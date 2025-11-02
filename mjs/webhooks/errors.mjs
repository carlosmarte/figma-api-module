/**
 * Error classes for figma-webhooks
 * Custom error types for webhook operations
 */

/**
 * Base error class for all webhook operations
 */
export class WebhookError extends Error {
  constructor(message, { code, meta } = {}) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication or authorization error
 * Thrown when API token is invalid or lacks required permissions
 */
export class WebhookAuthError extends WebhookError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'WebhookAuthError';
  }
}

/**
 * Validation error
 * Thrown when webhook configuration or parameters are invalid
 */
export class WebhookValidationError extends WebhookError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'WebhookValidationError';
  }
}

/**
 * Rate limit error
 * Thrown when Figma API rate limit is exceeded
 */
export class WebhookRateLimitError extends WebhookError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'WebhookRateLimitError';
  }
}
