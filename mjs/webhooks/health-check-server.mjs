/**
 * Health Check Server for Figma Webhooks API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import { FigmaApiClient } from '@figma-api/fetch';
import FigmaWebhooksSDK from './index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3009;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-webhooks',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /webhooks/team/:teamId - List team webhooks (example)',
      'POST /webhooks - Create webhook (example)',
      'PUT /webhooks/:webhookId - Update webhook (example)',
      'DELETE /webhooks/:webhookId - Delete webhook (example)',
      'GET /webhooks/:webhookId/requests - Get webhook requests (example)',
      'POST /webhooks/verify - Verify webhook payload (example)'
    ],
    availableMethods: [
      'listWebhooks(teamId)',
      'getWebhook(webhookId)',
      'createWebhook(teamId, eventType, endpoint, options)',
      'updateWebhook(webhookId, updates)',
      'deleteWebhook(webhookId)',
      'getWebhookRequests(webhookId)',
      'testWebhook(webhookId)',
      'verifyWebhookSignature(payload, signature, passcode)'
    ]
  };
});

// Simple test endpoint
fastify.get('/test', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const testTeamId = request.query.teamId;

    if (!testTeamId) {
      return {
        success: true,
        message: 'SDK initialized successfully. Provide ?teamId=YOUR_TEAM_ID to test API connectivity',
        tokenPresent: true
      };
    }

    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    const webhooks = await sdk.listWebhooks(testTeamId);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      teamId: testTeamId,
      webhooksCount: webhooks?.webhooks?.length || 0
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - List team webhooks
fastify.get('/webhooks/team/:teamId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    const webhooks = await sdk.listWebhooks(teamId);

    return {
      success: true,
      teamId,
      webhooks
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Create webhook
fastify.post('/webhooks', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId, eventType, endpoint, passcode, description } = request.body;

    if (!teamId || !eventType || !endpoint) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: teamId, eventType, endpoint'
      });
    }

    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    const webhook = await sdk.createWebhook(teamId, eventType, endpoint, {
      passcode,
      description
    });

    return {
      success: true,
      webhook
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Update webhook
fastify.put('/webhooks/:webhookId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { webhookId } = request.params;
    const updates = request.body;

    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    const webhook = await sdk.updateWebhook(webhookId, updates);

    return {
      success: true,
      webhookId,
      webhook
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Delete webhook
fastify.delete('/webhooks/:webhookId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { webhookId } = request.params;

    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    await sdk.deleteWebhook(webhookId);

    return {
      success: true,
      webhookId,
      message: 'Webhook deleted successfully'
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get webhook requests
fastify.get('/webhooks/:webhookId/requests', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { webhookId } = request.params;

    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    const requests = await sdk.getWebhookRequests(webhookId);

    return {
      success: true,
      webhookId,
      requests
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Verify webhook payload
fastify.post('/webhooks/verify', async (request, reply) => {
  try {
    const { payload, signature, passcode } = request.body;

    if (!payload || !signature || !passcode) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: payload, signature, passcode'
      });
    }

    const fetcher = new FigmaApiClient({ apiToken: FIGMA_TOKEN || 'dummy' });
    const sdk = new FigmaWebhooksSDK({ fetcher });
    const isValid = sdk.verifySignature(payload, signature, passcode);

    return {
      success: true,
      isValid,
      message: isValid ? 'Signature is valid' : 'Signature is invalid'
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Figma Webhooks Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
