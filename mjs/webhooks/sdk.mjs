/**
 * SDK facade for figma-webhooks
 * Provides ergonomic API for Figma Webhooks operations
 */

/**
 * High-level SDK for Figma Webhooks API
 * Provides convenient methods for common webhook operations
 *
 * @example
 * import { FigmaApiClient } from '@figma-api/fetch';
 * import { FigmaWebhooksSDK } from 'figma-webhooks';
 *
 * const fetcher = new FigmaApiClient({ apiToken: process.env.FIGMA_TOKEN });
 * const sdk = new FigmaWebhooksSDK({ fetcher });
 */
export class FigmaWebhooksSDK {
  /**
   * Initialize the Figma Webhooks SDK
   * @param {Object} config - Configuration object
   * @param {Object} config.fetcher - FigmaApiClient instance (required)
   * @param {Object} [config.logger=console] - Custom logger
   */
  constructor({ fetcher, logger = console } = {}) {
    if (!fetcher) {
      throw new Error('fetcher parameter is required. Please create and pass a FigmaApiClient instance.');
    }

    this.fetcher = fetcher;
    this.logger = logger;
  }

  // === Webhook Management Methods ===

  /**
   * Create a file update webhook
   * @param {Object} options - Webhook configuration
   * @param {string} options.fileKey - File key to monitor
   * @param {string} options.endpoint - Webhook endpoint URL
   * @param {string} options.passcode - Webhook verification passcode
   * @param {string} [options.description] - Webhook description
   * @param {boolean} [options.active=true] - Whether webhook should be active
   * @returns {Promise<Object>} - Created webhook
   */
  async createFileWebhook({ 
    fileKey, 
    endpoint, 
    passcode, 
    description,
    active = true 
  }) {
    return this.fetcher.createWebhook({
      eventType: 'FILE_UPDATE',
      context: 'file',
      contextId: fileKey,
      endpoint,
      passcode,
      status: active ? 'ACTIVE' : 'PAUSED',
      description
    });
  }

  /**
   * Create a project webhook for all files in a project
   * @param {Object} options - Webhook configuration
   * @param {string} options.projectId - Project ID to monitor
   * @param {string} options.eventType - Event type to subscribe to
   * @param {string} options.endpoint - Webhook endpoint URL
   * @param {string} options.passcode - Webhook verification passcode
   * @param {string} [options.description] - Webhook description
   * @param {boolean} [options.active=true] - Whether webhook should be active
   * @returns {Promise<Object>} - Created webhook
   */
  async createProjectWebhook({ 
    projectId, 
    eventType = 'FILE_UPDATE',
    endpoint, 
    passcode, 
    description,
    active = true 
  }) {
    return this.fetcher.createWebhook({
      eventType,
      context: 'project',
      contextId: projectId,
      endpoint,
      passcode,
      status: active ? 'ACTIVE' : 'PAUSED',
      description
    });
  }

  /**
   * Create a team webhook for all team activity
   * @param {Object} options - Webhook configuration
   * @param {string} options.teamId - Team ID to monitor
   * @param {string} options.eventType - Event type to subscribe to
   * @param {string} options.endpoint - Webhook endpoint URL
   * @param {string} options.passcode - Webhook verification passcode
   * @param {string} [options.description] - Webhook description
   * @param {boolean} [options.active=true] - Whether webhook should be active
   * @returns {Promise<Object>} - Created webhook
   */
  async createTeamWebhook({ 
    teamId, 
    eventType = 'FILE_UPDATE',
    endpoint, 
    passcode, 
    description,
    active = true 
  }) {
    return this.fetcher.createWebhook({
      eventType,
      context: 'team',
      contextId: teamId,
      endpoint,
      passcode,
      status: active ? 'ACTIVE' : 'PAUSED',
      description
    });
  }

  /**
   * Get webhook by ID with enhanced error handling
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object|null>} - Webhook data or null if not found
   */
  async getWebhook(webhookId) {
    try {
      return await this.fetcher.getWebhook(webhookId);
    } catch (error) {
      if (error.meta?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all webhooks for a context
   * @param {Object} options - Query options
   * @param {string} [options.context] - Context type ('team', 'project', 'file')
   * @param {string} [options.contextId] - Context ID
   * @param {string} [options.planApiId] - Plan API ID
   * @returns {Promise<Array>} - Array of webhooks
   */
  async listWebhooks(options = {}) {
    const response = await this.fetcher.getWebhooks(options);
    return response.webhooks || [];
  }

  /**
   * List all webhooks across all accessible contexts
   * @param {string} planApiId - Plan API ID
   * @returns {Promise<Array>} - Array of all webhooks
   */
  async listAllWebhooks(planApiId) {
    const webhooks = [];
    
    for await (const batch of this.fetcher.paginateWebhooks(planApiId)) {
      webhooks.push(...batch);
    }

    return webhooks;
  }

  /**
   * Update webhook with partial data
   * @param {string} webhookId - Webhook ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated webhook
   */
  async updateWebhook(webhookId, updates) {
    return this.fetcher.updateWebhook(webhookId, updates);
  }

  /**
   * Delete webhook with confirmation
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<boolean>} - True if successfully deleted
   */
  async deleteWebhook(webhookId) {
    try {
      await this.fetcher.deleteWebhook(webhookId);
      return true;
    } catch (error) {
      if (error.meta?.status === 404) {
        return false; // Already deleted
      }
      throw error;
    }
  }

  /**
   * Pause webhook
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} - Updated webhook
   */
  async pauseWebhook(webhookId) {
    return this.fetcher.pauseWebhook(webhookId);
  }

  /**
   * Activate webhook
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} - Updated webhook
   */
  async activateWebhook(webhookId) {
    return this.fetcher.activateWebhook(webhookId);
  }

  // === Webhook Monitoring Methods ===

  /**
   * Get webhook delivery history for debugging
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Array>} - Recent webhook requests
   */
  async getWebhookHistory(webhookId) {
    const response = await this.fetcher.getWebhookRequests(webhookId);
    return response.requests || [];
  }

  /**
   * Check webhook health by analyzing recent deliveries
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} - Health status report
   */
  async checkWebhookHealth(webhookId) {
    const requests = await this.getWebhookHistory(webhookId);
    
    if (requests.length === 0) {
      return {
        status: 'unknown',
        message: 'No recent webhook deliveries found',
        successRate: null,
        lastDelivery: null
      };
    }

    const successful = requests.filter(req => 
      req.response_info && parseInt(req.response_info.status) < 400
    );
    
    const successRate = successful.length / requests.length;
    const lastRequest = requests[0]; // Most recent
    
    let status = 'healthy';
    let message = `Webhook is healthy (${Math.round(successRate * 100)}% success rate)`;

    if (successRate < 0.8) {
      status = 'degraded';
      message = `Webhook is experiencing issues (${Math.round(successRate * 100)}% success rate)`;
    }

    if (successRate === 0) {
      status = 'failing';
      message = 'Webhook is failing all deliveries';
    }

    return {
      status,
      message,
      successRate,
      lastDelivery: lastRequest?.request_info?.sent_at,
      totalRequests: requests.length,
      successfulRequests: successful.length,
      failedRequests: requests.length - successful.length
    };
  }

  // === Bulk Operations ===

  /**
   * Create multiple webhooks with the same configuration
   * @param {Array<string>} contextIds - Array of context IDs
   * @param {Object} webhookConfig - Base webhook configuration
   * @param {string} webhookConfig.context - Context type
   * @param {string} webhookConfig.eventType - Event type
   * @param {string} webhookConfig.endpoint - Endpoint URL
   * @param {string} webhookConfig.passcode - Passcode
   * @returns {Promise<Object>} - Results with created webhooks and errors
   */
  async createBulkWebhooks(contextIds, webhookConfig) {
    const results = {
      created: [],
      errors: []
    };

    for (const contextId of contextIds) {
      try {
        const webhook = await this.fetcher.createWebhook({
          ...webhookConfig,
          contextId
        });
        results.created.push(webhook);
      } catch (error) {
        results.errors.push({
          contextId,
          error: error.message,
          code: error.code
        });
      }
    }

    return results;
  }

  /**
   * Delete multiple webhooks
   * @param {Array<string>} webhookIds - Array of webhook IDs
   * @returns {Promise<Object>} - Results with deletion status
   */
  async deleteBulkWebhooks(webhookIds) {
    const results = {
      deleted: [],
      errors: []
    };

    for (const webhookId of webhookIds) {
      try {
        await this.fetcher.deleteWebhook(webhookId);
        results.deleted.push(webhookId);
      } catch (error) {
        results.errors.push({
          webhookId,
          error: error.message,
          code: error.code
        });
      }
    }

    return results;
  }

  /**
   * Pause multiple webhooks
   * @param {Array<string>} webhookIds - Array of webhook IDs
   * @returns {Promise<Object>} - Results with pause status
   */
  async pauseBulkWebhooks(webhookIds) {
    const results = {
      paused: [],
      errors: []
    };

    for (const webhookId of webhookIds) {
      try {
        const webhook = await this.fetcher.pauseWebhook(webhookId);
        results.paused.push(webhook);
      } catch (error) {
        results.errors.push({
          webhookId,
          error: error.message,
          code: error.code
        });
      }
    }

    return results;
  }

  // === Webhook Discovery ===

  /**
   * Find webhooks by endpoint URL
   * @param {string} endpoint - Endpoint URL to search for
   * @param {string} planApiId - Plan API ID
   * @returns {Promise<Array>} - Matching webhooks
   */
  async findWebhooksByEndpoint(endpoint, planApiId) {
    const allWebhooks = await this.listAllWebhooks(planApiId);
    return allWebhooks.filter(webhook => webhook.endpoint === endpoint);
  }

  /**
   * Find webhooks by event type
   * @param {string} eventType - Event type to search for
   * @param {string} planApiId - Plan API ID
   * @returns {Promise<Array>} - Matching webhooks
   */
  async findWebhooksByEventType(eventType, planApiId) {
    const allWebhooks = await this.listAllWebhooks(planApiId);
    return allWebhooks.filter(webhook => webhook.event_type === eventType);
  }

  /**
   * Find inactive webhooks
   * @param {string} planApiId - Plan API ID
   * @returns {Promise<Array>} - Inactive webhooks
   */
  async findInactiveWebhooks(planApiId) {
    const allWebhooks = await this.listAllWebhooks(planApiId);
    return allWebhooks.filter(webhook => webhook.status === 'PAUSED');
  }

  // === Convenience Methods ===

  /**
   * Test webhook endpoint connectivity
   * @param {string} endpoint - Endpoint URL to test
   * @returns {Promise<Object>} - Test results
   */
  async testWebhookEndpoint(endpoint) {
    const testPayload = {
      event_type: 'PING',
      timestamp: new Date().toISOString(),
      webhook_id: 'test'
    };

    try {
      // Use fetcher's raw fetch capability for non-Figma endpoints
      // If fetcher doesn't have a fetch method, we'll need to use native fetch
      const fetchMethod = this.fetcher.fetch?.bind(this.fetcher) || globalThis.fetch;

      const response = await fetchMethod(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Figma-Event': 'PING'
        },
        body: JSON.stringify(testPayload)
      });

      return {
        reachable: true,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        reachable: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook payload signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Webhook signature header
   * @param {string} passcode - Webhook passcode
   * @returns {boolean} - Whether signature is valid
   */
  verifySignature(payload, signature, passcode) {
    return this.fetcher.verifyWebhookSignature(payload, signature, passcode);
  }

  /**
   * Get supported event types
   * @returns {Array<string>} - Available event types
   */
  getSupportedEventTypes() {
    return [...this.fetcher.eventTypes];
  }

  /**
   * Get supported context types
   * @returns {Array<string>} - Available context types
   */
  getSupportedContextTypes() {
    return [...this.fetcher.contextTypes];
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async close() {
    // Clean up any resources if needed
    this.logger.debug('FigmaWebhooksSDK closed');
  }
}

export default FigmaWebhooksSDK;