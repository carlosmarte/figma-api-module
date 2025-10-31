/**
 * Unit tests for FigmaFilesClient
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ValidationError,
  HttpError
} from '../../src/core/exceptions.mjs';

// Mock undici module
const mockFetch = jest.fn();

jest.unstable_mockModule('undici', () => ({
  fetch: mockFetch,
  ProxyAgent: jest.fn().mockImplementation(() => ({
    dispatch: jest.fn()
  })),
  setGlobalDispatcher: jest.fn(),
  Agent: jest.fn().mockImplementation(() => ({
    dispatch: jest.fn()
  }))
}));

// Import the client after mocking undici
const { default: FigmaFilesClient } = await import('../../src/core/client.mjs');

// Create an alias for tests to use
const fetch = mockFetch;

describe('FigmaFilesClient', () => {
  const validApiToken = 'figd_test_token_123';
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new FigmaFilesClient({
      apiToken: validApiToken,
      logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
    });
  });

  describe('constructor', () => {
    it('should create client with valid token', () => {
      expect(client.apiToken).toBe(validApiToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    it('should throw AuthenticationError without token', () => {
      expect(() => {
        new FigmaFilesClient({});
      }).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError with empty token', () => {
      expect(() => {
        new FigmaFilesClient({ apiToken: '' });
      }).toThrow(AuthenticationError);
    });

    it('should accept custom configuration', () => {
      const customClient = new FigmaFilesClient({
        apiToken: validApiToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        maxRetries: 5
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
      expect(customClient.maxRetries).toBe(5);
    });

    // Note: Client doesn't validate timeout or maxRetries values
    // These would be implementation-specific validations if needed
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await client.request('/v1/teams/123/projects');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/123/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Figma-Token': validApiToken,
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle POST request with body', async () => {
      const requestBody = { name: 'Test Project' };
      const mockResponse = { id: '456', name: 'Test Project' };

      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await client.request('/v1/projects', {
        method: 'POST',
        body: requestBody
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpError for 404 response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Team not found'
      });

      await expect(client.request('/v1/teams/invalid/projects'))
        .rejects.toThrow(HttpError);
    });

    it('should throw RateLimitError for 429 response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['Retry-After', '60']]),
        text: async () => 'Rate limit exceeded'
      });

      await expect(client.request('/v1/teams/123/projects'))
        .rejects.toThrow(RateLimitError);
    });

    it('should retry on network error', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };

      // First call fails, second succeeds
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => mockResponse
        });

      const result = await client.request('/v1/teams/123/projects');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('should respect maxRetries limit', async () => {
      const clientWithLowRetries = new FigmaFilesClient({
        apiToken: validApiToken,
        maxRetries: 1,
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      fetch.mockRejectedValue(new Error('Network error'));

      await expect(clientWithLowRetries.request('/v1/teams/123/projects'))
        .rejects.toThrow(NetworkError);

      expect(fetch).toHaveBeenCalledTimes(2); // Original + 1 retry
    });
  });

  describe('getTeamProjects', () => {
    it('should validate teamId parameter', async () => {
      await expect(client.getTeamProjects(''))
        .rejects.toThrow(ValidationError);

      await expect(client.getTeamProjects(null))
        .rejects.toThrow(ValidationError);
    });

    it('should make request to correct endpoint', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      await client.getTeamProjects('team123');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/team123/projects',
        expect.any(Object)
      );
    });

    it('should encode teamId in URL', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      await client.getTeamProjects('team with spaces');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/team%20with%20spaces/projects',
        expect.any(Object)
      );
    });
  });

  describe('getProjectFiles', () => {
    it('should validate projectId parameter', async () => {
      await expect(client.getProjectFiles(''))
        .rejects.toThrow(ValidationError);

      await expect(client.getProjectFiles(null))
        .rejects.toThrow(ValidationError);
    });

    it('should make request without branch data by default', async () => {
      const mockResponse = { name: 'Test Project', files: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      await client.getProjectFiles('project123');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/projects/project123/files',
        expect.any(Object)
      );
    });

    it('should include branch data when requested', async () => {
      const mockResponse = { name: 'Test Project', files: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      await client.getProjectFiles('project123', { branchData: true });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/projects/project123/files?branch_data=true',
        expect.any(Object)
      );
    });
  });

  describe('rate limiting', () => {
    it('should return rate limit status', () => {
      const status = client.getRateLimitStatus();
      
      expect(status).toHaveProperty('requestsRemaining');
      expect(status).toHaveProperty('totalRequests');
      expect(status).toHaveProperty('windowMs');
      expect(status).toHaveProperty('nextResetTime');
    });

    it('should respect rate limits', async () => {
      const clientWithLowLimit = new FigmaFilesClient({
        apiToken: validApiToken,
        rateLimitRpm: 1, // Very low limit for testing
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      const mockResponse = { name: 'Test Team', projects: [] };
      
      fetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
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
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      // First request
      const result1 = await client.request('/v1/teams/123/projects');
      
      // Second request (should use cache)
      const result2 = await client.request('/v1/teams/123/projects');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should not cache non-GET requests', async () => {
      const mockResponse = { id: '456', name: 'Test Project' };

      fetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      // Make two POST requests
      await client.request('/v1/projects', { method: 'POST', body: {} });
      await client.request('/v1/projects', { method: 'POST', body: {} });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const stats = client.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
    });

    it('should clear cache when requested', () => {
      client.clearCache();
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('metrics', () => {
    it('should track request metrics', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      await client.request('/v1/teams/123/projects');

      const metrics = client.getMetrics();
      
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.successRate).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track failed requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not found'
      });

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

    it('should reset metrics when requested', async () => {
      const mockResponse = { name: 'Test Team', projects: [] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
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
    it('should handle invalid JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Invalid response'
      });

      await expect(client.request('/v1/teams/123/projects'))
        .rejects.toThrow(ValidationError);
    });

    it('should handle timeout', async () => {
      const clientWithShortTimeout = new FigmaFilesClient({
        apiToken: validApiToken,
        timeout: 1, // Very short timeout
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      await expect(clientWithShortTimeout.request('/v1/teams/123/projects'))
        .rejects.toThrow();
    });

    it('should handle non-JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html>Error page</html>'
      });

      const result = await client.request('/v1/teams/123/projects');
      expect(result).toBe('<html>Error page</html>');
    });
  });
});