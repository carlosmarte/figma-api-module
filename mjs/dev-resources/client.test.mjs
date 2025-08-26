/**
 * Tests for FigmaDevResourcesClient
 */

import { jest } from '@jest/globals';

// Mock undici before importing the client
const mockFetch = jest.fn();
const mockProxyAgent = jest.fn();

jest.unstable_mockModule('undici', () => ({
  fetch: mockFetch,
  ProxyAgent: mockProxyAgent
}));

// Import the client after mocking
const { 
  FigmaDevResourcesClient, 
  FigmaApiError, 
  FigmaRateLimitError, 
  FigmaAuthError, 
  FigmaValidationError 
} = await import('./client.mjs');

describe('FigmaDevResourcesClient', () => {
  let client;
  const mockAccessToken = 'test-token';
  const mockBaseUrl = 'https://api.figma.com';

  beforeAll(() => {
    // Global mock for AbortSignal to avoid repetition
    global.AbortSignal = {
      timeout: jest.fn(() => ({}))
    };
  });

  beforeEach(() => {
    client = new FigmaDevResourcesClient({
      accessToken: mockAccessToken,
      baseUrl: mockBaseUrl
    });
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should create client with required access token', () => {
      expect(client.accessToken).toBe(mockAccessToken);
      expect(client.baseUrl).toBe(mockBaseUrl);
    });

    it('should throw FigmaAuthError if no access token provided', () => {
      expect(() => {
        new FigmaDevResourcesClient({});
      }).toThrow(FigmaAuthError);
    });

    it('should use default base URL if not provided', () => {
      const defaultClient = new FigmaDevResourcesClient({
        accessToken: mockAccessToken
      });
      expect(defaultClient.baseUrl).toBe('https://api.figma.com');
    });
  });

  describe('getDevResources', () => {
    const mockFileKey = 'test-file-key';
    const mockResponse = {
      dev_resources: [
        {
          id: 'resource-1',
          name: 'Test Resource',
          url: 'https://example.com',
          file_key: mockFileKey,
          node_id: 'node-1'
        }
      ]
    };

    it('should fetch dev resources successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.getDevResources(mockFileKey);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include node_ids query parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const nodeIds = ['node-1', 'node-2'];
      await client.getDevResources(mockFileKey, { nodeIds });

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources?node_ids=node-1%2Cnode-2`,
        expect.any(Object)
      );
    });

    it('should throw FigmaValidationError if file key is missing', async () => {
      await expect(client.getDevResources()).rejects.toThrow(FigmaValidationError);
    });

    it('should handle string nodeIds parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      await client.getDevResources(mockFileKey, { nodeIds: 'node-1,node-2' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources?node_ids=node-1%2Cnode-2`,
        expect.any(Object)
      );
    });
  });

  describe('createDevResources', () => {
    const mockDevResources = [
      {
        name: 'Test Resource',
        url: 'https://example.com',
        file_key: 'test-file',
        node_id: 'node-1'
      }
    ];

    const mockResponse = {
      links_created: [
        {
          id: 'resource-1',
          name: 'Test Resource',
          url: 'https://example.com',
          file_key: 'test-file',
          node_id: 'node-1'
        }
      ],
      errors: []
    };

    it('should create dev resources successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.createDevResources(mockDevResources);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/dev_resources`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ dev_resources: mockDevResources }),
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw FigmaValidationError for empty array', async () => {
      await expect(client.createDevResources([])).rejects.toThrow(FigmaValidationError);
    });

    it('should throw FigmaValidationError for non-array input', async () => {
      await expect(client.createDevResources({})).rejects.toThrow(FigmaValidationError);
    });

    it('should validate required fields', async () => {
      const invalidResource = [{ name: 'Test' }]; // Missing required fields

      await expect(client.createDevResources(invalidResource)).rejects.toThrow(FigmaValidationError);
    });

    it('should validate URL format', async () => {
      const invalidUrlResource = [
        {
          name: 'Test Resource',
          url: 'invalid-url',
          file_key: 'test-file',
          node_id: 'node-1'
        }
      ];

      await expect(client.createDevResources(invalidUrlResource)).rejects.toThrow(FigmaValidationError);
    });
  });

  describe('updateDevResources', () => {
    const mockDevResources = [
      {
        id: 'resource-1',
        name: 'Updated Resource',
        url: 'https://updated.example.com'
      }
    ];

    const mockResponse = {
      links_updated: [
        {
          id: 'resource-1',
          name: 'Updated Resource',
          url: 'https://updated.example.com',
          file_key: 'test-file',
          node_id: 'node-1'
        }
      ],
      errors: []
    };

    it('should update dev resources successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.updateDevResources(mockDevResources);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/dev_resources`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ dev_resources: mockDevResources })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw FigmaValidationError if resource ID is missing', async () => {
      const invalidResource = [{ name: 'Test' }]; // Missing id

      await expect(client.updateDevResources(invalidResource)).rejects.toThrow(FigmaValidationError);
    });
  });

  describe('deleteDevResource', () => {
    const mockFileKey = 'test-file';
    const mockResourceId = 'resource-1';

    it('should delete dev resource successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({})
      });

      await client.deleteDevResource(mockFileKey, mockResourceId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/files/${mockFileKey}/dev_resources/${mockResourceId}`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should throw FigmaValidationError if file key is missing', async () => {
      await expect(client.deleteDevResource(null, mockResourceId)).rejects.toThrow(FigmaValidationError);
    });

    it('should throw FigmaValidationError if resource ID is missing', async () => {
      await expect(client.deleteDevResource(mockFileKey, null)).rejects.toThrow(FigmaValidationError);
    });
  });

  describe('error handling', () => {
    it('should throw FigmaRateLimitError for 429 status', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 429,
        ok: false,
        headers: {
          get: jest.fn().mockReturnValue('60')
        }
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaRateLimitError);
    });

    it('should throw FigmaAuthError for 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaAuthError);
    });

    it('should throw FigmaApiError for 403 status', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 403,
        ok: false
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaApiError);
    });

    it('should throw FigmaApiError for other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValueOnce({ message: 'Server error' })
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaApiError);
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      // Create error with proper cause property for retry logic
      const networkError = new Error('Connection reset');
      networkError.cause = { code: 'ECONNRESET' };
      
      // Mock network error first, then success
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce({ dev_resources: [] })
        });

      // Mock sleep to make test faster
      jest.spyOn(client, '_sleep').mockResolvedValue();

      const result = await client.getDevResources('test-file');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ dev_resources: [] });
    });

    it('should not retry on authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaAuthError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limit with retry after', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 429,
        ok: false,
        headers: {
          get: jest.fn().mockReturnValue('1')
        }
      });

      await expect(client.getDevResources('test-file')).rejects.toThrow(FigmaRateLimitError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('batch operations', () => {
    it('should handle batch create with progress callback', async () => {
      const mockResources = [
        { name: 'Resource 1', url: 'https://example1.com', file_key: 'file1', node_id: 'node1' },
        { name: 'Resource 2', url: 'https://example2.com', file_key: 'file1', node_id: 'node2' }
      ];

      // Reset and setup fresh mock for each batch call
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce({
            links_created: [{ ...mockResources[0], id: 'id-0' }],
            errors: []
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce({
            links_created: [{ ...mockResources[1], id: 'id-1' }],
            errors: []
          })
        });

      // Mock sleep to make test faster
      jest.spyOn(client, '_sleep').mockResolvedValue();

      const progressCallback = jest.fn();
      const result = await client.batchCreateDevResources(mockResources, progressCallback, 1);

      expect(result.links_created).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('multi-file operations', () => {
    it('should get dev resources for multiple files', async () => {
      const mockFileKeys = ['file1', 'file2'];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [{ id: '1' }] })
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [{ id: '2' }] })
      });

      const result = await client.getMultipleFileDevResources(mockFileKeys);

      expect(result).toHaveProperty('file1');
      expect(result).toHaveProperty('file2');
      expect(result.file1.dev_resources).toHaveLength(1);
      expect(result.file2.dev_resources).toHaveLength(1);
    });

    it('should handle errors for individual files', async () => {
      const mockFileKeys = ['file1', 'file2'];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [{ id: '1' }] })
      });
      
      mockFetch.mockResolvedValueOnce({
        status: 404,
        ok: false
      });

      const result = await client.getMultipleFileDevResources(mockFileKeys);

      expect(result.file1.dev_resources).toHaveLength(1);
      expect(result.file2.error).toBeDefined();
      expect(result.file2.dev_resources).toHaveLength(0);
    });
  });

  describe('_isValidUrl helper', () => {
    it('should validate URLs correctly', () => {
      expect(client._isValidUrl('https://example.com')).toBe(true);
      expect(client._isValidUrl('http://test.com')).toBe(true);
      expect(client._isValidUrl('ftp://files.com')).toBe(true);
      expect(client._isValidUrl('not-a-url')).toBe(false);
      expect(client._isValidUrl('')).toBe(false);
    });
  });

  describe('proxy configuration', () => {
    it('should configure proxy agent when proxy URL is provided', () => {
      const clientWithProxy = new FigmaDevResourcesClient({
        accessToken: mockAccessToken,
        proxyUrl: 'http://proxy.example.com:8080'
      });

      expect(clientWithProxy.proxyAgent).toBeDefined();
    });

    it('should configure proxy agent with token when both are provided', () => {
      const clientWithProxy = new FigmaDevResourcesClient({
        accessToken: mockAccessToken,
        proxyUrl: 'http://proxy.example.com:8080',
        proxyToken: 'proxy-token'
      });

      expect(clientWithProxy.proxyAgent).toBeDefined();
    });
  });

  describe('cache integration', () => {
    it('should use cached response when available', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue({ cached: 'data' }),
        set: jest.fn()
      };

      const clientWithCache = new FigmaDevResourcesClient({
        accessToken: mockAccessToken,
        cache: mockCache
      });

      const result = await clientWithCache.getDevResources('test-file');

      expect(mockCache.get).toHaveBeenCalled();
      expect(result).toEqual({ cached: 'data' });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('rate limiter integration', () => {
    it('should check rate limits before making requests', async () => {
      const mockRateLimiter = {
        checkLimit: jest.fn().mockResolvedValue()
      };

      const clientWithRateLimit = new FigmaDevResourcesClient({
        accessToken: mockAccessToken,
        rateLimiter: mockRateLimiter
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ dev_resources: [] })
      });

      await clientWithRateLimit.getDevResources('test-file');

      expect(mockRateLimiter.checkLimit).toHaveBeenCalled();
    });
  });
});