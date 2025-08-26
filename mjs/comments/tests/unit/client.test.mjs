/**
 * Unit tests for FigmaCommentsClient
 */

import { jest } from '@jest/globals';

// Mock undici module BEFORE importing anything that uses it
jest.unstable_mockModule('undici', () => ({
  fetch: jest.fn(),
  ProxyAgent: jest.fn().mockImplementation(() => ({}))
}));

// Import fetch from the mocked module
const { fetch } = await import('undici');

// Now import modules that use undici
const { FigmaCommentsClient, RateLimiter, RequestCache } = await import('../../src/core/client.mjs');
const { AuthenticationError, RateLimitError, ApiError } = await import('../../src/core/exceptions.mjs');

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
        headers: {
          entries: () => [['content-type', 'application/json']].entries(),
          get: (key) => key === 'content-type' ? 'application/json' : null
        },
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await client.request('/v1/files/test/comments');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/test/comments',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Figma-Token': 'test-token',
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
        headers: {
          entries: () => [['content-type', 'application/json']].entries(),
          get: (key) => key === 'content-type' ? 'application/json' : null
        },
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
        headers: {
          entries: () => [].entries(),
          get: () => null
        },
        json: jest.fn().mockResolvedValueOnce({ error: 'File not found' }),
        text: jest.fn().mockResolvedValueOnce('File not found'),
        arrayBuffer: jest.fn().mockResolvedValueOnce(new ArrayBuffer(0))
      });

      await expect(client.request('/v1/files/invalid/comments'))
        .rejects.toThrow('Resource not found');
    });

    test('should handle 429 rate limit error', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          entries: () => [['retry-after', '60']].entries(),
          get: (key) => key === 'retry-after' ? '60' : null
        },
        json: jest.fn().mockResolvedValueOnce({ error: 'Rate limited' }),
        text: jest.fn().mockResolvedValueOnce('Rate limited'),
        arrayBuffer: jest.fn().mockResolvedValueOnce(new ArrayBuffer(0))
      };
      
      fetch.mockClear();
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(client.request('/v1/files/test/comments'))
        .rejects.toThrow(RateLimitError);
    });

    test('should use cache for GET requests', async () => {
      const mockResponse = { comments: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [['content-type', 'application/json']].entries(),
          get: (key) => key === 'content-type' ? 'application/json' : null
        },
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
        headers: {
          entries: () => [['content-type', 'application/json']].entries(),
          get: (key) => key === 'content-type' ? 'application/json' : null
        },
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
          headers: {
            entries: () => [].entries(),
            get: () => null
          },
          json: jest.fn().mockResolvedValueOnce({ error: 'Server error' }),
          text: jest.fn().mockResolvedValueOnce('Server error'),
          arrayBuffer: jest.fn().mockResolvedValueOnce(new ArrayBuffer(0))
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            entries: () => [['content-type', 'application/json']].entries(),
            get: (key) => key === 'content-type' ? 'application/json' : null
          },
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
        headers: {
          entries: () => [].entries(),
          get: () => null
        },
        json: jest.fn().mockResolvedValueOnce({ error: 'Unauthorized' }),
        text: jest.fn().mockResolvedValueOnce('Unauthorized'),
        arrayBuffer: jest.fn().mockResolvedValueOnce(new ArrayBuffer(0))
      });

      await expect(client.request('/v1/files/test/comments'))
        .rejects.toThrow();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      jest.setTimeout(10000); // Increase timeout for retry test
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          entries: () => [].entries(),
          get: () => null
        },
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
        text: jest.fn().mockResolvedValue('Server error'),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
      });

      await expect(client.request('/v1/files/test/comments'))
        .rejects.toThrow(ApiError);

      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Statistics', () => {
    test('should track request statistics', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [['content-type', 'application/json']].entries(),
          get: (key) => key === 'content-type' ? 'application/json' : null
        },
        json: jest.fn().mockResolvedValueOnce({ comments: [] })
      });

      await client.request('/v1/files/test/comments');

      const stats = client.getStats();
      expect(stats.client.totalRequests).toBe(1);
      expect(stats.client.successfulRequests).toBe(1);
    });

    test('should track failed requests', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: {
          entries: () => [].entries(),
          get: () => null
        },
        json: jest.fn().mockResolvedValue({ error: 'Not found' }),
        text: jest.fn().mockResolvedValue('Not found'),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
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
        headers: {
          entries: () => [['content-type', 'application/json']].entries(),
          get: (key) => key === 'content-type' ? 'application/json' : null
        },
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
        headers: {
          entries: () => [].entries(),
          get: () => null
        },
        json: jest.fn().mockResolvedValueOnce({ error: 'Unauthorized' }),
        text: jest.fn().mockResolvedValueOnce('Unauthorized'),
        arrayBuffer: jest.fn().mockResolvedValueOnce(new ArrayBuffer(0))
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

    // Add requests up to the rate limit
    for (let i = 0; i < 7; i++) {
      await rateLimiter.checkLimit();
    }

    // This should exceed the rate limit
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
    cache = new RequestCache();
  });

  test('should cache and retrieve data', () => {
    const data = { test: 'data' };
    cache.set('key1', data);

    expect(cache.get('key1')).toEqual(data);
  });

  test('should return null for non-existent key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('should clear cache', () => {
    cache.set('key1', { test: 'data' });
    cache.set('key2', { test: 'data2' });

    cache.clear();

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  test('should provide accurate statistics', () => {
    cache.set('key1', { test: 'data' });
    cache.get('key1'); // Hit
    cache.get('key2'); // Miss

    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });
});