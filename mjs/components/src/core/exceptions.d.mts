/**
 * Type declarations for Figma API exceptions
 */

export class FigmaApiError extends Error {
  constructor(message: string, statusCode?: number, response?: any);
  statusCode?: number;
  response?: any;
}

export class RateLimitError extends FigmaApiError {}
export class AuthenticationError extends FigmaApiError {}
export class AuthorizationError extends FigmaApiError {}
export class TeamNotFoundError extends FigmaApiError {}
export class FileNotFoundError extends FigmaApiError {}
export class ComponentNotFoundError extends FigmaApiError {}
export class ComponentSetNotFoundError extends FigmaApiError {}
export class StyleNotFoundError extends FigmaApiError {}
export class ValidationError extends FigmaApiError {}
export class NetworkError extends FigmaApiError {}
export class HttpError extends FigmaApiError {}
export class ServerError extends FigmaApiError {}
export class TimeoutError extends FigmaApiError {}
export class PaginationError extends FigmaApiError {}
export class ScopeError extends FigmaApiError {}

export function createErrorFromResponse(response: any, url: string, body?: any): FigmaApiError;
export function isRetryableError(error: Error): boolean;

export default {
  FigmaApiError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  TeamNotFoundError,
  FileNotFoundError,
  ComponentNotFoundError,
  ComponentSetNotFoundError,
  StyleNotFoundError,
  ValidationError,
  NetworkError,
  HttpError,
  ServerError,
  TimeoutError,
  PaginationError,
  ScopeError,
  createErrorFromResponse,
  isRetryableError
};
