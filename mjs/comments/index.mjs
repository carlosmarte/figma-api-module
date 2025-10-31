/**
 * project: figma-comments
 * purpose: Main entry point with all exports for Figma Comments API library
 * use-cases:
 *  - ES6 module imports for Node.js applications
 *  - TypeScript compatibility layer
 *  - Unified API surface for library consumers
 *  - Comment reaction management and analytics
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