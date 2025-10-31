/**
 * Error classes for figma-fetch module
 */

import { ErrorCode, FigmaErrorMeta } from '../types/index.js';

/**
 * Base error class for all Figma API errors
 */
export class FigmaFetchError extends Error {
  public readonly code: ErrorCode;
  public readonly meta: FigmaErrorMeta;

  constructor(message: string, code: ErrorCode = ErrorCode.UNKNOWN_ERROR, meta: FigmaErrorMeta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      meta: this.meta,
      stack: this.stack,
    };
  }
}

/**
 * Network error - connection failures, DNS errors, etc.
 */
export class NetworkError extends FigmaFetchError {
  constructor(message: string = 'Network request failed', cause?: Error) {
    super(message, ErrorCode.NETWORK_ERROR, { cause });
  }
}

/**
 * Timeout error - request exceeded timeout limit
 */
export class TimeoutError extends FigmaFetchError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, ErrorCode.TIMEOUT_ERROR, { timeout });
  }
}

/**
 * Rate limit error - API rate limit exceeded
 */
export class RateLimitError extends FigmaFetchError {
  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      ErrorCode.RATE_LIMIT_ERROR,
      { retryAfter }
    );
  }
}

/**
 * Authentication error - invalid or missing API token
 */
export class AuthenticationError extends FigmaFetchError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorCode.AUTH_ERROR);
  }
}

/**
 * Validation error - invalid request parameters
 */
export class ValidationError extends FigmaFetchError {
  constructor(message: string, field?: string) {
    super(message, ErrorCode.VALIDATION_ERROR, { field });
  }
}

/**
 * Not found error - resource not found (404)
 */
export class NotFoundError extends FigmaFetchError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, ErrorCode.NOT_FOUND, { resource });
  }
}

/**
 * Server error - 5xx errors from API
 */
export class ServerError extends FigmaFetchError {
  constructor(message: string, status: number) {
    super(message, ErrorCode.SERVER_ERROR, { status });
  }
}

/**
 * Create appropriate error from HTTP response
 */
export function createErrorFromResponse(response: {
  status: number;
  statusText: string;
  data?: any;
  headers?: Record<string, string>;
  url?: string;
}): FigmaFetchError {
  const { status, statusText, data, headers, url } = response;

  const meta: FigmaErrorMeta = {
    status,
    statusText,
    url,
    headers,
    data,
  };

  // Rate limit error
  if (status === 429) {
    const retryAfter = headers?.['retry-after']
      ? parseInt(headers['retry-after'])
      : 60;
    return new RateLimitError(retryAfter);
  }

  // Authentication errors
  if (status === 401 || status === 403) {
    const message = data?.message || data?.error || 'Authentication failed';
    return new AuthenticationError(message);
  }

  // Not found
  if (status === 404) {
    const resource = url || 'unknown';
    return new NotFoundError(resource);
  }

  // Validation errors
  if (status === 400 || status === 422) {
    const message = data?.message || data?.error || 'Validation failed';
    return new ValidationError(message);
  }

  // Server errors (5xx)
  if (status >= 500) {
    const message = data?.message || data?.error || `Server error: ${statusText}`;
    return new ServerError(message, status);
  }

  // Generic error for other status codes
  const message = data?.message || data?.error || `HTTP ${status}: ${statusText}`;
  return new FigmaFetchError(message, ErrorCode.UNKNOWN_ERROR, meta);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof ServerError) return true;
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return false; // Don't retry timeouts by default

  return false;
}
