/**
 * project: figma-projects-api
 * purpose: Core HTTP client for Figma Projects API operations
 * use-cases:
 *  - Authenticated API requests to Figma Projects endpoints
 *  - Rate-limited operations with exponential backoff
 *  - Request/response processing with proper error handling
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
 * Core HTTP client for Figma Projects API
 */
export class FigmaProjectsClient extends FigmaApiClient {
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    timeout = 30000,
    retryConfig = {},
    rateLimitConfig = {},
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN,
    fetchFunction = null
  } = {}) {
    if (!apiToken && !process.env.FIGMA_TOKEN) {
      throw new AuthenticationError('API token is required');
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
      rateLimiter: rateLimitConfig.requestsPerMinute !== undefined ? rateLimitConfig : { requestsPerMinute: 60, burstLimit: 10 },
      cache: { maxSize: 100, ttl: 300000 },
      timeout,
      retry: retryConfig.maxRetries !== undefined ? retryConfig : { maxRetries: 3 },
      fetchAdapter
    });
  }

  getStats() {
    return super.getStats();
  }

  resetStats() {
    super.reset();
  }

  async healthCheck() {
    return super.healthCheck();
  }
}

export default FigmaProjectsClient;
