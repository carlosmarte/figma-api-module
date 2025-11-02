/**
 * Main entry point for figma-projects module
 * Exports all public APIs and utilities
 */

// Core components
export { default as FigmaProjectsService } from './src/core/service.mjs';

// High-level SDK
export { default as FigmaProjectsSDK } from './src/interfaces/sdk.mjs';

// Exception classes
export {
  FigmaProjectsError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  ValidationError,
  NotFoundError,
  PermissionError,
  HttpError,
  ConfigurationError,
  TimeoutError,
  createErrorFromResponse,
  isRetryableError,
  getRetryDelay
} from './src/core/exceptions.mjs';

// Default export is the SDK for convenience
export { default } from './src/interfaces/sdk.mjs';