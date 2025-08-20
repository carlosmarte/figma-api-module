/**
 * Unit tests for FigmaVariablesService
 */

import { jest } from '@jest/globals';
import { FigmaVariablesService } from '../../src/core/service.mjs';
import { 
  ApiError,
  ValidationError,
  NotFoundError,
  VariableError
} from '../../src/core/exceptions.mjs';

describe('FigmaVariablesService', () => {
  let service;
  let mockClient;
  const mockFileKey = 'test-file-key';

  beforeEach(() => {
    mockClient = {
      getLocalVariables: jest.fn(),
      getPublishedVariables: jest.fn(),
      updateVariables: jest.fn()
    };

    service = new FigmaVariablesService({ client: mockClient });
  });

  describe('constructor', () => {
    it('should create service with client', () => {
      expect(service.client).toBe(mockClient);
    });

    it('should throw error without client', () => {
      expect(() => {
        new FigmaVariablesService({});
      }).toThrow(ApiError);
    });
  });

  describe('getLocalVariables', () => {
    const mockResponse = {
      meta: {
        variables: {
          'var1': { name: 'Test Variable', resolvedType: 'STRING' },
          'var2': { name: 'Another Variable', resolvedType: 'COLOR' }
        },
        variableCollections: {
          'col1': { name: 'Test Collection' }
        }
      }
    };

    it('should get local variables successfully', async () => {
      mockClient.getLocalVariables.mockResolvedValue(mockResponse);

      const result = await service.getLocalVariables(mockFileKey);

      expect(mockClient.getLocalVariables).toHaveBeenCalledWith(mockFileKey, {});
      expect(result.variables).toEqual(mockResponse.meta.variables);
      expect(result.variableCollections).toEqual(mockResponse.meta.variableCollections);
      expect(result.stats.variableCount).toBe(2);
      expect(result.stats.collectionCount).toBe(1);
    });

    it('should validate file key', async () => {
      await expect(service.getLocalVariables()).rejects.toThrow(ValidationError);
    });

    it('should handle not found errors', async () => {
      mockClient.getLocalVariables.mockRejectedValue(
        new Error('Not found')
      );
      mockClient.getLocalVariables.mockRejectedValue(
        Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
      );

      await expect(service.getLocalVariables(mockFileKey))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getVariable', () => {
    const mockVariablesResponse = {
      variables: {
        'var1': { name: 'Test Variable', resolvedType: 'STRING' }
      },
      variableCollections: {},
      stats: { variableCount: 1, collectionCount: 0 }
    };

    it('should get specific variable', async () => {
      service.getLocalVariables = jest.fn().mockResolvedValue(mockVariablesResponse);

      const result = await service.getVariable(mockFileKey, 'var1');

      expect(result).toEqual(mockVariablesResponse.variables.var1);
    });

    it('should throw not found for missing variable', async () => {
      service.getLocalVariables = jest.fn().mockResolvedValue(mockVariablesResponse);

      await expect(service.getVariable(mockFileKey, 'missing-var'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createVariable', () => {
    const mockVariableData = {
      name: 'New Variable',
      variableCollectionId: 'col1',
      resolvedType: 'STRING',
      values: { 'mode1': 'test value' }
    };

    it('should create variable successfully', async () => {
      const mockResponse = {
        meta: { tempIdToRealId: { 'temp_variable_123': 'real_var_456' } }
      };
      
      mockClient.updateVariables.mockResolvedValue(mockResponse);

      const result = await service.createVariable(mockFileKey, mockVariableData);

      expect(mockClient.updateVariables).toHaveBeenCalledWith(
        mockFileKey,
        expect.objectContaining({
          variables: expect.arrayContaining([
            expect.objectContaining({
              action: 'CREATE',
              name: 'New Variable',
              variableCollectionId: 'col1',
              resolvedType: 'STRING'
            })
          ]),
          variableModeValues: expect.arrayContaining([
            expect.objectContaining({
              modeId: 'mode1',
              value: 'test value'
            })
          ])
        }),
        {}
      );
      expect(result).toBe(mockResponse);
    });

    it('should validate variable data', async () => {
      await expect(service.createVariable(mockFileKey, null))
        .rejects.toThrow(ValidationError);

      await expect(service.createVariable(mockFileKey, { name: '' }))
        .rejects.toThrow(ValidationError);

      await expect(service.createVariable(mockFileKey, { 
        name: 'Test',
        variableCollectionId: null 
      })).rejects.toThrow(ValidationError);
    });

    it('should validate variable name constraints', async () => {
      // Test special characters
      await expect(service.createVariable(mockFileKey, {
        name: 'test.variable',
        variableCollectionId: 'col1'
      })).rejects.toThrow(ValidationError);

      // Test name length
      await expect(service.createVariable(mockFileKey, {
        name: 'a'.repeat(256),
        variableCollectionId: 'col1'
      })).rejects.toThrow(ValidationError);
    });

    it('should validate variable type', async () => {
      await expect(service.createVariable(mockFileKey, {
        name: 'Test Variable',
        variableCollectionId: 'col1',
        resolvedType: 'INVALID_TYPE'
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('updateVariable', () => {
    it('should update variable successfully', async () => {
      // Mock getVariable to return existing variable
      service.getVariable = jest.fn().mockResolvedValue({
        name: 'Existing Variable'
      });

      const mockResponse = { success: true };
      mockClient.updateVariables.mockResolvedValue(mockResponse);

      const updates = { name: 'Updated Variable' };
      const result = await service.updateVariable(mockFileKey, 'var1', updates);

      expect(service.getVariable).toHaveBeenCalledWith(mockFileKey, 'var1', {});
      expect(mockClient.updateVariables).toHaveBeenCalledWith(
        mockFileKey,
        {
          variables: [{
            action: 'UPDATE',
            id: 'var1',
            name: 'Updated Variable'
          }]
        },
        {}
      );
      expect(result).toBe(mockResponse);
    });

    it('should handle value updates', async () => {
      service.getVariable = jest.fn().mockResolvedValue({});
      mockClient.updateVariables.mockResolvedValue({});

      const updates = {
        name: 'Updated Variable',
        values: { 'mode1': 'new value' }
      };

      await service.updateVariable(mockFileKey, 'var1', updates);

      expect(mockClient.updateVariables).toHaveBeenCalledWith(
        mockFileKey,
        expect.objectContaining({
          variables: [{
            action: 'UPDATE',
            id: 'var1',
            name: 'Updated Variable'
          }],
          variableModeValues: [{
            variableId: 'var1',
            modeId: 'mode1',
            value: 'new value'
          }]
        }),
        {}
      );
    });
  });

  describe('deleteVariable', () => {
    it('should delete variable successfully', async () => {
      service.getVariable = jest.fn().mockResolvedValue({});
      const mockResponse = { success: true };
      mockClient.updateVariables.mockResolvedValue(mockResponse);

      const result = await service.deleteVariable(mockFileKey, 'var1');

      expect(mockClient.updateVariables).toHaveBeenCalledWith(
        mockFileKey,
        {
          variables: [{
            action: 'DELETE',
            id: 'var1'
          }]
        },
        {}
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('createVariableAlias', () => {
    it('should create alias successfully', async () => {
      const mockResponse = { success: true };
      mockClient.updateVariables.mockResolvedValue(mockResponse);

      const result = await service.createVariableAlias(
        mockFileKey, 
        'alias-var', 
        'target-var', 
        'mode1'
      );

      expect(mockClient.updateVariables).toHaveBeenCalledWith(
        mockFileKey,
        {
          variableModeValues: [{
            variableId: 'alias-var',
            modeId: 'mode1',
            value: {
              type: 'VARIABLE_ALIAS',
              id: 'target-var'
            }
          }]
        },
        {}
      );
      expect(result).toBe(mockResponse);
    });

    it('should prevent self-alias', async () => {
      await expect(service.createVariableAlias(
        mockFileKey,
        'var1',
        'var1',
        'mode1'
      )).rejects.toThrow(/cannot be aliased to itself/);
    });
  });

  describe('batchCreateVariables', () => {
    it('should create multiple variables', async () => {
      const variablesData = [
        {
          name: 'Variable 1',
          variableCollectionId: 'col1',
          resolvedType: 'STRING'
        },
        {
          name: 'Variable 2',
          variableCollectionId: 'col1',
          resolvedType: 'COLOR'
        }
      ];

      mockClient.updateVariables.mockResolvedValue({ success: true });

      await service.batchCreateVariables(mockFileKey, variablesData);

      expect(mockClient.updateVariables).toHaveBeenCalledWith(
        mockFileKey,
        expect.objectContaining({
          variables: expect.arrayContaining([
            expect.objectContaining({ name: 'Variable 1' }),
            expect.objectContaining({ name: 'Variable 2' })
          ])
        }),
        {}
      );
    });

    it('should validate each variable in batch', async () => {
      const invalidData = [
        { name: 'Valid Variable', variableCollectionId: 'col1' },
        { name: '', variableCollectionId: 'col1' } // Invalid
      ];

      await expect(service.batchCreateVariables(mockFileKey, invalidData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('searchVariables', () => {
    const mockVariablesData = {
      variables: {
        'var1': {
          name: 'Primary Color',
          resolvedType: 'COLOR',
          variableCollectionId: 'col1'
        },
        'var2': {
          name: 'Secondary Color',
          resolvedType: 'COLOR',
          variableCollectionId: 'col1'
        },
        'var3': {
          name: 'Font Size',
          resolvedType: 'FLOAT',
          variableCollectionId: 'col2'
        }
      },
      variableCollections: {},
      stats: {}
    };

    beforeEach(() => {
      service.getLocalVariables = jest.fn().mockResolvedValue(mockVariablesData);
    });

    it('should search by name', async () => {
      const results = await service.searchVariables(mockFileKey, { name: 'color' });

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Primary Color');
      expect(results[1].name).toBe('Secondary Color');
    });

    it('should search by type', async () => {
      const results = await service.searchVariables(mockFileKey, { type: 'FLOAT' });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Font Size');
    });

    it('should search by collection', async () => {
      const results = await service.searchVariables(mockFileKey, { collectionId: 'col1' });

      expect(results).toHaveLength(2);
    });

    it('should handle multiple criteria', async () => {
      const results = await service.searchVariables(mockFileKey, {
        name: 'primary',
        type: 'COLOR'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Primary Color');
    });
  });

  describe('statistics calculation', () => {
    it('should calculate variable statistics', () => {
      const meta = {
        variables: {
          'var1': { resolvedType: 'STRING', variableCollectionId: 'col1' },
          'var2': { resolvedType: 'COLOR', variableCollectionId: 'col1' },
          'var3': { resolvedType: 'STRING', variableCollectionId: 'col2' }
        },
        variableCollections: {
          'col1': {},
          'col2': {}
        }
      };

      const stats = service._calculateVariableStats(meta);

      expect(stats.variableCount).toBe(3);
      expect(stats.collectionCount).toBe(2);
      expect(stats.variablesByType.STRING).toBe(2);
      expect(stats.variablesByType.COLOR).toBe(1);
      expect(stats.variablesByCollection.col1).toBe(2);
      expect(stats.variablesByCollection.col2).toBe(1);
    });

    it('should handle empty metadata', () => {
      const stats = service._calculateVariableStats(null);
      expect(stats.variableCount).toBe(0);
      expect(stats.collectionCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        cacheSize: 0,
        limits: {
          maxVariablesPerCollection: 5000,
          maxModesPerCollection: 40,
          maxModeNameLength: 40,
          maxVariableNameLength: 255
        },
        variableTypes: {
          BOOLEAN: 'BOOLEAN',
          FLOAT: 'FLOAT',
          STRING: 'STRING',
          COLOR: 'COLOR'
        },
        actions: {
          CREATE: 'CREATE',
          UPDATE: 'UPDATE',
          DELETE: 'DELETE'
        }
      });
    });
  });
});