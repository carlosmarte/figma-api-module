/**
 * Type declarations for figma-webhooks package
 * Auto-generated from index.mjs exports
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
export const VERSION: string;

// Re-export commonly used items for convenience
export { default } from './sdk.mjs';
