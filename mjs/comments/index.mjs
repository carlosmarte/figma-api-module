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

// Re-export utility classes from @figma-api/fetch for convenience
// Users can also import these directly from '@figma-api/fetch' if needed
export { RateLimiter, RequestCache } from '@figma-api/fetch';

// Default export - the main SDK
export { FigmaCommentsSDK as default } from './src/interfaces/sdk.mjs';