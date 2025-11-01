/**
 * Type declarations for Figma Files API exceptions
 */

export class FigmaApiError extends Error {
  constructor(message: string, statusCode?: number, response?: any);
  statusCode?: number;
  response?: any;
}

export class RateLimitError extends FigmaApiError {}
export class AuthenticationError extends FigmaApiError {}
export class AuthorizationError extends FigmaApiError {}
export class FileNotFoundError extends FigmaApiError {}
export class NodeNotFoundError extends FigmaApiError {}
export class ValidationError extends FigmaApiError {}
export class NetworkError extends FigmaApiError {}
export class HttpError extends FigmaApiError {}
export class ServerError extends FigmaApiError {}
export class TimeoutError extends FigmaApiError {}

export function createErrorFromResponse(response: any, url: string, body?: any): FigmaApiError;
export function isRetryableError(error: Error): boolean;

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
