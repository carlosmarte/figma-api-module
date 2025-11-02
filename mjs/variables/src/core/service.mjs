/**
 * Service layer for figma-variables-sdk
 * Contains business logic and orchestration for Figma Variables operations
 */

import { 
  ValidationError, 
  NotFoundError,
  ApiError,
  VariableError,
  CollectionError,
  VariableLimitError,
  ModeLimitError,
  AliasError
} from './exceptions.mjs';

export class FigmaVariablesService {
  /**
   * @param {object} options - Service configuration
   * @param {object} options.fetcher - FigmaApiClient instance (required)
   * @param {object} [options.validator=null] - Validator instance
   * @param {object} [options.logger=console] - Logger instance
   */
  constructor({ fetcher, validator = null, logger = console } = {}) {
    if (!fetcher) {
      throw new Error('fetcher parameter is required. Please create and pass a FigmaApiClient instance.');
    }

    this.fetcher = fetcher;
    this.validator = validator;
    this.logger = logger;
    this._cache = new Map();
    this._initializeDefaults();
  }

  _initializeDefaults() {
    this.cacheConfig = {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100
    };
    
    this.limits = {
      maxVariablesPerCollection: 5000,
      maxModesPerCollection: 40,
      maxModeNameLength: 40,
      maxVariableNameLength: 255
    };

    this.variableTypes = {
      BOOLEAN: 'BOOLEAN',
      FLOAT: 'FLOAT',
      STRING: 'STRING',
      COLOR: 'COLOR'
    };

    this.actions = {
      CREATE: 'CREATE',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE'
    };
  }

  // Core variable operations

  /**
   * Get all local variables and collections from a file
   * @param {string} fileKey - File key or branch key
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Variables and collections with metadata
   */
  async getLocalVariables(fileKey, options = {}) {
    if (!fileKey) {
      throw new ValidationError('File key is required', 'fileKey', fileKey);
    }

    try {
      const response = await this.fetcher.getLocalVariables(fileKey, options);
      
      const result = {
        variables: response.meta?.variables || {},
        variableCollections: response.meta?.variableCollections || {},
        stats: this._calculateVariableStats(response.meta)
      };

      // Cache the processed result
      this._setCache(`local_${fileKey}`, result);
      
      return result;
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        throw new NotFoundError('File', fileKey);
      }
      throw error;
    }
  }

  /**
   * Get published variables and collections from a file
   * @param {string} fileKey - File key (main file only, not branch)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Published variables and collections
   */
  async getPublishedVariables(fileKey, options = {}) {
    if (!fileKey) {
      throw new ValidationError('File key is required', 'fileKey', fileKey);
    }

    try {
      const response = await this.fetcher.getPublishedVariables(fileKey, options);
      
      const result = {
        variables: response.meta?.variables || {},
        variableCollections: response.meta?.variableCollections || {},
        stats: this._calculateVariableStats(response.meta)
      };

      // Cache the processed result
      this._setCache(`published_${fileKey}`, result);
      
      return result;
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        throw new NotFoundError('File', fileKey);
      }
      throw error;
    }
  }

  /**
   * Get a specific variable by ID
   * @param {string} fileKey - File key
   * @param {string} variableId - Variable ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Variable details
   */
  async getVariable(fileKey, variableId, options = {}) {
    if (!fileKey || !variableId) {
      throw new ValidationError('File key and variable ID are required', 'params', { fileKey, variableId });
    }

    const variables = await this.getLocalVariables(fileKey, options);
    const variable = variables.variables[variableId];

    if (!variable) {
      throw new NotFoundError('Variable', variableId);
    }

    return variable;
  }

  /**
   * Get a specific variable collection by ID
   * @param {string} fileKey - File key
   * @param {string} collectionId - Collection ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Collection details
   */
  async getVariableCollection(fileKey, collectionId, options = {}) {
    if (!fileKey || !collectionId) {
      throw new ValidationError('File key and collection ID are required', 'params', { fileKey, collectionId });
    }

    const variables = await this.getLocalVariables(fileKey, options);
    const collection = variables.variableCollections[collectionId];

    if (!collection) {
      throw new NotFoundError('Variable collection', collectionId);
    }

    return collection;
  }

  // Variable creation and management

  /**
   * Create a new variable collection
   * @param {string} fileKey - File key
   * @param {Object} collectionData - Collection configuration
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Creation result with real ID mapping
   */
  async createVariableCollection(fileKey, collectionData, options = {}) {
    if (!fileKey || !collectionData) {
      throw new ValidationError('File key and collection data are required');
    }

    this._validateCollectionData(collectionData);

    const tempId = collectionData.id || `temp_collection_${Date.now()}`;
    const changes = {
      variableCollections: [{
        action: this.actions.CREATE,
        id: tempId,
        name: collectionData.name,
        initialModeId: collectionData.initialModeId || `temp_mode_${Date.now()}`,
        ...collectionData
      }]
    };

    // Add initial mode if specified
    if (collectionData.initialMode) {
      changes.variableModes = [{
        action: this.actions.CREATE,
        id: changes.variableCollections[0].initialModeId,
        name: collectionData.initialMode.name || 'Mode 1',
        variableCollectionId: tempId
      }];
    }

    return this.fetcher.updateVariables(fileKey, changes, options);
  }

  /**
   * Create a new variable
   * @param {string} fileKey - File key
   * @param {Object} variableData - Variable configuration
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Creation result with real ID mapping
   */
  async createVariable(fileKey, variableData, options = {}) {
    if (!fileKey || !variableData) {
      throw new ValidationError('File key and variable data are required');
    }

    this._validateVariableData(variableData);

    const tempId = variableData.id || `temp_variable_${Date.now()}`;
    const changes = {
      variables: [{
        action: this.actions.CREATE,
        id: tempId,
        name: variableData.name,
        variableCollectionId: variableData.variableCollectionId,
        resolvedType: variableData.resolvedType || this.variableTypes.STRING,
        ...variableData
      }]
    };

    // Add variable mode values if provided
    if (variableData.values) {
      changes.variableModeValues = Object.entries(variableData.values).map(([modeId, value]) => ({
        variableId: tempId,
        modeId,
        value
      }));
    }

    return this.fetcher.updateVariables(fileKey, changes, options);
  }

  /**
   * Update an existing variable
   * @param {string} fileKey - File key
   * @param {string} variableId - Variable ID
   * @param {Object} updates - Variable updates
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Update result
   */
  async updateVariable(fileKey, variableId, updates, options = {}) {
    if (!fileKey || !variableId) {
      throw new ValidationError('File key and variable ID are required');
    }

    // Verify variable exists
    await this.getVariable(fileKey, variableId, options);

    const changes = {
      variables: [{
        action: this.actions.UPDATE,
        id: variableId,
        ...updates
      }]
    };

    // Handle value updates
    if (updates.values) {
      changes.variableModeValues = Object.entries(updates.values).map(([modeId, value]) => ({
        variableId,
        modeId,
        value
      }));
      delete changes.variables[0].values;
    }

    return this.fetcher.updateVariables(fileKey, changes, options);
  }

  /**
   * Delete a variable
   * @param {string} fileKey - File key
   * @param {string} variableId - Variable ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteVariable(fileKey, variableId, options = {}) {
    if (!fileKey || !variableId) {
      throw new ValidationError('File key and variable ID are required');
    }

    // Verify variable exists
    await this.getVariable(fileKey, variableId, options);

    const changes = {
      variables: [{
        action: this.actions.DELETE,
        id: variableId
      }]
    };

    return this.fetcher.updateVariables(fileKey, changes, options);
  }

  /**
   * Create a variable alias
   * @param {string} fileKey - File key
   * @param {string} aliasVariableId - Variable that will become an alias
   * @param {string} targetVariableId - Variable to alias to
   * @param {string} modeId - Mode ID for the alias
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Alias creation result
   */
  async createVariableAlias(fileKey, aliasVariableId, targetVariableId, modeId, options = {}) {
    if (!fileKey || !aliasVariableId || !targetVariableId || !modeId) {
      throw new ValidationError('All parameters are required for alias creation');
    }

    // Validate alias won't create cycle
    if (aliasVariableId === targetVariableId) {
      throw new AliasError('Variable cannot be aliased to itself', aliasVariableId, targetVariableId);
    }

    const changes = {
      variableModeValues: [{
        variableId: aliasVariableId,
        modeId,
        value: {
          type: 'VARIABLE_ALIAS',
          id: targetVariableId
        }
      }]
    };

    return this.fetcher.updateVariables(fileKey, changes, options);
  }

  // Batch operations

  /**
   * Batch create multiple variables
   * @param {string} fileKey - File key
   * @param {Array} variablesData - Array of variable configurations
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Batch creation result
   */
  async batchCreateVariables(fileKey, variablesData, options = {}) {
    if (!fileKey || !Array.isArray(variablesData) || variablesData.length === 0) {
      throw new ValidationError('File key and non-empty variables array are required');
    }

    // Validate each variable
    variablesData.forEach((varData, index) => {
      try {
        this._validateVariableData(varData);
      } catch (error) {
        throw new ValidationError(`Variable at index ${index}: ${error.message}`, 'variables', varData);
      }
    });

    const changes = {
      variables: variablesData.map((varData, index) => ({
        action: this.actions.CREATE,
        id: varData.id || `temp_variable_${Date.now()}_${index}`,
        name: varData.name,
        variableCollectionId: varData.variableCollectionId,
        resolvedType: varData.resolvedType || this.variableTypes.STRING,
        ...varData
      })),
      variableModeValues: []
    };

    // Add variable mode values
    variablesData.forEach((varData, index) => {
      if (varData.values) {
        const variableId = changes.variables[index].id;
        Object.entries(varData.values).forEach(([modeId, value]) => {
          changes.variableModeValues.push({
            variableId,
            modeId,
            value
          });
        });
      }
    });

    return this.fetcher.updateVariables(fileKey, changes, options);
  }

  /**
   * Search variables by name or properties
   * @param {string} fileKey - File key
   * @param {Object} searchCriteria - Search criteria
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Matching variables
   */
  async searchVariables(fileKey, searchCriteria, options = {}) {
    if (!fileKey || !searchCriteria) {
      throw new ValidationError('File key and search criteria are required');
    }

    const { variables } = await this.getLocalVariables(fileKey, options);
    const results = [];

    Object.entries(variables).forEach(([id, variable]) => {
      let matches = true;

      if (searchCriteria.name && !variable.name.toLowerCase().includes(searchCriteria.name.toLowerCase())) {
        matches = false;
      }

      if (searchCriteria.type && variable.resolvedType !== searchCriteria.type) {
        matches = false;
      }

      if (searchCriteria.collectionId && variable.variableCollectionId !== searchCriteria.collectionId) {
        matches = false;
      }

      if (matches) {
        results.push({ id, ...variable });
      }
    });

    return results;
  }

  // Utility and validation methods

  /**
   * Validate variable collection data
   * @param {Object} collectionData - Collection data to validate
   */
  _validateCollectionData(collectionData) {
    if (!collectionData.name || typeof collectionData.name !== 'string') {
      throw new ValidationError('Collection name is required and must be a string', 'name', collectionData.name);
    }

    if (collectionData.name.length > 255) {
      throw new ValidationError('Collection name cannot exceed 255 characters', 'name', collectionData.name);
    }
  }

  /**
   * Validate variable data
   * @param {Object} variableData - Variable data to validate
   */
  _validateVariableData(variableData) {
    if (!variableData.name || typeof variableData.name !== 'string') {
      throw new ValidationError('Variable name is required and must be a string', 'name', variableData.name);
    }

    if (variableData.name.length > this.limits.maxVariableNameLength) {
      throw new ValidationError(
        `Variable name cannot exceed ${this.limits.maxVariableNameLength} characters`,
        'name',
        variableData.name
      );
    }

    if (!variableData.variableCollectionId) {
      throw new ValidationError('Variable collection ID is required', 'variableCollectionId', variableData.variableCollectionId);
    }

    if (variableData.resolvedType && !Object.values(this.variableTypes).includes(variableData.resolvedType)) {
      throw new ValidationError(
        `Invalid variable type. Must be one of: ${Object.values(this.variableTypes).join(', ')}`,
        'resolvedType',
        variableData.resolvedType
      );
    }

    // Validate special characters in name
    const invalidChars = /[.{}]/;
    if (invalidChars.test(variableData.name)) {
      throw new ValidationError('Variable name cannot contain special characters: . { }', 'name', variableData.name);
    }
  }

  /**
   * Calculate statistics for variables and collections
   * @param {Object} meta - Response metadata
   * @returns {Object} Statistics
   */
  _calculateVariableStats(meta) {
    if (!meta) return { variableCount: 0, collectionCount: 0 };

    const variables = meta.variables || {};
    const collections = meta.variableCollections || {};

    const stats = {
      variableCount: Object.keys(variables).length,
      collectionCount: Object.keys(collections).length,
      variablesByType: {},
      variablesByCollection: {}
    };

    // Count variables by type
    Object.values(variables).forEach(variable => {
      const type = variable.resolvedType || 'UNKNOWN';
      stats.variablesByType[type] = (stats.variablesByType[type] || 0) + 1;
    });

    // Count variables by collection
    Object.values(variables).forEach(variable => {
      const collectionId = variable.variableCollectionId;
      if (collectionId) {
        stats.variablesByCollection[collectionId] = (stats.variablesByCollection[collectionId] || 0) + 1;
      }
    });

    return stats;
  }

  // Cache management
  _getFromCache(key) {
    const item = this._cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > this.cacheConfig.ttl) {
      this._cache.delete(key);
      return null;
    }

    return item.data;
  }

  _setCache(key, data) {
    if (this._cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }

    this._cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  _clearCache() {
    this._cache.clear();
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      cacheSize: this._cache.size,
      limits: this.limits,
      variableTypes: this.variableTypes,
      actions: this.actions
    };
  }
}

export default FigmaVariablesService;