/**
 * Custom error classes for Figma Files API
 * Provides structured error handling with context and metadata
 */

/**
 * Base API error class for all Figma API related errors
 */
export class FigmaApiError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Rate limit exceeded error
 * Thrown when API rate limits are hit
 */
export class RateLimitError extends FigmaApiError {
  constructor(retryAfter = null, requestId = null) {
    const message = retryAfter 
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded';
    
    super(message, 'RATE_LIMIT_EXCEEDED', { 
      retryAfter, 
      requestId,
      retryable: true 
    });
    this.retryAfter = retryAfter;
  }
}

/**
 * Authentication error
 * Thrown when API token is invalid or missing
 */
export class AuthenticationError extends FigmaApiError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTHENTICATION_FAILED', { retryable: false });
  }
}

/**
 * Authorization error
 * Thrown when user doesn't have permission to access resource
 */
export class AuthorizationError extends FigmaApiError {
  constructor(message = 'Insufficient permissions', requiredScopes = []) {
    super(message, 'AUTHORIZATION_FAILED', { 
      requiredScopes,
      retryable: false 
    });
  }
}

/**
 * File not found error
 * Thrown when file_key doesn't exist or isn't accessible
 */
export class FileNotFoundError extends FigmaApiError {
  constructor(fileKey) {
    super(`File not found: ${fileKey}`, 'FILE_NOT_FOUND', { 
      fileKey,
      retryable: false 
    });
  }
}

/**
 * Node not found error
 * Thrown when node IDs don't exist in the file
 */
export class NodeNotFoundError extends FigmaApiError {
  constructor(nodeIds, fileKey) {
    const ids = Array.isArray(nodeIds) ? nodeIds.join(', ') : nodeIds;
    super(`Nodes not found: ${ids}`, 'NODES_NOT_FOUND', { 
      nodeIds,
      fileKey,
      retryable: false 
    });
  }
}

/**
 * Validation error
 * Thrown when request parameters are invalid
 */
export class ValidationError extends FigmaApiError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { 
      field,
      value,
      retryable: false 
    });
  }
}

/**
 * Network error
 * Thrown when network requests fail
 */
export class NetworkError extends FigmaApiError {
  constructor(message, originalError = null) {
    super(message, 'NETWORK_ERROR', { 
      originalError: originalError?.message,
      retryable: true 
    });
    this.originalError = originalError;
  }
}

/**
 * HTTP error
 * Thrown for various HTTP status codes
 */
export class HttpError extends FigmaApiError {
  constructor(status, statusText, url, body = null) {
    super(`HTTP ${status}: ${statusText}`, 'HTTP_ERROR', {
      status,
      statusText,
      url,
      body,
      retryable: status >= 500 || status === 429
    });
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/**
 * Server error
 * Thrown for 5xx status codes
 */
export class ServerError extends FigmaApiError {
  constructor(message = 'Internal server error', requestId = null) {
    super(message, 'SERVER_ERROR', { 
      requestId,
      retryable: true 
    });
  }
}

/**
 * Timeout error
 * Thrown when requests exceed timeout threshold
 */
export class TimeoutError extends FigmaApiError {
  constructor(timeout) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT', { 
      timeout,
      retryable: true 
    });
  }
}

/**
 * Utility function to create appropriate error from HTTP response
 * @param {Response} response - Fetch API response
 * @param {string} url - Request URL
 * @param {Object} body - Parsed response body
 * @returns {FigmaApiError} Appropriate error instance
 */
export function createErrorFromResponse(response, url, body = null) {
  const { status, statusText } = response;
  const requestId = response.headers.get('x-request-id');

  switch (status) {
    case 401:
      return new AuthenticationError(body?.message || 'Invalid API token');
    
    case 403:
      return new AuthorizationError(
        body?.message || 'Insufficient permissions',
        body?.requiredScopes
      );
    
    case 404:
      // Try to determine if it's a file or node error from URL
      const fileKeyMatch = url.match(/\/files\/([^\/]+)/);
      if (fileKeyMatch) {
        return new FileNotFoundError(fileKeyMatch[1]);
      }
      return new FigmaApiError('Resource not found', 'NOT_FOUND', { status, url });
    
    case 429:
      const retryAfter = response.headers.get('retry-after');
      return new RateLimitError(retryAfter ? parseInt(retryAfter) : null, requestId);
    
    case 400:
      return new ValidationError(body?.message || 'Bad request', null, body);
    
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(body?.message || 'Server error', requestId);
    
    default:
      return new HttpError(status, statusText, url, body);
  }
}

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} Whether the error is retryable
 */
export function isRetryableError(error) {
  if (error instanceof FigmaApiError) {
    return error.meta.retryable || false;
  }
  
  // Network errors are generally retryable
  if (error instanceof NetworkError || error.code === 'NETWORK_ERROR') {
    return true;
  }
  
  return false;
}

export default {
  FigmaApiError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  FileNotFoundError,
  NodeNotFoundError,
  ValidationError,
  NetworkError,
  HttpError,
  ServerError,
  TimeoutError,
  createErrorFromResponse,
  isRetryableError
};