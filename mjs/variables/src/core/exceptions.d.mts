/**
 * Type declarations for Figma Variables API exceptions
 */

export class BaseError extends Error {
  constructor(message: string, code?: string, meta?: any);
  code?: string;
  meta?: any;
}

export class ApiError extends BaseError {}
export class ValidationError extends BaseError {}
export class AuthenticationError extends BaseError {}
export class EnterpriseAccessError extends BaseError {}
export class ScopeError extends BaseError {}
export class RateLimitError extends BaseError {
  retryAfter?: number;
}
export class NetworkError extends BaseError {}
export class TimeoutError extends BaseError {}
export class NotFoundError extends BaseError {}
export class ConfigurationError extends BaseError {}
export class VariableError extends BaseError {}
export class CollectionError extends BaseError {}
export class VariableLimitError extends BaseError {}
export class ModeLimitError extends BaseError {}
export class AliasError extends BaseError {}
