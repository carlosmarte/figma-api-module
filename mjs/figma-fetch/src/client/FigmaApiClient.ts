/**
 * Base Figma API client using composable fetch adapter
 * Integrates rate limiting, caching, retry logic, and error handling
 */

import { FetchAdapter } from '../core/FetchAdapter.js';
import { NativeFetchAdapter } from '../adapters/NativeFetchAdapter.js';
import { UndiciFetchAdapter } from '../adapters/UndiciFetchAdapter.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { RequestCache } from '../utils/RequestCache.js';
import { RetryHandler } from '../utils/RetryHandler.js';
import {
  FigmaApiClientConfig,
  FetchRequest,
  FetchResponse,
  Logger,
  ClientStats,
  HealthCheckResult,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from '../types/index.js';
import { createErrorFromResponse, AuthenticationError } from '../errors/index.js';

/**
 * Default console logger
 */
const defaultLogger: Logger = {
  debug: (...args) => console.debug('[FigmaApiClient]', ...args),
  info: (...args) => console.info('[FigmaApiClient]', ...args),
  warn: (...args) => console.warn('[FigmaApiClient]', ...args),
  error: (...args) => console.error('[FigmaApiClient]', ...args),
};

/**
 * FigmaApiClient base class
 * Provides common functionality for Figma API clients
 */
export class FigmaApiClient {
  protected apiToken: string;
  protected baseUrl: string;
  protected logger: Logger;
  protected timeout: number;
  protected fetchAdapter: FetchAdapter;
  protected rateLimiter: RateLimiter | null;
  protected cache: RequestCache | null;
  protected retryHandler: RetryHandler;
  protected stats: ClientStats;
  protected requestInterceptors: RequestInterceptor[] = [];
  protected responseInterceptors: ResponseInterceptor[] = [];
  protected errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: FigmaApiClientConfig = {}) {
    // Validate API token
    this.apiToken = config.apiToken || process.env.FIGMA_TOKEN || '';
    if (!this.apiToken) {
      throw new AuthenticationError('API token is required. Provide via config.apiToken or FIGMA_TOKEN environment variable');
    }

    this.baseUrl = config.baseUrl || 'https://api.figma.com';
    this.logger = config.logger || defaultLogger;
    this.timeout = config.timeout || 30000;

    // Initialize fetch adapter
    if (config.fetchAdapter) {
      this.fetchAdapter = config.fetchAdapter;
    } else if (config.proxy?.url || process.env.HTTP_PROXY) {
      // Use undici for proxy support
      this.fetchAdapter = new UndiciFetchAdapter(config.proxy);
    } else {
      // Use native fetch by default
      this.fetchAdapter = new NativeFetchAdapter();
    }

    // Initialize optional utilities
    this.rateLimiter = config.rateLimiter !== null && config.rateLimiter !== undefined
      ? new RateLimiter(config.rateLimiter)
      : null;

    this.cache = config.cache !== null && config.cache !== undefined
      ? new RequestCache(config.cache)
      : null;

    this.retryHandler = new RetryHandler(config.retry);

    // Initialize stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      retries: 0,
      avgResponseTime: 0,
      lastRequestTime: null,
    };
  }

  /**
   * Make HTTP request to Figma API
   */
  async request<T = any>(path: string, options: Partial<FetchRequest> = {}): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';

    // Update stats
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date().toISOString();

    try {
      // Check rate limits
      if (this.rateLimiter) {
        await this.rateLimiter.checkLimit();
      }

      // Check cache for GET requests
      if (method === 'GET' && this.cache) {
        const cached = this.cache.get(url, options);
        if (cached !== null) {
          this.stats.cachedResponses++;
          this.logger.debug(`Cache hit for ${method} ${path}`);
          return cached;
        }
      }

      // Prepare request
      let request: FetchRequest = {
        url,
        method,
        headers: {
          'X-Figma-Token': this.apiToken,
          'Content-Type': 'application/json',
          'User-Agent': 'figma-api-fetch/1.0.0',
          'Accept': 'application/json',
          ...options.headers,
        },
        body: options.body,
        timeout: this.timeout,
      };

      // Apply request interceptors
      for (const interceptor of this.requestInterceptors) {
        request = await interceptor(request);
      }

      // Execute request with retry logic
      const response = await this.retryHandler.execute<FetchResponse<T>>(
        async () => {
          const res = await this.fetchAdapter.fetch<T>(request);

          // Check for HTTP errors
          if (!res.ok) {
            throw createErrorFromResponse({
              status: res.status,
              statusText: res.statusText,
              data: res.data,
              headers: res.headers,
              url,
            });
          }

          return res;
        },
        (attempt, delay, error) => {
          this.stats.retries++;
          this.logger.debug(
            `Retrying request after ${delay}ms (attempt ${attempt + 1}/${this.retryHandler.getConfig().maxRetries})`,
            { error: error.message }
          );
        }
      );

      // Apply response interceptors
      let finalResponse = response;
      for (const interceptor of this.responseInterceptors) {
        finalResponse = await interceptor(finalResponse);
      }

      // Cache successful GET responses
      if (method === 'GET' && this.cache) {
        this.cache.set(url, finalResponse.data, options);
      }

      // Update stats
      this.stats.successfulRequests++;
      this.updateResponseTime(startTime);

      this.logger.debug(`Request successful: ${method} ${path}`);
      return finalResponse.data;

    } catch (error: any) {
      this.stats.failedRequests++;
      this.updateResponseTime(startTime);

      this.logger.error(`Request failed: ${method} ${path}`, {
        error: error.message,
        duration: Date.now() - startTime,
      });

      // Apply error interceptors
      for (const interceptor of this.errorInterceptors) {
        await interceptor(error);
      }

      throw error;
    }
  }

  /**
   * Make GET request with query parameters
   */
  async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    const searchParams = new URLSearchParams();

    // Add non-null/undefined parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;

    return this.request<T>(fullPath, { method: 'GET' });
  }

  /**
   * Make POST request with JSON body
   */
  async post<T = any>(path: string, data: any = {}): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make PUT request with JSON body
   */
  async put<T = any>(path: string, data: any = {}): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make PATCH request with JSON body
   */
  async patch<T = any>(path: string, data: any = {}): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make DELETE request
   */
  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.get('/v1/me');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get client statistics
   */
  getStats(): ClientStats & {
    rateLimiter?: any;
    cache?: any;
  } {
    const stats: any = { ...this.stats };

    if (this.rateLimiter) {
      stats.rateLimiter = this.rateLimiter.getStats();
    }

    if (this.cache) {
      stats.cache = this.cache.getStats();
    }

    return stats;
  }

  /**
   * Reset client statistics and cache
   */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      retries: 0,
      avgResponseTime: 0,
      lastRequestTime: null,
    };

    if (this.cache) {
      this.cache.clear();
    }

    if (this.rateLimiter) {
      this.rateLimiter.reset();
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Update average response time
   */
  private updateResponseTime(startTime: number): void {
    const duration = Date.now() - startTime;
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;

    if (totalRequests === 1) {
      this.stats.avgResponseTime = duration;
    } else {
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * (totalRequests - 1) + duration) / totalRequests;
    }
  }
}

export default FigmaApiClient;
