/**
 * Unit tests for FigmaVariablesClient
 */

import { jest } from '@jest/globals';

// Mock undici before imports
jest.unstable_mockModule('undici', () => ({
  fetch: jest.fn(),
  ProxyAgent: jest.fn()
}));

// Mock AbortSignal.timeout since it may not be available in test environment
global.AbortSignal = global.AbortSignal || {};
global.AbortSignal.timeout = global.AbortSignal.timeout || jest.fn().mockReturnValue({
  aborted: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
});

const { FigmaVariablesClient } = await import('../../src/core/client.mjs');
const { 
  AuthenticationError,
  EnterpriseAccessError,
  ValidationError,
  RateLimitError,
  NetworkError,
  ScopeError
} = await import('../../src/core/exceptions.mjs');

// Get the mocked fetch from undici
const { fetch } = await import('undici');

// Make fetch available globally for the tests
global.fetch = fetch;

describe('FigmaVariablesClient', () => {
  let client;
  const mockAccessToken = 'test-token';
  const mockFileKey = 'test-file-key';

  beforeEach(() => {
    // Reset and setup fetch mock for each test
    fetch.mockClear();
    fetch.mockReset();
    
    client = new FigmaVariablesClient({ accessToken: mockAccessToken });
  });

  describe('constructor', () => {
    it('should create client with valid access token', () => {
      expect(client.accessToken).toBe(mockAccessToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    it('should throw error without access token', () => {
      expect(() => {
        new FigmaVariablesClient({});
      }).toThrow(AuthenticationError);
    });

    it('should accept custom configuration', () => {
      const customClient = new FigmaVariablesClient({
        accessToken: mockAccessToken,
        baseUrl: 'https://custom.api.com',
        timeout: 60000
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

    it('should fetch local variables successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await client.getLocalVariables(mockFileKey);

      expect(fetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${mockFileKey}/variables/local`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw validation error for missing file key', async () => {
      await expect(client.getLocalVariables()).rejects.toThrow(ValidationError);
    });

    it('should handle enterprise access error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' })
      });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow(EnterpriseAccessError);
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

    it('should fetch published variables successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await client.getPublishedVariables(mockFileKey);

      expect(fetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${mockFileKey}/variables/published`,
        expect.objectContaining({
          method: 'GET'
        })
      );
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

    it('should update variables successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await client.updateVariables(mockFileKey, mockChanges);

      expect(fetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${mockFileKey}/variables`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockChanges)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should validate changes payload', async () => {
      await expect(client.updateVariables(mockFileKey, null))
        .rejects.toThrow(ValidationError);
    });

    it('should validate payload size', async () => {
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
    it('should handle rate limiting', async () => {
      // Create a test client with very short retry delays
      const testClient = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        timeout: 1000 // Short timeout
      });
      
      // Override retry config for faster testing
      testClient.retryConfig = {
        maxRetries: 1,
        initialDelay: 10,
        maxDelay: 50,
        backoffFactor: 1
      };
      
      const mockResponse = {
        ok: false,
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('1') // Short retry-after
        },
        json: jest.fn().mockResolvedValue({message: 'Rate limited'})
      };
      
      fetch.mockImplementation(() => Promise.resolve(mockResponse));

      await expect(testClient.getLocalVariables(mockFileKey))
        .rejects.toThrow(RateLimitError);
    }, 10000);

    it('should handle authentication errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow(AuthenticationError);
    });

    it('should handle network errors', async () => {
      // Create a test client with no retries for this specific test
      const testClient = new FigmaVariablesClient({ accessToken: mockAccessToken });
      testClient.retryConfig.maxRetries = 0; // No retries for immediate error
      
      const networkError = new TypeError('fetch failed');
      networkError.cause = new Error('Network error');
      fetch.mockRejectedValueOnce(networkError);

      await expect(testClient.getLocalVariables(mockFileKey))
        .rejects.toThrow(NetworkError);
    });
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      // First call fails with network error, second succeeds
      const networkError = new TypeError('fetch failed');
      networkError.cause = new Error('Network error');
      
      fetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ status: 200, error: false, meta: {} }),
          headers: { get: jest.fn() }
        });

      const result = await client.getLocalVariables(mockFileKey);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(200);
    });

    it('should not retry on non-retryable errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Bad request' }),
        headers: { get: jest.fn() }
      });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow();

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('caching', () => {
    it('should work without cache', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ status: 200, error: false, meta: {} }),
        headers: { get: jest.fn() }
      });

      const result = await client.getLocalVariables(mockFileKey);
      expect(result.status).toBe(200);
    });

    it('should integrate with provided cache', async () => {
      const mockCache = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true)
      };

      const cachedClient = new FigmaVariablesClient({
        accessToken: mockAccessToken,
        cache: mockCache
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ status: 200, error: false, meta: {} }),
        headers: { get: jest.fn() }
      });

      await cachedClient.getLocalVariables(mockFileKey);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return client statistics', () => {
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