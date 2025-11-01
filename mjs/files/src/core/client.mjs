/**
 * project: figma-files-api
 * purpose: Core HTTP client for Figma Files API operations
 * use-cases:
 *  - Authenticated API requests to Figma Files endpoints
 *  - Rate-limited operations with exponential backoff
 *  - Request/response processing with proper error handling
 *  - File content retrieval, image rendering, and metadata access
 * performance:
 *  - Connection reuse via fetch with keep-alive
 *  - Request queuing to respect rate limits
 *  - Response streaming for large payloads
 *  - Memory-efficient JSON parsing
 *  - Exponential backoff with jitter for retries
 */

import { FigmaApiClient, UndiciFetchAdapter } from '../../../figma-fetch/dist/index.mjs';
import {
  FigmaApiError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse,
  isRetryableError
} from './exceptions.mjs';

/**
 * Core HTTP client for Figma Files API
 * Handles authentication, rate limiting, retries, and response processing
 */
export class FigmaFilesClient extends FigmaApiClient {
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    timeout = 30000,
    retryConfig = {},
    rateLimitConfig = {},
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN,
    fetchFunction = null,
    fetchAdapter = null
  } = {}) {
    // Check for API token before calling parent for backward compatibility
    if (!apiToken && !process.env.FIGMA_TOKEN) {
      throw new AuthenticationError('API token is required');
    }

    // Prepare fetch adapter with proxy support if needed
    let adapter;
    if (fetchAdapter) {
      adapter = fetchAdapter;
    } else if (fetchFunction) {
      adapter = fetchFunction;
    } else if (proxyUrl) {
      adapter = new UndiciFetchAdapter({
        url: proxyUrl,
        token: proxyToken
      });
    }

    // Call parent constructor
    super({
      apiToken,
      baseUrl,
      logger,
      rateLimiter: rateLimitConfig.requestsPerMinute !== undefined ? rateLimitConfig : { requestsPerMinute: 60, burstLimit: 10 },
      cache: { maxSize: 100, ttl: 300000 },
      timeout,
      retry: retryConfig.maxRetries !== undefined ? retryConfig : { maxRetries: 3 },
      fetchAdapter: adapter
    });
  }

  /**
   * Get client statistics
   */
  getStats() {
    return super.getStats();
  }

  /**
   * Reset client statistics
   */
  resetStats() {
    super.reset();
  }

  /**
   * Health check endpoint to verify API connectivity
   */
  async healthCheck() {
    return super.healthCheck();
  }
}

export default FigmaFilesClient;
