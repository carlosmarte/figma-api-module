/**
 * Health Check Server for Figma Library Analytics API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaLibraryAnalyticsSDK } from './index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3006;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-library-analytics',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /analytics/:fileKey/actions - Get component actions (example)',
      'GET /analytics/:fileKey/usage - Get component usage (example)',
      'GET /analytics/:fileKey/health - Get library health report (example)',
      'GET /analytics/:fileKey/trends - Get adoption trends (example)'
    ],
    availableMethods: [
      'getComponentActions(fileKey)',
      'getComponentUsageData(fileKey)',
      'getStyleAnalytics(fileKey)',
      'getVariableAnalytics(fileKey)',
      'getLibraryHealthReport(fileKey)',
      'getAdoptionTrends(fileKey)',
      'getComponentLeaderboard(fileKey)'
    ],
    note: 'Requires library_analytics:read scope'
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
    const testFileKey = request.query.fileKey;

    if (!testFileKey) {
      return {
        success: true,
        message: 'SDK initialized successfully. Provide ?fileKey=YOUR_FILE_KEY to test API connectivity',
        tokenPresent: true,
        note: 'Requires library_analytics:read scope'
      };
    }

    const sdk = new FigmaLibraryAnalyticsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const actions = await sdk.getComponentActions(testFileKey);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      fileKey: testFileKey,
      actionsCount: actions?.component_actions?.length || 0
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name,
      note: 'If you see 403/401 errors, ensure your token has library_analytics:read scope'
    });
  }
});

// Example endpoint - Get component actions
fastify.get('/analytics/:fileKey/actions', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaLibraryAnalyticsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const actions = await sdk.getComponentActions(fileKey);

    return {
      success: true,
      fileKey,
      actions
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get component usage data
fastify.get('/analytics/:fileKey/usage', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaLibraryAnalyticsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const usage = await sdk.getComponentUsageData(fileKey);

    return {
      success: true,
      fileKey,
      usage
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get library health report
fastify.get('/analytics/:fileKey/health', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaLibraryAnalyticsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const health = await sdk.getLibraryHealthReport(fileKey);

    return {
      success: true,
      fileKey,
      health
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get adoption trends
fastify.get('/analytics/:fileKey/trends', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaLibraryAnalyticsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const trends = await sdk.getAdoptionTrends(fileKey);

    return {
      success: true,
      fileKey,
      trends
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
    console.log(`\n🚀 Figma Library Analytics Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}`);
    console.log(`   Note: Requires library_analytics:read scope\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
