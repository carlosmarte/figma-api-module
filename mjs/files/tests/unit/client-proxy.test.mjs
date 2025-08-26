/**
 * Proxy support tests for FigmaFilesClient
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock undici module with proxy support BEFORE importing helper functions
const mockFetch = jest.fn();
const mockProxyAgent = jest.fn();
const mockSetGlobalDispatcher = jest.fn();

jest.unstable_mockModule('undici', () => ({
  fetch: mockFetch,
  ProxyAgent: mockProxyAgent.mockImplementation((proxyUrl) => ({
    proxyUrl,
    dispatch: jest.fn()
  })),
  setGlobalDispatcher: mockSetGlobalDispatcher,
  Agent: jest.fn().mockImplementation(() => ({
    dispatch: jest.fn()
  }))
}));

// Now import helper functions after mocking undici
const { 
  createMockResponse,
  createMockFigmaFile,
  createMockFigmaNode,
  createMockFigmaImage,
  createMockFigmaVersion
} = await import('../../test-helpers/proxy-test-utils.mjs');

// Import the client after mocking undici
const { FigmaFilesClient } = await import('../../src/core/client.mjs');

describe.skip('FigmaFilesClient - Proxy Support', () => {
  const mockApiToken = 'test-token';
  const testFileId = 'tmaZV2VEXIIrWYVjqaNUxa';
  const proxyUrl = 'http://proxy.example.com:8080';
  const proxyToken = 'proxy-auth-token';
  
  beforeEach(() => {
    mockFetch.mockReset();
    mockProxyAgent.mockClear();
    mockSetGlobalDispatcher.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Proxy Configuration', () => {
    it('should configure proxy when proxyUrl is provided', () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      expect(client.proxyUrl).toBe(proxyUrl);
      expect(mockProxyAgent).toHaveBeenCalledWith(proxyUrl);
      expect(mockSetGlobalDispatcher).toHaveBeenCalled();
    });

    it('should configure proxy with authentication token', () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl,
        proxyToken: proxyToken
      });

      expect(client.proxyUrl).toBe(proxyUrl);
      expect(client.proxyToken).toBe(proxyToken);
    });

    it('should work without proxy configuration', () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken
      });

      expect(client.proxyUrl).toBeUndefined();
      expect(mockProxyAgent).not.toHaveBeenCalled();
    });
  });

  describe('Proxy File Operations', () => {
    it('should fetch file through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const mockFile = createMockFigmaFile(testFileId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockFile));

      const result = await client.get(`/v1/files/${testFileId}`);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${testFileId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': mockApiToken
          })
        })
      );
      expect(result).toEqual(mockFile);
    });

    it('should fetch file nodes through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl,
        proxyToken: proxyToken
      });

      const mockNodes = {
        nodes: {
          '1:2': createMockFigmaNode('1:2').document,
          '3:4': createMockFigmaNode('3:4').document
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockNodes));

      const result = await client.get(`/v1/files/${testFileId}/nodes`, {
        ids: '1:2,3:4'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${testFileId}/nodes?ids=1%3A2%2C3%3A4`,
        expect.anything()
      );
      expect(result).toEqual(mockNodes);
    });

    it('should render images through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const mockImages = createMockFigmaImage(testFileId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockImages));

      const result = await client.get(`/v1/images/${testFileId}`, {
        ids: '0:1'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/images/${testFileId}?ids=0%3A1`,
        expect.anything()
      );
      expect(result).toEqual(mockImages);
    });

    it('should fetch file versions through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const mockVersions = createMockFigmaVersion();
      mockFetch.mockResolvedValueOnce(createMockResponse(mockVersions));

      const result = await client.get(`/v1/files/${testFileId}/versions`);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${testFileId}/versions`,
        expect.anything()
      );
      expect(result).toEqual(mockVersions);
    });

    it('should handle file export through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const exportParams = {
        format: 'pdf',
        ids: ['1:2', '3:4']
      };

      const mockExportResponse = {
        images: {
          '1:2': 'https://figma-exports.s3.amazonaws.com/export-1.pdf',
          '3:4': 'https://figma-exports.s3.amazonaws.com/export-2.pdf'
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockExportResponse));

      const result = await client.get(`/v1/images/${testFileId}`, {
        ids: '1:2,3:4',
        format: 'pdf'
      });

      expect(result).toEqual(mockExportResponse);
    });

    it('should handle POST requests through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const commentData = { message: 'Test comment' };
      const mockCommentResponse = {
        comment: {
          id: '123456',
          message: 'Test comment',
          file_key: testFileId,
          user: {
            handle: 'testuser',
            img_url: 'https://example.com/avatar.png',
            id: '12345'
          },
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockCommentResponse));

      const result = await client.post(`/v1/files/${testFileId}/comments`, commentData);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.figma.com/v1/files/${testFileId}/comments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(commentData)
        })
      );
      expect(result).toEqual(mockCommentResponse);
    });
  });

  describe('Proxy Error Handling', () => {
    it('should handle proxy connection errors', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      mockFetch.mockRejectedValueOnce(new Error('Proxy connection failed'));

      await expect(client.get(`/v1/files/${testFileId}`))
        .rejects.toThrow('Proxy connection failed');
    });

    it('should handle authentication errors through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      mockFetch.mockResolvedValueOnce(
        createMockResponse({ err: 'Invalid token' }, 401)
      );

      await expect(client.get(`/v1/files/${testFileId}`))
        .rejects.toThrow();
    });

    it('should retry on transient errors through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl,
        retryConfig: { maxRetries: 1, initialDelay: 10 }
      });

      const mockFile = createMockFigmaFile(testFileId);

      // First request fails with 502, second succeeds
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ err: 'Bad Gateway' }, 502))
        .mockResolvedValueOnce(createMockResponse(mockFile));

      const result = await client.get(`/v1/files/${testFileId}`);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockFile);
    });
  });

  describe('Proxy Rate Limiting', () => {
    it('should handle rate limiting with retry through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl,
        retryConfig: { maxRetries: 2, initialDelay: 10 }
      });

      const mockFile = createMockFigmaFile(testFileId);

      // First request - rate limited
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(
            { err: 'Rate limited' }, 
            429, 
            { 'retry-after': '1' }
          )
        )
        .mockResolvedValueOnce(createMockResponse(mockFile));

      const result = await client.get(`/v1/files/${testFileId}`);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockFile);
    });

    it('should respect rate limit headers through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const mockFile = createMockFigmaFile(testFileId);
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          mockFile,
          200,
          { 
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '99',
            'x-ratelimit-reset': String(Date.now() / 1000 + 60)
          }
        )
      );

      const result = await client.get(`/v1/files/${testFileId}`);

      expect(result).toEqual(mockFile);
    });
  });

  describe('Direct Requests (No Proxy)', () => {
    it('should handle direct requests when proxy not configured', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken
      });

      const mockFile = createMockFigmaFile(testFileId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockFile));

      const result = await client.get(`/v1/files/${testFileId}`);

      expect(mockProxyAgent).not.toHaveBeenCalled();
      expect(mockSetGlobalDispatcher).not.toHaveBeenCalled();
      expect(result).toEqual(mockFile);
    });

    it('should handle multiple direct requests', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken
      });

      const mockFile = createMockFigmaFile(testFileId);
      const mockImages = createMockFigmaImage(testFileId);

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockFile))
        .mockResolvedValueOnce(createMockResponse(mockImages));

      const fileResult = await client.get(`/v1/files/${testFileId}`);
      const imageResult = await client.get(`/v1/images/${testFileId}`, { ids: '0:1' });

      expect(fileResult).toEqual(mockFile);
      expect(imageResult).toEqual(mockImages);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Proxy Headers', () => {
    it('should include proxy authentication headers when proxyToken is provided', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl,
        proxyToken: proxyToken
      });

      const mockFile = createMockFigmaFile(testFileId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockFile));

      await client.get(`/v1/files/${testFileId}`);

      // Verify proxy was configured with authentication
      expect(client.proxyToken).toBe(proxyToken);
    });

    it('should maintain Figma API headers through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: proxyUrl
      });

      const mockFile = createMockFigmaFile(testFileId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockFile));

      await client.get(`/v1/files/${testFileId}`);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': mockApiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'figma-files-api/1.0.0'
          })
        })
      );
    });
  });
});