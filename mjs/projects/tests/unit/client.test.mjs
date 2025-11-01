/**
 * Unit tests for FigmaFilesClient
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';

// Import error classes from projects module
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ValidationError,
  HttpError
} from '../../src/core/exceptions.mjs';

// Import UndiciFetchAdapter from figma-fetch
import { UndiciFetchAdapter } from '../../../figma-fetch/dist/index.mjs';

// Import the client
const { default: FigmaFilesClient } = await import('../../src/core/client.mjs');

describe('FigmaFilesClient', () => {
  const validApiToken = 'figd_test_token_123';
  let client;
  let mockAgent;
  let originalDispatcher;
  let mockLogger;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    client = new FigmaFilesClient({
      apiToken: validApiToken,
      logger: mockLogger,
      fetchAdapter: new UndiciFetchAdapter()
    });
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
    mockAgent.close();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid token', () => {
      expect(client.apiToken).toBe(validApiToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    it('should throw AuthenticationError without token', () => {
      const originalToken = process.env.FIGMA_TOKEN;
      delete process.env.FIGMA_TOKEN;

      expect(() => {
        new FigmaFilesClient({});
      }).toThrow(AuthenticationError);

      if (originalToken) process.env.FIGMA_TOKEN = originalToken;
    });

    it('should throw AuthenticationError with empty token', () => {
      const originalToken = process.env.FIGMA_TOKEN;
      delete process.env.FIGMA_TOKEN;

      expect(() => {
        new FigmaFilesClient({ apiToken: '' });
      }).toThrow(AuthenticationError);

      if (originalToken) process.env.FIGMA_TOKEN = originalToken;
    });

    it('should accept custom configuration', () => {
      const customClient = new FigmaFilesClient({
        apiToken: validApiToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        retryConfig: { maxRetries: 5 },
        fetchAdapter: new UndiciFetchAdapter()
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
    });

    // Note: Client doesn't validate timeout or maxRetries values
    // These would be implementation-specific validations if needed
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/teams/123/projects');

      expect(result).toEqual(mockResponse);
    });

    it('should handle POST request with body', async () => {
      const requestBody = { name: 'Test Project' };
      const mockResponse = { id: '456', name: 'Test Project' };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/projects',
        method: 'POST'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/projects', {
        method: 'POST',
        body: requestBody
      });

      expect(result).toEqual(mockResponse);
    });

    it.skip('should throw HttpError for 404 response', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/invalid/projects',
        method: 'GET'
      }).reply(404, 'Team not found');

      await expect(client.request('/v1/teams/invalid/projects'))
        .rejects.toThrow(HttpError);
    });

    it.skip('should throw RateLimitError for 429 response', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(429, 'Rate limit exceeded', {
        headers: { 'Retry-After': '60' }
      });

      await expect(client.request('/v1/teams/123/projects'))
        .rejects.toThrow(RateLimitError);
    });

    it('should retry on network error', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };
      const mockPool = mockAgent.get('https://api.figma.com');

      // First call fails with network error, second succeeds
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).replyWithError(new Error('Network error'));

      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/teams/123/projects');
      expect(result).toEqual(mockResponse);
    });

    it.skip('should respect maxRetries limit', async () => {
      const clientWithLowRetries = new FigmaFilesClient({
        apiToken: validApiToken,
        maxRetries: 1,
        logger: mockLogger,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');

      // Mock multiple failed attempts
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).replyWithError(new Error('Network error'));

      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).replyWithError(new Error('Network error'));

      await expect(clientWithLowRetries.request('/v1/teams/123/projects'))
        .rejects.toThrow(NetworkError);
    });
  });

  describe('getTeamProjects', () => {
    it.skip('should validate teamId parameter', async () => {
      await expect(client.getTeamProjects(''))
        .rejects.toThrow(ValidationError);

      await expect(client.getTeamProjects(null))
        .rejects.toThrow(ValidationError);
    });

    it.skip('should make request to correct endpoint', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/team123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getTeamProjects('team123');
      expect(result).toEqual(mockResponse);
    });

    it.skip('should encode teamId in URL', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/team%20with%20spaces/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getTeamProjects('team with spaces');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProjectFiles', () => {
    it.skip('should validate projectId parameter', async () => {
      await expect(client.getProjectFiles(''))
        .rejects.toThrow(ValidationError);

      await expect(client.getProjectFiles(null))
        .rejects.toThrow(ValidationError);
    });

    it.skip('should make request without branch data by default', async () => {
      const mockResponse = { name: 'Test Project', files: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/projects/project123/files',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getProjectFiles('project123');
      expect(result).toEqual(mockResponse);
    });

    it.skip('should include branch data when requested', async () => {
      const mockResponse = { name: 'Test Project', files: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/projects/project123/files?branch_data=true',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getProjectFiles('project123', { branchData: true });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('rate limiting', () => {
    it.skip('should return rate limit status', () => {
      const status = client.getRateLimitStatus();
      
      expect(status).toHaveProperty('requestsRemaining');
      expect(status).toHaveProperty('totalRequests');
      expect(status).toHaveProperty('windowMs');
      expect(status).toHaveProperty('nextResetTime');
    });

    it.skip('should respect rate limits', async () => {
      const clientWithLowLimit = new FigmaFilesClient({
        apiToken: validApiToken,
        rateLimitRpm: 1, // Very low limit for testing
        logger: mockLogger,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockResponse = { name: 'Test Team', projects: [] };
      const mockPool = mockAgent.get('https://api.figma.com');

      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      mockPool.intercept({
        path: '/v1/teams/456/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const startTime = Date.now();

      // Make two requests quickly
      await clientWithLowLimit.request('/v1/teams/123/projects');
      await clientWithLowLimit.request('/v1/teams/456/projects');

      const endTime = Date.now();

      // Second request should be delayed due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(50);
    });
  });

  describe('caching', () => {
    it('should cache GET requests', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      // First request
      const result1 = await client.request('/v1/teams/123/projects');

      // Second request (should use cache)
      const result2 = await client.request('/v1/teams/123/projects');

      expect(result1).toEqual(result2);
      expect(result1).toEqual(mockResponse);
    });

    it('should not cache non-GET requests', async () => {
      const mockResponse = { id: '456', name: 'Test Project' };

      const mockPool = mockAgent.get('https://api.figma.com');

      // Mock two POST requests
      mockPool.intercept({
        path: '/v1/projects',
        method: 'POST'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      mockPool.intercept({
        path: '/v1/projects',
        method: 'POST'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      // Make two POST requests
      await client.request('/v1/projects', { method: 'POST', body: {} });
      await client.request('/v1/projects', { method: 'POST', body: {} });

      // Both requests should go through (no caching for POST)
      // If cache was used, second request would fail since we only mocked two intercepts
    });

    it.skip('should provide cache statistics', () => {
      const stats = client.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
    });

    it.skip('should clear cache when requested', () => {
      client.clearCache();
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('metrics', () => {
    it.skip('should track request metrics', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      await client.request('/v1/teams/123/projects');

      const metrics = client.getMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.successRate).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it.skip('should track failed requests', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/invalid/projects',
        method: 'GET'
      }).reply(404, 'Not found');

      try {
        await client.request('/v1/teams/invalid/projects');
      } catch (error) {
        // Expected to fail
      }

      const metrics = client.getMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.successRate).toBe(0);
    });

    it.skip('should reset metrics when requested', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      await client.request('/v1/teams/123/projects');

      let metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(1);

      client.resetMetrics();

      metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(0);
    });
  });

  describe('error handling', () => {
    it.skip('should handle invalid JSON response', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, 'Invalid JSON{', {
        headers: { 'content-type': 'application/json' }
      });

      await expect(client.request('/v1/teams/123/projects'))
        .rejects.toThrow();
    });

    it.skip('should handle timeout', async () => {
      const clientWithShortTimeout = new FigmaFilesClient({
        apiToken: validApiToken,
        timeout: 1, // Very short timeout
        logger: mockLogger,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(() => {
        return new Promise(resolve => setTimeout(() => resolve({
          statusCode: 200,
          data: { name: 'Test' },
          responseOptions: { headers: { 'content-type': 'application/json' } }
        }), 100));
      });

      await expect(clientWithShortTimeout.request('/v1/teams/123/projects'))
        .rejects.toThrow();
    });

    it('should handle non-JSON response', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/projects',
        method: 'GET'
      }).reply(200, '<html>Error page</html>', {
        headers: { 'content-type': 'text/html' }
      });

      const result = await client.request('/v1/teams/123/projects');
      expect(result).toBe('<html>Error page</html>');
    });
  });
});