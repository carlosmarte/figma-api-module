/**
 * project: figma-library-analytics
 * purpose: Core orchestration for Figma Library Analytics API operations
 * use-cases:
 *  - Component, style, and variable usage analytics for design systems
 *  - Library adoption metrics and engagement tracking
 *  - Performance insights for published design tokens
 *  - Team collaboration and library consumption analytics
 * performance:
 *  - Non-blocking async I/O with streaming support
 *  - Built-in pagination for analytics datasets
 *  - Exponential backoff for transient failures
 *  - Memory-efficient aggregation processing
 *  - Connection pooling for high-throughput scenarios
 */

import { fetch, ProxyAgent } from 'undici';

/**
 * Base error class for library analytics operations
 * @extends Error
 */
export class LibraryAnalyticsError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
  }
}

/**
 * Error thrown when library analytics rate limits are exceeded
 * @extends LibraryAnalyticsError
 */
export class LibraryAnalyticsRateLimitError extends LibraryAnalyticsError {
  constructor(retryAfter) {
    super('Library Analytics API rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

/**
 * Error thrown when library analytics authentication fails
 * @extends LibraryAnalyticsError
 */
export class LibraryAnalyticsAuthError extends LibraryAnalyticsError {
  constructor() {
    super('Library Analytics authentication failed - requires library_analytics:read scope', 'AUTH_FAILED');
  }
}

/**
 * Error thrown when library analytics validation fails
 * @extends LibraryAnalyticsError
 */
export class LibraryAnalyticsValidationError extends LibraryAnalyticsError {
  constructor(field, value) {
    super(`Invalid library analytics ${field}: ${value}`, 'VALIDATION_ERROR', { field, value });
  }
}

/**
 * Core client for Figma Library Analytics API
 * Provides low-level analytics operations with proper error handling,
 * rate limiting, and authentication scope validation.
 */
export class FigmaLibraryAnalyticsClient {
  /**
   * Initialize the Figma Library Analytics client
   * @param {Object} options - Configuration options
   * @param {string} options.apiToken - Figma API token with library_analytics:read scope
   * @param {string} [options.baseUrl='https://api.figma.com'] - Figma API base URL
   * @param {Object} [options.logger=console] - Logger instance for debugging
   * @param {Object} [options.rateLimiter=null] - Rate limiter implementation
   * @param {Object} [options.cache=null] - Cache implementation for responses
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   */
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN
  } = {}) {
    if (!apiToken) {
      throw new LibraryAnalyticsAuthError();
    }

    this.apiToken = apiToken;
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

  /**
   * Initialize default configuration
   * @private
   */
  _initializeDefaults() {
    this.defaultHeaders = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'figma-library-analytics-client/1.0.0'
    };

    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    };

    // Valid groupBy dimensions for different endpoints
    this.groupByOptions = {
      componentActions: ['component', 'team'],
      componentUsages: ['component', 'file'],
      styleActions: ['style', 'team'],
      styleUsages: ['style', 'file'],
      variableActions: ['variable', 'team'],
      variableUsages: ['variable', 'file']
    };

    // API endpoint paths
    this.endpoints = {
      componentActions: '/v1/analytics/libraries/{file_key}/component/actions',
      componentUsages: '/v1/analytics/libraries/{file_key}/component/usages',
      styleActions: '/v1/analytics/libraries/{file_key}/style/actions',
      styleUsages: '/v1/analytics/libraries/{file_key}/style/usages',
      variableActions: '/v1/analytics/libraries/{file_key}/variable/actions',
      variableUsages: '/v1/analytics/libraries/{file_key}/variable/usages'
    };
  }

  /**
   * Make authenticated HTTP request to Figma Library Analytics API
   * @param {string} path - API endpoint path
   * @param {Object} [options={}] - Request options
   * @returns {Promise<Object>} - API response data
   * @throws {LibraryAnalyticsError} - On request failure
   */
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';

    // Check rate limits
    if (this.rateLimiter) {
      await this.rateLimiter.checkLimit();
    }

    // Check cache for GET requests
    const cacheKey = `${method}:${url}:${JSON.stringify(options.params || {})}`;
    if (this.cache && method === 'GET') {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${url}`);
        return cached;
      }
    }

    const fetchOptions = {
      method,
      headers: { ...this.defaultHeaders, ...options.headers },
      signal: AbortSignal.timeout(this.timeout),
      ...options
    };
    
    // Add proxy dispatcher if configured
    if (this.proxyAgent) {
      fetchOptions.dispatcher = this.proxyAgent;
    }
    
    const response = await this._executeWithRetry(url, fetchOptions);

    // Update cache for successful GET requests
    if (this.cache && method === 'GET' && response) {
      await this.cache.set(cacheKey, response, { ttl: 300 }); // 5 minute TTL for analytics data
    }

    return response;
  }

  /**
   * Execute HTTP request with exponential backoff retry logic
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {number} [attempt=0] - Current retry attempt
   * @returns {Promise<Object>} - Parsed response data
   * @throws {LibraryAnalyticsError} - On final failure
   * @private
   */
  async _executeWithRetry(url, options, attempt = 0) {
    try {
      const response = await fetch(url, options);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new LibraryAnalyticsRateLimitError(retryAfter);
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new LibraryAnalyticsAuthError();
      }

      // Handle forbidden - likely missing library_analytics:read scope
      if (response.status === 403) {
        throw new LibraryAnalyticsError(
          'Access forbidden - ensure your token has library_analytics:read scope',
          'INSUFFICIENT_SCOPE',
          { status: 403 }
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LibraryAnalyticsError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { 
            status: response.status, 
            statusText: response.statusText,
            url,
            errorData 
          }
        );
      }

      return await response.json();

    } catch (error) {
      // Don't retry auth errors, validation errors, or rate limit errors
      if (error instanceof LibraryAnalyticsAuthError || 
          error instanceof LibraryAnalyticsValidationError ||
          error instanceof LibraryAnalyticsRateLimitError) {
        throw error;
      }

      // Retry on network errors and 5xx responses
      if (attempt < this.retryConfig.maxRetries && this._shouldRetry(error)) {
        const delay = this._calculateBackoff(attempt);
        this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
        await this._sleep(delay);
        return this._executeWithRetry(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} - Whether error should be retried
   * @private
   */
  _shouldRetry(error) {
    if (error.meta?.status >= 500) return true;
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true;
    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param {number} attempt - Current attempt number
   * @returns {number} - Delay in milliseconds
   * @private
   */
  _calculateBackoff(attempt) {
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate file key format
   * @param {string} fileKey - File key to validate
   * @throws {LibraryAnalyticsValidationError} - If file key is invalid
   * @private
   */
  _validateFileKey(fileKey) {
    if (!fileKey || typeof fileKey !== 'string') {
      throw new LibraryAnalyticsValidationError('file_key', fileKey);
    }
    
    // Figma file keys are typically alphanumeric with some special chars
    if (!/^[a-zA-Z0-9_-]+$/.test(fileKey)) {
      throw new LibraryAnalyticsValidationError('file_key', 'File key contains invalid characters');
    }
  }

  /**
   * Validate groupBy parameter for specific endpoint
   * @param {string} groupBy - GroupBy value to validate
   * @param {string} endpointType - Type of endpoint (e.g., 'componentActions')
   * @throws {LibraryAnalyticsValidationError} - If groupBy is invalid
   * @private
   */
  _validateGroupBy(groupBy, endpointType) {
    const validOptions = this.groupByOptions[endpointType];
    if (!validOptions || !validOptions.includes(groupBy)) {
      throw new LibraryAnalyticsValidationError(
        'group_by', 
        `Must be one of: ${validOptions?.join(', ') || 'unknown endpoint'}`
      );
    }
  }

  /**
   * Validate date format (ISO 8601 YYYY-MM-DD)
   * @param {string} date - Date string to validate
   * @param {string} fieldName - Field name for error reporting
   * @throws {LibraryAnalyticsValidationError} - If date format is invalid
   * @private
   */
  _validateDate(date, fieldName) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new LibraryAnalyticsValidationError(fieldName, 'Date must be in YYYY-MM-DD format');
    }
  }

  /**
   * Build query parameters for analytics requests
   * @param {Object} options - Query options
   * @returns {URLSearchParams} - Formatted query parameters
   * @private
   */
  _buildQueryParams(options = {}) {
    const params = new URLSearchParams();

    if (options.groupBy) {
      params.set('group_by', options.groupBy);
    }

    if (options.cursor) {
      params.set('cursor', options.cursor);
    }

    if (options.startDate) {
      this._validateDate(options.startDate, 'start_date');
      params.set('start_date', options.startDate);
    }

    if (options.endDate) {
      this._validateDate(options.endDate, 'end_date');
      params.set('end_date', options.endDate);
    }

    return params;
  }

  // === Component Analytics Methods ===

  /**
   * Get component action analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('component' or 'team')
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Component actions analytics data
   */
  async getComponentActions(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    this._validateGroupBy(options.groupBy, 'componentActions');

    const path = this.endpoints.componentActions.replace('{file_key}', fileKey);
    const queryParams = this._buildQueryParams(options);
    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    return this.request(fullPath);
  }

  /**
   * Get component usage analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('component' or 'file')
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Component usage analytics data
   */
  async getComponentUsages(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    this._validateGroupBy(options.groupBy, 'componentUsages');

    const path = this.endpoints.componentUsages.replace('{file_key}', fileKey);
    const queryParams = this._buildQueryParams(options);
    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    return this.request(fullPath);
  }

  // === Style Analytics Methods ===

  /**
   * Get style action analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('style' or 'team')
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Style actions analytics data
   */
  async getStyleActions(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    this._validateGroupBy(options.groupBy, 'styleActions');

    const path = this.endpoints.styleActions.replace('{file_key}', fileKey);
    const queryParams = this._buildQueryParams(options);
    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    return this.request(fullPath);
  }

  /**
   * Get style usage analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('style' or 'file')
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Style usage analytics data
   */
  async getStyleUsages(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    this._validateGroupBy(options.groupBy, 'styleUsages');

    const path = this.endpoints.styleUsages.replace('{file_key}', fileKey);
    const queryParams = this._buildQueryParams(options);
    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    return this.request(fullPath);
  }

  // === Variable Analytics Methods ===

  /**
   * Get variable action analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('variable' or 'team')
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Variable actions analytics data
   */
  async getVariableActions(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    this._validateGroupBy(options.groupBy, 'variableActions');

    const path = this.endpoints.variableActions.replace('{file_key}', fileKey);
    const queryParams = this._buildQueryParams(options);
    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    return this.request(fullPath);
  }

  /**
   * Get variable usage analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('variable' or 'file')
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Variable usage analytics data
   */
  async getVariableUsages(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    this._validateGroupBy(options.groupBy, 'variableUsages');

    const path = this.endpoints.variableUsages.replace('{file_key}', fileKey);
    const queryParams = this._buildQueryParams(options);
    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    return this.request(fullPath);
  }

  // === Pagination Support ===

  /**
   * Paginate through analytics data
   * @param {Function} apiMethod - The API method to paginate
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @returns {AsyncGenerator<Array>} - Analytics data pages
   */
  async *paginate(apiMethod, fileKey, options = {}) {
    let cursor = null;

    do {
      const currentOptions = { ...options, cursor };
      const response = await apiMethod.call(this, fileKey, currentOptions);

      // Yield the data array based on response structure
      if (response.component_actions) {
        yield response.component_actions;
      } else if (response.component_usages) {
        yield response.component_usages;
      } else if (response.style_actions) {
        yield response.style_actions;
      } else if (response.style_usages) {
        yield response.style_usages;
      } else if (response.variable_actions) {
        yield response.variable_actions;
      } else if (response.variable_usages) {
        yield response.variable_usages;
      } else {
        yield [];
      }

      // Extract cursor for next page
      cursor = response.pagination?.next_cursor || null;
    } while (cursor);
  }

  /**
   * Get all analytics data by paginating through all pages
   * @param {Function} apiMethod - The API method to use
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - All analytics data
   */
  async getAll(apiMethod, fileKey, options = {}) {
    const allData = [];
    
    for await (const batch of this.paginate(apiMethod, fileKey, options)) {
      allData.push(...batch);
    }

    return allData;
  }

  /**
   * Get supported groupBy options for a specific analytics type
   * @param {string} analyticsType - Type of analytics ('component', 'style', 'variable')
   * @param {string} dataType - Type of data ('actions', 'usages')
   * @returns {Array<string>} - Valid groupBy options
   */
  getSupportedGroupByOptions(analyticsType, dataType) {
    const key = `${analyticsType}${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
    return [...(this.groupByOptions[key] || [])];
  }
}

export default FigmaLibraryAnalyticsClient;