/**
 * figma-library-analytics - Main entry point
 * Exports all public interfaces for the library
 */

// Error exports
export {
  LibraryAnalyticsError,
  LibraryAnalyticsAuthError,
  LibraryAnalyticsValidationError,
  LibraryAnalyticsRateLimitError
} from './errors.mjs';

// Service export
export { FigmaLibraryAnalyticsService } from './service.mjs';

// SDK exports
export { FigmaLibraryAnalyticsSDK, default } from './sdk.mjs';

// Version info
export const VERSION = '1.0.0';