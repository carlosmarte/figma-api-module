/**
 * Health Check Server for Figma Variables API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import FigmaVariablesSDK from './index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3008;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-variables',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /variables/:fileKey - Get all variables and collections (example)',
      'POST /variables/:fileKey - Create variable (example)',
      'PUT /variables/:fileKey/:variableId - Update variable (example)',
      'DELETE /variables/:fileKey/:variableId - Delete variable (example)',
      'GET /variables/:fileKey/export - Export variables (example)'
    ],
    availableMethods: [
      'getLocalVariables(fileKey)',
      'getPublishedVariables(fileKey)',
      'createVariable(fileKey, data)',
      'updateVariable(fileKey, variableId, updates)',
      'deleteVariable(fileKey, variableId)',
      'createVariableCollection(fileKey, name)',
      'createVariableAlias(fileKey, variableId, aliasId)',
      'searchVariables(fileKey, query)',
      'exportVariables(fileKey)'
    ],
    note: 'Requires Figma Enterprise plan'
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
        note: 'Requires Figma Enterprise plan'
      };
    }

    const sdk = new FigmaVariablesSDK({ token: FIGMA_TOKEN });
    const variables = await sdk.getLocalVariables(testFileKey);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      fileKey: testFileKey,
      variablesCount: Object.keys(variables?.meta?.variables || {}).length,
      collectionsCount: Object.keys(variables?.meta?.variableCollections || {}).length
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name,
      note: 'If you see 403/404 errors, ensure you have Figma Enterprise plan'
    });
  }
});

// Example endpoint - Get all variables and collections
fastify.get('/variables/:fileKey', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const sdk = new FigmaVariablesSDK({ token: FIGMA_TOKEN });
    const variables = await sdk.getLocalVariables(fileKey);

    return {
      success: true,
      fileKey,
      variables
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Create variable
fastify.post('/variables/:fileKey', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const { name, variableCollectionId, resolvedType, scopes } = request.body;

    if (!name || !variableCollectionId || !resolvedType) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: name, variableCollectionId, resolvedType'
      });
    }

    const sdk = new FigmaVariablesSDK({ token: FIGMA_TOKEN });
    const variable = await sdk.createVariable(fileKey, {
      name,
      variableCollectionId,
      resolvedType,
      scopes: scopes || []
    });

    return {
      success: true,
      fileKey,
      variable
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Update variable
fastify.put('/variables/:fileKey/:variableId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey, variableId } = request.params;
    const updates = request.body;

    const sdk = new FigmaVariablesSDK({ token: FIGMA_TOKEN });
    const variable = await sdk.updateVariable(fileKey, variableId, updates);

    return {
      success: true,
      fileKey,
      variableId,
      variable
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Delete variable
fastify.delete('/variables/:fileKey/:variableId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey, variableId } = request.params;

    const sdk = new FigmaVariablesSDK({ token: FIGMA_TOKEN });
    await sdk.deleteVariable(fileKey, variableId);

    return {
      success: true,
      fileKey,
      variableId,
      message: 'Variable deleted successfully'
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Export variables
fastify.get('/variables/:fileKey/export', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { fileKey } = request.params;
    const { format = 'json' } = request.query;

    const sdk = new FigmaVariablesSDK({ token: FIGMA_TOKEN });
    const exported = await sdk.exportVariables(fileKey, { format });

    return {
      success: true,
      fileKey,
      format,
      exported
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
    console.log(`\n🚀 Figma Variables Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}`);
    console.log(`   Note: Requires Figma Enterprise plan\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
