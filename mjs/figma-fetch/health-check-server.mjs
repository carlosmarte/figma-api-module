/**
 * Health Check Server for Figma Fetch API Client
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import { FigmaApiClient } from './dist/index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3004;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-fetch',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    description: 'Core HTTP client infrastructure for Figma API',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /health - Extended health check with client stats',
      'GET /stats - Client statistics (example)'
    ],
    features: [
      'Composable fetch adapters',
      'Built-in rate limiting',
      'Request caching',
      'Retry logic with exponential backoff',
      'Proxy support (undici)',
      'Request/response interceptors'
    ],
    availableClasses: [
      'FigmaApiClient',
      'FetchAdapter',
      'NativeFetchAdapter',
      'UndiciFetchAdapter',
      'RateLimiter',
      'RequestCache',
      'RetryHandler'
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
        message: 'Client initialized successfully. Provide ?fileKey=YOUR_FILE_KEY to test API connectivity',
        tokenPresent: true
      };
    }

    const client = new FigmaApiClient({
      token: FIGMA_TOKEN,
      rateLimit: {
        requestsPerMinute: 60
      }
    });

    // Test basic fetch capability
    const response = await client.fetch(`/files/${testFileKey}`, {
      method: 'GET'
    });

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      fileKey: testFileKey,
      status: response.status,
      fileName: response.data?.name || 'Unknown'
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Extended health check
fastify.get('/health', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const client = new FigmaApiClient({
      token: FIGMA_TOKEN,
      rateLimit: {
        requestsPerMinute: 60
      }
    });

    const health = await client.healthCheck();

    return {
      success: true,
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

// Client statistics endpoint
fastify.get('/stats', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const client = new FigmaApiClient({
      token: FIGMA_TOKEN,
      rateLimit: {
        requestsPerMinute: 60
      }
    });

    const stats = client.getStats();

    return {
      success: true,
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

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Figma Fetch Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   Extended health: http://localhost:${PORT}/health`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
