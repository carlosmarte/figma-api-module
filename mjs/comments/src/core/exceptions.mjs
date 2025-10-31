/**
 * project: figma-comments
 * purpose: Structured error classes for Figma Comments API operations
 * use-cases:
 *  - API error handling with context
 *  - Rate limiting and retry management
 *  - Authentication and authorization failures
 * performance:
 *  - Fast error creation with minimal overhead
 *  - Structured metadata for debugging
 *  - Error categorization for proper handling
 */

/**
 * Base error class for all Figma Comments API errors
 */
export class FigmaCommentsError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      meta: this.meta,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * API request/response related errors
 */
export class ApiError extends FigmaCommentsError {
  constructor(message, status, response = null, meta = {}) {
    super(message, 'API_ERROR', { status, response, ...meta });
    this.status = status;
    this.response = response;
  }
}

/**
 * Rate limiting specific errors
 */
export class RateLimitError extends FigmaCommentsError {
  constructor(retryAfter = null, meta = {}) {
    const message = retryAfter 
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded';
    super(message, 'RATE_LIMIT', { retryAfter, ...meta });
    this.retryAfter = retryAfter;
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends FigmaCommentsError {
  constructor(message = 'Authentication failed', meta = {}) {
    super(message, 'AUTH_ERROR', meta);
  }
}

export class AuthorizationError extends FigmaCommentsError {
  constructor(message = 'Access denied', meta = {}) {
    super(message, 'AUTHORIZATION_ERROR', meta);
  }
}

/**
 * Validation errors for request data
 */
export class ValidationError extends FigmaCommentsError {
  constructor(message, field = null, value = null, meta = {}) {
    super(message, 'VALIDATION_ERROR', { field, value, ...meta });
    this.field = field;
    this.value = value;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends FigmaCommentsError {
  constructor(resource, identifier = null, meta = {}) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', { resource, identifier, ...meta });
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Network and connectivity errors
 */
export class NetworkError extends FigmaCommentsError {
  constructor(message = 'Network error occurred', meta = {}) {
    super(message, 'NETWORK_ERROR', meta);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends FigmaCommentsError {
  constructor(message, setting = null, meta = {}) {
    super(message, 'CONFIG_ERROR', { setting, ...meta });
    this.setting = setting;
  }
}

/**
 * Comment-specific domain errors
 */
export class CommentError extends FigmaCommentsError {
  constructor(message, commentId = null, meta = {}) {
    super(message, 'COMMENT_ERROR', { commentId, ...meta });
    this.commentId = commentId;
  }
}

export class CommentPermissionError extends CommentError {
  constructor(action, commentId = null, meta = {}) {
    super(
      `Permission denied for action '${action}' on comment`,
      commentId,
      { action, ...meta }
    );
    this.action = action;
  }
}

export class CommentValidationError extends CommentError {
  constructor(message, field = null, commentId = null, meta = {}) {
    super(message, commentId, { field, ...meta });
    this.field = field;
  }
}

/**
 * File-specific errors
 */
export class FileError extends FigmaCommentsError {
  constructor(message, fileKey = null, meta = {}) {
    super(message, 'FILE_ERROR', { fileKey, ...meta });
    this.fileKey = fileKey;
  }
}

export class FileNotFoundError extends FileError {
  constructor(fileKey, meta = {}) {
    super(`Figma file not found`, fileKey, meta);
  }
}

export class FileAccessError extends FileError {
  constructor(fileKey, meta = {}) {
    super(`Access denied to Figma file`, fileKey, meta);
  }
}

/**
 * Utility function to create appropriate error from API response
 */
export function createErrorFromResponse(response, requestMeta = {}) {
  const { status, statusText, data } = response;

  // Extract error message from response
  let message = statusText || 'Unknown error';
  if (data?.err) {
    message = data.err;
  } else if (data?.error) {
    message = typeof data.error === 'string' ? data.error : data.error.message || message;
  } else if (data?.message) {
    message = data.message;
  }

  const meta = { requestMeta, responseData: data };

  switch (status) {
    case 400:
      return new ValidationError(message, null, null, meta);
    case 401:
      return new AuthenticationError(message, meta);
    case 403:
      return new AuthorizationError(message, meta);
    case 404:
      return new NotFoundError('Resource', null, meta);
    case 429:
      const retryAfter = response.headers?.['retry-after'];
      return new RateLimitError(retryAfter, meta);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ApiError(`Server error: ${message}`, status, response, meta);
    default:
      return new ApiError(message, status, response, meta);
  }
}

export default {
  FigmaCommentsError,
  ApiError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  NetworkError,
  ConfigurationError,
  CommentError,
  CommentPermissionError,
  CommentValidationError,
  FileError,
  FileNotFoundError,
  FileAccessError,
  createErrorFromResponse
};