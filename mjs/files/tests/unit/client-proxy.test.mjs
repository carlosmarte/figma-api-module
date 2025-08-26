/**
 * Proxy support tests for FigmaFilesClient
 */

import { jest } from '@jest/globals';
import { ProxyTestHelper, createProxyTestSuite } from '../../../test-helpers/proxy-test-utils.mjs';
import { FigmaFilesClient } from '../../src/core/client.mjs';

describe('FigmaFilesClient - Proxy Support', () => {
  const setupSuite = createProxyTestSuite(FigmaFilesClient, 'FigmaFilesClient');
  const { helper, mockApiToken } = setupSuite();

  describe('Proxy File Operations', () => {
    test('should fetch file through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key',
        method: 'GET',
        responseBody: { 
          document: { id: '0:0', name: 'Document' },
          components: {},
          styles: {}
        }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/files/file-key');
      expect(result.ok).toBe(true);
    });

    test('should fetch file nodes through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        proxyToken: helper.proxyToken
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/nodes?ids=1:2,3:4',
        method: 'GET',
        responseBody: { 
          nodes: {
            '1:2': { document: { id: '1:2', name: 'Node1' } },
            '3:4': { document: { id: '3:4', name: 'Node2' } }
          }
        }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/files/file-key/nodes?ids=1:2,3:4');
      expect(result.ok).toBe(true);
    });

    test('should render images through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/images/file-key',
        method: 'GET',
        responseBody: { 
          images: {
            '1:2': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/...'
          }
        }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/images/file-key');
      expect(result.ok).toBe(true);
    });

    test('should fetch file versions through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/versions',
        method: 'GET',
        responseBody: { 
          versions: [
            { id: 'v1', created_at: '2024-01-01', label: 'Version 1' },
            { id: 'v2', created_at: '2024-01-02', label: 'Version 2' }
          ]
        }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/files/file-key/versions');
      expect(result.ok).toBe(true);
    });

    test('should handle file export through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      const exportParams = {
        format: 'pdf',
        ids: ['1:2', '3:4']
      };

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/export',
        method: 'POST',
        body: exportParams,
        responseBody: { 
          export_url: 'https://figma-exports.s3.amazonaws.com/...'
        }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/files/file-key/export', {
        method: 'POST',
        body: JSON.stringify(exportParams)
      });
      expect(result.ok).toBe(true);
    });

    test('should handle rate limiting with retry through proxy', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        retryConfig: { maxRetries: 1, initialDelay: 100 }
      });

      // First request - rate limited
      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key',
        method: 'GET',
        responseStatus: 429,
        responseBody: { error: 'Rate limited' },
        responseHeaders: { 'Retry-After': '1' }
      });

      // Second request - success
      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key',
        method: 'GET',
        responseBody: { document: { id: '0:0', name: 'Document' } }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/files/file-key');
      expect(result.ok).toBe(true);
    });

    test('should handle direct requests when proxy not configured', async () => {
      const client = new FigmaFilesClient({ 
        apiToken: mockApiToken
      });

      helper.mockDirectRequest({
        baseUrl: 'https://api.figma.com',
        path: '/v1/files/file-key',
        method: 'GET',
        responseBody: { document: { id: '0:0', name: 'Document' } }
      });

      const result = await client._executeRequest('https://api.figma.com/v1/files/file-key');
      expect(result.ok).toBe(true);
    });
  });
});