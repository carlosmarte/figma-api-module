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

import { FigmaApiClient, UndiciFetchAdapter } from '../figma-fetch/dist/index.mjs';

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

export class FigmaDevResourcesClient extends FigmaApiClient {
  constructor({
    accessToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN,
    fetchFunction = null
  } = {}) {
    if (!accessToken && !process.env.FIGMA_TOKEN) {
      throw new FigmaAuthError('API token is required');
    }

    let fetchAdapter;
    if (fetchFunction) {
      fetchAdapter = fetchFunction;
    } else if (proxyUrl) {
      fetchAdapter = new UndiciFetchAdapter({
        url: proxyUrl,
        token: proxyToken
      });
    }

    super({
      apiToken: accessToken,
      baseUrl,
      logger,
      rateLimiter: rateLimiter !== null ? { requestsPerMinute: 60, burstLimit: 10 } : null,
      cache: cache !== null ? { maxSize: 100, ttl: 300000 } : null,
      timeout,
      retry: { maxRetries: 3 },
      fetchAdapter
    });

    // Keep accessToken for backward compatibility
    this.accessToken = accessToken || process.env.FIGMA_TOKEN;
  }

  /**
   * Get dev resources for a file
   * @param {string} fileKey - The file key
   * @param {object} options - Optional parameters (nodeIds, etc.)
   * @returns {Promise<object>} Dev resources data
   */
  async getDevResources(fileKey, options = {}) {
    if (!fileKey) {
      throw new FigmaValidationError('File key is required');
    }

    const params = new URLSearchParams();
    if (options.nodeIds) {
      params.append('node_ids', options.nodeIds);
    }

    const queryString = params.toString();
    const url = `/v1/files/${fileKey}/dev_resources${queryString ? `?${queryString}` : ''}`;

    return this.get(url);
  }

  /**
   * Create dev resources
   * @param {array|object} devResources - Dev resources to create
   * @returns {Promise<object>} Created resources data
   */
  async createDevResources(devResources) {
    if (!devResources || (Array.isArray(devResources) && devResources.length === 0)) {
      throw new FigmaValidationError('Dev resources array cannot be empty');
    }

    if (!Array.isArray(devResources) && typeof devResources !== 'object') {
      throw new FigmaValidationError('Dev resources must be an array or object');
    }

    const resources = Array.isArray(devResources) ? devResources : [devResources];

    // Validate each resource
    for (const resource of resources) {
      if (!resource.file_key) {
        throw new FigmaValidationError('Each dev resource must have a file_key');
      }
      if (!resource.node_id) {
        throw new FigmaValidationError('Each dev resource must have a node_id');
      }
      if (!resource.url) {
        throw new FigmaValidationError('Each dev resource must have a url');
      }
      if (!this._isValidUrl(resource.url)) {
        throw new FigmaValidationError('Invalid URL format');
      }
    }

    return this.post('/v1/dev_resources', { dev_resources: resources });
  }

  /**
   * Update dev resources
   * @param {array|object} devResources - Dev resources to update
   * @returns {Promise<object>} Updated resources data
   */
  async updateDevResources(devResources) {
    const resources = Array.isArray(devResources) ? devResources : [devResources];

    // Validate each resource
    for (const resource of resources) {
      if (!resource.id) {
        throw new FigmaValidationError('Each dev resource must have an id for updates');
      }
    }

    return this.put('/v1/dev_resources', { dev_resources: resources });
  }

  /**
   * Delete a dev resource
   * @param {string} fileKey - The file key
   * @param {string} resourceId - The resource ID
   * @returns {Promise<void>}
   */
  async deleteDevResource(fileKey, resourceId) {
    if (!fileKey) {
      throw new FigmaValidationError('File key is required');
    }
    if (!resourceId) {
      throw new FigmaValidationError('Resource ID is required');
    }

    return this.delete(`/v1/files/${fileKey}/dev_resources/${resourceId}`);
  }

  /**
   * Get dev resources for multiple files
   * @param {array} fileKeys - Array of file keys
   * @returns {Promise<object>} Combined dev resources data
   */
  async getMultipleFileDevResources(fileKeys) {
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      throw new FigmaValidationError('File keys must be a non-empty array');
    }

    const promises = fileKeys.map(fileKey => this.getDevResources(fileKey));
    const results = await Promise.all(promises);

    return {
      files: fileKeys.reduce((acc, fileKey, index) => {
        acc[fileKey] = results[index];
        return acc;
      }, {})
    };
  }

  /**
   * Validate if a string is a valid URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   * @private
   */
  _isValidUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get default headers for requests
   * @returns {object} Headers object
   * @private
   */
  _getDefaultHeaders() {
    return {
      'X-Figma-Token': this.accessToken,
      'Content-Type': 'application/json'
    };
  }
}

export default FigmaDevResourcesClient;
