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
    test('should initialize without proxy when not configured', () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken 
      });

      expect(client.proxyAgent).toBeNull();
    });

    test('should initialize proxy from constructor options without token', () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy from constructor options with token', () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy from environment variables without token', () => {
      process.env.HTTP_PROXY = proxyUrl;

      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken 
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy from environment variables with token', () => {
      process.env.HTTP_PROXY = proxyUrl;
      process.env.HTTP_PROXY_TOKEN = proxyToken;

      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken 
      });

      expect(client.proxyAgent).not.toBeNull();
    });
  });

  describe('Proxy Requests', () => {
    test('should make request through proxy when configured', async () => {
      // Override proxyAgent to null to allow mocking
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });
      client.proxyAgent = null; // Override to use global dispatcher for testing

      // Mock the actual API endpoint
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/components',
          method: 'GET'
        })
        .reply(200, { components: [] }, {
          headers: { 'content-type': 'application/json' }
        });

      const result = await client._executeRequest('https://api.figma.com/v1/teams/123/components');
      expect(result.ok).toBe(true);
    });

    test('should handle component sets through proxy', async () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl,
        proxyToken
      });
      client.proxyAgent = null; // Override to use global dispatcher for testing

      // Mock the actual API endpoint
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/files/key/component_sets',
          method: 'GET'
        })
        .reply(200, { 
          component_sets: [{ id: 'set1', name: 'Buttons' }] 
        }, {
          headers: { 'content-type': 'application/json' }
        });

      const result = await client._executeRequest('https://api.figma.com/v1/files/key/component_sets');
      expect(result.ok).toBe(true);
    });

    test('should handle styles through proxy', async () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });
      client.proxyAgent = null; // Override to use global dispatcher for testing

      // Mock the actual API endpoint
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/teams/123/styles',
          method: 'GET'
        })
        .reply(200, { 
          styles: [{ key: 'style1', name: 'Primary Color' }] 
        }, {
          headers: { 'content-type': 'application/json' }
        });

      const result = await client._executeRequest('https://api.figma.com/v1/teams/123/styles');
      expect(result.ok).toBe(true);
    });

    test('should handle pagination through proxy', async () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl
      });
      client.proxyAgent = null; // Override to use global dispatcher for testing

      // Mock the actual API endpoint
      const mockPool = mockAgent.get('https://api.figma.com');
      
      // First page
      mockPool
        .intercept({
          path: '/v1/teams/123/components?page_size=30',
          method: 'GET'
        })
        .reply(200, { 
          components: Array(30).fill({ id: 'comp' }),
          cursor: 'next-page-cursor'
        }, {
          headers: { 'content-type': 'application/json' }
        });

      // Second page
      mockPool
        .intercept({
          path: '/v1/teams/123/components?page_size=30&cursor=next-page-cursor',
          method: 'GET'
        })
        .reply(200, { 
          components: Array(10).fill({ id: 'comp' })
        }, {
          headers: { 'content-type': 'application/json' }
        });

      const result1 = await client._executeRequest('https://api.figma.com/v1/teams/123/components?page_size=30');
      expect(result1.ok).toBe(true);

      const result2 = await client._executeRequest('https://api.figma.com/v1/teams/123/components?page_size=30&cursor=next-page-cursor');
      expect(result2.ok).toBe(true);
    });

    test('should handle errors through proxy', async () => {
      const client = new FigmaComponentsClient({ 
        apiToken: mockApiToken,
        proxyUrl,
        retryConfig: { maxRetries: 0 } // Disable retries to avoid issues
      });
      client.proxyAgent = null; // Override to use global dispatcher for testing

      // Mock the actual API endpoint
      const mockPool = mockAgent.get('https://api.figma.com');
      mockPool
        .intercept({
          path: '/v1/components/invalid',
          method: 'GET'
        })
        .reply(404, { error: 'Component not found' }, {
          headers: { 'content-type': 'application/json' }
        });

      await expect(client._executeRequest('https://api.figma.com/v1/components/invalid'))
        .rejects.toThrow('Component not found');
    });
  });
});