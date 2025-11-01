/**
 * Unit tests for FigmaVariablesClient
 */

import { jest } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';

// Import error classes from variables module
const {
  AuthenticationError,
  EnterpriseAccessError,
  ValidationError,
  RateLimitError,
  NetworkError,
  ScopeError
} = await import('../../src/core/exceptions.mjs');

// Import UndiciFetchAdapter from figma-fetch
import { UndiciFetchAdapter } from '../../../figma-fetch/dist/index.mjs';

// Import the client
const { FigmaVariablesClient } = await import('../../src/core/client.mjs');

describe('FigmaVariablesClient', () => {
  let client;
  let mockAgent;
  let originalDispatcher;
  let mockLogger;
  const mockAccessToken = 'test-token';
  const mockFileKey = 'test-file-key';

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

    client = new FigmaVariablesClient({
      accessToken: mockAccessToken,
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
    it.skip('should create client with valid access token', () => {
      expect(client.accessToken).toBe(mockAccessToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    it.skip('should throw error without access token', () => {
      expect(() => {
        new FigmaVariablesClient({});
      }).toThrow(AuthenticationError);
    });

    it('should accept custom configuration', () => {
      const customClient = new FigmaVariablesClient({
        accessToken: mockAccessToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        fetchAdapter: new UndiciFetchAdapter()
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
    });
  });

  describe('getLocalVariables', () => {
    const mockResponse = {
      status: 200,
      error: false,
      meta: {
        variables: { 'var1': { name: 'Test Variable' } },
        variableCollections: { 'col1': { name: 'Test Collection' } }
      }
    };

    it.skip('should fetch local variables successfully', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getLocalVariables(mockFileKey);

      expect(result).toEqual(mockResponse);
    });

    it.skip('should throw validation error for missing file key', async () => {
      await expect(client.getLocalVariables()).rejects.toThrow(ValidationError);
    });

    it.skip('should handle enterprise access error', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(403, { message: 'Forbidden' });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow();
    });
  });

  describe('getPublishedVariables', () => {
    const mockResponse = {
      status: 200,
      error: false,
      meta: {
        variables: { 'var1': { name: 'Published Variable' } },
        variableCollections: { 'col1': { name: 'Published Collection' } }
      }
    };

    it.skip('should fetch published variables successfully', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/published`,
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getPublishedVariables(mockFileKey);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateVariables', () => {
    const mockChanges = {
      variables: [{
        action: 'CREATE',
        id: 'temp-var-1',
        name: 'New Variable'
      }]
    };

    const mockResponse = {
      status: 200,
      error: false,
      meta: {
        tempIdToRealId: { 'temp-var-1': 'real-var-1' }
      }
    };

    it.skip('should update variables successfully', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables`,
        method: 'POST'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.updateVariables(mockFileKey, mockChanges);

      expect(result).toEqual(mockResponse);
    });

    it.skip('should validate changes payload', async () => {
      await expect(client.updateVariables(mockFileKey, null))
        .rejects.toThrow(ValidationError);
    });

    it.skip('should validate payload size', async () => {
      const largeChanges = {
        variables: Array(10000).fill().map((_, i) => ({
          action: 'CREATE',
          id: `var-${i}`,
          name: 'A'.repeat(1000) // Create large payload
        }))
      };

      await expect(client.updateVariables(mockFileKey, largeChanges))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('error handling', () => {
    it.skip('should handle rate limiting', async () => {
      // Create a test client with very short retry delays
      const testClient = new FigmaVariablesClient({
        accessToken: mockAccessToken,
        timeout: 1000, // Short timeout
        retryConfig: { maxRetries: 1 },
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(429, {message: 'Rate limited'}, {
        headers: { 'Retry-After': '1' }
      });

      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(429, {message: 'Rate limited'}, {
        headers: { 'Retry-After': '1' }
      });

      await expect(testClient.getLocalVariables(mockFileKey))
        .rejects.toThrow(RateLimitError);
    }, 10000);

    it.skip('should handle authentication errors', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(401, { message: 'Unauthorized' });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow(AuthenticationError);
    });

    it.skip('should handle network errors', async () => {
      // Create a test client with no retries for this specific test
      const testClient = new FigmaVariablesClient({
        accessToken: mockAccessToken,
        retryConfig: { maxRetries: 0 },
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).replyWithError(new Error('Network error'));

      await expect(testClient.getLocalVariables(mockFileKey))
        .rejects.toThrow(NetworkError);
    });
  });

  describe('retry logic', () => {
    it.skip('should retry on transient failures', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      const mockResponse = { status: 200, error: false, meta: {} };

      // First call fails with network error
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).replyWithError(new Error('Network error'));

      // Second call succeeds
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getLocalVariables(mockFileKey);

      expect(result.status).toBe(200);
    });

    it.skip('should not retry on non-retryable errors', async () => {
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(400, { message: 'Bad request' });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow();
    });
  });

  describe('caching', () => {
    it.skip('should work without cache', async () => {
      const mockResponse = { status: 200, error: false, meta: {} };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.getLocalVariables(mockFileKey);
      expect(result.status).toBe(200);
    });

    it.skip('should integrate with provided cache', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true)
      };

      const cachedClient = new FigmaVariablesClient({
        accessToken: mockAccessToken,
        cache: mockCache,
        fetchAdapter: new UndiciFetchAdapter()
      });

      const mockResponse = { status: 200, error: false, meta: {} };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: `/v1/files/${mockFileKey}/variables/local`,
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      await cachedClient.getLocalVariables(mockFileKey);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it.skip('should return client statistics', () => {
      const stats = client.getStats();

      expect(stats).toEqual({
        baseUrl: 'https://api.figma.com',
        timeout: 30000,
        retryConfig: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffFactor: 2
        },
        enterpriseScopes: {
          read: 'file_variables:read',
          write: 'file_variables:write'
        }
      });
    });
  });
});