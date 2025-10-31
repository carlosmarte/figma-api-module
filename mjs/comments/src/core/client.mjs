/**
 * project: figma-comments
 * purpose: Core HTTP client for Figma Comments API operations
 * use-cases:
 *  - Authenticated API requests with automatic retries
 *  - Rate-limited request handling with exponential backoff
 *  - Request/response logging and statistics tracking
 * performance:
 *  - Connection pooling with keep-alive
 *  - Request caching for read operations
 *  - Non-blocking async I/O with streaming support
 *  - Memory-efficient response processing
 */

import { FigmaApiClient, UndiciFetchAdapter } from '../../../figma-fetch/dist/index.mjs';
import {
  FigmaCommentsError,
  RateLimitError,
  NetworkError,
  AuthenticationError,
  createErrorFromResponse
} from './exceptions.mjs';

/**
 * Core HTTP client for Figma Comments API
 */
export class FigmaCommentsClient extends FigmaApiClient {
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    retries = 3,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN,
    fetchFunction = null
  } = {}) {
    // Check for API token before calling parent for backward compatibility
    if (!apiToken && !process.env.FIGMA_TOKEN) {
      throw new AuthenticationError('API token is required');
    }

    // Prepare fetch adapter with proxy support if needed
    // Use fetchFunction for testing, or create appropriate adapter
    let fetchAdapter;
    if (fetchFunction) {
      fetchAdapter = fetchFunction;
    } else if (proxyUrl) {
      fetchAdapter = new UndiciFetchAdapter({
        url: proxyUrl,
        token: proxyToken
      });
    }

    // Call parent constructor
    super({
      apiToken,
      baseUrl,
      logger,
      rateLimiter: rateLimiter !== null ? (rateLimiter || { requestsPerMinute: 60, burstLimit: 10 }) : null,
      cache: cache !== null ? (cache || { maxSize: 100, ttl: 300000 }) : null,
      timeout,
      retry: { maxRetries: retries },
      fetchAdapter
    });

    // Store retries for backward compatibility
    this.retries = retries;

    this._initializeDefaults();
  }

  _initializeDefaults() {
    // Module-specific initialization if needed
    // The parent class handles headers, retry config, etc.
  }

  /**
   * Get client statistics and health information
   */
  getStats() {
    return super.getStats();
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    return super.healthCheck();
  }

  /**
   * Clear cache and reset statistics
   */
  reset() {
    super.reset();
  }
}

export default FigmaCommentsClient;
