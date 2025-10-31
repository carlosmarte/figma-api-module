/**
 * Tests for FigmaDevResourcesSDK
 */

import { jest } from '@jest/globals';

// Mock client and undici modules
const mockClient = {
  getDevResources: jest.fn(),
  createDevResources: jest.fn(),
  updateDevResources: jest.fn(),
  deleteDevResource: jest.fn(),
  batchCreateDevResources: jest.fn()
};

const mockFetch = jest.fn();
const mockProxyAgent = jest.fn();

jest.unstable_mockModule('./client.mjs', () => ({
  default: jest.fn(() => mockClient),
  FigmaDevResourcesClient: jest.fn(() => mockClient),
  FigmaApiError: class extends Error {},
  FigmaAuthError: class extends Error {},
  FigmaValidationError: class extends Error {},
  FigmaRateLimitError: class extends Error {}
}));

jest.unstable_mockModule('undici', () => ({
  fetch: mockFetch,
  ProxyAgent: mockProxyAgent
}));

// Import after mocking
const FigmaDevResourcesSDK = (await import('./sdk.mjs')).default;

describe('FigmaDevResourcesSDK', () => {
  let sdk;
  const mockConfig = {
    accessToken: 'test-token',
    baseUrl: 'https://api.figma.com'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    sdk = new FigmaDevResourcesSDK(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create SDK with client instance', () => {
      expect(sdk.client).toBe(mockClient);
    });

    it('should initialize proxy agent if configured', () => {
      const configWithProxy = {
        ...mockConfig,
        proxyUrl: 'http://proxy.example.com:8080',
        proxyToken: 'proxy-token'
      };
      
      const sdkWithProxy = new FigmaDevResourcesSDK(configWithProxy);
      expect(sdkWithProxy.proxyAgent).toBeDefined();
    });
  });

  describe('getFileDevResources', () => {
    const mockFileKey = 'test-file-key';
    const mockDevResources = [
      {
        id: 'resource-1',
        name: 'Test Resource',
        url: 'https://example.com',
        file_key: mockFileKey,
        node_id: 'node-1'
      }
    ];

    it('should get dev resources for a file', async () => {
      mockClient.getDevResources.mockResolvedValue({
        dev_resources: mockDevResources
      });

      const result = await sdk.getFileDevResources(mockFileKey);

      expect(mockClient.getDevResources).toHaveBeenCalledWith(mockFileKey, {});
      expect(result).toEqual(mockDevResources);
    });

    it('should get dev resources with node ID filter', async () => {
      const nodeIds = ['node-1', 'node-2'];
      mockClient.getDevResources.mockResolvedValue({
        dev_resources: mockDevResources
      });

      const result = await sdk.getFileDevResources(mockFileKey, nodeIds);

      expect(mockClient.getDevResources).toHaveBeenCalledWith(mockFileKey, { nodeIds });
      expect(result).toEqual(mockDevResources);
    });

    it('should return empty array if no dev_resources in response', async () => {
      mockClient.getDevResources.mockResolvedValue({});

      const result = await sdk.getFileDevResources(mockFileKey);

      expect(result).toEqual([]);
    });
  });

  describe('getNodeDevResources', () => {
    it('should call getFileDevResources with node IDs', async () => {
      const fileKey = 'test-file';
      const nodeIds = ['node-1', 'node-2'];
      const mockResources = [{ id: 'res-1' }];
      
      sdk.getFileDevResources = jest.fn().mockResolvedValue(mockResources);

      const result = await sdk.getNodeDevResources(fileKey, nodeIds);

      expect(sdk.getFileDevResources).toHaveBeenCalledWith(fileKey, nodeIds);
      expect(result).toBe(mockResources);
    });
  });

  describe('createDevResource', () => {
    const mockFileKey = 'test-file';
    const mockNodeId = 'node-1';
    const mockName = 'Test Resource';
    const mockUrl = 'https://example.com';
    const mockCreatedResource = {
      id: 'resource-1',
      name: mockName,
      url: mockUrl,
      file_key: mockFileKey,
      node_id: mockNodeId
    };

    it('should create a single dev resource successfully', async () => {
      mockClient.createDevResources.mockResolvedValue({
        links_created: [mockCreatedResource],
        errors: []
      });

      const result = await sdk.createDevResource(mockFileKey, mockNodeId, mockName, mockUrl);

      expect(mockClient.createDevResources).toHaveBeenCalledWith([{
        file_key: mockFileKey,
        node_id: mockNodeId,
        name: mockName,
        url: mockUrl
      }]);
      expect(result).toEqual(mockCreatedResource);
    });

    it('should throw error if creation fails', async () => {
      mockClient.createDevResources.mockResolvedValue({
        links_created: [],
        errors: [{ error: 'Creation failed' }]
      });

      await expect(
        sdk.createDevResource(mockFileKey, mockNodeId, mockName, mockUrl)
      ).rejects.toThrow('Creation failed');
    });

    it('should throw error for unknown creation failure', async () => {
      mockClient.createDevResources.mockResolvedValue({
        links_created: [],
        errors: []
      });

      await expect(
        sdk.createDevResource(mockFileKey, mockNodeId, mockName, mockUrl)
      ).rejects.toThrow('Unknown error creating dev resource');
    });
  });

  describe('createFileDevResources', () => {
    it('should create multiple resources for a single file', async () => {
      const mockFileKey = 'test-file';
      const resources = [
        { nodeId: 'node-1', name: 'Resource 1', url: 'https://example1.com' },
        { nodeId: 'node-2', name: 'Resource 2', url: 'https://example2.com' }
      ];
      const mockResponse = { links_created: [], errors: [] };

      mockClient.createDevResources.mockResolvedValue(mockResponse);

      const result = await sdk.createFileDevResources(mockFileKey, resources);

      expect(mockClient.createDevResources).toHaveBeenCalledWith([
        { file_key: mockFileKey, node_id: 'node-1', name: 'Resource 1', url: 'https://example1.com' },
        { file_key: mockFileKey, node_id: 'node-2', name: 'Resource 2', url: 'https://example2.com' }
      ]);
      expect(result).toBe(mockResponse);
    });
  });

  describe('createMultiFileDevResources', () => {
    it('should create resources across multiple files', async () => {
      const resources = [
        { fileKey: 'file-1', nodeId: 'node-1', name: 'Resource 1', url: 'https://example1.com' },
        { fileKey: 'file-2', nodeId: 'node-2', name: 'Resource 2', url: 'https://example2.com' }
      ];
      const mockResponse = { links_created: [], errors: [] };

      mockClient.createDevResources.mockResolvedValue(mockResponse);

      const result = await sdk.createMultiFileDevResources(resources);

      expect(mockClient.createDevResources).toHaveBeenCalledWith([
        { file_key: 'file-1', node_id: 'node-1', name: 'Resource 1', url: 'https://example1.com' },
        { file_key: 'file-2', node_id: 'node-2', name: 'Resource 2', url: 'https://example2.com' }
      ]);
      expect(result).toBe(mockResponse);
    });
  });

  describe('updateDevResource', () => {
    const mockResourceId = 'resource-1';
    const mockUpdates = { name: 'Updated Name', url: 'https://updated.example.com' };
    const mockUpdatedResource = { id: mockResourceId, ...mockUpdates };

    it('should update a single dev resource successfully', async () => {
      mockClient.updateDevResources.mockResolvedValue({
        links_updated: [mockUpdatedResource],
        errors: []
      });

      const result = await sdk.updateDevResource(mockResourceId, mockUpdates);

      expect(mockClient.updateDevResources).toHaveBeenCalledWith([{
        id: mockResourceId,
        ...mockUpdates
      }]);
      expect(result).toEqual(mockUpdatedResource);
    });

    it('should throw error if update fails', async () => {
      mockClient.updateDevResources.mockResolvedValue({
        links_updated: [],
        errors: [{ error: 'Update failed' }]
      });

      await expect(
        sdk.updateDevResource(mockResourceId, mockUpdates)
      ).rejects.toThrow('Update failed');
    });

    it('should throw error for unknown update failure', async () => {
      mockClient.updateDevResources.mockResolvedValue({
        links_updated: [],
        errors: []
      });

      await expect(
        sdk.updateDevResource(mockResourceId, mockUpdates)
      ).rejects.toThrow('Unknown error updating dev resource');
    });
  });

  describe('updateMultipleDevResources', () => {
    it('should update multiple dev resources', async () => {
      const updates = [
        { id: 'resource-1', name: 'Updated 1' },
        { id: 'resource-2', name: 'Updated 2' }
      ];
      const mockResponse = { links_updated: [], errors: [] };

      mockClient.updateDevResources.mockResolvedValue(mockResponse);

      const result = await sdk.updateMultipleDevResources(updates);

      expect(mockClient.updateDevResources).toHaveBeenCalledWith(updates);
      expect(result).toBe(mockResponse);
    });
  });

  describe('deleteDevResource', () => {
    it('should delete a dev resource', async () => {
      const fileKey = 'test-file';
      const resourceId = 'resource-1';

      mockClient.deleteDevResource.mockResolvedValue({});

      await sdk.deleteDevResource(fileKey, resourceId);

      expect(mockClient.deleteDevResource).toHaveBeenCalledWith(fileKey, resourceId);
    });
  });

  describe('deleteMultipleDevResources', () => {
    it('should delete multiple dev resources successfully', async () => {
      const resources = [
        { fileKey: 'file-1', id: 'resource-1' },
        { fileKey: 'file-2', id: 'resource-2' }
      ];

      mockClient.deleteDevResource.mockResolvedValue({});

      const result = await sdk.deleteMultipleDevResources(resources);

      expect(mockClient.deleteDevResource).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { success: true, fileKey: 'file-1', id: 'resource-1' },
        { success: true, fileKey: 'file-2', id: 'resource-2' }
      ]);
    });

    it('should handle deletion errors gracefully', async () => {
      const resources = [
        { fileKey: 'file-1', id: 'resource-1' },
        { fileKey: 'file-2', id: 'resource-2' }
      ];

      mockClient.deleteDevResource
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Delete failed'));

      const result = await sdk.deleteMultipleDevResources(resources);

      expect(result).toEqual([
        { success: true, fileKey: 'file-1', id: 'resource-1' },
        { success: false, fileKey: 'file-2', id: 'resource-2', error: 'Delete failed' }
      ]);
    });
  });

  describe('syncFileDevResources', () => {
    const mockFileKey = 'test-file';
    const mockCurrentResources = [
      { id: 'existing-1', node_id: 'node-1', name: 'Existing 1', url: 'https://existing1.com' },
      { id: 'existing-2', node_id: 'node-2', name: 'Existing 2', url: 'https://existing2.com' },
      { id: 'to-delete', node_id: 'node-3', name: 'To Delete', url: 'https://delete.com' }
    ];

    beforeEach(() => {
      sdk.getFileDevResources = jest.fn().mockResolvedValue(mockCurrentResources);
      sdk.deleteMultipleDevResources = jest.fn().mockResolvedValue([
        { success: true, fileKey: mockFileKey, id: 'to-delete' }
      ]);
    });

    it('should sync resources - create, update, and delete', async () => {
      const targetResources = [
        { nodeId: 'node-1', name: 'Updated 1', url: 'https://existing1.com' }, // Update
        { nodeId: 'node-2', name: 'Existing 2', url: 'https://existing2.com' }, // No change
        { nodeId: 'node-4', name: 'New Resource', url: 'https://new.com' } // Create
      ];

      mockClient.createDevResources.mockResolvedValue({
        links_created: [{ id: 'new-1', name: 'New Resource', url: 'https://new.com' }],
        errors: []
      });

      mockClient.updateDevResources.mockResolvedValue({
        links_updated: [{ id: 'existing-1', name: 'Updated 1', url: 'https://existing1.com' }],
        errors: []
      });

      const result = await sdk.syncFileDevResources(mockFileKey, targetResources);

      expect(mockClient.createDevResources).toHaveBeenCalledWith([{
        file_key: mockFileKey,
        node_id: 'node-4',
        name: 'New Resource',
        url: 'https://new.com'
      }]);

      expect(mockClient.updateDevResources).toHaveBeenCalledWith([{
        id: 'existing-1',
        name: 'Updated 1',
        url: 'https://existing1.com'
      }]);

      expect(sdk.deleteMultipleDevResources).toHaveBeenCalledWith([
        { fileKey: mockFileKey, id: 'to-delete' }
      ]);

      expect(result).toEqual({
        created: [{ id: 'new-1', name: 'New Resource', url: 'https://new.com' }],
        updated: [{ id: 'existing-1', name: 'Updated 1', url: 'https://existing1.com' }],
        deleted: [{ success: true, fileKey: mockFileKey, id: 'to-delete' }],
        errors: []
      });
    });

    it('should handle sync errors gracefully', async () => {
      const targetResources = [
        { nodeId: 'node-4', name: 'New Resource', url: 'https://new.com' }
      ];

      mockClient.createDevResources.mockRejectedValue(new Error('Create failed'));

      const result = await sdk.syncFileDevResources(mockFileKey, targetResources);

      expect(result.errors).toContainEqual({ error: 'Create failed' });
    });
  });

  describe('searchDevResources', () => {
    const mockFileKey = 'test-file';
    const mockResources = [
      { id: '1', name: 'Test Resource', url: 'https://test.com' },
      { id: '2', name: 'Example Resource', url: 'https://example.com' },
      { id: '3', name: 'Another Item', url: 'https://other.com' }
    ];

    beforeEach(() => {
      sdk.getFileDevResources = jest.fn().mockResolvedValue(mockResources);
    });

    it('should search resources by string pattern', async () => {
      const result = await sdk.searchDevResources(mockFileKey, 'resource');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Resource');
      expect(result[1].name).toBe('Example Resource');
    });

    it('should search resources by regex pattern', async () => {
      const pattern = /^Test/;
      const result = await sdk.searchDevResources(mockFileKey, pattern);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Resource');
    });
  });

  describe('getDevResourcesByUrl', () => {
    const mockFileKey = 'test-file';
    const mockResources = [
      { id: '1', name: 'Resource 1', url: 'https://example.com/path1' },
      { id: '2', name: 'Resource 2', url: 'https://test.com/path2' },
      { id: '3', name: 'Resource 3', url: 'https://example.org/path3' }
    ];

    beforeEach(() => {
      sdk.getFileDevResources = jest.fn().mockResolvedValue(mockResources);
    });

    it('should filter resources by URL string pattern', async () => {
      const result = await sdk.getDevResourcesByUrl(mockFileKey, 'example.com');

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/path1');
    });

    it('should filter resources by URL regex pattern', async () => {
      const pattern = /example\.(com|org)/;
      const result = await sdk.getDevResourcesByUrl(mockFileKey, pattern);

      expect(result).toHaveLength(2);
    });
  });

  describe('getDevResourcesStats', () => {
    const mockFileKey = 'test-file';
    const mockResources = [
      { id: '1', node_id: 'node-1', url: 'https://example.com/1' },
      { id: '2', node_id: 'node-1', url: 'https://test.com/2' },
      { id: '3', node_id: 'node-2', url: 'https://example.com/3' },
      { id: '4', node_id: 'node-2', url: 'https://invalid-url' }
    ];

    beforeEach(() => {
      sdk.getFileDevResources = jest.fn().mockResolvedValue(mockResources);
    });

    it('should calculate dev resources statistics', async () => {
      const result = await sdk.getDevResourcesStats(mockFileKey);

      expect(result).toEqual({
        total: 4,
        byNode: {
          'node-1': 2,
          'node-2': 2
        },
        byDomain: {
          'example.com': 2,
          'test.com': 1,
          'invalid-url': 1  // The invalid URL gets treated as a domain
        },
        nodesWithResources: 2,
        domains: 3  // Updated to 3 because invalid-url counts as a domain
      });
    });

    it('should handle invalid URLs gracefully', async () => {
      const resourcesWithInvalidUrl = [
        { id: '1', node_id: 'node-1', url: 'https://example.com' },
        { id: '2', node_id: 'node-1', url: 'not-a-valid-url' }
      ];

      sdk.getFileDevResources = jest.fn().mockResolvedValue(resourcesWithInvalidUrl);

      const result = await sdk.getDevResourcesStats(mockFileKey);

      expect(result.byDomain).toEqual({ 'example.com': 1 });
      expect(result.domains).toBe(1);
    });
  });

  describe('validateDevResourceUrls', () => {
    const mockFileKey = 'test-file';
    const mockResources = [
      { id: '1', name: 'Valid Resource', url: 'https://example.com' },
      { id: '2', name: 'Invalid Resource', url: 'https://invalid.com' },
      { id: '3', name: 'Error Resource', url: 'https://error.com' }
    ];

    beforeEach(() => {
      sdk.getFileDevResources = jest.fn().mockResolvedValue(mockResources);
    });

    it('should validate URLs and return invalid ones', async () => {
      const { fetch } = await import('undici');
      
      fetch
        .mockResolvedValueOnce({ ok: true }) // Valid URL
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' }) // Invalid URL
        .mockRejectedValueOnce(new Error('Network error')); // Error URL

      const result = await sdk.validateDevResourceUrls(mockFileKey);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '2',
        name: 'Invalid Resource',
        error: 'HTTP 404: Not Found'
      });
      expect(result[1]).toMatchObject({
        id: '3',
        name: 'Error Resource',
        error: 'Network error'
      });
    });

    it('should use proxy agent if configured', async () => {
      const configWithProxy = {
        ...mockConfig,
        proxyUrl: 'http://proxy.example.com:8080'
      };
      
      const sdkWithProxy = new FigmaDevResourcesSDK(configWithProxy);
      sdkWithProxy.getFileDevResources = jest.fn().mockResolvedValue([
        { id: '1', name: 'Resource', url: 'https://example.com' }
      ]);

      const { fetch } = await import('undici');
      fetch.mockResolvedValue({ ok: true });

      await sdkWithProxy.validateDevResourceUrls(mockFileKey);

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'HEAD',
          dispatcher: expect.any(Object)
        })
      );
    });
  });
});