/**
 * Rate limiter utility for API requests
 * Implements token bucket algorithm with burst support
 */

import { RateLimiterConfig, RateLimiterStats } from '../types/index.js';
import { RateLimitError } from '../errors/index.js';

/**
 * RateLimiter class
 * Controls the rate of API requests with configurable limits and burst support
 */
export class RateLimiter {
  private readonly requestsPerMinute: number;
  private readonly burstLimit: number;
  private requests: number[] = [];
  private burstTokens: number;
  private lastRefill: number;

  constructor(config: RateLimiterConfig = {}) {
    this.requestsPerMinute = config.requestsPerMinute || 60;
    this.burstLimit = config.burstLimit || 10;
    this.burstTokens = this.burstLimit;
    this.lastRefill = Date.now();
  }

  /**
   * Check if request can be made, and wait if necessary
   * Throws RateLimitError if rate limit is exceeded
   */
  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Refill burst tokens every minute
    if (now - this.lastRefill >= 60000) {
      this.burstTokens = Math.min(this.burstLimit, this.burstTokens + 1);
      this.lastRefill = now;
    }

    // Clean old requests (older than 1 minute)
    this.requests = this.requests.filter(time => now - time < 60000);

    // Try to use burst token first
    if (this.burstTokens > 0) {
      this.burstTokens--;
      this.requests.push(now);
      return;
    }

    // Check if we're at the rate limit
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      throw new RateLimitError(waitTime / 1000);
    }

    // Allow the request
    this.requests.push(now);
  }

  /**
   * Get current rate limiter statistics
   */
  getStats(): RateLimiterStats {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < 60000);

    return {
      requestsLastMinute: recentRequests.length,
      remainingRequests: Math.max(0, this.requestsPerMinute - recentRequests.length),
      burstTokensRemaining: this.burstTokens,
      resetTime: recentRequests.length > 0 ? Math.max(...recentRequests) + 60000 : now + 60000,
    };
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.requests = [];
    this.burstTokens = this.burstLimit;
    this.lastRefill = Date.now();
  }
}

export default RateLimiter;
