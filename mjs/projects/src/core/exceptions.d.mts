/**
 * Type declarations for Figma Projects API exceptions
 */

export class FigmaProjectsError extends Error {
  constructor(message: string, code?: string, statusCode?: number, meta?: any);
  code?: string;
  statusCode?: number;
  meta?: any;
}

export class AuthenticationError extends FigmaProjectsError {}
export class RateLimitError extends FigmaProjectsError {
  retryAfter?: number;
}
export class NetworkError extends FigmaProjectsError {}
export class ValidationError extends FigmaProjectsError {}
export class NotFoundError extends FigmaProjectsError {
  resourceType?: string;
  resourceId?: string;
}
export class PermissionError extends FigmaProjectsError {}
export class HttpError extends FigmaProjectsError {}
export class ConfigurationError extends FigmaProjectsError {}
export class TimeoutError extends FigmaProjectsError {}

export function createErrorFromResponse(response: any, url: string, responseData?: any): FigmaProjectsError;
export function isRetryableError(error: Error): boolean;
export function getRetryDelay(error: Error, attempt: number): number;
