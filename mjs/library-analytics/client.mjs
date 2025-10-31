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
}

export default FigmaLibraryAnalyticsClient;
