/**
 * figma-fetch - Abstract fetch client for Figma API
 *
 * Main exports for the figma-fetch module
 */

// Core
export { FetchAdapter } from './core/FetchAdapter.js';

// Adapters
export { NativeFetchAdapter, UndiciFetchAdapter } from './adapters/index.js';

// Client
export { FigmaApiClient } from './client/index.js';

// Utilities
export { RateLimiter, RequestCache, RetryHandler } from './utils/index.js';

// Errors
export {
  FigmaFetchError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ServerError,
  createErrorFromResponse,
  isRetryableError,
} from './errors/index.js';

// Types
export type {
  HttpMethod,
  Headers,
  FetchRequest,
  FetchResponse,
  Logger,
  RateLimiterConfig,
  RateLimiterStats,
  CacheConfig,
  CacheStats,
  CacheEntry,
  RetryConfig,
  RetryContext,
  ProxyConfig,
  FigmaApiClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  ClientStats,
  HealthCheckResult,
  FigmaErrorMeta,
  ErrorCode,
} from './types/index.js';
