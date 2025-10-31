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
}

export default FigmaDevResourcesClient;
