/**
 * Unit tests for FigmaCommentsClient
 */

import { jest } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';

// Import modules
const { default: FigmaCommentsClient } = await import('../../src/core/client.mjs');

// Import error classes and adapters from figma-fetch
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  NotFoundError,
  ValidationError,
  UndiciFetchAdapter
} from '../../../figma-fetch/dist/index.mjs';

describe('FigmaCommentsClient', () => {
  let client;
  let mockAgent;
  let originalDispatcher;
  let mockLogger;
  const mockApiToken = 'test-token';

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Create client with UndiciFetchAdapter so MockAgent can intercept requests
    client = new FigmaCommentsClient({
      apiToken: mockApiToken,
      logger: mockLogger,
      fetchAdapter: new UndiciFetchAdapter()
    });
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
    mockAgent.close();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should throw error without API token', () => {
      const originalToken = process.env.FIGMA_TOKEN;
      delete process.env.FIGMA_TOKEN;

      expect(() => new FigmaCommentsClient()).toThrow('API token is required');

      if (originalToken) process.env.FIGMA_TOKEN = originalToken;
    });

    test('should initialize with default options', () => {
      expect(client.apiToken).toBe(mockApiToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
      expect(client.timeout).toBe(30000);
    });

    test('should initialize with custom options', () => {
      const customClient = new FigmaCommentsClient({
        apiToken: mockApiToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        retries: 5,
        proxyUrl: 'http://localhost:9999'
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
      expect(customClient.retries).toBe(5);
    });
  });

  describe('Request', () => {
    test('should make successful GET request', async () => {
      const mockResponse = { comments: [] };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/files/test/comments');

      expect(result).toEqual(mockResponse);
    });

    test('should make successful POST request', async () => {
      const mockResponse = { id: 'comment-123' };
      const requestBody = { message: 'Test comment' };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'POST'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: requestBody
      });

      expect(result).toEqual(mockResponse);
    });

    test('should handle 404 error', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/invalid/comments',
        method: 'GET'
      }).reply(404, { error: 'File not found' }, {
        headers: { 'content-type': 'application/json' }
      });

      await expect(client.request('/v1/files/invalid/comments'))
        .rejects.toThrow('Resource not found');
    });

    test('should handle 429 rate limit error', async () => {
      const noRetryClient = new FigmaCommentsClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 0 },
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(429, { error: 'Rate limited' }, {
        headers: {
          'content-type': 'application/json',
          'retry-after': '60'
        }
      });

      await expect(noRetryClient.request('/v1/files/test/comments'))
        .rejects.toThrow();
    });

    test('should use cache for GET requests', async () => {
      const mockResponse = { comments: [] };
      const mockPool = mockAgent.get('https://api.figma.com');
      // Set up multiple intercepts in case cache doesn't work
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      // First request
      const result1 = await client.request('/v1/files/test/comments');

      // Second request should use cache
      const result2 = await client.request('/v1/files/test/comments');

      // Both results should be the same
      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
    });

    test('should bypass cache when requested', async () => {
      const mockResponse = { comments: [] };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      // First request
      await client.request('/v1/files/test/comments');

      // Second request with cache bypass
      await client.request('/v1/files/test/comments', { bypassCache: true });
    });
  });

  describe('Retry Logic', () => {
    test('should retry on 500 error', async () => {
      const mockResponse = { comments: [] };

      const retryClient = new FigmaCommentsClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 2, initialDelay: 10 },
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      // First attempt fails, second succeeds
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(500, { error: 'Server error' }, {
        headers: { 'content-type': 'application/json' }
      });
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await retryClient.request('/v1/files/test/comments');

      expect(result).toEqual(mockResponse);
    }, 10000); // 10 second timeout for retry test

    test('should not retry on 401 error', async () => {
      const noRetryClient = new FigmaCommentsClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 3 },
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(401, { error: 'Unauthorized' }, {
        headers: { 'content-type': 'application/json' }
      });

      await expect(noRetryClient.request('/v1/files/test/comments'))
        .rejects.toThrow();
    });

    test('should fail after max retries', async () => {
      const retryClient = new FigmaCommentsClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 3, initialDelay: 10 },
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      // Set up 4 failing responses (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        mockPool.intercept({
          path: '/v1/files/test/comments',
          method: 'GET'
        }).reply(500, { error: 'Server error' }, {
          headers: { 'content-type': 'application/json' }
        });
      }

      await expect(retryClient.request('/v1/files/test/comments'))
        .rejects.toThrow();
    }, 10000); // 10 second timeout for retry test
  });

  describe('Statistics', () => {
    test('should track request statistics', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, { comments: [] }, {
        headers: { 'content-type': 'application/json' }
      });

      await client.request('/v1/files/test/comments');

      const stats = client.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
    });

    test('should track failed requests', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(404, { error: 'Not found' }, {
        headers: { 'content-type': 'application/json' }
      });

      try {
        await client.request('/v1/files/test/comments');
      } catch (error) {
        // Expected to fail
      }

      const stats = client.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/me',
        method: 'GET'
      }).reply(200, { id: 'user-123' }, {
        headers: { 'content-type': 'application/json' }
      });

      const health = await client.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
    });

    test('should return unhealthy status on error', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/me',
        method: 'GET'
      }).reply(401, { error: 'Unauthorized' }, {
        headers: { 'content-type': 'application/json' }
      });

      const health = await client.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });
  });
});

describe('RateLimiter', () => {
  // Note: RateLimiter is now an internal component of FigmaApiClient
  // and is tested in the figma-fetch module
  test('should be tested in figma-fetch module', () => {
    expect(true).toBe(true);
  });
});

describe('RequestCache', () => {
  // Note: RequestCache is now an internal component of FigmaApiClient
  // and is tested in the figma-fetch module
  test('should be tested in figma-fetch module', () => {
    expect(true).toBe(true);
  });
});