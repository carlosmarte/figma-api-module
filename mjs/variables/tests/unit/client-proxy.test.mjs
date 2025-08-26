/**
 * Proxy support tests for FigmaVariablesClient
 */

import { jest } from '@jest/globals';
import { ProxyTestHelper } from '../../../test-helpers/proxy-test-utils.mjs';
import { FigmaVariablesClient } from '../../src/core/client.mjs';

describe('FigmaVariablesClient - Proxy Support', () => {
  let helper;
  const mockAccessToken = 'test-token';

  beforeEach(() => {
    helper = new ProxyTestHelper();
    helper.setup();
  });

  afterEach(() => {
    helper.teardown();
  });

  describe('Proxy Configuration', () => {
    test('should initialize without proxy when not configured', () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken 
      });

      expect(client.proxyAgent).toBeNull();
    });

    test('should initialize proxy from constructor options', () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy with token', () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl,
        proxyToken: helper.proxyToken
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should use environment variables', () => {
      helper.setEnvironmentProxy(true);

      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken
      });

      expect(client.proxyAgent).not.toBeNull();
    });
  });

  describe('Proxy Variable Operations', () => {
    test('should fetch local variables through proxy', async () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/variables/local',
        method: 'GET',
        responseBody: { 
          variables: {
            'var1': { id: 'var1', name: 'Primary Color', resolvedType: 'COLOR' }
          },
          variableCollections: {
            'coll1': { id: 'coll1', name: 'Colors' }
          }
        }
      });

      const result = await client.getLocalVariables('file-key');
      expect(result.variables).toBeDefined();
      expect(result.variableCollections).toBeDefined();
    });

    test('should fetch published variables through proxy', async () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl,
        proxyToken: helper.proxyToken
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/variables/published',
        method: 'GET',
        responseBody: { 
          variables: {
            'var1': { 
              id: 'var1', 
              name: 'Published Color',
              resolvedType: 'COLOR',
              publishStatus: 'CURRENT'
            }
          }
        }
      });

      const result = await client.getPublishedVariables('file-key');
      expect(result.variables.var1.publishStatus).toBe('CURRENT');
    });

    test('should update variables through proxy', async () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl
      });

      const changes = {
        variableCollections: [
          {
            action: 'CREATE',
            name: 'New Collection',
            initialModeId: 'mode1'
          }
        ],
        variables: [
          {
            action: 'CREATE',
            variableCollectionId: 'coll1',
            name: 'New Variable',
            resolvedType: 'STRING'
          }
        ]
      };

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/variables',
        method: 'POST',
        body: changes,
        responseBody: { 
          tempIdToRealId: {
            'tempId1': 'realId1'
          }
        }
      });

      const result = await client.updateVariables('file-key', changes);
      expect(result.tempIdToRealId).toBeDefined();
    });

    test('should handle enterprise access errors through proxy', async () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/variables/local',
        method: 'GET',
        responseStatus: 403,
        responseBody: { 
          error: 'Enterprise organization access required'
        }
      });

      await expect(client.getLocalVariables('file-key')).rejects.toThrow();
    });

    test('should handle caching through proxy', async () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl,
        cache: {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn()
        }
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/variables/local',
        method: 'GET',
        responseBody: { 
          variables: {}
        }
      });

      await client.getLocalVariables('file-key');
      
      expect(client.cache.set).toHaveBeenCalledWith(
        'local_variables_file-key',
        expect.any(Object),
        expect.objectContaining({ ttl: 5 * 60 * 1000 })
      );
    });

    test('should clear cache after updates through proxy', async () => {
      const clearVariableCachesSpy = jest.fn();
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken,
        proxyUrl: helper.proxyUrl,
        cache: {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn()
        }
      });
      client._clearVariableCaches = clearVariableCachesSpy;

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/files/file-key/variables',
        method: 'POST',
        body: {},
        responseBody: { tempIdToRealId: {} }
      });

      await client.updateVariables('file-key', {});
      expect(clearVariableCachesSpy).toHaveBeenCalledWith('file-key');
    });

    test('should handle direct requests when proxy not configured', async () => {
      const client = new FigmaVariablesClient({ 
        accessToken: mockAccessToken
      });

      helper.mockDirectRequest({
        baseUrl: 'https://api.figma.com',
        path: '/v1/files/file-key/variables/local',
        method: 'GET',
        responseBody: { variables: {} }
      });

      const result = await client.getLocalVariables('file-key');
      expect(result.variables).toBeDefined();
    });
  });
});