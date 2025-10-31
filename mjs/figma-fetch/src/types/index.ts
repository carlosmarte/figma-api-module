/**
 * TypeScript type definitions for figma-fetch module
 */

/**
 * HTTP methods supported by the fetch adapter
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request headers as key-value pairs
 */
export interface Headers {
  [key: string]: string;
}

/**
 * Request options for fetch adapter
 */
export interface FetchRequest {
  url: string;
  method?: HttpMethod;
  headers?: Headers;
  body?: string | FormData | Blob | ArrayBuffer;
  signal?: AbortSignal;
  timeout?: number;
  [key: string]: any; // Allow additional options for specific adapters
}

/**
 * Response from fetch adapter
 */
export interface FetchResponse<T = any> {
  status: number;
  statusText: string;
  headers: Headers;
  data: T;
  ok: boolean;
}

/**
 * Logger interface for debugging and monitoring
 */
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  requestsPerMinute?: number;
  burstLimit?: number;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  requestsLastMinute: number;
  remainingRequests: number;
  burstTokensRemaining: number;
  resetTime: number;
}

/**
 * Request cache configuration
 */
export interface CacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitterFactor?: number;
  retryableStatuses?: number[];
}

/**
 * Retry context for retry handler
 */
export interface RetryContext {
  attempt: number;
  error: Error;
  request: FetchRequest;
  response?: FetchResponse;
}

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  url?: string;
  token?: string;
  enabled?: boolean;
}

/**
 * Figma API client configuration
 */
export interface FigmaApiClientConfig {
  apiToken?: string;
  baseUrl?: string;
  logger?: Logger;
  timeout?: number;
  rateLimiter?: RateLimiterConfig | null;
  cache?: CacheConfig | null;
  retry?: RetryConfig;
  proxy?: ProxyConfig;
  fetchAdapter?: any; // Will be typed as FetchAdapter in implementation
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (request: FetchRequest) => Promise<FetchRequest> | FetchRequest;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = (response: FetchResponse) => Promise<FetchResponse> | FetchResponse;

/**
 * Error interceptor function
 */
export type ErrorInterceptor = (error: Error) => Promise<never> | never;

/**
 * Client statistics
 */
export interface ClientStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedResponses: number;
  retries: number;
  avgResponseTime: number;
  lastRequestTime: string | null;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  error?: string;
}

/**
 * Figma API error metadata
 */
export interface FigmaErrorMeta {
  status?: number;
  statusText?: string;
  url?: string;
  headers?: Headers;
  [key: string]: any;
}

/**
 * Error codes for Figma API errors
 */
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
