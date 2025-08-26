/**
 * Unit tests for FigmaFilesService
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ValidationError, NodeNotFoundError } from '../../src/core/exceptions.mjs';

// Mock the client module before importing the service
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockGetStats = jest.fn();
const mockHealthCheck = jest.fn();

jest.unstable_mockModule('../../src/core/client.mjs', () => ({
  default: jest.fn().mockImplementation(() => ({
    get: mockGet,
    post: mockPost,
    getStats: mockGetStats,
    healthCheck: mockHealthCheck
  }))
}));

// Import the service after mocking the client
const { FigmaFilesService } = await import('../../src/core/service.mjs');

describe('FigmaFilesService', () => {
  let service;
  let mockClient;
  const mockApiToken = 'test-token';

  beforeEach(() => {
    // Reset all mocks before each test
    mockGet.mockReset();
    mockPost.mockReset();
    mockGetStats.mockReset();
    mockHealthCheck.mockReset();
    
    // Set default return values
    mockGetStats.mockReturnValue({ totalRequests: 0 });
    mockHealthCheck.mockResolvedValue(true);
    
    service = new FigmaFilesService({
      apiToken: mockApiToken,
      logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
    });
    mockClient = service.client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with client', () => {
      expect(service.client).toBeDefined();
      expect(service.logger).toBeDefined();
    });
  });

  describe('validation', () => {
    describe('_validateFileKey', () => {
      it('should accept valid file keys', () => {
        expect(() => service._validateFileKey('abc123')).not.toThrow();
        expect(() => service._validateFileKey('test-file_key')).not.toThrow();
      });

      it('should reject invalid file keys', () => {
        expect(() => service._validateFileKey('')).toThrow(ValidationError);
        expect(() => service._validateFileKey(null)).toThrow(ValidationError);
        expect(() => service._validateFileKey('invalid/key')).toThrow(ValidationError);
        expect(() => service._validateFileKey('key with spaces')).toThrow(ValidationError);
      });
    });

    describe('_validateNodeIds', () => {
      it('should accept valid node IDs', () => {
        expect(service._validateNodeIds('1:2')).toEqual(['1:2']);
        expect(service._validateNodeIds(['1:2', '3:4'])).toEqual(['1:2', '3:4']);
        expect(service._validateNodeIds('1:2,3:4')).toEqual(['1:2', '3:4']);
      });

      it('should reject invalid node IDs', () => {
        expect(() => service._validateNodeIds('')).toThrow(ValidationError);
        expect(() => service._validateNodeIds(null)).toThrow(ValidationError);
        expect(() => service._validateNodeIds([])).toThrow(ValidationError);
        expect(() => service._validateNodeIds('invalid-id')).toThrow(ValidationError);
      });

      it('should trim whitespace from node IDs', () => {
        expect(service._validateNodeIds(' 1:2 , 3:4 ')).toEqual(['1:2', '3:4']);
      });
    });

    describe('_validateScale', () => {
      it('should accept valid scales', () => {
        expect(() => service._validateScale(1)).not.toThrow();
        expect(() => service._validateScale(0.5)).not.toThrow();
        expect(() => service._validateScale(4)).not.toThrow();
        expect(() => service._validateScale(undefined)).not.toThrow();
      });

      it('should reject invalid scales', () => {
        expect(() => service._validateScale(0)).toThrow(ValidationError);
        expect(() => service._validateScale(5)).toThrow(ValidationError);
        expect(() => service._validateScale('invalid')).toThrow(ValidationError);
      });
    });

    describe('_validateImageFormat', () => {
      it('should accept valid formats', () => {
        expect(() => service._validateImageFormat('png')).not.toThrow();
        expect(() => service._validateImageFormat('jpg')).not.toThrow();
        expect(() => service._validateImageFormat('svg')).not.toThrow();
        expect(() => service._validateImageFormat('pdf')).not.toThrow();
        expect(() => service._validateImageFormat(undefined)).not.toThrow();
      });

      it('should reject invalid formats', () => {
        expect(() => service._validateImageFormat('gif')).toThrow(ValidationError);
        expect(() => service._validateImageFormat('invalid')).toThrow(ValidationError);
      });
    });
  });

  describe('getFile', () => {
    it('should get file with basic parameters', async () => {
      const mockResponse = { name: 'Test File', document: {} };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.getFile('test-key');

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key', {});
      expect(result).toEqual(mockResponse);
    });

    it('should pass through options correctly', async () => {
      const mockResponse = { name: 'Test File', document: {} };
      mockGet.mockResolvedValue(mockResponse);

      const options = {
        version: 'v123',
        ids: '1:2,3:4',
        depth: 2,
        geometry: 'paths',
        pluginData: 'plugin1,plugin2',
        branchData: true
      };

      await service.getFile('test-key', options);

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key', {
        version: 'v123',
        ids: '1:2,3:4',
        depth: 2,
        geometry: 'paths',
        plugin_data: 'plugin1,plugin2',
        branch_data: true
      });
    });

    it('should validate file key', async () => {
      await expect(service.getFile('')).rejects.toThrow(ValidationError);
    });
  });

  describe('getFileNodes', () => {
    it('should get file nodes with valid response', async () => {
      const mockResponse = {
        nodes: {
          '1:2': { id: '1:2', name: 'Node 1' },
          '3:4': { id: '3:4', name: 'Node 2' }
        }
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.getFileNodes('test-key', '1:2,3:4');

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key/nodes', {
        ids: '1:2,3:4'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle null nodes in response', async () => {
      const mockResponse = {
        nodes: {
          '1:2': { id: '1:2', name: 'Node 1' },
          '3:4': null // Node not found
        }
      };
      mockGet.mockResolvedValue(mockResponse);

      await expect(service.getFileNodes('test-key', '1:2,3:4'))
        .rejects.toThrow(NodeNotFoundError);
    });

    it('should pass through options correctly', async () => {
      const mockResponse = { nodes: {} };
      mockGet.mockResolvedValue(mockResponse);

      const options = {
        version: 'v123',
        depth: 1,
        geometry: 'paths',
        pluginData: 'plugin1'
      };

      await service.getFileNodes('test-key', '1:2', options);

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key/nodes', {
        ids: '1:2',
        version: 'v123',
        depth: 1,
        geometry: 'paths',
        plugin_data: 'plugin1'
      });
    });

    it('should validate inputs', async () => {
      await expect(service.getFileNodes('', '1:2')).rejects.toThrow(ValidationError);
      await expect(service.getFileNodes('test-key', '')).rejects.toThrow(ValidationError);
    });
  });

  describe('renderImages', () => {
    it('should render images with basic parameters', async () => {
      const mockResponse = {
        images: {
          '1:2': 'https://image1.url',
          '3:4': 'https://image2.url'
        }
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.renderImages('test-key', '1:2,3:4');

      expect(mockGet).toHaveBeenCalledWith('/v1/images/test-key', {
        ids: '1:2,3:4'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should warn about failed image renders', async () => {
      const mockResponse = {
        images: {
          '1:2': 'https://image1.url',
          '3:4': null // Render failed
        }
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.renderImages('test-key', '1:2,3:4');

      expect(service.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to render images for nodes: 3:4')
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass through all options correctly', async () => {
      const mockResponse = { images: {} };
      mockGet.mockResolvedValue(mockResponse);

      const options = {
        version: 'v123',
        scale: 2,
        format: 'jpg',
        svgOutlineText: true,
        svgIncludeId: false,
        svgIncludeNodeId: true,
        svgSimplifyStroke: false,
        contentsOnly: false,
        useAbsoluteBounds: true
      };

      await service.renderImages('test-key', '1:2', options);

      expect(mockGet).toHaveBeenCalledWith('/v1/images/test-key', {
        ids: '1:2',
        version: 'v123',
        scale: 2,
        format: 'jpg',
        svg_outline_text: true,
        svg_include_id: false,
        svg_include_node_id: true,
        svg_simplify_stroke: false,
        contents_only: false,
        use_absolute_bounds: true
      });
    });

    it('should validate inputs', async () => {
      await expect(service.renderImages('', '1:2')).rejects.toThrow(ValidationError);
      await expect(service.renderImages('test-key', '')).rejects.toThrow(ValidationError);
      await expect(service.renderImages('test-key', '1:2', { scale: 5 }))
        .rejects.toThrow(ValidationError);
      await expect(service.renderImages('test-key', '1:2', { format: 'gif' }))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getImageFills', () => {
    it('should get image fills', async () => {
      const mockResponse = { images: { 'ref1': 'https://image.url' } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.getImageFills('test-key');

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key/images');
      expect(result).toEqual(mockResponse);
    });

    it('should validate file key', async () => {
      await expect(service.getImageFills('')).rejects.toThrow(ValidationError);
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata', async () => {
      const mockResponse = { name: 'Test File', lastModified: '2023-01-01' };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.getFileMetadata('test-key');

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key/meta');
      expect(result).toEqual(mockResponse);
    });

    it('should validate file key', async () => {
      await expect(service.getFileMetadata('')).rejects.toThrow(ValidationError);
    });
  });

  describe('getFileVersions', () => {
    it('should get file versions with basic parameters', async () => {
      const mockResponse = { versions: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await service.getFileVersions('test-key');

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key/versions', {});
      expect(result).toEqual(mockResponse);
    });

    it('should pass through options correctly', async () => {
      const mockResponse = { versions: [] };
      mockGet.mockResolvedValue(mockResponse);

      const options = {
        pageSize: 20,
        before: 123,
        after: 456
      };

      await service.getFileVersions('test-key', options);

      expect(mockGet).toHaveBeenCalledWith('/v1/files/test-key/versions', {
        page_size: 20,
        before: 123,
        after: 456
      });
    });

    it('should validate page size', async () => {
      await expect(service.getFileVersions('test-key', { pageSize: 100 }))
        .rejects.toThrow(ValidationError);
    });

    it('should validate file key', async () => {
      await expect(service.getFileVersions('')).rejects.toThrow(ValidationError);
    });
  });

  describe('batchGetFiles', () => {
    it('should get multiple files successfully', async () => {
      const mockResponse1 = { name: 'File 1' };
      const mockResponse2 = { name: 'File 2' };
      
      mockGet
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await service.batchGetFiles(['key1', 'key2']);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.total).toBe(2);
    });

    it('should handle partial failures', async () => {
      const mockResponse1 = { name: 'File 1' };
      
      mockGet
        .mockResolvedValueOnce(mockResponse1)
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await service.batchGetFiles(['key1', 'key2']);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should validate input', async () => {
      await expect(service.batchGetFiles([])).rejects.toThrow(ValidationError);
      await expect(service.batchGetFiles('not-array')).rejects.toThrow(ValidationError);
    });
  });

  describe('utility methods', () => {
    it('should get stats from client', () => {
      const mockStats = { totalRequests: 10 };
      mockGetStats.mockReturnValue(mockStats);

      const result = service.getStats();

      expect(result).toEqual(mockStats);
    });

    it('should perform health check via client', async () => {
      mockHealthCheck.mockResolvedValue(true);

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });
  });
});