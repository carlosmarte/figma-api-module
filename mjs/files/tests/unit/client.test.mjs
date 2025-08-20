/**
 * Unit tests for FigmaFilesClient
 */

import { jest } from '@jest/globals';
import { FigmaFilesClient } from '../../src/core/client.mjs';
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError
} from '../../src/core/exceptions.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('FigmaFilesClient', () => {
  let client;
  const mockApiToken = 'test-token';

  beforeEach(() => {
    client = new FigmaFilesClient({
      apiToken: mockApiToken,
      logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
    });
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with required API token', () => {
      expect(client.apiToken).toBe(mockApiToken);
      expect(client.baseUrl).toBe('https://api.figma.com');
    });

    it('should throw error without API token', () => {
      expect(() => {
        new FigmaFilesClient({});
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
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
        headers: new Map()
      });

      const result = await client.request('/test');

      expect(fetch).toHaveBeenCalledWith(
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
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await client.get('/test', { param1: 'value1', param2: 'value2' });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/test?param1=value1&param2=value2',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should make POST request with body', async () => {
      const mockResponse = { data: 'test' };
      const requestData = { key: 'value' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await client.post('/test', requestData);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      );
    });

    it('should filter out null/undefined query parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await client.get('/test', { 
        param1: 'value1', 
        param2: null, 
        param3: undefined,
        param4: 'value4'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/test?param1=value1&param4=value4',
        expect.anything()
      );
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ message: 'Invalid token' })
      });

      await expect(client.request('/test')).rejects.toThrow(AuthenticationError);
    });

    it('should handle 429 rate limit errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([
          ['content-type', 'application/json'],
          ['retry-after', '60']
        ]),
        json: jest.fn().mockResolvedValue({ message: 'Rate limited' })
      });

      await expect(client.request('/test')).rejects.toThrow(RateLimitError);
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(client.request('/test')).rejects.toThrow(NetworkError);
    });

    it('should handle request timeout', async () => {
      const shortTimeoutClient = new FigmaFilesClient({
        apiToken: mockApiToken,
        timeout: 100,
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      // Mock a request that takes longer than timeout
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(shortTimeoutClient.request('/test')).rejects.toThrow(TimeoutError);
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      const client = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 2, initialDelay: 10 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      // First two calls fail with 500, third succeeds
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Map()
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Map()
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'success' })
        });

      const result = await client.request('/test');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry on non-retryable errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ message: 'Invalid token' })
      });

      await expect(client.request('/test')).rejects.toThrow(AuthenticationError);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const client = new FigmaFilesClient({
        apiToken: mockApiToken,
        retryConfig: { maxRetries: 1, initialDelay: 10 },
        logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      });

      // All calls fail with 500
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map()
      });

      await expect(client.request('/test')).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(2); // Original + 1 retry
    });
  });

  describe('rate limiting', () => {
    it('should track request timestamps', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const initialLength = client.requestTimestamps.length;
      await client.request('/test');
      
      expect(client.requestTimestamps.length).toBe(initialLength + 1);
    });

    it('should clean old timestamps', async () => {
      // Add old timestamp
      client.requestTimestamps.push(Date.now() - 70000); // 70 seconds ago
      
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await client.request('/test');
      
      // Old timestamp should be cleaned
      expect(client.requestTimestamps.every(ts => 
        Date.now() - ts < 60000
      )).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track request statistics', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const initialStats = client.getStats();
      await client.request('/test');
      const finalStats = client.getStats();

      expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 1);
      expect(finalStats.successfulRequests).toBe(initialStats.successfulRequests + 1);
    });

    it('should track failed requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({})
      });

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
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'user123' })
      });

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false for failed health check', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map()
      });

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });
});