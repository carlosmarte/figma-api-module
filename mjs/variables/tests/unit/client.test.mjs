/**
 * Unit tests for FigmaVariablesClient
 */

import { jest } from '@jest/globals';
import { FigmaVariablesClient } from '../../src/core/client.mjs';
import { 
  AuthenticationError,
  EnterpriseAccessError,
  ValidationError,
  RateLimitError,
  NetworkError
} from '../../src/core/exceptions.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('FigmaVariablesClient', () => {
  let client;
  const mockAccessToken = 'test-token';
  const mockFileKey = 'test-file-key';

  beforeEach(() => {
    client = new FigmaVariablesClient({ accessToken: mockAccessToken });
    fetch.mockClear();
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
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']])
      });

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow(RateLimitError);
    });

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
      fetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(client.getLocalVariables(mockFileKey))
        .rejects.toThrow(NetworkError);
    });
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      fetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 200, error: false, meta: {} })
        });

      const result = await client.getLocalVariables(mockFileKey);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(200);
    });

    it('should not retry on non-retryable errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request' })
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
        json: async () => ({ status: 200, error: false, meta: {} })
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
        json: async () => ({ status: 200, error: false, meta: {} })
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