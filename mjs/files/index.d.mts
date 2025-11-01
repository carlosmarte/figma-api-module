/**
 * Type declarations for figma-files-api package
 * Auto-generated from index.mjs exports
 */

// Core exports
export { FigmaFilesClient } from './src/core/client.mjs';
export { FigmaFilesService } from './src/core/service.mjs';

// Interface exports
export { FigmaFilesSDK } from './src/interfaces/sdk.mjs';

// Exception exports
export {
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
} from './src/core/exceptions.mjs';

// Default export for convenience
export { FigmaFilesSDK as default } from './src/interfaces/sdk.mjs';
