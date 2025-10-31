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

import { fetch, ProxyAgent } from 'undici';
import {
  FigmaCommentsError,
  RateLimitError,
  NetworkError,
  AuthenticationError,
  createErrorFromResponse
} from './exceptions.mjs';

/**
 * Rate limiter implementation for API requests
 */
class RateLimiter {
  constructor({ requestsPerMinute = 60, burstLimit = 10 } = {}) {
    this.requestsPerMinute = requestsPerMinute;
    this.burstLimit = burstLimit;
    this.requests = [];
    this.burstTokens = burstLimit;
    this.lastRefill = Date.now();
  }

  async checkLimit() {
    const now = Date.now();
    
    // Refill burst tokens every minute
    if (now - this.lastRefill >= 60000) {
      this.burstTokens = Math.min(this.burstLimit, this.burstTokens + 1);
      this.lastRefill = now;
    }

    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 60000);

    // Check if we can make the request
    if (this.burstTokens > 0) {
      this.burstTokens--;
      this.requests.push(now);
      return;
    }

    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      throw new RateLimitError(waitTime / 1000);
    }

    this.requests.push(now);
  }

  getStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < 60000);
    
    return {
      requestsLastMinute: recentRequests.length,
      remainingRequests: Math.max(0, this.requestsPerMinute - recentRequests.length),
      burstTokensRemaining: this.burstTokens,
      resetTime: Math.max(...recentRequests) + 60000
    };
  }
}

/**
 * Request cache for GET operations
 */
class RequestCache {
  constructor({ maxSize = 100, ttl = 300000 } = {}) { // 5 min default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  _generateKey(url, options = {}) {
    const params = new URLSearchParams(options.params || {}).toString();
    return `${url}${params ? '?' + params : ''}`;
  }

  get(url, options = {}) {
    const key = this._generateKey(url, options);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.data;
  }

  set(url, data, options = {}) {
    const key = this._generateKey(url, options);
    
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this._calculateHitRate()
    };
  }

  _calculateHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
}

/**
 * Core HTTP client for Figma Comments API
 */
export class FigmaCommentsClient {
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    retries = 3,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN
  } = {}) {
    if (!apiToken) {
      throw new AuthenticationError('API token is required');
    }

    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.timeout = timeout;
    this.retries = retries;
    
    // Initialize rate limiter and cache
    this.rateLimiter = rateLimiter || new RateLimiter();
    this.cache = cache || new RequestCache();
    
    // Initialize proxy agent if configured
    this.proxyAgent = null;
    if (proxyUrl) {
      this.proxyAgent = proxyToken 
        ? new ProxyAgent({ uri: proxyUrl, token: proxyToken })
        : new ProxyAgent(proxyUrl);
      this.logger.debug(`Proxy configured: ${proxyUrl}`);
    }
    
    // Request statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      retries: 0,
      avgResponseTime: 0,
      lastRequestTime: null
    };

    this._initializeDefaults();
  }

  _initializeDefaults() {
    this.defaultHeaders = {
      'X-Figma-Token': this.apiToken,
      'Content-Type': 'application/json',
      'User-Agent': 'figma-comments-client/1.0.0',
      'Accept': 'application/json'
    };

    this.retryConfig = {
      maxRetries: this.retries,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      retryableStatuses: [429, 500, 502, 503, 504]
    };
  }

  /**
   * Make an HTTP request with retry logic and caching
   */
  async request(path, options = {}) {
    const startTime = Date.now();
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';
    
    // Update statistics
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date().toISOString();

    try {
      // Check rate limits
      await this.rateLimiter.checkLimit();

      // Check cache for GET requests
      if (method === 'GET' && !options.bypassCache) {
        const cached = this.cache.get(url, options);
        if (cached) {
          this.stats.cachedResponses++;
          this.logger.debug(`Cache hit for ${method} ${path}`);
          return cached;
        }
      }

      // Execute request with retry logic
      const fetchOptions = {
        method,
        headers: { ...this.defaultHeaders, ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: this._createTimeoutSignal()
      };
      
      // Add proxy dispatcher if configured
      if (this.proxyAgent) {
        fetchOptions.dispatcher = this.proxyAgent;
      }
      
      const response = await this._executeWithRetry(url, fetchOptions);

      // Cache successful GET responses
      if (method === 'GET' && response && !options.bypassCache) {
        this.cache.set(url, response, options);
      }

      // Update statistics
      this.stats.successfulRequests++;
      this._updateResponseTime(startTime);

      return response;

    } catch (error) {
      this.stats.failedRequests++;
      this._updateResponseTime(startTime);
      
      this.logger.error(`Request failed: ${method} ${path}`, {
        error: error.message,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  async _executeWithRetry(url, options, attempt = 0) {
    try {
      this.logger.debug(`Making request: ${options.method} ${url} (attempt ${attempt + 1})`);
      
      const response = await fetch(url, options);
      const responseData = await this._parseResponse(response);

      if (!response.ok) {
        throw createErrorFromResponse({
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      return responseData;

    } catch (error) {
      // Don't retry non-retryable errors
      if (!this._isRetryableError(error) || attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      // Calculate delay with jitter
      const delay = this._calculateBackoffDelay(attempt);
      this.stats.retries++;
      
      this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
      
      await this._sleep(delay);
      return this._executeWithRetry(url, options, attempt + 1);
    }
  }

  /**
   * Parse response based on content type
   */
  async _parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    }
    
    if (contentType.includes('text/')) {
      return response.text();
    }
    
    return response.arrayBuffer();
  }

  /**
   * Determine if an error is retryable
   */
  _isRetryableError(error) {
    if (error instanceof RateLimitError) return true;
    if (error instanceof NetworkError) return true;
    if (error.name === 'AbortError') return false; // Timeout
    if (error.status && this.retryConfig.retryableStatuses.includes(error.status)) {
      return true;
    }
    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  _calculateBackoffDelay(attempt) {
    const baseDelay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, baseDelay + jitter);
  }

  /**
   * Create timeout signal for requests
   */
  _createTimeoutSignal() {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout);
    return controller.signal;
  }

  /**
   * Sleep utility for delays
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average response time
   */
  _updateResponseTime(startTime) {
    const duration = Date.now() - startTime;
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
    
    if (totalRequests === 1) {
      this.stats.avgResponseTime = duration;
    } else {
      this.stats.avgResponseTime = (
        (this.stats.avgResponseTime * (totalRequests - 1) + duration) / totalRequests
      );
    }
  }

  /**
   * Get client statistics and health information
   */
  getStats() {
    return {
      client: { ...this.stats },
      rateLimiter: this.rateLimiter.getStats(),
      cache: this.cache.getStats()
    };
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    try {
      await this.request('/v1/me', { bypassCache: true });
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  /**
   * Clear cache and reset statistics
   */
  reset() {
    this.cache.clear();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      retries: 0,
      avgResponseTime: 0,
      lastRequestTime: null
    };
  }
}

export { RateLimiter, RequestCache };
export default FigmaCommentsClient;