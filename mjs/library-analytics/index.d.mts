/**
 * Type declarations for figma-library-analytics package
 * Auto-generated from index.mjs exports
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
export const VERSION: string;

// Re-export commonly used items for convenience
export { default } from './sdk.mjs';
