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

export const createMockFigmaNode = (nodeId = '0:1') => ({
  document: {
    id: nodeId,
    name: 'Test Node',
    type: 'FRAME',
    children: [],
    absoluteBoundingBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    },
    backgroundColor: {
      r: 1,
      g: 1,
      b: 1,
      a: 1
    }
  },
  components: {},
  componentSets: {},
  schemaVersion: 0,
  styles: {}
});

export const createMockFigmaImage = (fileId = 'tmaZV2VEXIIrWYVjqaNUxa') => ({
  err: null,
  images: {
    '0:1': `https://figma.com/images/${fileId}/node-0-1.png`
  }
});

export const createMockFigmaComments = () => ({
  comments: [
    {
      id: '123456',
      message: 'Test comment',
      file_key: 'tmaZV2VEXIIrWYVjqaNUxa',
      parent_id: null,
      user: {
        handle: 'testuser',
        img_url: 'https://example.com/avatar.png',
        id: '12345'
      },
      created_at: '2024-01-01T00:00:00Z',
      resolved_at: null,
      reactions: [],
      order_id: '1'
    }
  ]
});

export const createMockFigmaVersion = () => ({
  versions: [
    {
      id: '1234567890',
      created_at: '2024-01-01T00:00:00Z',
      label: 'v1.0',
      description: 'Initial version',
      user: {
        handle: 'testuser',
        img_url: 'https://example.com/avatar.png',
        id: '12345'
      }
    }
  ]
});

export const createMockFigmaUser = () => ({
  id: '12345',
  handle: 'testuser',
  img_url: 'https://example.com/avatar.png',
  email: 'test@example.com'
});

export const createMockFigmaTeamProjects = () => ({
  name: 'Test Team',
  projects: [
    {
      id: '123',
      name: 'Test Project'
    }
  ]
});

export const createMockFigmaProjectFiles = () => ({
  name: 'Test Project',
  files: [
    {
      key: 'tmaZV2VEXIIrWYVjqaNUxa',
      name: 'Test File',
      thumbnail_url: 'https://example.com/thumbnail.png',
      last_modified: '2024-01-01T00:00:00Z'
    }
  ]
});

export const resetMocks = () => {
  // Helper function for resetting mocks in test files
  // Individual test files will handle their own mock resets
};

export default {
  createMockResponse,
  createMockFigmaFile,
  createMockFigmaNode,
  createMockFigmaImage,
  createMockFigmaComments,
  createMockFigmaVersion,
  createMockFigmaUser,
  createMockFigmaTeamProjects,
  createMockFigmaProjectFiles,
  resetMocks
};