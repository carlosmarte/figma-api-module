/**
 * Service layer for Figma Components API operations
 * Implements business logic for all components, component sets, and styles endpoints
 * Provides high-level methods that compose HTTP client operations
 */

import FigmaComponentsClient from './client.mjs';
import { 
  ValidationError, 
  TeamNotFoundError,
  FileNotFoundError,
  ComponentNotFoundError,
  ComponentSetNotFoundError,
  StyleNotFoundError,
  PaginationError,
  ScopeError
} from './exceptions.mjs';

/**
 * Service class for Figma Components API operations
 * Handles business logic and validation for components operations
 */
export class FigmaComponentsService {
  /**
   * @param {Object} options - Service configuration
   * @param {string} options.apiToken - Figma personal access token
   * @param {Object} [options.clientConfig={}] - HTTP client configuration
   * @param {Object} [options.logger=console] - Logger instance
   */
  constructor({ apiToken, clientConfig = {}, logger = console } = {}) {
    this.client = new FigmaComponentsClient({
      apiToken,
      logger,
      ...clientConfig
    });
    this.logger = logger;
  }

  /**
   * Validate team ID format
   * @private
   */
  _validateTeamId(teamId) {
    if (!teamId || typeof teamId !== 'string') {
      throw new ValidationError('Team ID is required and must be a string', 'teamId', teamId);
    }

    // Team IDs are typically numeric strings
    if (!/^\d+$/.test(teamId)) {
      throw new ValidationError('Invalid team ID format', 'teamId', teamId);
    }
  }

  /**
   * Validate file key format
   * @private
   */
  _validateFileKey(fileKey) {
    if (!fileKey || typeof fileKey !== 'string') {
      throw new ValidationError('File key is required and must be a string', 'fileKey', fileKey);
    }

    // Figma file keys are typically alphanumeric with some special characters
    if (!/^[a-zA-Z0-9\-_]+$/.test(fileKey)) {
      throw new ValidationError('Invalid file key format', 'fileKey', fileKey);
    }
  }

  /**
   * Validate component key format
   * @private
   */
  _validateComponentKey(key) {
    if (!key || typeof key !== 'string') {
      throw new ValidationError('Component key is required and must be a string', 'key', key);
    }

    // Component keys are typically alphanumeric with colons and dashes
    if (!/^[a-zA-Z0-9:\-_]+$/.test(key)) {
      throw new ValidationError('Invalid component key format', 'key', key);
    }
  }

  /**
   * Validate pagination parameters
   * @private
   */
  _validatePaginationParams(params) {
    const { pageSize, after, before } = params;

    if (pageSize !== undefined) {
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
        throw new PaginationError('Page size must be an integer between 1 and 1000', { pageSize });
      }
    }

    if (after !== undefined && before !== undefined) {
      throw new PaginationError('Cannot specify both after and before cursors', { after, before });
    }

    if (after !== undefined && (!Number.isInteger(after) || after < 0)) {
      throw new PaginationError('After cursor must be a non-negative integer', { after });
    }

    if (before !== undefined && (!Number.isInteger(before) || before < 0)) {
      throw new PaginationError('Before cursor must be a non-negative integer', { before });
    }
  }

  /**
   * Validate required OAuth scopes for endpoint
   * @private
   */
  _validateScopes(endpoint, scopes) {
    // This is informational for developers - actual scope validation happens server-side
    const scopeMap = {
      'team_library_content': ['getTeamComponents', 'getTeamComponentSets', 'getTeamStyles'],
      'library_content': ['getFileComponents', 'getFileComponentSets', 'getFileStyles'],
      'library_assets': ['getComponent', 'getComponentSet', 'getStyle'],
      'files': ['getTeamComponents', 'getTeamComponentSets', 'getTeamStyles', 'getFileComponents', 'getFileComponentSets', 'getFileStyles', 'getComponent', 'getComponentSet', 'getStyle']
    };

    // Check if endpoint requires specific scopes
    for (const [scope, endpoints] of Object.entries(scopeMap)) {
      if (endpoints.includes(endpoint) && !scopes.includes(scope)) {
        this.logger.warn(`Endpoint ${endpoint} requires scope: ${scope}`);
      }
    }
  }

  // ==========================================
  // Components API Methods
  // ==========================================

  /**
   * Get team components
   * Returns a paginated list of published components within a team library
   * Required scopes: team_library_content:read, files:read
   * 
   * @param {string} teamId - Team ID to list components from
   * @param {Object} [options={}] - Request options
   * @param {number} [options.pageSize=30] - Number of items per page (max 1000)
   * @param {number} [options.after] - Cursor for pagination (exclusive with before)
   * @param {number} [options.before] - Cursor for pagination (exclusive with after)
   * @returns {Promise<Object>} Paginated list of components
   */
  async getTeamComponents(teamId, options = {}) {
    this._validateTeamId(teamId);
    this._validatePaginationParams(options);
    this._validateScopes('getTeamComponents', ['team_library_content', 'files']);

    const params = {};
    
    if (options.pageSize !== undefined) params.page_size = options.pageSize;
    if (options.after !== undefined) params.after = options.after;
    if (options.before !== undefined) params.before = options.before;

    this.logger.debug(`Getting team components: ${teamId}`, params);

    return this.client.get(`/v1/teams/${teamId}/components`, params);
  }

  /**
   * Get file components
   * Returns a list of published components within a file library
   * Required scopes: library_content:read, files:read
   * 
   * @param {string} fileKey - File key to list components from (main file, not branch)
   * @returns {Promise<Object>} List of components in file
   */
  async getFileComponents(fileKey) {
    this._validateFileKey(fileKey);
    this._validateScopes('getFileComponents', ['library_content', 'files']);

    this.logger.debug(`Getting file components: ${fileKey}`);

    return this.client.get(`/v1/files/${fileKey}/components`);
  }

  /**
   * Get component by key
   * Returns metadata on a component by key
   * Required scopes: library_assets:read, files:read
   * 
   * @param {string} key - Unique identifier of the component
   * @returns {Promise<Object>} Component metadata
   */
  async getComponent(key) {
    this._validateComponentKey(key);
    this._validateScopes('getComponent', ['library_assets', 'files']);

    this.logger.debug(`Getting component: ${key}`);

    return this.client.get(`/v1/components/${key}`);
  }

  // ==========================================
  // Component Sets API Methods
  // ==========================================

  /**
   * Get team component sets
   * Returns a paginated list of published component sets within a team library
   * Required scopes: team_library_content:read, files:read
   * 
   * @param {string} teamId - Team ID to list component sets from
   * @param {Object} [options={}] - Request options
   * @param {number} [options.pageSize=30] - Number of items per page (max 1000)
   * @param {number} [options.after] - Cursor for pagination (exclusive with before)
   * @param {number} [options.before] - Cursor for pagination (exclusive with after)
   * @returns {Promise<Object>} Paginated list of component sets
   */
  async getTeamComponentSets(teamId, options = {}) {
    this._validateTeamId(teamId);
    this._validatePaginationParams(options);
    this._validateScopes('getTeamComponentSets', ['team_library_content', 'files']);

    const params = {};
    
    if (options.pageSize !== undefined) params.page_size = options.pageSize;
    if (options.after !== undefined) params.after = options.after;
    if (options.before !== undefined) params.before = options.before;

    this.logger.debug(`Getting team component sets: ${teamId}`, params);

    return this.client.get(`/v1/teams/${teamId}/component_sets`, params);
  }

  /**
   * Get file component sets
   * Returns a list of published component sets within a file library
   * Required scopes: library_content:read, files:read
   * 
   * @param {string} fileKey - File key to list component sets from (main file, not branch)
   * @returns {Promise<Object>} List of component sets in file
   */
  async getFileComponentSets(fileKey) {
    this._validateFileKey(fileKey);
    this._validateScopes('getFileComponentSets', ['library_content', 'files']);

    this.logger.debug(`Getting file component sets: ${fileKey}`);

    return this.client.get(`/v1/files/${fileKey}/component_sets`);
  }

  /**
   * Get component set by key
   * Returns metadata on a published component set by key
   * Required scopes: library_assets:read, files:read
   * 
   * @param {string} key - Unique identifier of the component set
   * @returns {Promise<Object>} Component set metadata
   */
  async getComponentSet(key) {
    this._validateComponentKey(key);
    this._validateScopes('getComponentSet', ['library_assets', 'files']);

    this.logger.debug(`Getting component set: ${key}`);

    return this.client.get(`/v1/component_sets/${key}`);
  }

  // ==========================================
  // Styles API Methods
  // ==========================================

  /**
   * Get team styles
   * Returns a paginated list of published styles within a team library
   * Required scopes: team_library_content:read, files:read
   * 
   * @param {string} teamId - Team ID to list styles from
   * @param {Object} [options={}] - Request options
   * @param {number} [options.pageSize=30] - Number of items per page (max 1000)
   * @param {number} [options.after] - Cursor for pagination (exclusive with before)
   * @param {number} [options.before] - Cursor for pagination (exclusive with after)
   * @returns {Promise<Object>} Paginated list of styles
   */
  async getTeamStyles(teamId, options = {}) {
    this._validateTeamId(teamId);
    this._validatePaginationParams(options);
    this._validateScopes('getTeamStyles', ['team_library_content', 'files']);

    const params = {};
    
    if (options.pageSize !== undefined) params.page_size = options.pageSize;
    if (options.after !== undefined) params.after = options.after;
    if (options.before !== undefined) params.before = options.before;

    this.logger.debug(`Getting team styles: ${teamId}`, params);

    return this.client.get(`/v1/teams/${teamId}/styles`, params);
  }

  /**
   * Get file styles
   * Returns a list of published styles within a file library
   * Required scopes: library_content:read, files:read
   * 
   * @param {string} fileKey - File key to list styles from (main file, not branch)
   * @returns {Promise<Object>} List of styles in file
   */
  async getFileStyles(fileKey) {
    this._validateFileKey(fileKey);
    this._validateScopes('getFileStyles', ['library_content', 'files']);

    this.logger.debug(`Getting file styles: ${fileKey}`);

    return this.client.get(`/v1/files/${fileKey}/styles`);
  }

  /**
   * Get style by key
   * Returns metadata on a style by key
   * Required scopes: library_assets:read, files:read
   * 
   * @param {string} key - Unique identifier of the style
   * @returns {Promise<Object>} Style metadata
   */
  async getStyle(key) {
    this._validateComponentKey(key);
    this._validateScopes('getStyle', ['library_assets', 'files']);

    this.logger.debug(`Getting style: ${key}`);

    return this.client.get(`/v1/styles/${key}`);
  }

  // ==========================================
  // Batch Operations
  // ==========================================

  /**
   * Batch get multiple components by key
   * Convenience method to get multiple components in parallel
   * 
   * @param {string[]} keys - Array of component keys to retrieve
   * @returns {Promise<Object>} Batch results with successful and failed components
   */
  async batchGetComponents(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new ValidationError('Component keys must be a non-empty array', 'keys', keys);
    }

    this.logger.debug(`Batch getting ${keys.length} components`);

    const promises = keys.map(key => 
      this.getComponent(key)
        .then(data => ({
          key,
          data,
          success: true
        }))
        .catch(error => ({
          key,
          error: error.message,
          success: false
        }))
    );

    const results = await Promise.all(promises);
    
    // Separate successful and failed results
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);

    if (failed.length > 0) {
      this.logger.warn(`Failed to get ${failed.length} components:`, failed);
    }

    return {
      successful,
      failed,
      total: keys.length
    };
  }

  /**
   * Batch get multiple component sets by key
   * Convenience method to get multiple component sets in parallel
   * 
   * @param {string[]} keys - Array of component set keys to retrieve
   * @returns {Promise<Object>} Batch results with successful and failed component sets
   */
  async batchGetComponentSets(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new ValidationError('Component set keys must be a non-empty array', 'keys', keys);
    }

    this.logger.debug(`Batch getting ${keys.length} component sets`);

    const promises = keys.map(key => 
      this.getComponentSet(key)
        .then(data => ({
          key,
          data,
          success: true
        }))
        .catch(error => ({
          key,
          error: error.message,
          success: false
        }))
    );

    const results = await Promise.all(promises);
    
    // Separate successful and failed results
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);

    if (failed.length > 0) {
      this.logger.warn(`Failed to get ${failed.length} component sets:`, failed);
    }

    return {
      successful,
      failed,
      total: keys.length
    };
  }

  /**
   * Batch get multiple styles by key
   * Convenience method to get multiple styles in parallel
   * 
   * @param {string[]} keys - Array of style keys to retrieve
   * @returns {Promise<Object>} Batch results with successful and failed styles
   */
  async batchGetStyles(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new ValidationError('Style keys must be a non-empty array', 'keys', keys);
    }

    this.logger.debug(`Batch getting ${keys.length} styles`);

    const promises = keys.map(key => 
      this.getStyle(key)
        .then(data => ({
          key,
          data,
          success: true
        }))
        .catch(error => ({
          key,
          error: error.message,
          success: false
        }))
    );

    const results = await Promise.all(promises);
    
    // Separate successful and failed results
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);

    if (failed.length > 0) {
      this.logger.warn(`Failed to get ${failed.length} styles:`, failed);
    }

    return {
      successful,
      failed,
      total: keys.length
    };
  }

  // ==========================================
  // Convenience Methods
  // ==========================================

  /**
   * Get all team library items (components, component sets, and styles)
   * Convenience method to fetch all library content for a team
   * 
   * @param {string} teamId - Team ID to get library content from
   * @param {Object} [options={}] - Request options for pagination
   * @returns {Promise<Object>} Combined library content
   */
  async getTeamLibraryContent(teamId, options = {}) {
    this._validateTeamId(teamId);

    this.logger.debug(`Getting complete team library content: ${teamId}`);

    const [components, componentSets, styles] = await Promise.all([
      this.getTeamComponents(teamId, options),
      this.getTeamComponentSets(teamId, options),
      this.getTeamStyles(teamId, options)
    ]);

    return {
      components,
      componentSets,
      styles,
      summary: {
        componentsCount: components.meta?.total_count || components.components?.length || 0,
        componentSetsCount: componentSets.meta?.total_count || componentSets.component_sets?.length || 0,
        stylesCount: styles.meta?.total_count || styles.styles?.length || 0
      }
    };
  }

  /**
   * Get all file library items (components, component sets, and styles)
   * Convenience method to fetch all library content for a file
   * 
   * @param {string} fileKey - File key to get library content from
   * @returns {Promise<Object>} Combined library content
   */
  async getFileLibraryContent(fileKey) {
    this._validateFileKey(fileKey);

    this.logger.debug(`Getting complete file library content: ${fileKey}`);

    const [components, componentSets, styles] = await Promise.all([
      this.getFileComponents(fileKey),
      this.getFileComponentSets(fileKey),
      this.getFileStyles(fileKey)
    ]);

    return {
      components,
      componentSets,
      styles,
      summary: {
        componentsCount: components.components?.length || 0,
        componentSetsCount: componentSets.component_sets?.length || 0,
        stylesCount: styles.styles?.length || 0
      }
    };
  }

  /**
   * Search team components by name
   * Convenience method to search for components by name within a team
   * 
   * @param {string} teamId - Team ID to search in
   * @param {string} searchTerm - Name to search for
   * @param {Object} [options={}] - Search options
   * @returns {Promise<Object[]>} Matching components
   */
  async searchTeamComponentsByName(teamId, searchTerm, options = {}) {
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new ValidationError('Search term is required and must be a string', 'searchTerm', searchTerm);
    }

    this.logger.debug(`Searching team components by name: ${teamId}, term: ${searchTerm}`);

    const response = await this.getTeamComponents(teamId, options);
    const components = response.components || [];

    return components.filter(component => 
      component.name && component.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Get client statistics
   * @returns {Object} HTTP client statistics
   */
  getStats() {
    return this.client.getStats();
  }

  /**
   * Perform health check
   * @returns {Promise<boolean>} Whether service is healthy
   */
  async healthCheck() {
    return this.client.healthCheck();
  }
}

export default FigmaComponentsService;