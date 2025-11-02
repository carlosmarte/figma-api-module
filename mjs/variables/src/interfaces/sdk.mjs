/**
 * SDK facade for figma-variables-sdk
 * Provides ergonomic API over core service layer
 */

import { FigmaVariablesService } from '../core/service.mjs';

/**
 * High-level SDK for Figma Variables API
 *
 * @example
 * import { FigmaApiClient } from '@figma-api/fetch';
 * import { FigmaVariablesSDK } from 'figma-variables-sdk';
 *
 * const fetcher = new FigmaApiClient({ apiToken: process.env.FIGMA_TOKEN });
 * const sdk = new FigmaVariablesSDK({ fetcher });
 */
export class FigmaVariablesSDK {
  /**
   * @param {object} config - SDK configuration
   * @param {object} config.fetcher - FigmaApiClient instance (required)
   * @param {object} [config.logger=console] - Logger instance
   */
  constructor({ fetcher, logger = console } = {}) {
    this.service = new FigmaVariablesService({
      fetcher,
      logger
    });
  }

  // High-level variable operations

  /**
   * Get all variables in a file
   * @param {string} fileKey - File key or branch key
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Variables and collections with metadata
   */
  async getVariables(fileKey, options = {}) {
    return this.service.getLocalVariables(fileKey, options);
  }

  /**
   * Get published variables from a file
   * @param {string} fileKey - File key (main file only)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Published variables and collections
   */
  async getPublishedVariables(fileKey, options = {}) {
    return this.service.getPublishedVariables(fileKey, options);
  }

  /**
   * Get a specific variable by ID
   * @param {string} fileKey - File key
   * @param {string} variableId - Variable ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Variable details
   */
  async getVariable(fileKey, variableId, options = {}) {
    return this.service.getVariable(fileKey, variableId, options);
  }

  /**
   * Get a variable collection by ID
   * @param {string} fileKey - File key
   * @param {string} collectionId - Collection ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Collection details
   */
  async getCollection(fileKey, collectionId, options = {}) {
    return this.service.getVariableCollection(fileKey, collectionId, options);
  }

  /**
   * Search for variables by criteria
   * @param {string} fileKey - File key
   * @param {Object} criteria - Search criteria (name, type, collectionId)
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Matching variables
   */
  async searchVariables(fileKey, criteria, options = {}) {
    return this.service.searchVariables(fileKey, criteria, options);
  }

  // Variable creation and management

  /**
   * Create a new variable collection
   * @param {string} fileKey - File key
   * @param {string} name - Collection name
   * @param {Object} config - Additional configuration
   * @returns {Promise<Object>} Creation result
   */
  async createCollection(fileKey, name, config = {}) {
    const collectionData = {
      name,
      ...config
    };

    return this.service.createVariableCollection(fileKey, collectionData);
  }

  /**
   * Create a new variable
   * @param {string} fileKey - File key
   * @param {Object} variableConfig - Variable configuration
   * @returns {Promise<Object>} Creation result
   */
  async createVariable(fileKey, variableConfig) {
    return this.service.createVariable(fileKey, variableConfig);
  }

  /**
   * Create multiple variables at once
   * @param {string} fileKey - File key
   * @param {Array} variablesConfig - Array of variable configurations
   * @returns {Promise<Object>} Batch creation result
   */
  async createVariables(fileKey, variablesConfig) {
    return this.service.batchCreateVariables(fileKey, variablesConfig);
  }

  /**
   * Update an existing variable
   * @param {string} fileKey - File key
   * @param {string} variableId - Variable ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async updateVariable(fileKey, variableId, updates) {
    return this.service.updateVariable(fileKey, variableId, updates);
  }

  /**
   * Delete a variable
   * @param {string} fileKey - File key
   * @param {string} variableId - Variable ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteVariable(fileKey, variableId) {
    return this.service.deleteVariable(fileKey, variableId);
  }

  /**
   * Create an alias between variables
   * @param {string} fileKey - File key
   * @param {string} aliasVariableId - Variable to become alias
   * @param {string} targetVariableId - Variable to alias to
   * @param {string} modeId - Mode for the alias
   * @returns {Promise<Object>} Alias creation result
   */
  async createAlias(fileKey, aliasVariableId, targetVariableId, modeId) {
    return this.service.createVariableAlias(fileKey, aliasVariableId, targetVariableId, modeId);
  }

  // Convenience methods for common patterns

  /**
   * Create a color variable
   * @param {string} fileKey - File key
   * @param {string} name - Variable name
   * @param {string} collectionId - Collection ID
   * @param {Object} colorValue - RGBA color value
   * @param {string} modeId - Mode ID
   * @returns {Promise<Object>} Creation result
   */
  async createColorVariable(fileKey, name, collectionId, colorValue, modeId) {
    return this.createVariable(fileKey, {
      name,
      variableCollectionId: collectionId,
      resolvedType: 'COLOR',
      values: {
        [modeId]: colorValue
      }
    });
  }

  /**
   * Create a string variable
   * @param {string} fileKey - File key
   * @param {string} name - Variable name
   * @param {string} collectionId - Collection ID
   * @param {string} stringValue - String value
   * @param {string} modeId - Mode ID
   * @returns {Promise<Object>} Creation result
   */
  async createStringVariable(fileKey, name, collectionId, stringValue, modeId) {
    return this.createVariable(fileKey, {
      name,
      variableCollectionId: collectionId,
      resolvedType: 'STRING',
      values: {
        [modeId]: stringValue
      }
    });
  }

  /**
   * Create a number variable
   * @param {string} fileKey - File key
   * @param {string} name - Variable name
   * @param {string} collectionId - Collection ID
   * @param {number} numberValue - Number value
   * @param {string} modeId - Mode ID
   * @returns {Promise<Object>} Creation result
   */
  async createNumberVariable(fileKey, name, collectionId, numberValue, modeId) {
    return this.createVariable(fileKey, {
      name,
      variableCollectionId: collectionId,
      resolvedType: 'FLOAT',
      values: {
        [modeId]: numberValue
      }
    });
  }

  /**
   * Create a boolean variable
   * @param {string} fileKey - File key
   * @param {string} name - Variable name
   * @param {string} collectionId - Collection ID
   * @param {boolean} booleanValue - Boolean value
   * @param {string} modeId - Mode ID
   * @returns {Promise<Object>} Creation result
   */
  async createBooleanVariable(fileKey, name, collectionId, booleanValue, modeId) {
    return this.createVariable(fileKey, {
      name,
      variableCollectionId: collectionId,
      resolvedType: 'BOOLEAN',
      values: {
        [modeId]: booleanValue
      }
    });
  }

  // Bulk operations

  /**
   * Import variables from a data structure
   * @param {string} fileKey - File key
   * @param {Object} variablesData - Variables data to import
   * @returns {Promise<Object>} Import result
   */
  async importVariables(fileKey, variablesData) {
    const { collections = [], variables = [] } = variablesData;
    const results = { collections: [], variables: [], errors: [] };

    // Create collections first
    for (const collection of collections) {
      try {
        const result = await this.createCollection(fileKey, collection.name, collection);
        results.collections.push(result);
      } catch (error) {
        results.errors.push({ type: 'collection', data: collection, error: error.message });
      }
    }

    // Create variables in batches
    const batchSize = 50;
    for (let i = 0; i < variables.length; i += batchSize) {
      const batch = variables.slice(i, i + batchSize);
      try {
        const result = await this.createVariables(fileKey, batch);
        results.variables.push(result);
      } catch (error) {
        results.errors.push({ type: 'variables', data: batch, error: error.message });
      }
    }

    return results;
  }

  /**
   * Export variables to a structured format
   * @param {string} fileKey - File key
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async exportVariables(fileKey, options = {}) {
    const data = await this.getVariables(fileKey, options);
    
    return {
      collections: Object.entries(data.variableCollections).map(([id, collection]) => ({
        id,
        ...collection
      })),
      variables: Object.entries(data.variables).map(([id, variable]) => ({
        id,
        ...variable
      })),
      stats: data.stats,
      exportedAt: new Date().toISOString()
    };
  }

  // Utility methods

  /**
   * Get SDK statistics and health info
   * @returns {Object} SDK stats
   */
  getStats() {
    return {
      service: this.service.getStats()
    };
  }

  /**
   * Test connection and permissions
   * @param {string} fileKey - File key to test with
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(fileKey) {
    try {
      const result = await this.getVariables(fileKey, { useCache: false });
      return {
        success: true,
        hasVariables: result.stats.variableCount > 0,
        hasCollections: result.stats.collectionCount > 0,
        stats: result.stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }
}

export default FigmaVariablesSDK;