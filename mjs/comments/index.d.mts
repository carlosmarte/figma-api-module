/**
 * Type declarations for figma-comments package
 * Auto-generated from index.mjs exports
 */

// Core classes
export { FigmaCommentsClient } from './src/core/client.mjs';
export { FigmaCommentsService } from './src/core/service.mjs';
export { FigmaCommentsSDK } from './src/interfaces/sdk.mjs';

// Error classes
export {
  FigmaCommentsError,
  ApiError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  NetworkError,
  ConfigurationError,
  CommentError,
  CommentPermissionError,
  CommentValidationError,
  FileError,
  FileNotFoundError,
  FileAccessError,
  createErrorFromResponse
} from './src/core/exceptions.mjs';

// Utility classes
export { RateLimiter, RequestCache } from './src/core/client.mjs';

// Default export - the main SDK
export { FigmaCommentsSDK as default } from './src/interfaces/sdk.mjs';
