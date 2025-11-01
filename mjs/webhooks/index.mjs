/**
 * figma-webhooks - Main entry point
 * Exports all public interfaces for the Figma Webhooks API library
 */

// Core exports
export {
  FigmaWebhooksClient,
  WebhookError,
  WebhookAuthError,
  WebhookValidationError,
  WebhookRateLimitError
} from './client.mjs';

// SDK exports
export { FigmaWebhooksSDK } from './sdk.mjs';
export { default as FigmaWebhooksSDK } from './sdk.mjs';

// Version info
export const VERSION = '1.0.0';

// Re-export commonly used items for convenience
export { default } from './sdk.mjs';
