/**
 * Health Check Server for Figma Dev Resources API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaDevResourcesSDK } from './sdk.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3003;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-dev-resources',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /dev-resources/:fileKey - Get all dev resources in a file (example)',
      'POST /dev-resources/:fileKey - Create dev resource (example)',
      'GET /dev-resources/:fileKey/stats - Get dev resources statistics (example)'
    ],
    availableMethods: [
      'getFileDevResources(fileKey)',
      'getNodeDevResources(fileKey, nodeIds)',
      'createDevResource(fileKey, nodeId, name, url)',
      'updateDevResource(devResourceId, updates)',
      'deleteDevResource(fileKey, devResourceId)',
      'searchDevResources(fileKey, pattern)',
      'getDevResourcesStats(fileKey)',
      'validateDevResourceUrls(fileKey)'
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
    const testFileKey = request.query.fileKey;

    if (!testFileKey) {
      return {
        success: true,
        message: 'SDK initialized successfully. Provide ?fileKey=YOUR_FILE_KEY to test API connectivity',
        tokenPresent: true
      };
    }

    const sdk = new FigmaDevResourcesSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const resources = await sdk.getFileDevResources(testFileKey);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      fileKey: testFileKey,
      devResourcesCount: resources?.length || 0
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get all dev resources in a file
fastify.get('/dev-resources/:fileKey', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaDevResourcesSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const resources = await sdk.getFileDevResources(fileKey);

    return {
      success: true,
      fileKey,
      count: resources.length,
      resources
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get dev resources statistics
fastify.get('/dev-resources/:fileKey/stats', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaDevResourcesSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const stats = await sdk.getDevResourcesStats(fileKey);

    return {
      success: true,
      fileKey,
      stats
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Create dev resource
fastify.post('/dev-resources/:fileKey', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const { nodeId, name, url } = request.body;

    if (!nodeId || !name || !url) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: nodeId, name, url'
      });
    }

    const sdk = new FigmaDevResourcesSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const resource = await sdk.createDevResource(fileKey, nodeId, name, url);

    return {
      success: true,
      fileKey,
      resource
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
    console.log(`\n🚀 Figma Dev Resources Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
