/**
 * Unit tests for FigmaComponentsService
 */

import { jest } from '@jest/globals';
import { FigmaComponentsService } from '../../src/core/service.mjs';
import { 
  ValidationError,
  PaginationError 
} from '../../src/core/exceptions.mjs';

// Mock the client
const mockClient = {
  get: jest.fn(),
  getStats: jest.fn(() => ({ totalRequests: 0 })),
  healthCheck: jest.fn(() => Promise.resolve(true))
};

// Mock the client constructor
jest.unstable_mockModule('../../src/core/client.mjs', () => ({
  FigmaComponentsClient: jest.fn(() => mockClient),
  default: jest.fn(() => mockClient)
}));

describe('FigmaComponentsService', () => {
  let service;
  let mockLogger;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    service = new FigmaComponentsService({
      apiToken: 'test-token',
      logger: mockLogger
    });

    mockClient.get.mockClear();
  });

  describe('validation methods', () => {
    describe('_validateTeamId', () => {
      it('should accept valid team ID', () => {
        expect(() => service._validateTeamId('123456')).not.toThrow();
      });

      it('should reject invalid team ID formats', () => {
        expect(() => service._validateTeamId('abc')).toThrow(ValidationError);
        expect(() => service._validateTeamId('')).toThrow(ValidationError);
        expect(() => service._validateTeamId(null)).toThrow(ValidationError);
      });
    });

    describe('_validateFileKey', () => {
      it('should accept valid file key', () => {
        expect(() => service._validateFileKey('abc123-def456')).not.toThrow();
      });

      it('should reject invalid file key formats', () => {
        expect(() => service._validateFileKey('abc@123')).toThrow(ValidationError);
        expect(() => service._validateFileKey('')).toThrow(ValidationError);
        expect(() => service._validateFileKey(null)).toThrow(ValidationError);
      });
    });

    describe('_validateComponentKey', () => {
      it('should accept valid component key', () => {
        expect(() => service._validateComponentKey('123:456-abc')).not.toThrow();
      });

      it('should reject invalid component key formats', () => {
        expect(() => service._validateComponentKey('abc@123')).toThrow(ValidationError);
        expect(() => service._validateComponentKey('')).toThrow(ValidationError);
        expect(() => service._validateComponentKey(null)).toThrow(ValidationError);
      });
    });

    describe('_validatePaginationParams', () => {
      it('should accept valid pagination params', () => {
        expect(() => service._validatePaginationParams({ 
          pageSize: 50, 
          after: 100 
        })).not.toThrow();
      });

      it('should reject invalid page size', () => {
        expect(() => service._validatePaginationParams({ 
          pageSize: 0 
        })).toThrow(PaginationError);

        expect(() => service._validatePaginationParams({ 
          pageSize: 1001 
        })).toThrow(PaginationError);
      });

      it('should reject both after and before cursors', () => {
        expect(() => service._validatePaginationParams({ 
          after: 100, 
          before: 200 
        })).toThrow(PaginationError);
      });
    });
  });

  describe('components methods', () => {
    describe('getTeamComponents', () => {
      it('should fetch team components successfully', async () => {
        const mockResponse = { 
          components: [{ name: 'Button', key: '123:456' }],
          meta: { total_count: 1 }
        };
        
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getTeamComponents('123456');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/teams/123456/components', {});
        expect(result).toEqual(mockResponse);
      });

      it('should handle pagination options', async () => {
        const mockResponse = { components: [] };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        await service.getTeamComponents('123456', {
          pageSize: 50,
          after: 100
        });

        expect(mockClient.get).toHaveBeenCalledWith('/v1/teams/123456/components', {
          page_size: 50,
          after: 100
        });
      });

      it('should validate team ID', async () => {
        await expect(service.getTeamComponents('invalid')).rejects.toThrow(ValidationError);
      });
    });

    describe('getFileComponents', () => {
      it('should fetch file components successfully', async () => {
        const mockResponse = { components: [] };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getFileComponents('abc123');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/files/abc123/components');
        expect(result).toEqual(mockResponse);
      });

      it('should validate file key', async () => {
        await expect(service.getFileComponents('invalid@key')).rejects.toThrow(ValidationError);
      });
    });

    describe('getComponent', () => {
      it('should fetch component successfully', async () => {
        const mockResponse = { 
          meta: { node: { name: 'Button' } }
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getComponent('123:456');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/components/123:456');
        expect(result).toEqual(mockResponse);
      });

      it('should validate component key', async () => {
        await expect(service.getComponent('invalid@key')).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('component sets methods', () => {
    describe('getTeamComponentSets', () => {
      it('should fetch team component sets successfully', async () => {
        const mockResponse = { 
          component_sets: [{ name: 'ButtonSet', key: '123:456' }]
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getTeamComponentSets('123456');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/teams/123456/component_sets', {});
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getFileComponentSets', () => {
      it('should fetch file component sets successfully', async () => {
        const mockResponse = { component_sets: [] };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getFileComponentSets('abc123');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/files/abc123/component_sets');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getComponentSet', () => {
      it('should fetch component set successfully', async () => {
        const mockResponse = { 
          meta: { node: { name: 'ButtonSet' } }
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getComponentSet('123:456');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/component_sets/123:456');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('styles methods', () => {
    describe('getTeamStyles', () => {
      it('should fetch team styles successfully', async () => {
        const mockResponse = { 
          styles: [{ name: 'Primary Color', key: '123:456' }]
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getTeamStyles('123456');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/teams/123456/styles', {});
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getFileStyles', () => {
      it('should fetch file styles successfully', async () => {
        const mockResponse = { styles: [] };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getFileStyles('abc123');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/files/abc123/styles');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getStyle', () => {
      it('should fetch style successfully', async () => {
        const mockResponse = { 
          meta: { node: { name: 'Primary Color' } }
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.getStyle('123:456');

        expect(mockClient.get).toHaveBeenCalledWith('/v1/styles/123:456');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('batch operations', () => {
    describe('batchGetComponents', () => {
      it('should batch get components successfully', async () => {
        const mockComponent1 = { meta: { node: { name: 'Button' } } };
        const mockComponent2 = { meta: { node: { name: 'Input' } } };

        mockClient.get
          .mockResolvedValueOnce(mockComponent1)
          .mockResolvedValueOnce(mockComponent2);

        const result = await service.batchGetComponents(['123:456', '789:012']);

        expect(result.successful).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
        expect(result.total).toBe(2);
      });

      it('should handle partial failures', async () => {
        const mockComponent = { meta: { node: { name: 'Button' } } };

        mockClient.get
          .mockResolvedValueOnce(mockComponent)
          .mockRejectedValueOnce(new Error('Component not found'));

        const result = await service.batchGetComponents(['123:456', '789:012']);

        expect(result.successful).toHaveLength(1);
        expect(result.failed).toHaveLength(1);
        expect(result.total).toBe(2);
      });

      it('should validate input array', async () => {
        await expect(service.batchGetComponents([])).rejects.toThrow(ValidationError);
        await expect(service.batchGetComponents('not-array')).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('convenience methods', () => {
    describe('getTeamLibraryContent', () => {
      it('should fetch complete team library', async () => {
        const mockComponents = { components: [{ name: 'Button' }] };
        const mockComponentSets = { component_sets: [{ name: 'ButtonSet' }] };
        const mockStyles = { styles: [{ name: 'Primary' }] };

        mockClient.get
          .mockResolvedValueOnce(mockComponents)
          .mockResolvedValueOnce(mockComponentSets)
          .mockResolvedValueOnce(mockStyles);

        const result = await service.getTeamLibraryContent('123456');

        expect(result.components).toEqual(mockComponents);
        expect(result.componentSets).toEqual(mockComponentSets);
        expect(result.styles).toEqual(mockStyles);
        expect(result.summary.componentsCount).toBe(1);
        expect(result.summary.componentSetsCount).toBe(1);
        expect(result.summary.stylesCount).toBe(1);
      });
    });

    describe('searchTeamComponentsByName', () => {
      it('should search components by name', async () => {
        const mockResponse = {
          components: [
            { name: 'Primary Button', key: '123:456' },
            { name: 'Secondary Button', key: '789:012' },
            { name: 'Input Field', key: '345:678' }
          ]
        };

        mockClient.get.mockResolvedValueOnce(mockResponse);

        const result = await service.searchTeamComponentsByName('123456', 'button');

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Primary Button');
        expect(result[1].name).toBe('Secondary Button');
      });

      it('should validate search term', async () => {
        await expect(service.searchTeamComponentsByName('123456', '')).rejects.toThrow(ValidationError);
        await expect(service.searchTeamComponentsByName('123456', null)).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('utility methods', () => {
    it('should get client statistics', () => {
      const result = service.getStats();
      expect(mockClient.getStats).toHaveBeenCalled();
      expect(result.totalRequests).toBe(0);
    });

    it('should perform health check', async () => {
      const result = await service.healthCheck();
      expect(mockClient.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});