/**
 * Type declarations for figma-components-api package
 * Auto-generated from index.mjs exports
 */

// Core exports
export { FigmaComponentsClient } from './src/core/client.mjs';
export { FigmaComponentsService } from './src/core/service.mjs';

// Interface exports
export { FigmaComponentsSDK } from './src/interfaces/sdk.mjs';

// Exception exports
export {
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
} from './src/core/exceptions.mjs';

// Default export for convenience
export { FigmaComponentsSDK as default } from './src/interfaces/sdk.mjs';
