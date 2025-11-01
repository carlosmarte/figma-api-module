/**
 * Health Check Server for Figma Components API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import { FigmaComponentsSDK } from './index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3002;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-components',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /components/team/:teamId - Get team components (example)',
      'GET /components/file/:fileKey - Get file components (example)',
      'GET /library/:teamId - Get complete team library (example)'
    ],
    availableMethods: [
      'getTeamComponents(teamId)',
      'getFileComponents(fileKey)',
      'getComponentSets(teamId)',
      'getTeamStyles(teamId)',
      'getFileStyles(fileKey)',
      'getTeamLibrary(teamId)',
      'searchComponents(teamId, query)'
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

    const sdk = new FigmaComponentsSDK({ token: FIGMA_TOKEN });
    const components = await sdk.getTeamComponents(testTeamId);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      teamId: testTeamId,
      componentsCount: components?.meta?.components?.length || 0
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get team components
fastify.get('/components/team/:teamId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const sdk = new FigmaComponentsSDK({ token: FIGMA_TOKEN });
    const components = await sdk.getTeamComponents(teamId);

    return {
      success: true,
      teamId,
      components
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get file components
fastify.get('/components/file/:fileKey', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaComponentsSDK({ token: FIGMA_TOKEN });
    const components = await sdk.getFileComponents(fileKey);

    return {
      success: true,
      fileKey,
      components
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get complete team library
fastify.get('/library/:teamId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const sdk = new FigmaComponentsSDK({ token: FIGMA_TOKEN });
    const library = await sdk.getTeamLibrary(teamId);

    return {
      success: true,
      teamId,
      library
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
    console.log(`\n🚀 Figma Components Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
