/**
 * Retry handler utility for failed requests
 * Implements exponential backoff with jitter
 */

import { RetryConfig, RetryContext } from '../types/index.js';
import { isRetryableError } from '../errors/index.js';

/**
 * RetryHandler class
 * Handles retry logic with exponential backoff and jitter
 */
export class RetryHandler {
  private readonly maxRetries: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffFactor: number;
  private readonly jitterFactor: number;
  private readonly retryableStatuses: number[];

  constructor(config: RetryConfig = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.initialDelay = config.initialDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.backoffFactor = config.backoffFactor || 2;
    this.jitterFactor = config.jitterFactor || 0.1;
    this.retryableStatuses = config.retryableStatuses || [429, 500, 502, 503, 504];
  }

  /**
   * Calculate delay for retry attempt with exponential backoff and jitter
   */
  calculateDelay(attempt: number): number {
    // Calculate exponential backoff
    const baseDelay = Math.min(
      this.initialDelay * Math.pow(this.backoffFactor, attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = baseDelay * this.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, Math.floor(baseDelay + jitter));
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(context: RetryContext): boolean {
    const { attempt, error, response } = context;

    // Check if max retries exceeded
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Check if error is retryable using our error detection
    if (isRetryableError(error)) {
      return true;
    }

    // Check if response status is retryable
    if (response && this.retryableStatuses.includes(response.status)) {
      return true;
    }

    return false;
  }

  /**
   * Execute function with retry logic
   * @param fn - Async function to execute
   * @param onRetry - Optional callback called before each retry
   * @returns Promise resolving to function result
   */
  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delay: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        const context: RetryContext = {
          attempt,
          error,
          request: {} as any, // Request context can be added if needed
        };

        if (!this.shouldRetry(context)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);

        if (onRetry) {
          onRetry(attempt, delay, error);
        }

        await this.sleep(delay);
        attempt++;
      }
    }

    throw lastError!;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration
   */
  getConfig(): RetryConfig {
    return {
      maxRetries: this.maxRetries,
      initialDelay: this.initialDelay,
      maxDelay: this.maxDelay,
      backoffFactor: this.backoffFactor,
      jitterFactor: this.jitterFactor,
      retryableStatuses: [...this.retryableStatuses],
    };
  }
}

export default RetryHandler;
