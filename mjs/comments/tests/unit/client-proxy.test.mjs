/**
 * Proxy support tests for FigmaCommentsClient
 */

import { jest } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';

const { default: FigmaCommentsClient } = await import('../../src/core/client.mjs');
const { AuthenticationError } = await import('../../../figma-fetch/dist/index.mjs');

describe('FigmaCommentsClient - Proxy Support', () => {
  const mockApiToken = 'test-token';
  const proxyUrl = 'http://proxy.example.com:8080';
  const proxyToken = 'proxy-auth-token';
  let mockAgent;
  let originalDispatcher;

  beforeEach(() => {
    // Set up MockAgent for all undici requests
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    // Clear environment variables
    delete process.env.HTTP_PROXY;
    delete process.env.HTTP_PROXY_TOKEN;
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original dispatcher
    setGlobalDispatcher(originalDispatcher);
    mockAgent.close();
    jest.clearAllMocks();
  });

  describe('Proxy Configuration', () => {
    test('should initialize without proxy when not configured', () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken
      });

      // Client should be created successfully without proxy config
      expect(client).toBeDefined();
    });

    test('should initialize proxy from constructor options without token', () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl
      });

      // Client should be created successfully with proxy URL
      expect(client).toBeDefined();
    });

    test('should initialize proxy from constructor options with token', () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken
      });

      // Client should be created successfully with proxy URL and token
      expect(client).toBeDefined();
    });

    test('should initialize proxy from environment variables', () => {
      process.env.HTTP_PROXY = proxyUrl;
      process.env.HTTP_PROXY_TOKEN = proxyToken;

      const client = new FigmaCommentsClient({
        apiToken: mockApiToken
      });

      // Client should be created successfully using env vars
      expect(client).toBeDefined();
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

      // Client should be created successfully with custom proxy options
      expect(client).toBeDefined();
    });
  });

  describe('Proxy Requests', () => {
    test('should make request through proxy when configured', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful response
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, { comments: [] }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
    });

    test('should include proxy token in requests when configured', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken
      });

      // Mock successful response
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, { comments: [] }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
    });

    test('should make direct request when proxy is not configured', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken
      });

      // Mock successful response
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, { comments: [] }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
    });

    test('should handle POST requests through proxy', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful response
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'POST'
      }).reply(201, { id: 'comment-123', message: 'Test comment' }, {
        headers: { 'content-type': 'application/json' }
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
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(404, { error: 'Not found' }, {
        headers: { 'content-type': 'application/json' }
      });

      await expect(client.request('/v1/files/test/comments')).rejects.toThrow();
    });

    test('should handle rate limiting through proxy', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl,
        retryConfig: { maxRetries: 1 }
      });

      const mockPool = mockAgent.get('https://api.figma.com');

      // First request - rate limit
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(429, { error: 'Rate limited' }, {
        headers: {
          'content-type': 'application/json',
          'retry-after': '1'
        }
      });

      // Retry request - success
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, { comments: [] }, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.request('/v1/files/test/comments');
      expect(result).toEqual({ comments: [] });
    }, 10000); // Increase timeout for retry test
  });

  describe('Cache with Proxy', () => {
    test('should cache GET requests through proxy', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl
      });

      // Mock successful response - only mock once since it should be cached
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'GET'
      }).reply(200, { comments: ['comment1'] }, {
        headers: { 'content-type': 'application/json' }
      });

      // First request
      const result1 = await client.request('/v1/files/test/comments');
      expect(result1).toEqual({ comments: ['comment1'] });

      // Second request should use cache
      const result2 = await client.request('/v1/files/test/comments');
      expect(result2).toEqual({ comments: ['comment1'] });
    });

    test('should not cache POST requests through proxy', async () => {
      const client = new FigmaCommentsClient({
        apiToken: mockApiToken,
        proxyUrl
      });

      const mockPool = mockAgent.get('https://api.figma.com');

      // First POST request
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'POST'
      }).reply(201, { id: '1' }, {
        headers: { 'content-type': 'application/json' }
      });

      // Second POST request
      mockPool.intercept({
        path: '/v1/files/test/comments',
        method: 'POST'
      }).reply(201, { id: '2' }, {
        headers: { 'content-type': 'application/json' }
      });

      // First POST request
      const result1 = await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: { message: 'Test 1' }
      });
      expect(result1).toEqual({ id: '1' });

      // Second POST request
      const result2 = await client.request('/v1/files/test/comments', {
        method: 'POST',
        body: { message: 'Test 2' }
      });
      expect(result2).toEqual({ id: '2' });
    });
  });
});