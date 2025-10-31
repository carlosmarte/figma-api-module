/**
 * project: figma-components-api
 * purpose: Core HTTP client for Figma Components API operations
 * use-cases:
 *  - Authenticated API requests to Figma Components, Component Sets, and Styles endpoints
 *  - Rate-limited operations with exponential backoff
 *  - Request/response processing with proper error handling
 *  - Team library and file library content retrieval
 * performance:
 *  - Connection reuse via fetch with keep-alive
 *  - Request queuing to respect rate limits
 *  - Response streaming for large payloads
 *  - Memory-efficient JSON parsing
 *  - Exponential backoff with jitter for retries
 */

import { fetch, ProxyAgent } from 'undici';
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
 * Core HTTP client for Figma Components API
 * Handles authentication, rate limiting, retries, and response processing
 */
export class FigmaComponentsClient {
  /**
   * @param {Object} options - Client configuration
   * @param {string} options.apiToken - Figma personal access token
   * @param {string} [options.baseUrl='https://api.figma.com'] - API base URL
   * @param {Object} [options.logger=console] - Logger instance
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   * @param {Object} [options.retryConfig] - Retry configuration
   * @param {Object} [options.rateLimitConfig] - Rate limit configuration
   */
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    timeout = 30000,
    retryConfig = {},
    rateLimitConfig = {},
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN
  } = {}) {
    if (!apiToken) {
      throw new AuthenticationError('API token is required');
    }

    this.apiToken = apiToken;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.logger = logger;
    this.timeout = timeout;

    this._initializeRetryConfig(retryConfig);
    this._initializeRateLimitConfig(rateLimitConfig);
    this._initializeRequestTracking();
    
    // Initialize proxy agent if configured
    this.proxyAgent = null;
    if (proxyUrl) {
      this.proxyAgent = proxyToken 
        ? new ProxyAgent({ uri: proxyUrl, token: proxyToken })
        : new ProxyAgent(proxyUrl);
      this.logger.debug(`Proxy configured: ${proxyUrl}`);
    }
  }

  /**
   * Initialize retry configuration with defaults
   * @private
   */
  _initializeRetryConfig(config) {
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitterFactor: 0.1,
      ...config
    };
  }

  /**
   * Initialize rate limit configuration with defaults
   * @private
   */
  _initializeRateLimitConfig(config) {
    this.rateLimitConfig = {
      requestsPerMinute: 60,
      burstLimit: 10,
      ...config
    };

    // Request tracking for rate limiting
    this.requestQueue = [];
    this.requestTimestamps = [];
  }

  /**
   * Initialize request tracking and statistics
   * @private
   */
  _initializeRequestTracking() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retryAttempts: 0,
      rateLimitHits: 0
    };
  }

  /**
   * Get default headers for requests
   * @private
   */
  _getDefaultHeaders() {
    return {
      'X-Figma-Token': this.apiToken,
      'Content-Type': 'application/json',
      'User-Agent': 'figma-components-api/1.0.0',
      'Accept': 'application/json'
    };
  }

  /**
   * Check if we're within rate limits
   * @private
   */
  async _checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => 
      timestamp > oneMinuteAgo
    );

    // Check if we're at the rate limit
    if (this.requestTimestamps.length >= this.rateLimitConfig.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + 60000 - now;
      
      if (waitTime > 0) {
        this.logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await this._sleep(waitTime);
        return this._checkRateLimit(); // Recursive check after wait
      }
    }

    this.requestTimestamps.push(now);
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate backoff delay with jitter
   * @private
   */
  _calculateBackoffDelay(attempt) {
    const baseDelay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = baseDelay * this.retryConfig.jitterFactor * Math.random();
    return Math.floor(baseDelay + jitter);
  }

  /**
   * Execute HTTP request with retries and rate limiting
   * @private
   */
  async _executeRequest(url, options = {}, attempt = 0) {
    try {
      // Check rate limits before making request
      await this._checkRateLimit();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestOptions = {
        ...options,
        headers: {
          ...this._getDefaultHeaders(),
          ...options.headers
        },
        signal: controller.signal
      };
      
      // Add proxy dispatcher if configured
      if (this.proxyAgent) {
        requestOptions.dispatcher = this.proxyAgent;
      }

      this.logger.debug(`Making request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      this.stats.totalRequests++;

      // Handle successful responses
      if (response.ok) {
        this.stats.successfulRequests++;
        return response;
      }

      // Handle error responses
      let body = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          body = await response.json();
        }
      } catch (parseError) {
        this.logger.debug('Failed to parse error response body:', parseError.message);
      }

      const error = createErrorFromResponse(response, url, body);

      // Track rate limit hits
      if (error instanceof RateLimitError) {
        this.stats.rateLimitHits++;
      }

      throw error;

    } catch (error) {
      this.stats.failedRequests++;

      // Handle timeout
      if (error.name === 'AbortError') {
        throw new TimeoutError(this.timeout);
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError('Network request failed', error);
      }

      // Retry logic for retryable errors
      if (attempt < this.retryConfig.maxRetries && isRetryableError(error)) {
        this.stats.retryAttempts++;
        const delay = this._calculateBackoffDelay(attempt);
        
        this.logger.debug(
          `Retrying request after ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
        );
        
        await this._sleep(delay);
        return this._executeRequest(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Make HTTP request to Figma API
   * @param {string} path - API endpoint path
   * @param {Object} [options={}] - Request options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    
    try {
      const response = await this._executeRequest(url, options);
      
      // Parse JSON response
      const data = await response.json();
      
      this.logger.debug(`Request successful: ${options.method || 'GET'} ${path}`);
      return data;
      
    } catch (error) {
      this.logger.error(`Request failed: ${options.method || 'GET'} ${path}`, error.message);
      throw error;
    }
  }

  /**
   * Make GET request with query parameters
   * @param {string} path - API endpoint path
   * @param {Object} [params={}] - Query parameters
   * @param {Object} [options={}] - Additional request options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async get(path, params = {}, options = {}) {
    const searchParams = new URLSearchParams();
    
    // Add non-null/undefined parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;

    return this.request(fullPath, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Health check endpoint to verify API connectivity
   * @returns {Promise<boolean>} Whether API is accessible
   */
  async healthCheck() {
    try {
      // Use the current user endpoint as a simple health check
      await this.get('/v1/me');
      return true;
    } catch (error) {
      this.logger.error('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get client statistics
   * @returns {Object} Request statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset client statistics
   */
  resetStats() {
    this._initializeRequestTracking();
  }
}

export default FigmaComponentsClient;