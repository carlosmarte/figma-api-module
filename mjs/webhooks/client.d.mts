/**
 * Type declarations for FigmaWebhooksClient
 */

export class WebhookError extends Error {
  constructor(message: string, code?: string, meta?: any);
  code?: string;
  meta?: any;
}

export class WebhookRateLimitError extends WebhookError {
  constructor(retryAfter?: number);
  retryAfter?: number;
}

export class WebhookAuthError extends WebhookError {
  constructor(message?: string);
}

export class WebhookValidationError extends WebhookError {
  constructor(message: string, validationErrors?: any[]);
  validationErrors?: any[];
}

export class FigmaWebhooksClient {
  constructor(config: any);
  // Add method signatures as needed
}

export default FigmaWebhooksClient;
