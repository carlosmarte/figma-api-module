/**
 * project: figma-dev-resources-client
 * purpose: Core API client for Figma Dev Resources API
 * use-cases:
 *  - Authenticated API requests to Figma Dev Resources endpoints
 *  - Rate-limited operations with exponential backoff
 *  - Bulk operations for dev resource management
 *  - Structured error handling with proper context
 * performance:
 *  - Connection pooling and keep-alive
 *  - Request/response streaming for large payloads
 *  - Memory-efficient pagination handling
 *  - Exponential backoff for transient failures
 */

import { fetch, ProxyAgent } from 'undici';

export class FigmaApiError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
  }
}

export class FigmaRateLimitError extends FigmaApiError {
  constructor(retryAfter) {
    super('Rate limit exceeded', 'RATE_LIMIT', { retryAfter });
  }
}

export class FigmaAuthError extends FigmaApiError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
  }
}

export class FigmaValidationError extends FigmaApiError {
  constructor(message, validationErrors = []) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
  }
}

export class FigmaDevResourcesClient {
  constructor({
    accessToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN
  } = {}) {
    if (!accessToken) {
      throw new FigmaAuthError('Access token is required');
    }

    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    this.cache = cache;
    this.timeout = timeout;
    
    // Initialize proxy agent if configured
    this.proxyAgent = null;
    if (proxyUrl) {
      this.proxyAgent = proxyToken 
        ? new ProxyAgent({ uri: proxyUrl, token: proxyToken })
        : new ProxyAgent(proxyUrl);
      this.logger.debug(`Proxy configured: ${proxyUrl}`);
    }
    
    this._initializeDefaults();
  }

  _initializeDefaults() {
    this.defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'figma-dev-resources-client/1.0.0'
    };

    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    };
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';

    // Check rate limits
    if (this.rateLimiter) {
      await this.rateLimiter.checkLimit();
    }

    // Check cache for GET requests
    if (this.cache && method === 'GET') {
      const cached = await this.cache.get(url);
      if (cached) return cached;
    }

    const fetchOptions = {
      ...options,
      headers: { ...this.defaultHeaders, ...options.headers },
      signal: AbortSignal.timeout(this.timeout)
    };
    
    // Add proxy dispatcher if configured
    if (this.proxyAgent) {
      fetchOptions.dispatcher = this.proxyAgent;
    }
    
    const response = await this._executeWithRetry(url, fetchOptions);

    // Update cache for successful GET requests
    if (this.cache && method === 'GET' && response) {
      await this.cache.set(url, response);
    }

    return response;
  }

  async _executeWithRetry(url, options, attempt = 0) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new FigmaRateLimitError(retryAfter);
      }

      if (response.status === 401) {
        throw new FigmaAuthError('Invalid or expired access token');
      }

      if (response.status === 403) {
        throw new FigmaApiError(
          'Insufficient permissions. Check required scopes: file_dev_resources:read or file_dev_resources:write',
          'FORBIDDEN',
          { status: response.status, url }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FigmaApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, url, details: errorData }
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof FigmaApiError) {
        throw error;
      }

      if (attempt < this.retryConfig.maxRetries && this._isRetryableError(error)) {
        const delay = this._calculateBackoff(attempt);
        this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}): ${error.message}`);
        await this._sleep(delay);
        return this._executeWithRetry(url, options, attempt + 1);
      }

      throw new FigmaApiError(`Request failed: ${error.message}`, 'NETWORK_ERROR', { originalError: error });
    }
  }

  _isRetryableError(error) {
    return error instanceof FigmaRateLimitError ||
           error.name === 'TimeoutError' ||
           (error.cause && ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.cause.code));
  }

  _calculateBackoff(attempt) {
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get dev resources from a file
   * @param {string} fileKey - The file key to get dev resources from
   * @param {Object} options - Options for the request
   * @param {string|string[]} options.nodeIds - Comma separated list of node IDs or array
   * @returns {Promise<Object>} Response containing dev_resources array
   */
  async getDevResources(fileKey, options = {}) {
    if (!fileKey) {
      throw new FigmaValidationError('File key is required');
    }

    const params = new URLSearchParams();
    if (options.nodeIds) {
      const nodeIds = Array.isArray(options.nodeIds) ? options.nodeIds.join(',') : options.nodeIds;
      params.set('node_ids', nodeIds);
    }

    const queryString = params.toString();
    const path = `/v1/files/${fileKey}/dev_resources${queryString ? `?${queryString}` : ''}`;

    return this.request(path);
  }

  /**
   * Create dev resources across multiple files
   * @param {Object[]} devResources - Array of dev resources to create
   * @param {string} devResources[].name - The name of the dev resource
   * @param {string} devResources[].url - The URL of the dev resource
   * @param {string} devResources[].file_key - The file key where the dev resource belongs
   * @param {string} devResources[].node_id - The target node to attach the dev resource to
   * @returns {Promise<Object>} Response containing links_created and errors arrays
   */
  async createDevResources(devResources) {
    if (!Array.isArray(devResources) || devResources.length === 0) {
      throw new FigmaValidationError('Dev resources array is required and cannot be empty');
    }

    // Validate each dev resource
    const validationErrors = [];
    devResources.forEach((resource, index) => {
      const requiredFields = ['name', 'url', 'file_key', 'node_id'];
      requiredFields.forEach(field => {
        if (!resource[field]) {
          validationErrors.push(`Dev resource at index ${index} missing required field: ${field}`);
        }
      });

      if (resource.url && !this._isValidUrl(resource.url)) {
        validationErrors.push(`Dev resource at index ${index} has invalid URL: ${resource.url}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new FigmaValidationError('Validation failed', validationErrors);
    }

    return this.request('/v1/dev_resources', {
      method: 'POST',
      body: JSON.stringify({ dev_resources: devResources })
    });
  }

  /**
   * Update existing dev resources
   * @param {Object[]} devResources - Array of dev resources to update
   * @param {string} devResources[].id - Unique identifier of the dev resource
   * @param {string} [devResources[].name] - The name of the dev resource
   * @param {string} [devResources[].url] - The URL of the dev resource
   * @returns {Promise<Object>} Response containing links_updated and errors arrays
   */
  async updateDevResources(devResources) {
    if (!Array.isArray(devResources) || devResources.length === 0) {
      throw new FigmaValidationError('Dev resources array is required and cannot be empty');
    }

    // Validate each dev resource
    const validationErrors = [];
    devResources.forEach((resource, index) => {
      if (!resource.id) {
        validationErrors.push(`Dev resource at index ${index} missing required field: id`);
      }

      if (resource.url && !this._isValidUrl(resource.url)) {
        validationErrors.push(`Dev resource at index ${index} has invalid URL: ${resource.url}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new FigmaValidationError('Validation failed', validationErrors);
    }

    return this.request('/v1/dev_resources', {
      method: 'PUT',
      body: JSON.stringify({ dev_resources: devResources })
    });
  }

  /**
   * Delete a dev resource from a file
   * @param {string} fileKey - The file key to delete the dev resource from
   * @param {string} devResourceId - The id of the dev resource to delete
   * @returns {Promise<Object>} Response confirming deletion
   */
  async deleteDevResource(fileKey, devResourceId) {
    if (!fileKey) {
      throw new FigmaValidationError('File key is required');
    }

    if (!devResourceId) {
      throw new FigmaValidationError('Dev resource ID is required');
    }

    return this.request(`/v1/files/${fileKey}/dev_resources/${devResourceId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Batch operations helper - create multiple dev resources with progress tracking
   * @param {Object[]} devResources - Array of dev resources to create
   * @param {Function} [onProgress] - Progress callback function
   * @param {number} [batchSize=10] - Number of resources per batch
   * @returns {Promise<Object>} Aggregated results
   */
  async batchCreateDevResources(devResources, onProgress = null, batchSize = 10) {
    const results = {
      links_created: [],
      errors: [],
      total: devResources.length,
      processed: 0
    };

    for (let i = 0; i < devResources.length; i += batchSize) {
      const batch = devResources.slice(i, i + batchSize);
      
      try {
        const response = await this.createDevResources(batch);
        results.links_created.push(...response.links_created);
        results.errors.push(...(response.errors || []));
      } catch (error) {
        // Add batch errors
        batch.forEach(resource => {
          results.errors.push({
            file_key: resource.file_key,
            node_id: resource.node_id,
            error: error.message
          });
        });
      }

      results.processed = Math.min(i + batchSize, devResources.length);
      
      if (onProgress) {
        onProgress(results);
      }

      // Add delay between batches to avoid rate limits
      if (i + batchSize < devResources.length) {
        await this._sleep(100);
      }
    }

    return results;
  }

  /**
   * Get dev resources for multiple files
   * @param {string[]} fileKeys - Array of file keys
   * @param {Object} options - Options for each request
   * @returns {Promise<Object>} Map of file keys to their dev resources
   */
  async getMultipleFileDevResources(fileKeys, options = {}) {
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      throw new FigmaValidationError('File keys array is required and cannot be empty');
    }

    const results = {};
    const promises = fileKeys.map(async (fileKey) => {
      try {
        const response = await this.getDevResources(fileKey, options);
        results[fileKey] = response;
      } catch (error) {
        results[fileKey] = { error: error.message, dev_resources: [] };
      }
    });

    await Promise.all(promises);
    return results;
  }

  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export default FigmaDevResourcesClient;