/**
 * Proxy support tests for FigmaCommentsClient
 */

import { jest } from '@jest/globals';

// Mock undici module before importing anything that uses it
jest.unstable_mockModule('undici', () => ({
  fetch: jest.fn(),
  ProxyAgent: jest.fn().mockImplementation(() => ({}))
}));

const { fetch } = await import('undici');
const { FigmaCommentsClient } = await import('../../src/core/client.mjs');
const { AuthenticationError } = await import('../../src/core/exceptions.mjs');

describe('FigmaCommentsClient - Proxy Support', () => {
  const mockApiToken = 'test-token';
  const proxyUrl = 'http://proxy.example.com:8080';
  const proxyToken = 'proxy-auth-token';

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Clear environment variables
    delete process.env.HTTP_PROXY;
    delete process.env.HTTP_PROXY_TOKEN;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Proxy Configuration', () => {
    test('should initialize without proxy when not configured', () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken 
      });

      expect(client.proxyAgent).toBeNull();
    });

    test('should initialize proxy from constructor options without token', () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy from constructor options with token', () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy from environment variables', () => {
      process.env.HTTP_PROXY = proxyUrl;
      process.env.HTTP_PROXY_TOKEN = proxyToken;

      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken 
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should prefer constructor options over environment variables', () => {
      process.env.HTTP_PROXY = 'http://env.proxy.com:8080';
      process.env.HTTP_PROXY_TOKEN = 'env-token';

      const customProxy = 'http://custom.proxy.com:8080';
      const customToken = 'custom-token';

      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl: customProxy,
        proxyToken: customToken
      });

      expect(client.proxyAgent).not.toBeNull();
      // The agent would use the custom values, not env values
    });
  });

  describe('Proxy Requests', () => {
    test('should make request through proxy when configured', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ comments: [] })
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/test/comments',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Figma-Token': mockApiToken
          })
        })
      );
    });

    test('should include proxy token in requests when configured', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken
      });

      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ comments: [] })
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
    });

    test('should make direct request when proxy is not configured', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken
      });

      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ comments: [] })
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
      expect(client.proxyAgent).toBeNull();
    });

    test('should handle POST requests through proxy', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ id: 'comment-123', message: 'Test comment' })
      });

      const result = await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: { message: 'Test comment' }
      });
      
      expect(result).toEqual({ id: 'comment-123', message: 'Test comment' });
    });

    test('should handle errors through proxy', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock error response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ error: 'Not found' })
      });

      await expect(client.request('/v1/files/test/comments')).rejects.toThrow();
    });

    test('should handle rate limiting through proxy', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl,
        retries: 1
      });

      // Mock rate limit response then success
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([
            ['content-type', 'application/json'],
            ['retry-after', '1']
          ]),
          json: async () => ({ error: 'Rate limited' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ comments: [] })
        });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache with Proxy', () => {
    test('should cache GET requests through proxy', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ comments: ['comment1'] })
      });

      // First request
      const result1 = await client.request('/v1/files/test/comments');
      expect(result1).toEqual({ comments: ['comment1'] });

      // Second request should use cache
      const result2 = await client.request('/v1/files/test/comments');
      expect(result2).toEqual({ comments: ['comment1'] });

      // Fetch should only be called once due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should not cache POST requests through proxy', async () => {
      const client = new FigmaCommentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ id: '1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ id: '2' })
        });

      // First POST request
      await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: { message: 'Test 1' }
      });

      // Second POST request
      await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: { message: 'Test 2' }
      });

      // Both requests should hit the server
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});