/**
 * Proxy support tests for FigmaComponentsClient
 */

import { jest } from '@jest/globals';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { FigmaComponentsClient } from '../../src/core/client.mjs';
import { AuthenticationError } from '../../src/core/exceptions.mjs';

describe('FigmaComponentsClient - Proxy Support', () => {
  let mockAgent;
  let originalDispatcher;
  const mockApiToken = 'test-token';
  const proxyUrl = 'http://proxy.example.com:8080';
  const proxyToken = 'proxy-auth-token';

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    delete process.env.HTTP_PROXY;
    delete process.env.HTTP_PROXY_TOKEN;
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
    mockAgent.close();
  });

  describe('Proxy Configuration', () => {
    test('should make requests successfully without proxy', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
      });

      const mockResponse = { components: [] };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/components',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/v1/teams/123/components');
      expect(result).toEqual(mockResponse);
    });

    test('should make requests successfully with proxy URL configured', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
        proxyUrl,
      });

      const mockResponse = { components: [] };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/components',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/v1/teams/123/components');
      expect(result).toEqual(mockResponse);
    });

    test('should make requests successfully with proxy from environment', async () => {
      process.env.HTTP_PROXY = proxyUrl;
      process.env.HTTP_PROXY_TOKEN = proxyToken;

      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
      });

      const mockResponse = { components: [] };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/components',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/v1/teams/123/components');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Proxy Requests', () => {
    test('should handle GET requests with proxy', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
        proxyUrl,
      });

      const mockResponse = { components: [{ id: 'comp1', name: 'Button' }] };
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/components',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/v1/teams/123/components');
      expect(result).toEqual(mockResponse);
    });

    test('should handle component sets requests with proxy', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken,
      });

      const mockResponse = {
        component_sets: [{ id: 'set1', name: 'Buttons' }]
      };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/files/key/component_sets',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/v1/files/key/component_sets');
      expect(result).toEqual(mockResponse);
    });

    test('should handle styles requests with proxy', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
        proxyUrl,
      });

      const mockResponse = {
        styles: [{ key: 'style1', name: 'Primary Color' }]
      };

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/teams/123/styles',
        method: 'GET'
      }).reply(200, mockResponse, {
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.get('/v1/teams/123/styles');
      expect(result).toEqual(mockResponse);
    });

    test('should handle paginated requests with proxy', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
        proxyUrl,
      });

      const mockPool = mockAgent.get('https://api.figma.com');

      // First page
      mockPool.intercept({
        path: '/v1/teams/123/components?page_size=30',
        method: 'GET'
      }).reply(200, {
        components: Array(30).fill({ id: 'comp' }),
        cursor: 'next-page-cursor'
      }, {
        headers: { 'content-type': 'application/json' }
      });

      // Second page
      mockPool.intercept({
        path: '/v1/teams/123/components?page_size=30&cursor=next-page-cursor',
        method: 'GET'
      }).reply(200, {
        components: Array(10).fill({ id: 'comp' })
      }, {
        headers: { 'content-type': 'application/json' }
      });

      // Request first page
      const page1 = await client.get('/v1/teams/123/components', { page_size: 30 });
      expect(page1.components).toHaveLength(30);
      expect(page1.cursor).toBe('next-page-cursor');

      // Request second page using cursor
      const page2 = await client.get('/v1/teams/123/components', {
        page_size: 30,
        cursor: 'next-page-cursor'
      });
      expect(page2.components).toHaveLength(10);
    });

    test('should handle errors through proxy', async () => {
      const client = new FigmaComponentsClient({
        apiToken: mockApiToken,
        proxyUrl,
        retryConfig: { maxRetries: 0 },
      });

      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool.intercept({
        path: '/v1/components/invalid',
        method: 'GET'
      }).reply(404, { error: 'Component not found' }, {
        headers: { 'content-type': 'application/json' }
      });

      await expect(client.get('/v1/components/invalid'))
        .rejects.toThrow();
    });
  });
});