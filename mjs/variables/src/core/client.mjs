/**
 * project: figma-variables-api
 * purpose: Core HTTP client for Figma Variables API operations
 * use-cases:
 *  - Authenticated API requests to Figma Variables endpoints
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
 * Core HTTP client for Figma Variables API
 */
export class FigmaVariablesClient extends FigmaApiClient {
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
    if (!apiToken && !process.env.FIGMA_TOKEN) {
      throw new AuthenticationError('API token is required');
    }

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

export default FigmaVariablesClient;
