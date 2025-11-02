/**
 * Error classes for figma-library-analytics
 * Provides specific error types for library analytics operations
 */

/**
 * Base error class for library analytics operations
 * @extends Error
 */
export class LibraryAnalyticsError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
  }
}

/**
 * Error thrown when library analytics rate limits are exceeded
 * @extends LibraryAnalyticsError
 */
export class LibraryAnalyticsRateLimitError extends LibraryAnalyticsError {
  constructor(retryAfter) {
    super('Library Analytics API rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

/**
 * Error thrown when library analytics authentication fails
 * @extends LibraryAnalyticsError
 */
export class LibraryAnalyticsAuthError extends LibraryAnalyticsError {
  constructor() {
    super('Library Analytics authentication failed - requires library_analytics:read scope', 'AUTH_FAILED');
  }
}

/**
 * Error thrown when library analytics validation fails
 * @extends LibraryAnalyticsError
 */
export class LibraryAnalyticsValidationError extends LibraryAnalyticsError {
  constructor(field, value) {
    super(`Invalid library analytics ${field}: ${value}`, 'VALIDATION_ERROR', { field, value });
  }
}
