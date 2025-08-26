/**
 * project: figma-variables-sdk
 * purpose: Core API client for Figma Variables API
 * use-cases:
 *  - Enterprise-only variable management API client
 *  - Rate-limited requests with proper authentication
 *  - Local and published variables operations
 *  - Bulk variable create/update/delete operations
 * performance:
 *  - Connection pooling for multiple requests
 *  - Request/response caching with TTL
 *  - Stream processing for large variable sets
 *  - Memory-efficient batch operations
 */

import { fetch, ProxyAgent } from 'undici';
import { 
  ApiError, 
  AuthenticationError, 
  EnterpriseAccessError,
  ScopeError,
  RateLimitError, 
  NetworkError,
  TimeoutError,
  NotFoundError,
  ValidationError
} from './exceptions.mjs';

export class FigmaVariablesClient {
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
      throw new AuthenticationError('Figma access token is required');
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
      'User-Agent': 'figma-variables-sdk/1.0.0'
    };

    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    };

    this.enterpriseScopes = {
      read: 'file_variables:read',
      write: 'file_variables:write'
    };
  }

  /**
   * Get local variables from a file
   * @param {string} fileKey - File key or branch key
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Variables and collections data
   */
  async getLocalVariables(fileKey, options = {}) {
    if (!fileKey) {
      throw new ValidationError('File key is required', 'fileKey', fileKey);
    }

    const path = `/v1/files/${fileKey}/variables/local`;
    const cacheKey = `local_variables_${fileKey}`;

    // Check cache first
    if (this.cache && options.useCache !== false) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for local variables ${fileKey}`);
        return cached;
      }
    }

    try {
      const response = await this.request(path, {
        method: 'GET',
        ...options
      });

      // Validate Enterprise response
      this._validateEnterpriseResponse(response);

      // Cache the response
      if (this.cache) {
        await this.cache.set(cacheKey, response, { ttl: 5 * 60 * 1000 }); // 5 minutes
      }

      return response;
    } catch (error) {
      if (error.code === 'FORBIDDEN') {
        throw new EnterpriseAccessError('Local variables API requires Enterprise organization access');
      }
      throw error;
    }
  }

  /**
   * Get published variables from a file
   * @param {string} fileKey - File key (must be main file, not branch)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Published variables and collections data
   */
  async getPublishedVariables(fileKey, options = {}) {
    if (!fileKey) {
      throw new ValidationError('File key is required', 'fileKey', fileKey);
    }

    const path = `/v1/files/${fileKey}/variables/published`;
    const cacheKey = `published_variables_${fileKey}`;

    // Check cache first
    if (this.cache && options.useCache !== false) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for published variables ${fileKey}`);
        return cached;
      }
    }

    try {
      const response = await this.request(path, {
        method: 'GET',
        ...options
      });

      // Validate Enterprise response
      this._validateEnterpriseResponse(response);

      // Cache the response
      if (this.cache) {
        await this.cache.set(cacheKey, response, { ttl: 10 * 60 * 1000 }); // 10 minutes for published
      }

      return response;
    } catch (error) {
      if (error.code === 'FORBIDDEN') {
        throw new EnterpriseAccessError('Published variables API requires Enterprise organization access');
      }
      throw error;
    }
  }

  /**
   * Create, modify, or delete variables in bulk
   * @param {string} fileKey - File key or branch key
   * @param {Object} changes - Variable changes to apply
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response with tempIdToRealId mapping
   */
  async updateVariables(fileKey, changes, options = {}) {
    if (!fileKey) {
      throw new ValidationError('File key is required', 'fileKey', fileKey);
    }

    if (!changes || typeof changes !== 'object') {
      throw new ValidationError('Changes object is required', 'changes', changes);
    }

    // Validate changes structure
    this._validateChangesPayload(changes);

    const path = `/v1/files/${fileKey}/variables`;

    try {
      const response = await this.request(path, {
        method: 'POST',
        body: JSON.stringify(changes),
        ...options
      });

      // Clear relevant caches after successful update
      if (this.cache) {
        await this._clearVariableCaches(fileKey);
      }

      return response;
    } catch (error) {
      if (error.code === 'FORBIDDEN') {
        throw new ScopeError(this.enterpriseScopes.write, 'Variables write operations require file_variables:write scope');
      }
      throw error;
    }
  }

  /**
   * Core request method with retry logic and error handling
   * @param {string} path - API endpoint path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;

    // Check rate limits
    if (this.rateLimiter) {
      await this.rateLimiter.checkLimit();
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

    return response;
  }

  /**
   * Execute request with exponential backoff retry
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Response data
   */
  async _executeWithRetry(url, options, attempt = 0) {
    try {
      const response = await fetch(url, options);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new RateLimitError(retryAfter * 1000);
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new AuthenticationError('Invalid or expired access token');
      }

      // Handle authorization errors
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || 'Access forbidden',
          'FORBIDDEN',
          { status: response.status, url }
        );
      }

      // Handle not found errors
      if (response.status === 404) {
        throw new NotFoundError('Resource', url);
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, url }
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Handle network errors and timeouts
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new TimeoutError(this.timeout, 'request');
      }

      let processedError = error;
      if (error instanceof TypeError && error.message.includes('fetch')) {
        processedError = new NetworkError('Network request failed', error);
      }

      // Retry logic for transient errors
      if (this._shouldRetry(processedError) && attempt < this.retryConfig.maxRetries) {
        const delay = this._calculateBackoff(attempt);
        this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1})`);
        await this._sleep(delay);
        return this._executeWithRetry(url, options, attempt + 1);
      }

      throw processedError;
    }
  }

  /**
   * Validate changes payload structure
   * @param {Object} changes - Changes to validate
   */
  _validateChangesPayload(changes) {
    const validKeys = ['variableCollections', 'variableModes', 'variables', 'variableModeValues'];
    const hasValidKey = validKeys.some(key => Array.isArray(changes[key]) && changes[key].length > 0);

    if (!hasValidKey) {
      throw new ValidationError(
        'Changes must include at least one of: variableCollections, variableModes, variables, variableModeValues',
        'changes',
        Object.keys(changes)
      );
    }

    // Validate payload size
    const payloadSize = JSON.stringify(changes).length;
    const maxSize = 4 * 1024 * 1024; // 4MB

    if (payloadSize > maxSize) {
      throw new ValidationError(
        `Payload size (${payloadSize} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
        'payloadSize',
        payloadSize
      );
    }
  }

  /**
   * Validate Enterprise API response
   * @param {Object} response - API response
   */
  _validateEnterpriseResponse(response) {
    if (!response || response.error === true) {
      throw new EnterpriseAccessError(
        response?.message || 'Access denied - Enterprise organization required'
      );
    }
  }

  /**
   * Clear variable-related caches
   * @param {string} fileKey - File key
   */
  async _clearVariableCaches(fileKey) {
    const cacheKeys = [
      `local_variables_${fileKey}`,
      `published_variables_${fileKey}`
    ];

    for (const key of cacheKeys) {
      await this.cache.delete(key);
    }
  }

  /**
   * Determine if error should trigger retry
   * @param {Error} error - Error to check
   * @returns {boolean} Whether to retry
   */
  _shouldRetry(error) {
    if (error instanceof RateLimitError) return true;
    if (error instanceof NetworkError) return true;
    if (error instanceof TimeoutError) return true;
    if (error instanceof ApiError && error.meta.status >= 500) return true;
    return false;
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  _calculateBackoff(attempt) {
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get client statistics
   * @returns {Object} Client stats
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryConfig: this.retryConfig,
      enterpriseScopes: this.enterpriseScopes
    };
  }
}

export default FigmaVariablesClient;