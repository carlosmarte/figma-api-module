/**
 * Unit tests for FigmaFilesClient
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError
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
const { FigmaFilesClient } = await import('../../src/core/client.mjs');

// Helper function to create mock responses
const createMockResponse = (data, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Map(Object.entries(headers)),
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data))
});

describe('FigmaFilesClient', () => {
  let client;
  const mockApiToken = 'test-token';
  const testFileId = 'tmaZV2VEXIIrWYVjqaNUxa';

  beforeEach(() => {
    mockFetch.mockReset();
    client = new FigmaFilesClient({
      apiToken: mockApiToken,
      logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid token', () => {
      const testClient = new FigmaFilesClient({ apiToken: mockApiToken });
      expect(testClient.apiToken).toBe(mockApiToken);
      expect(testClient.baseUrl).toBe('https://api.figma.com');
    });

    it.skip('should throw AuthenticationError without token', () => {
      expect(() => {
        new FigmaFilesClient({});
      }).toThrow(AuthenticationError);
    });

    it.skip('should throw AuthenticationError with empty token', () => {
      expect(() => {
        new FigmaFilesClient({ apiToken: '' });
      }).toThrow(AuthenticationError);
    });

    it('should accept custom configuration', () => {
      const customClient = new FigmaFilesClient({
        apiToken: mockApiToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
    });

    it('should remove trailing slash from baseUrl', () => {
      const customClient = new FigmaFilesClient({
        apiToken: mockApiToken,
        baseUrl: 'https://api.figma.com/'
      });

      expect(customClient.baseUrl).toBe('https://api.figma.com');
    });
  });

  describe('request headers', () => {
    it('should include correct headers', () => {
      const headers = client._getDefaultHeaders();
      
      expect(headers['X-Figma-Token']).toBe(mockApiToken);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('figma-files-api/1.0.0');
      expect(headers['Accept']).toBe('application/json');
    });
  });

  describe('successful requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: []
        },
        name: 'Test File',
        lastModified: '2024-01-01T00:00:00Z',
        version: '1234567890'
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': mockApiToken
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make GET request with query parameters', async () => {
      const mockResponse = {
        nodes: {
          '1:2': { id: '1:2', name: 'Node 1', type: 'FRAME' }
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await client.get('/test', { param1: 'value1', param2: 'value2' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/test?param1=value1&param2=value2',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should make POST request with body', async () => {
      const mockResponse = { 
        comments: [{
          id: '123',
          message: 'Test comment',
          file_key: testFileId
        }]
      };
      const requestData = { message: 'Test comment' };
      
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await client.post('/test', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      );
    });

    it('should filter out null/undefined query parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.get('/test', { 
        param1: 'value1', 
        param2: null, 
        param3: undefined,
        param4: 'value4'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/test?param1=value1&param4=value4',
        expect.anything()
      );
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const errorResponse = { 
        status: 401, 
        err: 'Invalid token',
        message: 'Invalid authentication token'
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, 401, { 'content-type': 'application/json' })
      );

      await expect(client.request('/test')).rejects.toThrow(AuthenticationError);
    });

    it('should handle 429 rate limit errors', async () => {
      const errorResponse = {
        status: 429,
        err: 'Rate limited',
        message: 'Too many requests'
      };

      // Create a client with no retries for this test
      const noRetryClient = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 0 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, 429, {
          'content-type': 'application/json',
          'retry-after': '60'
        })
      );

      await expect(noRetryClient.request('/test')).rejects.toThrow(RateLimitError);
    });

    it('should handle 404 not found errors', async () => {
      const errorResponse = {
        status: 404,
        err: 'Not found',
        message: 'Resource not found'
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, 404, { 'content-type': 'application/json' })
      );

      await expect(client.request('/test')).rejects.toThrow(Error);
    });

    it('should handle network errors', async () => {
      // Create a client with no retries for this test
      const noRetryClient = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 0 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(noRetryClient.request('/test')).rejects.toThrow(NetworkError);
    });

    it('should handle request timeout', async () => {
      const shortTimeoutClient = new FigmaFilesClient({
        apiToken: mockApiToken,
        timeout: 100,
        retryConfig: { maxRetries: 0 },  // No retries for this test
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      // Mock a request that takes longer than timeout - will be aborted
      mockFetch.mockImplementationOnce(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 200);
        }).catch(err => {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          throw abortError;
        })
      );

      await expect(shortTimeoutClient.request('/test')).rejects.toThrow(TimeoutError);
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      const successResponse = {
        document: { id: '0:0', name: 'Document', type: 'DOCUMENT' },
        name: 'Success File'
      };

      const client = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 2, initialDelay: 10 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      // First two calls fail with 500, third succeeds
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ err: 'Server error' }, 500)
        )
        .mockResolvedValueOnce(
          createMockResponse({ err: 'Server error' }, 500)
        )
        .mockResolvedValueOnce(
          createMockResponse(successResponse)
        );

      const result = await client.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(successResponse);
    });

    it('should not retry on non-retryable errors', async () => {
      const errorResponse = { 
        status: 401,
        err: 'Unauthorized'
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, 401, { 'content-type': 'application/json' })
      );

      await expect(client.request('/test')).rejects.toThrow(AuthenticationError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const client = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 1, initialDelay: 10 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      // All calls fail with 500
      mockFetch.mockResolvedValue(
        createMockResponse({ err: 'Server error' }, 500)
      );

      await expect(client.request('/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Original + 1 retry
    });

    it('should handle 502 errors with retry', async () => {
      const client = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 1, initialDelay: 10 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ err: 'Bad gateway' }, 502))
        .mockResolvedValueOnce(createMockResponse({ data: 'success' }));

      const result = await client.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should handle 503 errors with retry', async () => {
      const client = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 1, initialDelay: 10 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ err: 'Service unavailable' }, 503))
        .mockResolvedValueOnce(createMockResponse({ data: 'success' }));

      const result = await client.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('rate limiting', () => {
    it('should track request timestamps', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const initialLength = client.requestTimestamps.length;
      await client.request('/test');
      
      expect(client.requestTimestamps.length).toBe(initialLength + 1);
    });

    it('should clean old timestamps', async () => {
      // Add old timestamp
      client.requestTimestamps.push(Date.now() - 70000); // 70 seconds ago
      
      mockFetch.mockResolvedValue(createMockResponse({}));

      await client.request('/test');
      
      // Old timestamp should be cleaned
      expect(client.requestTimestamps.every(ts => 
        Date.now() - ts < 60000
      )).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track request statistics', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      const initialStats = client.getStats();
      await client.request('/test');
      const finalStats = client.getStats();

      expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 1);
      expect(finalStats.successfulRequests).toBe(initialStats.successfulRequests + 1);
    });

    it('should track failed requests', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ err: 'Unauthorized' }, 401, { 'content-type': 'application/json' })
      );

      const initialStats = client.getStats();
      
      try {
        await client.request('/test');
      } catch (error) {
        // Expected error
      }

      const finalStats = client.getStats();
      expect(finalStats.failedRequests).toBe(initialStats.failedRequests + 1);
    });

    it('should reset statistics', () => {
      client.stats.totalRequests = 10;
      client.resetStats();
      
      expect(client.stats.totalRequests).toBe(0);
    });
  });

  describe('health check', () => {
    it('should return true for successful health check', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ 
          id: 'user123',
          handle: 'testuser',
          img_url: 'https://example.com/avatar.png',
          email: 'test@example.com'
        })
      );

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false for failed health check', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ err: 'Unauthorized' }, 401)
      );

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false for network error in health check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('get and post methods', () => {
    it('should use GET method for get()', async () => {
      const mockResponse = {
        images: {
          '1:2': `https://figma.com/images/${testFileId}/node-1-2.png`
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await client.get(`/v1/images/${testFileId}`, { ids: '1:2' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/images/'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should use POST method for post()', async () => {
      const mockResponse = {
        comment: {
          id: '456',
          message: 'New comment',
          file_key: testFileId
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await client.post(`/v1/files/${testFileId}/comments`, {
        message: 'New comment'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Figma-specific endpoints', () => {
    it('should handle file endpoint correctly', async () => {
      const mockFileResponse = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: []
        },
        components: {},
        componentSets: {},
        schemaVersion: 0,
        styles: {},
        name: 'Test File',
        lastModified: '2024-01-01T00:00:00Z',
        thumbnailUrl: `https://figma.com/file/${testFileId}/thumbnail`,
        version: '1234567890',
        role: 'owner',
        editorType: 'figma',
        linkAccess: 'view'
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockFileResponse));

      const result = await client.get(`/v1/files/${testFileId}`);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${testFileId}`,
        expect.anything()
      );
      expect(result).toEqual(mockFileResponse);
    });

    it('should handle nodes endpoint correctly', async () => {
      const mockNodesResponse = {
        nodes: {
          '1:2': {
            document: {
              id: '1:2',
              name: 'Test Node',
              type: 'FRAME',
              children: []
            }
          },
          '3:4': null // Node not found
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockNodesResponse));

      const result = await client.get(`/v1/files/${testFileId}/nodes`, {
        ids: '1:2,3:4'
      });

      expect(result).toEqual(mockNodesResponse);
    });

    it('should handle images endpoint correctly', async () => {
      const mockImagesResponse = {
        err: null,
        images: {
          '1:2': `https://s3-alpha-sig.figma.com/img/${testFileId}/node-1-2.png`,
          '3:4': `https://s3-alpha-sig.figma.com/img/${testFileId}/node-3-4.png`
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockImagesResponse));

      const result = await client.get(`/v1/images/${testFileId}`, {
        ids: '1:2,3:4',
        scale: 2,
        format: 'png'
      });

      expect(result).toEqual(mockImagesResponse);
    });
  });
});