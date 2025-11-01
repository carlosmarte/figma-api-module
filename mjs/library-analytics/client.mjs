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

import { FigmaApiClient, UndiciFetchAdapter } from '../figma-fetch/dist/index.mjs';

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
 */
export class FigmaLibraryAnalyticsClient extends FigmaApiClient {
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN,
    fetchFunction = null
  } = {}) {
    if (!apiToken && !process.env.FIGMA_TOKEN) {
      throw new LibraryAnalyticsAuthError();
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
      apiToken,
      baseUrl,
      logger,
      rateLimiter: rateLimiter !== null ? { requestsPerMinute: 60, burstLimit: 10 } : null,
      cache: cache !== null ? { maxSize: 100, ttl: 300000 } : null,
      timeout,
      retry: { maxRetries: 3 },
      fetchAdapter
    });
  }

  /**
   * Get component actions for a file
   */
  async getComponentActions(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    const queryString = this._buildQueryParams(options);
    return this.get(`/v1/analytics/libraries/${fileKey}/component_actions${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get component usages for a file
   */
  async getComponentUsages(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    const queryString = this._buildQueryParams(options);
    return this.get(`/v1/analytics/libraries/${fileKey}/component_usages${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get style actions for a file
   */
  async getStyleActions(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    const queryString = this._buildQueryParams(options);
    return this.get(`/v1/analytics/libraries/${fileKey}/style_actions${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get style usages for a file
   */
  async getStyleUsages(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    const queryString = this._buildQueryParams(options);
    return this.get(`/v1/analytics/libraries/${fileKey}/style_usages${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get variable actions for a file
   */
  async getVariableActions(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    const queryString = this._buildQueryParams(options);
    return this.get(`/v1/analytics/libraries/${fileKey}/variable_actions${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get variable usages for a file
   */
  async getVariableUsages(fileKey, options = {}) {
    this._validateFileKey(fileKey);
    const queryString = this._buildQueryParams(options);
    return this.get(`/v1/analytics/libraries/${fileKey}/variable_usages${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get all results with pagination
   */
  async getAll(fn, fileKey, options = {}) {
    let allResults = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const params = cursor ? { ...options, cursor } : options;
      const response = await fn(fileKey, params);

      if (response && response.data) {
        allResults = allResults.concat(response.data);
      }

      cursor = response?.pagination?.cursor;
      hasMore = !!cursor;
    }

    return allResults;
  }

  /**
   * Get supported group by options for an asset type and endpoint
   */
  getSupportedGroupByOptions(assetType, endpoint) {
    const options = {
      component: {
        actions: ['team', 'component'],
        usages: ['team', 'component']
      },
      style: {
        actions: ['team', 'style'],
        usages: ['team', 'style']
      },
      variable: {
        actions: ['team', 'variable'],
        usages: ['team', 'variable']
      }
    };

    return options[assetType]?.[endpoint] || [];
  }

  /**
   * Build query parameters string
   * @private
   */
  _buildQueryParams(options = {}) {
    const params = new URLSearchParams();

    if (options.start_date) {
      this._validateDate(options.start_date, 'start_date');
      params.append('start_date', options.start_date);
    }

    if (options.end_date) {
      this._validateDate(options.end_date, 'end_date');
      params.append('end_date', options.end_date);
    }

    if (options.group_by) {
      params.append('group_by', options.group_by);
    }

    if (options.cursor) {
      params.append('cursor', options.cursor);
    }

    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    return params.toString();
  }

  /**
   * Validate file key format
   * @private
   */
  _validateFileKey(fileKey) {
    if (!fileKey || typeof fileKey !== 'string') {
      throw new LibraryAnalyticsValidationError('file_key', fileKey);
    }

    // File keys should only contain alphanumeric characters and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(fileKey)) {
      throw new LibraryAnalyticsValidationError('file_key', fileKey);
    }
  }

  /**
   * Validate group by parameter
   * @private
   */
  _validateGroupBy(groupBy, endpoint) {
    const validOptions = ['team', 'component', 'style', 'variable'];
    if (!validOptions.includes(groupBy)) {
      throw new LibraryAnalyticsValidationError('group_by', groupBy);
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @private
   */
  _validateDate(date, fieldName) {
    if (!date || typeof date !== 'string') {
      throw new LibraryAnalyticsValidationError(fieldName, date);
    }

    // Check format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new LibraryAnalyticsValidationError(fieldName, date);
    }

    // Validate it's a valid date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new LibraryAnalyticsValidationError(fieldName, date);
    }
  }
}

export default FigmaLibraryAnalyticsClient;
