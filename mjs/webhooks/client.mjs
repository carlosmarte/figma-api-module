/**
 * project: figma-webhooks
 * purpose: Core orchestration for Figma Webhooks API operations
 * use-cases:
 *  - Team webhook management for design workflow automation
 *  - File, project, and team-level event subscriptions
 *  - Webhook delivery monitoring and debugging
 *  - Enterprise-grade webhook lifecycle management
 * performance:
 *  - Non-blocking async I/O with streaming support
 *  - Built-in pagination for webhook listing
 *  - Exponential backoff for transient failures
 *  - Memory-efficient request/response processing
 *  - Connection pooling for high-throughput scenarios
 */

import { FigmaApiClient, UndiciFetchAdapter } from '../figma-fetch/dist/index.mjs';

/**
 * Base error class for webhook operations
 * @extends Error
 */
export class WebhookError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
  }
}

/**
 * Error thrown when webhook rate limits are exceeded
 * @extends WebhookError
 */
export class WebhookRateLimitError extends WebhookError {
  constructor(retryAfter) {
    super('Webhook API rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

/**
 * Error thrown when webhook authentication fails
 * @extends WebhookError
 */
export class WebhookAuthError extends WebhookError {
  constructor() {
    super('Webhook authentication failed', 'AUTH_FAILED');
  }
}

/**
 * Error thrown when webhook validation fails
 * @extends WebhookError
 */
export class WebhookValidationError extends WebhookError {
  constructor(field, value) {
    super(`Invalid webhook ${field}: ${value}`, 'VALIDATION_ERROR', { field, value });
  }
}

/**
 * Core client for Figma Webhooks API v2
 * Provides low-level webhook management operations with proper error handling,
 * rate limiting, and authentication support.
 */
export class FigmaWebhooksClient extends FigmaApiClient {
  /**
   * Initialize the Figma Webhooks client
   * @param {Object} options - Configuration options
   * @param {string} options.apiToken - Figma API token (personal access token or OAuth2)
   * @param {string} [options.baseUrl='https://api.figma.com'] - Figma API base URL
   * @param {Object} [options.logger=console] - Logger instance for debugging
   * @param {Object} [options.rateLimiter=null] - Rate limiter implementation
   * @param {Object} [options.cache=null] - Cache implementation for responses
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   */
  constructor({
    apiToken,
    baseUrl = 'https://api.figma.com',
    logger = console,
    rateLimiter = null,
    cache = null,
    timeout = 30000,
    proxyUrl = process.env.HTTP_PROXY,
    proxyToken = process.env.HTTP_PROXY_TOKEN,
    fetchFunction = null,
    fetchAdapter = null
  } = {}) {
    // Check for API token before calling parent
    if (!apiToken && !process.env.FIGMA_TOKEN) {
      throw new WebhookAuthError();
    }

    // Prepare fetch adapter with proxy support if needed
    // Prioritize: fetchAdapter > fetchFunction > proxyUrl
    const adapter = fetchAdapter || fetchFunction || (proxyUrl ? new UndiciFetchAdapter({
      url: proxyUrl,
      token: proxyToken
    }) : undefined);

    // Call parent constructor
    super({
      apiToken,
      baseUrl,
      logger,
      rateLimiter,
      cache,
      timeout,
      fetchAdapter: adapter
    });

    this._initializeDefaults();
  }

  /**
   * Initialize default configuration
   * @private
   */
  _initializeDefaults() {
    // Webhook event types supported by the API
    this.eventTypes = [
      'PING',
      'FILE_UPDATE',
      'FILE_VERSION_UPDATE',
      'FILE_DELETE',
      'LIBRARY_PUBLISH',
      'FILE_COMMENT',
      'DEV_MODE_STATUS_UPDATE'
    ];

    // Webhook statuses
    this.statuses = ['ACTIVE', 'PAUSED'];

    // Context types
    this.contextTypes = ['team', 'project', 'file'];
  }

  /**
   * Validate webhook event type
   * @param {string} eventType - Event type to validate
   * @throws {WebhookValidationError} - If event type is invalid
   * @private
   */
  _validateEventType(eventType) {
    if (!this.eventTypes.includes(eventType)) {
      throw new WebhookValidationError('event_type', eventType);
    }
  }

  /**
   * Validate webhook status
   * @param {string} status - Status to validate
   * @throws {WebhookValidationError} - If status is invalid
   * @private
   */
  _validateStatus(status) {
    if (!this.statuses.includes(status)) {
      throw new WebhookValidationError('status', status);
    }
  }

  /**
   * Validate context type
   * @param {string} context - Context to validate
   * @throws {WebhookValidationError} - If context is invalid
   * @private
   */
  _validateContext(context) {
    if (!this.contextTypes.includes(context)) {
      throw new WebhookValidationError('context', context);
    }
  }

  /**
   * Get webhooks by context or plan
   * @param {Object} options - Query options
   * @param {string} [options.context] - Context type ('team', 'project', or 'file')
   * @param {string} [options.contextId] - ID of the context
   * @param {string} [options.planApiId] - Plan API ID for getting all webhooks
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Webhooks response with pagination
   */
  async getWebhooks({ context, contextId, planApiId, cursor } = {}) {
    const params = {};

    if (context) {
      this._validateContext(context);
      params.context = context;
    }

    if (contextId) {
      params.context_id = contextId;
    }

    if (planApiId) {
      params.plan_api_id = planApiId;
    }

    if (cursor) {
      params.cursor = cursor;
    }

    return this.get('/v2/webhooks', params);
  }

  /**
   * Create a new webhook
   * @param {Object} webhook - Webhook configuration
   * @param {string} webhook.eventType - Type of event to subscribe to
   * @param {string} webhook.context - Context type ('team', 'project', or 'file')
   * @param {string} webhook.contextId - ID of the context to subscribe to
   * @param {string} webhook.endpoint - HTTP endpoint that will receive POST requests
   * @param {string} webhook.passcode - Verification string sent with requests
   * @param {string} [webhook.status='ACTIVE'] - Initial status of webhook
   * @param {string} [webhook.description] - Optional description
   * @returns {Promise<Object>} - Created webhook data
   */
  async createWebhook({
    eventType,
    context,
    contextId,
    endpoint,
    passcode,
    status = 'ACTIVE',
    description
  }) {
    // Validation
    this._validateEventType(eventType);
    this._validateContext(context);
    this._validateStatus(status);

    if (!endpoint || typeof endpoint !== 'string') {
      throw new WebhookValidationError('endpoint', endpoint);
    }

    if (endpoint.length > 2048) {
      throw new WebhookValidationError('endpoint', 'URL too long (max 2048 characters)');
    }

    if (!passcode || typeof passcode !== 'string') {
      throw new WebhookValidationError('passcode', passcode);
    }

    if (passcode.length > 100) {
      throw new WebhookValidationError('passcode', 'Passcode too long (max 100 characters)');
    }

    if (description && description.length > 150) {
      throw new WebhookValidationError('description', 'Description too long (max 150 characters)');
    }

    const webhookData = {
      event_type: eventType,
      context,
      context_id: contextId,
      endpoint,
      passcode,
      status
    };

    if (description) {
      webhookData.description = description;
    }

    return this.post('/v2/webhooks', webhookData);
  }

  /**
   * Get a webhook by ID
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} - Webhook data
   */
  async getWebhook(webhookId) {
    if (!webhookId || typeof webhookId !== 'string') {
      throw new WebhookValidationError('webhook_id', webhookId);
    }

    return this.get(`/v2/webhooks/${webhookId}`);
  }

  /**
   * Update an existing webhook
   * @param {string} webhookId - Webhook ID to update
   * @param {Object} updates - Fields to update
   * @param {string} [updates.eventType] - New event type
   * @param {string} [updates.endpoint] - New endpoint URL
   * @param {string} [updates.passcode] - New passcode
   * @param {string} [updates.status] - New status
   * @param {string} [updates.description] - New description
   * @returns {Promise<Object>} - Updated webhook data
   */
  async updateWebhook(webhookId, updates = {}) {
    if (!webhookId || typeof webhookId !== 'string') {
      throw new WebhookValidationError('webhook_id', webhookId);
    }

    const updateData = {};

    if (updates.eventType) {
      this._validateEventType(updates.eventType);
      updateData.event_type = updates.eventType;
    }

    if (updates.endpoint) {
      if (typeof updates.endpoint !== 'string' || updates.endpoint.length > 2048) {
        throw new WebhookValidationError('endpoint', updates.endpoint);
      }
      updateData.endpoint = updates.endpoint;
    }

    if (updates.passcode) {
      if (typeof updates.passcode !== 'string' || updates.passcode.length > 100) {
        throw new WebhookValidationError('passcode', updates.passcode);
      }
      updateData.passcode = updates.passcode;
    }

    if (updates.status) {
      this._validateStatus(updates.status);
      updateData.status = updates.status;
    }

    if (updates.description !== undefined) {
      if (updates.description && updates.description.length > 150) {
        throw new WebhookValidationError('description', updates.description);
      }
      updateData.description = updates.description;
    }

    return this.put(`/v2/webhooks/${webhookId}`, updateData);
  }

  /**
   * Delete a webhook
   * @param {string} webhookId - Webhook ID to delete
   * @returns {Promise<Object>} - Deletion confirmation
   */
  async deleteWebhook(webhookId) {
    if (!webhookId || typeof webhookId !== 'string') {
      throw new WebhookValidationError('webhook_id', webhookId);
    }

    return this.delete(`/v2/webhooks/${webhookId}`);
  }

  /**
   * Get webhook requests (for debugging)
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} - Recent webhook requests and responses
   */
  async getWebhookRequests(webhookId) {
    if (!webhookId || typeof webhookId !== 'string') {
      throw new WebhookValidationError('webhook_id', webhookId);
    }

    return this.get(`/v2/webhooks/${webhookId}/requests`);
  }

  /**
   * Paginate through all webhooks for a plan
   * @param {string} planApiId - Plan API ID
   * @param {Object} [options={}] - Additional options
   * @returns {AsyncGenerator<Object>} - Webhook pages
   */
  async *paginateWebhooks(planApiId, options = {}) {
    let cursor = null;

    do {
      const response = await this.getWebhooks({
        planApiId,
        cursor,
        ...options
      });

      yield response.webhooks || [];

      // Extract cursor for next page
      if (response.pagination?.next_page) {
        const nextUrl = new URL(response.pagination.next_page);
        cursor = nextUrl.searchParams.get('cursor');
      } else {
        cursor = null;
      }
    } while (cursor);
  }

  /**
   * Pause a webhook (convenience method)
   * @param {string} webhookId - Webhook ID to pause
   * @returns {Promise<Object>} - Updated webhook data
   */
  async pauseWebhook(webhookId) {
    return this.updateWebhook(webhookId, { status: 'PAUSED' });
  }

  /**
   * Activate a webhook (convenience method)
   * @param {string} webhookId - Webhook ID to activate
   * @returns {Promise<Object>} - Updated webhook data
   */
  async activateWebhook(webhookId) {
    return this.updateWebhook(webhookId, { status: 'ACTIVE' });
  }

  /**
   * Verify webhook payload signature (for webhook endpoints)
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - X-Figma-Signature header value
   * @param {string} passcode - Webhook passcode
   * @returns {boolean} - Whether signature is valid
   */
  verifyWebhookSignature(payload, signature, passcode) {
    // Note: Actual implementation would use crypto to verify HMAC signature
    // This is a placeholder for the signature verification logic
    this.logger.debug('Verifying webhook signature', { signature, hasPasscode: !!passcode });
    return signature === passcode; // Simplified verification
  }
}

export default FigmaWebhooksClient;
