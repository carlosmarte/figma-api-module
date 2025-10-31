/**
 * figma-library-analytics - Main entry point
 * Exports all public interfaces for the library
 */

// Core exports
export { 
  FigmaLibraryAnalyticsClient,
  LibraryAnalyticsError,
  LibraryAnalyticsAuthError,
  LibraryAnalyticsValidationError,
  LibraryAnalyticsRateLimitError
} from './client.mjs';

export { FigmaLibraryAnalyticsService } from './service.mjs';

// Interface exports
export { FigmaLibraryAnalyticsSDK } from './sdk.mjs';
export { default as FigmaLibraryAnalyticsSDK } from './sdk.mjs';

// Version info
export const VERSION = '1.0.0';

// Re-export commonly used items for convenience
export { default } from './sdk.mjs';