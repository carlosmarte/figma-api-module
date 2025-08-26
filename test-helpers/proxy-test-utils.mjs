import { jest } from '@jest/globals';

// Mock undici ProxyAgent for testing
const MockProxyAgent = jest.fn().mockImplementation((url, options) => ({
  url,
  options,
  dispatch: jest.fn(),
  connect: jest.fn(),
  destroy: jest.fn()
}));

// ProxyTestHelper class for proxy-related testing
export class ProxyTestHelper {
  constructor() {
    this.proxyUrl = 'http://localhost:8080';
    this.proxyToken = 'test-proxy-token';
    this.originalEnv = {};
  }

  setup() {
    // Mock the ProxyAgent
    global.ProxyAgent = MockProxyAgent;
    
    // Store original environment
    this.originalEnv = {
      HTTP_PROXY: process.env.HTTP_PROXY,
      HTTP_PROXY_TOKEN: process.env.HTTP_PROXY_TOKEN
    };
  }

  teardown() {
    // Restore original environment
    if (this.originalEnv.HTTP_PROXY !== undefined) {
      process.env.HTTP_PROXY = this.originalEnv.HTTP_PROXY;
    } else {
      delete process.env.HTTP_PROXY;
    }
    
    if (this.originalEnv.HTTP_PROXY_TOKEN !== undefined) {
      process.env.HTTP_PROXY_TOKEN = this.originalEnv.HTTP_PROXY_TOKEN;
    } else {
      delete process.env.HTTP_PROXY_TOKEN;
    }
    
    // Clear mock
    if (global.ProxyAgent) {
      global.ProxyAgent.mockClear();
    }
  }

  setEnvironmentProxy(enabled = true) {
    if (enabled) {
      process.env.HTTP_PROXY = this.proxyUrl;
      process.env.HTTP_PROXY_TOKEN = this.proxyToken;
    } else {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTP_PROXY_TOKEN;
    }
  }

  mockProxyRequest({ path, method, responseBody, responseStatus = 200, body }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: responseStatus >= 200 && responseStatus < 300,
      status: responseStatus,
      statusText: responseStatus === 200 ? 'OK' : 'Error',
      headers: new Map([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValue(responseBody),
      text: jest.fn().mockResolvedValue(JSON.stringify(responseBody))
    });
  }

  mockDirectRequest({ baseUrl, path, method, responseBody, responseStatus = 200 }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: responseStatus >= 200 && responseStatus < 300,
      status: responseStatus,
      statusText: responseStatus === 200 ? 'OK' : 'Error',
      headers: new Map([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValue(responseBody),
      text: jest.fn().mockResolvedValue(JSON.stringify(responseBody))
    });
  }
}

// Helper functions for creating mock responses and test data

export const createMockResponse = (data, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Map(Object.entries(headers)),
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  clone: jest.fn().mockReturnThis()
});

export const createMockFigmaFile = (fileId = 'tmaZV2VEXIIrWYVjqaNUxa') => ({
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: '0:1',
        name: 'Page 1',
        type: 'PAGE',
        children: []
      }
    ]
  },
  components: {},
  componentSets: {},
  schemaVersion: 0,
  styles: {},
  name: 'Test File',
  lastModified: '2024-01-01T00:00:00Z',
  thumbnailUrl: `https://figma.com/file/${fileId}/thumbnail`,
  version: '1234567890',
  role: 'owner',
  editorType: 'figma',
  linkAccess: 'view'
});

export default {
  ProxyTestHelper,
  createMockResponse,
  createMockFigmaFile
};