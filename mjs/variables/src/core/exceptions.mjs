/**
 * Custom exception classes for figma-variables-sdk
 * Provides structured error handling with context
 */

export class BaseError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      meta: this.meta,
      timestamp: this.timestamp
    };
  }
}

export class ApiError extends BaseError {
  constructor(message, code = 'API_ERROR', meta = {}) {
    super(message, code, meta);
  }
}

export class ValidationError extends BaseError {
  constructor(message, field, value) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
  }
}

export class EnterpriseAccessError extends BaseError {
  constructor(message = 'This API is only available to full members of Enterprise organizations') {
    super(message, 'ENTERPRISE_ACCESS_ERROR');
  }
}

export class ScopeError extends BaseError {
  constructor(requiredScope, message = null) {
    const msg = message || `Missing required scope: ${requiredScope}`;
    super(msg, 'SCOPE_ERROR', { requiredScope });
  }
}

export class RateLimitError extends BaseError {
  constructor(retryAfter, limit = null) {
    super('Rate limit exceeded', 'RATE_LIMIT', { retryAfter, limit });
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends BaseError {
  constructor(message, originalError = null) {
    super(message, 'NETWORK_ERROR', { originalError: originalError?.message });
    this.originalError = originalError;
  }
}

export class TimeoutError extends BaseError {
  constructor(timeout, operation) {
    super(`Operation timed out after ${timeout}ms`, 'TIMEOUT', { timeout, operation });
  }
}

export class NotFoundError extends BaseError {
  constructor(resource, identifier) {
    super(`${resource} not found`, 'NOT_FOUND', { resource, identifier });
  }
}

export class ConfigurationError extends BaseError {
  constructor(message, config) {
    super(message, 'CONFIG_ERROR', { config });
  }
}

export class VariableError extends BaseError {
  constructor(message, variableId = null, operation = null) {
    super(message, 'VARIABLE_ERROR', { variableId, operation });
  }
}

export class CollectionError extends BaseError {
  constructor(message, collectionId = null, operation = null) {
    super(message, 'COLLECTION_ERROR', { collectionId, operation });
  }
}

export class VariableLimitError extends BaseError {
  constructor(limit, current) {
    super(`Variable limit exceeded: ${current}/${limit}`, 'VARIABLE_LIMIT_ERROR', { limit, current });
  }
}

export class ModeLimitError extends BaseError {
  constructor(limit = 40) {
    super(`Mode limit exceeded: maximum ${limit} modes per collection`, 'MODE_LIMIT_ERROR', { limit });
  }
}

export class AliasError extends BaseError {
  constructor(message, aliasId = null, targetId = null) {
    super(message, 'ALIAS_ERROR', { aliasId, targetId });
  }
}