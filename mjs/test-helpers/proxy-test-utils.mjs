/**
 * Shared test utilities for proxy testing with undici MockAgent
 */

import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';

export class ProxyTestHelper {
  constructor() {
    this.mockAgent = null;
    this.originalDispatcher = null;
    this.proxyUrl = 'http://proxy.example.com:8080';
    this.proxyToken = 'proxy-auth-token';
  }

  setup() {
    // Save original dispatcher
    this.originalDispatcher = getGlobalDispatcher();
    
    // Create and set mock agent
    this.mockAgent = new MockAgent();
    this.mockAgent.disableNetConnect();
    setGlobalDispatcher(this.mockAgent);

    // Clear environment variables
    delete process.env.HTTP_PROXY;
    delete process.env.HTTP_PROXY_TOKEN;
  }

  teardown() {
    // Restore original dispatcher
    if (this.originalDispatcher) {
      setGlobalDispatcher(this.originalDispatcher);
    }
    if (this.mockAgent) {
      this.mockAgent.close();
    }
  }

  mockProxyRequest({ path, method = 'GET', body, responseStatus = 200, responseBody, responseHeaders = {} }) {
    const pool = this.mockAgent.get(this.proxyUrl);
    const interceptor = pool.intercept({
      path,
      method,
      ...(body && { body: typeof body === 'object' ? JSON.stringify(body) : body })
    });

    return interceptor.reply(responseStatus, responseBody, {
      headers: {
        'content-type': 'application/json',
        ...responseHeaders
      }
    });
  }

  mockDirectRequest({ baseUrl, path, method = 'GET', body, responseStatus = 200, responseBody, responseHeaders = {} }) {
    const pool = this.mockAgent.get(baseUrl);
    const interceptor = pool.intercept({
      path,
      method,
      ...(body && { body: typeof body === 'object' ? JSON.stringify(body) : body })
    });

    return interceptor.reply(responseStatus, responseBody, {
      headers: {
        'content-type': 'application/json',
        ...responseHeaders
      }
    });
  }

  setEnvironmentProxy(withToken = false) {
    process.env.HTTP_PROXY = this.proxyUrl;
    if (withToken) {
      process.env.HTTP_PROXY_TOKEN = this.proxyToken;
    }
  }

  clearEnvironment() {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTP_PROXY_TOKEN;
  }
}

export const createProxyTestSuite = (ClientClass, clientName) => {
  return () => {
    let helper;
    const mockApiToken = 'test-token';

    beforeEach(() => {
      helper = new ProxyTestHelper();
      helper.setup();
    });

    afterEach(() => {
      helper.teardown();
    });

    describe('Proxy Configuration', () => {
      test('should initialize without proxy when not configured', () => {
        const client = new ClientClass({ 
          apiToken: mockApiToken,
          accessToken: mockApiToken // For clients that use accessToken
        });

        expect(client.proxyAgent).toBeNull();
      });

      test('should initialize proxy from constructor options without token', () => {
        const client = new ClientClass({ 
          apiToken: mockApiToken,
          accessToken: mockApiToken,
          proxyUrl: helper.proxyUrl
        });

        expect(client.proxyAgent).not.toBeNull();
      });

      test('should initialize proxy from constructor options with token', () => {
        const client = new ClientClass({ 
          apiToken: mockApiToken,
          accessToken: mockApiToken,
          proxyUrl: helper.proxyUrl,
          proxyToken: helper.proxyToken
        });

        expect(client.proxyAgent).not.toBeNull();
      });

      test('should initialize proxy from environment variables without token', () => {
        helper.setEnvironmentProxy(false);

        const client = new ClientClass({ 
          apiToken: mockApiToken,
          accessToken: mockApiToken
        });

        expect(client.proxyAgent).not.toBeNull();
      });

      test('should initialize proxy from environment variables with token', () => {
        helper.setEnvironmentProxy(true);

        const client = new ClientClass({ 
          apiToken: mockApiToken,
          accessToken: mockApiToken
        });

        expect(client.proxyAgent).not.toBeNull();
      });

      test('should prefer constructor options over environment variables', () => {
        process.env.HTTP_PROXY = 'http://env.proxy.com:3128';
        process.env.HTTP_PROXY_TOKEN = 'env-token';

        const customProxyUrl = 'http://custom.proxy.com:8080';
        const customProxyToken = 'custom-token';

        const client = new ClientClass({ 
          apiToken: mockApiToken,
          accessToken: mockApiToken,
          proxyUrl: customProxyUrl,
          proxyToken: customProxyToken
        });

        expect(client.proxyAgent).not.toBeNull();
      });
    });

    return { helper, mockApiToken };
  };
};