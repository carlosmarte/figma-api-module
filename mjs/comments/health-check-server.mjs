/**
 * Health Check Server for Figma Comments API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import { FigmaApiClient } from '@figma-api/fetch';
import { FigmaCommentsSDK } from './index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3001;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-comments',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /comments/:fileKey - Get comments from a file (example)'
    ],
    availableMethods: [
      'getComments(fileKey)',
      'getComment(fileKey, commentId)',
      'postComment(fileKey, message, coordinates)',
      'deleteComment(fileKey, commentId)',
      'addReaction(fileKey, commentId, emoji)',
      'deleteReaction(fileKey, commentId, emoji)'
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
    // Note: This requires a valid file key to test
    const testFileKey = request.query.fileKey;

    if (!testFileKey) {
      return {
        success: true,
        message: 'SDK initialized successfully. Provide ?fileKey=YOUR_FILE_KEY to test API connectivity',
        tokenPresent: true
      };
    }

    const sdk = new FigmaCommentsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const comments = await sdk.getComments(testFileKey);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      fileKey: testFileKey,
      commentsCount: comments?.comments?.length || 0
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get comments from a file
fastify.get('/comments/:fileKey', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaCommentsSDK({ fetcher: new FigmaApiClient({ apiToken: FIGMA_TOKEN }) });
    const comments = await sdk.getComments(fileKey);

    return {
      success: true,
      fileKey,
      comments
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
    console.log(`\n🚀 Figma Comments Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
