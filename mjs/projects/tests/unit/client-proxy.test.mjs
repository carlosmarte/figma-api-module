/**
 * Proxy support tests for FigmaProjectsClient
 */

import { jest } from '@jest/globals';
// import { ProxyTestHelper } from '../../../test-helpers/proxy-test-utils.mjs';
// import { FigmaProjectsClient } from '../../src/core/client.mjs';

describe('FigmaProjectsClient - Proxy Support', () => {
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
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken 
      });

      expect(client.proxyAgent).toBeNull();
    });

    test('should initialize proxy from constructor options', () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should initialize proxy with token', () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        proxyToken: helper.proxyToken
      });

      expect(client.proxyAgent).not.toBeNull();
    });

    test('should use environment variables', () => {
      helper.setEnvironmentProxy(true);

      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken
      });

      expect(client.proxyAgent).not.toBeNull();
    });
  });

  describe('Proxy Project Operations', () => {
    test('should fetch team projects through proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/teams/team-123/projects',
        method: 'GET',
        responseBody: { 
          projects: [
            { id: 'proj1', name: 'Project 1' },
            { id: 'proj2', name: 'Project 2' }
          ]
        }
      });

      const result = await client.getTeamProjects('team-123');
      expect(result.projects).toHaveLength(2);
    });

    test('should fetch project files through proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        proxyToken: helper.proxyToken
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/projects/proj-123/files',
        method: 'GET',
        responseBody: { 
          files: [
            { key: 'file1', name: 'Design System' },
            { key: 'file2', name: 'Components' }
          ]
        }
      });

      const result = await client.getProjectFiles('proj-123');
      expect(result.files).toHaveLength(2);
    });

    test('should include branch data through proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/projects/proj-123/files?branch_data=true',
        method: 'GET',
        responseBody: { 
          files: [
            { 
              key: 'file1', 
              name: 'Main File',
              branches: [
                { key: 'branch1', name: 'Feature Branch' }
              ]
            }
          ]
        }
      });

      const result = await client.getProjectFiles('proj-123', { branchData: true });
      expect(result.files[0].branches).toBeDefined();
    });

    test('should handle caching with proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        enableCache: true
      });

      // Mock only once - second call should use cache
      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/teams/team-123/projects',
        method: 'GET',
        responseBody: { 
          projects: [{ id: 'proj1', name: 'Cached Project' }]
        }
      });

      const result1 = await client.getTeamProjects('team-123');
      const result2 = await client.getTeamProjects('team-123');
      
      expect(result1).toEqual(result2);
      expect(client.getCacheStats().size).toBeGreaterThan(0);
    });

    test('should handle metrics tracking through proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        enableMetrics: true
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/teams/team-123/projects',
        method: 'GET',
        responseBody: { projects: [] }
      });

      await client.getTeamProjects('team-123');
      
      const metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
    });

    test('should handle errors through proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl
      });

      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/teams/invalid/projects',
        method: 'GET',
        responseStatus: 404,
        responseBody: { error: 'Team not found' }
      });

      await expect(client.getTeamProjects('invalid')).rejects.toThrow();
    });

    test('should handle rate limiting through proxy', async () => {
      const client = new FigmaProjectsClient({ 
        apiToken: mockApiToken,
        proxyUrl: helper.proxyUrl,
        maxRetries: 1
      });

      // First attempt - rate limited
      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/teams/team-123/projects',
        method: 'GET',
        responseStatus: 429,
        responseBody: { error: 'Too many requests' },
        responseHeaders: { 'Retry-After': '1' }
      });

      // Retry - success
      helper.mockProxyRequest({
        path: 'https://api.figma.com/v1/teams/team-123/projects',
        method: 'GET',
        responseBody: { projects: [] }
      });

      const result = await client.getTeamProjects('team-123');
      expect(result.projects).toBeDefined();
    });
  });
});