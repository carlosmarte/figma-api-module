/**
 * Health Check Server for Figma Projects API
 * Provides status information and simple connectivity tests
 */

import Fastify from 'fastify';
import FigmaProjectsSDK from './index.mjs';

const fastify = Fastify({
  logger: true
});

const PORT = process.env.PORT || 3007;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Health check endpoint
fastify.get('/', async (request, reply) => {
  const hasToken = !!FIGMA_TOKEN;

  return {
    module: 'figma-projects',
    version: '1.0.0',
    status: hasToken ? 'healthy' : 'unhealthy',
    environment: {
      FIGMA_TOKEN: hasToken ? 'present' : 'missing'
    },
    endpoints: [
      'GET / - Health check and module information',
      'GET /test - Test Figma API connectivity',
      'GET /projects/team/:teamId - Get team projects (example)',
      'GET /projects/:projectId/files - Get project files (example)',
      'GET /projects/team/:teamId/tree - Get complete project hierarchy (example)',
      'GET /projects/team/:teamId/recent - Get recent files (example)'
    ],
    availableMethods: [
      'getTeamProjects(teamId)',
      'getProjectFiles(projectId)',
      'getProjectTree(teamId)',
      'searchProjects(teamId, query)',
      'getProjectStatistics(projectId)',
      'findFilesAcrossProjects(teamId, query)',
      'getRecentFiles(teamId)'
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

    const sdk = new FigmaProjectsSDK({ token: FIGMA_TOKEN });
    const projects = await sdk.getTeamProjects(testTeamId);

    return {
      success: true,
      message: 'Successfully connected to Figma API',
      teamId: testTeamId,
      projectsCount: projects?.projects?.length || 0
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get team projects
fastify.get('/projects/team/:teamId', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const sdk = new FigmaProjectsSDK({ token: FIGMA_TOKEN });
    const projects = await sdk.getTeamProjects(teamId);

    return {
      success: true,
      teamId,
      projects
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get project files
fastify.get('/projects/:projectId/files', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { projectId } = request.params;
    const sdk = new FigmaProjectsSDK({ token: FIGMA_TOKEN });
    const files = await sdk.getProjectFiles(projectId);

    return {
      success: true,
      projectId,
      files
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get complete project hierarchy
fastify.get('/projects/team/:teamId/tree', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const sdk = new FigmaProjectsSDK({ token: FIGMA_TOKEN });
    const tree = await sdk.getProjectTree(teamId);

    return {
      success: true,
      teamId,
      tree
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Get recent files
fastify.get('/projects/team/:teamId/recent', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const sdk = new FigmaProjectsSDK({ token: FIGMA_TOKEN });
    const recent = await sdk.getRecentFiles(teamId);

    return {
      success: true,
      teamId,
      recent
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example endpoint - Search projects
fastify.get('/projects/team/:teamId/search', async (request, reply) => {
  if (!FIGMA_TOKEN) {
    return reply.code(400).send({
      success: false,
      error: 'FIGMA_TOKEN environment variable not set'
    });
  }

  try {
    const { teamId } = request.params;
    const { query } = request.query;

    if (!query) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required query parameter: query'
      });
    }

    const sdk = new FigmaProjectsSDK({ token: FIGMA_TOKEN });
    const results = await sdk.searchProjects(teamId, query);

    return {
      success: true,
      teamId,
      query,
      results
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
    console.log(`\n🚀 Figma Projects Health Check Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   Test endpoint: http://localhost:${PORT}/test`);
    console.log(`   FIGMA_TOKEN: ${FIGMA_TOKEN ? '✓ Set' : '✗ Not set'}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
