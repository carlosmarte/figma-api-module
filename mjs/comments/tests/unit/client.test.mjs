/**
 * Unit tests for FigmaCommentsClient
 */

import { jest } from '@jest/globals';
import { FigmaCommentsClient, RateLimiter, RequestCache } from '../../src/core/client.mjs';
import { AuthenticationError, RateLimitError, ApiError } from '../../src/core/exceptions.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('FigmaCommentsClient', () => {
  let client;
  const mockApiToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new FigmaCommentsClient({ 
      apiToken: mockApiToken,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    });
  });

  describe('Constructor', () => {
    test('should throw error without API token', () => {
      expect(() => new FigmaCommentsClient()).toThrow(AuthenticationError);
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
        retries: 5
      });

      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
      expect(customClient.retries).toBe(5);
    });
  });

  describe('Request', () => {
    test('should make successful GET request', async () => {
      const mockResponse = { comments: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.request('/v1/files/test/comments');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/test/comments',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('should make successful POST request', async () => {
      const mockResponse = { id: 'comment-123' };
      const requestBody = { message: 'Test comment' };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: requestBody
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/test/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle 404 error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        json: jest.fn().mockResolvedValueOnce({ error: 'File not found' })
      });

      await expect(client.request('/v1/files/invalid/comments'))
        .rejects.toThrow('File not found');
    });

    test('should handle 429 rate limit error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        json: jest.fn().mockResolvedValueOnce({ error: 'Rate limited' })
      });

      await expect(client.request('/v1/files/test/comments'))
        .rejects.toThrow(RateLimitError);
    });

    test('should use cache for GET requests', async () => {
      const mockResponse = { comments: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      // First request
      await client.request('/v1/files/test/comments');
      
      // Second request should use cache
      const result = await client.request('/v1/files/test/comments');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    test('should bypass cache when requested', async () => {
      const mockResponse = { comments: [] };
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      // First request
      await client.request('/v1/files/test/comments');
      
      // Second request with cache bypass
      await client.request('/v1/files/test/comments', { bypassCache: true });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Logic', () => {
    test('should retry on 500 error', async () => {
      const mockResponse = { comments: [] };
      
      // First attempt fails, second succeeds
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Map(),
          json: jest.fn().mockResolvedValueOnce({ error: 'Server error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: jest.fn().mockResolvedValueOnce(mockResponse)
        });

      const result = await client.request('/v1/files/test/comments');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    test('should not retry on 401 error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map(),
        json: jest.fn().mockResolvedValueOnce({ error: 'Unauthorized' })
      });

      await expect(client.request('/v1/files/test/comments'))
        .rejects.toThrow();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      });

      await expect(client.request('/v1/files/test/comments'))
        .rejects.toThrow(ApiError);

      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Statistics', () => {
    test('should track request statistics', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ comments: [] })
      });

      await client.request('/v1/files/test/comments');
      await client.request('/v1/files/test/comments');

      const stats = client.getStats();
      expect(stats.client.totalRequests).toBe(2);
      expect(stats.client.successfulRequests).toBe(2);
      expect(stats.client.cachedResponses).toBe(1);
    });

    test('should track failed requests', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        json: jest.fn().mockResolvedValue({ error: 'Not found' })
      });

      try {
        await client.request('/v1/files/test/comments');
      } catch (error) {
        // Expected to fail
      }

      const stats = client.getStats();
      expect(stats.client.totalRequests).toBe(1);
      expect(stats.client.failedRequests).toBe(1);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({ id: 'user-123' })
      });

      const health = await client.healthCheck();
      expect(health.status).toBe('healthy');
    });

    test('should return unhealthy status on error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map(),
        json: jest.fn().mockResolvedValueOnce({ error: 'Unauthorized' })
      });

      const health = await client.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ requestsPerMinute: 10, burstLimit: 3 });
  });

  test('should allow requests within burst limit', async () => {
    await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
    await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
    await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
  });

  test('should reject requests exceeding rate limit', async () => {
    // Exhaust burst tokens
    await rateLimiter.checkLimit();
    await rateLimiter.checkLimit();
    await rateLimiter.checkLimit();

    // Add many requests to exceed rate limit
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkLimit();
    }

    await expect(rateLimiter.checkLimit()).rejects.toThrow(RateLimitError);
  });

  test('should provide accurate statistics', () => {
    const stats = rateLimiter.getStats();
    expect(stats).toHaveProperty('requestsLastMinute');
    expect(stats).toHaveProperty('remainingRequests');
    expect(stats).toHaveProperty('burstTokensRemaining');
  });
});

describe('RequestCache', () => {
  let cache;

  beforeEach(() => {
    cache = new RequestCache({ maxSize: 5, ttl: 1000 });
  });

  test('should cache and retrieve data', () => {
    const data = { test: 'data' };
    cache.set('/test', data);
    
    const cached = cache.get('/test');
    expect(cached).toEqual(data);
  });

  test('should return null for expired data', async () => {
    const data = { test: 'data' };
    cache.set('/test', data);
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const cached = cache.get('/test');
    expect(cached).toBeNull();
  });

  test('should evict old entries when max size reached', () => {
    for (let i = 0; i < 6; i++) {
      cache.set(`/test${i}`, { data: i });
    }
    
    // First entry should be evicted
    expect(cache.get('/test0')).toBeNull();
    expect(cache.get('/test5')).toBeDefined();
  });

  test('should clear all cached data', () => {
    cache.set('/test1', { data: 1 });
    cache.set('/test2', { data: 2 });
    
    cache.clear();
    
    expect(cache.get('/test1')).toBeNull();
    expect(cache.get('/test2')).toBeNull();
  });
});