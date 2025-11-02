/**
 * figma-webhooks - Main entry point
 * Exports all public interfaces for the Figma Webhooks API library
 */

// Error exports
export {
  WebhookError,
  WebhookAuthError,
  WebhookValidationError,
  WebhookRateLimitError
} from './errors.mjs';

// SDK exports
export { FigmaWebhooksSDK } from './sdk.mjs';
export { default } from './sdk.mjs';

// Version info
export const VERSION = '1.0.0';
