/**
 * SDK facade for Figma Components API
 * Provides ergonomic API over core service layer
 * Simplifies common operations and provides convenient methods
 */

import FigmaComponentsService from '../core/service.mjs';

/**
 * High-level SDK for Figma Components API operations
 * Provides simplified interface for common use cases
 */
export class FigmaComponentsSDK {
  /**
   * @param {Object} config - SDK configuration
   * @param {string} config.apiToken - Figma personal access token
   * @param {Object} [config.logger] - Logger instance
   * @param {Object} [config.clientConfig] - HTTP client configuration
   */
  constructor({ apiToken, logger = console, clientConfig = {} } = {}) {
    this.service = new FigmaComponentsService({
      apiToken,
      logger,
      clientConfig
    });
    this.logger = logger;
  }

  // ==========================================
  // Components Operations
  // ==========================================

  /**
   * Get team components with pagination
   * @param {string} teamId - Team ID to list components from
   * @param {Object} [options] - Pagination options
   * @returns {Promise<Object>} Paginated components list
   */
  async getTeamComponents(teamId, options = {}) {
    return this.service.getTeamComponents(teamId, options);
  }

  /**
   * Get all team components (handles pagination automatically)
   * @param {string} teamId - Team ID to list components from
   * @param {number} [maxItems=1000] - Maximum number of items to fetch
   * @returns {Promise<Object[]>} All components in team
   */
  async getAllTeamComponents(teamId, maxItems = 1000) {
    const allComponents = [];
    let after = null;
    let hasMore = true;

    while (hasMore && allComponents.length < maxItems) {
      const response = await this.getTeamComponents(teamId, { 
        pageSize: Math.min(100, maxItems - allComponents.length),
        after 
      });

      if (response.components) {
        allComponents.push(...response.components);
      }

      // Check if there are more pages
      hasMore = response.meta?.has_next_page || false;
      after = response.meta?.next_page_token || null;

      if (!hasMore || !after) break;
    }

    return allComponents;
  }

  /**
   * Get file components
   * @param {string} fileKey - File key to list components from
   * @returns {Promise<Object>} Components in file
   */
  async getFileComponents(fileKey) {
    return this.service.getFileComponents(fileKey);
  }

  /**
   * Get component by key
   * @param {string} key - Component key
   * @returns {Promise<Object>} Component metadata
   */
  async getComponent(key) {
    return this.service.getComponent(key);
  }

  /**
   * Search components in team by name
   * @param {string} teamId - Team ID to search in
   * @param {string} searchTerm - Name to search for
   * @returns {Promise<Object[]>} Matching components
   */
  async searchComponents(teamId, searchTerm) {
    return this.service.searchTeamComponentsByName(teamId, searchTerm);
  }

  // ==========================================
  // Component Sets Operations
  // ==========================================

  /**
   * Get team component sets with pagination
   * @param {string} teamId - Team ID to list component sets from
   * @param {Object} [options] - Pagination options
   * @returns {Promise<Object>} Paginated component sets list
   */
  async getTeamComponentSets(teamId, options = {}) {
    return this.service.getTeamComponentSets(teamId, options);
  }

  /**
   * Get all team component sets (handles pagination automatically)
   * @param {string} teamId - Team ID to list component sets from
   * @param {number} [maxItems=1000] - Maximum number of items to fetch
   * @returns {Promise<Object[]>} All component sets in team
   */
  async getAllTeamComponentSets(teamId, maxItems = 1000) {
    const allComponentSets = [];
    let after = null;
    let hasMore = true;

    while (hasMore && allComponentSets.length < maxItems) {
      const response = await this.getTeamComponentSets(teamId, { 
        pageSize: Math.min(100, maxItems - allComponentSets.length),
        after 
      });

      if (response.component_sets) {
        allComponentSets.push(...response.component_sets);
      }

      // Check if there are more pages
      hasMore = response.meta?.has_next_page || false;
      after = response.meta?.next_page_token || null;

      if (!hasMore || !after) break;
    }

    return allComponentSets;
  }

  /**
   * Get file component sets
   * @param {string} fileKey - File key to list component sets from
   * @returns {Promise<Object>} Component sets in file
   */
  async getFileComponentSets(fileKey) {
    return this.service.getFileComponentSets(fileKey);
  }

  /**
   * Get component set by key
   * @param {string} key - Component set key
   * @returns {Promise<Object>} Component set metadata
   */
  async getComponentSet(key) {
    return this.service.getComponentSet(key);
  }

  // ==========================================
  // Styles Operations
  // ==========================================

  /**
   * Get team styles with pagination
   * @param {string} teamId - Team ID to list styles from
   * @param {Object} [options] - Pagination options
   * @returns {Promise<Object>} Paginated styles list
   */
  async getTeamStyles(teamId, options = {}) {
    return this.service.getTeamStyles(teamId, options);
  }

  /**
   * Get all team styles (handles pagination automatically)
   * @param {string} teamId - Team ID to list styles from
   * @param {number} [maxItems=1000] - Maximum number of items to fetch
   * @returns {Promise<Object[]>} All styles in team
   */
  async getAllTeamStyles(teamId, maxItems = 1000) {
    const allStyles = [];
    let after = null;
    let hasMore = true;

    while (hasMore && allStyles.length < maxItems) {
      const response = await this.getTeamStyles(teamId, { 
        pageSize: Math.min(100, maxItems - allStyles.length),
        after 
      });

      if (response.styles) {
        allStyles.push(...response.styles);
      }

      // Check if there are more pages
      hasMore = response.meta?.has_next_page || false;
      after = response.meta?.next_page_token || null;

      if (!hasMore || !after) break;
    }

    return allStyles;
  }

  /**
   * Get file styles
   * @param {string} fileKey - File key to list styles from
   * @returns {Promise<Object>} Styles in file
   */
  async getFileStyles(fileKey) {
    return this.service.getFileStyles(fileKey);
  }

  /**
   * Get style by key
   * @param {string} key - Style key
   * @returns {Promise<Object>} Style metadata
   */
  async getStyle(key) {
    return this.service.getStyle(key);
  }

  // ==========================================
  // Batch Operations
  // ==========================================

  /**
   * Get multiple components by their keys
   * @param {string[]} keys - Array of component keys
   * @returns {Promise<Object>} Batch results
   */
  async batchGetComponents(keys) {
    return this.service.batchGetComponents(keys);
  }

  /**
   * Get multiple component sets by their keys
   * @param {string[]} keys - Array of component set keys
   * @returns {Promise<Object>} Batch results
   */
  async batchGetComponentSets(keys) {
    return this.service.batchGetComponentSets(keys);
  }

  /**
   * Get multiple styles by their keys
   * @param {string[]} keys - Array of style keys
   * @returns {Promise<Object>} Batch results
   */
  async batchGetStyles(keys) {
    return this.service.batchGetStyles(keys);
  }

  // ==========================================
  // Library Content Operations
  // ==========================================

  /**
   * Get complete team library content (components, component sets, styles)
   * @param {string} teamId - Team ID to get library from
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Complete library content
   */
  async getTeamLibrary(teamId, options = {}) {
    return this.service.getTeamLibraryContent(teamId, options);
  }

  /**
   * Get complete file library content (components, component sets, styles)
   * @param {string} fileKey - File key to get library from
   * @returns {Promise<Object>} Complete library content
   */
  async getFileLibrary(fileKey) {
    return this.service.getFileLibraryContent(fileKey);
  }

  /**
   * Get library analytics for a team
   * @param {string} teamId - Team ID to analyze
   * @returns {Promise<Object>} Library analytics summary
   */
  async getTeamLibraryAnalytics(teamId) {
    const library = await this.getTeamLibrary(teamId);
    
    const analytics = {
      totalItems: library.summary.componentsCount + library.summary.componentSetsCount + library.summary.stylesCount,
      breakdown: {
        components: library.summary.componentsCount,
        componentSets: library.summary.componentSetsCount,
        styles: library.summary.stylesCount
      },
      componentsByType: {},
      stylesByType: {}
    };

    // Analyze component types
    if (library.components?.components) {
      for (const component of library.components.components) {
        const type = component.node_type || 'unknown';
        analytics.componentsByType[type] = (analytics.componentsByType[type] || 0) + 1;
      }
    }

    // Analyze style types
    if (library.styles?.styles) {
      for (const style of library.styles.styles) {
        const type = style.style_type || 'unknown';
        analytics.stylesByType[type] = (analytics.stylesByType[type] || 0) + 1;
      }
    }

    return analytics;
  }

  /**
   * Export team library as structured data
   * @param {string} teamId - Team ID to export
   * @param {Object} [options] - Export options
   * @returns {Promise<Object>} Structured library export
   */
  async exportTeamLibrary(teamId, options = {}) {
    const { includeMetadata = true, format = 'json' } = options;
    
    const library = await this.getTeamLibrary(teamId);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      teamId,
      summary: library.summary,
      components: library.components?.components || [],
      componentSets: library.componentSets?.component_sets || [],
      styles: library.styles?.styles || []
    };

    if (includeMetadata) {
      exportData.metadata = {
        exportVersion: '1.0.0',
        figmaApiVersion: 'v1',
        totalItems: exportData.components.length + exportData.componentSets.length + exportData.styles.length
      };
    }

    return format === 'json' ? exportData : JSON.stringify(exportData, null, 2);
  }

  // ==========================================
  // Search and Filter Operations
  // ==========================================

  /**
   * Find components by pattern in team
   * @param {string} teamId - Team ID to search in
   * @param {Object} pattern - Search pattern
   * @param {string} [pattern.name] - Name pattern (partial match)
   * @param {string} [pattern.description] - Description pattern (partial match)
   * @param {string} [pattern.nodeType] - Node type filter
   * @returns {Promise<Object[]>} Matching components
   */
  async findComponents(teamId, pattern) {
    const allComponents = await this.getAllTeamComponents(teamId);
    
    return allComponents.filter(component => {
      if (pattern.name && !component.name?.toLowerCase().includes(pattern.name.toLowerCase())) {
        return false;
      }
      
      if (pattern.description && !component.description?.toLowerCase().includes(pattern.description.toLowerCase())) {
        return false;
      }
      
      if (pattern.nodeType && component.node_type !== pattern.nodeType) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Find styles by type in team
   * @param {string} teamId - Team ID to search in
   * @param {string} styleType - Style type to filter by (FILL, TEXT, EFFECT, GRID)
   * @returns {Promise<Object[]>} Matching styles
   */
  async findStylesByType(teamId, styleType) {
    const allStyles = await this.getAllTeamStyles(teamId);
    
    return allStyles.filter(style => style.style_type === styleType);
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Parse component key from Figma URL
   * @param {string} url - Figma component URL
   * @returns {string} Extracted component key
   */
  static parseComponentKeyFromUrl(url) {
    const match = url.match(/figma\.com.*component\/([a-zA-Z0-9:\-_]+)/);
    if (!match) {
      throw new Error('Invalid Figma component URL');
    }
    return match[1];
  }

  /**
   * Parse team ID from Figma team URL
   * @param {string} url - Figma team URL
   * @returns {string} Extracted team ID
   */
  static parseTeamIdFromUrl(url) {
    const match = url.match(/figma\.com.*team\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Figma team URL');
    }
    return match[1];
  }

  /**
   * Validate component key format
   * @param {string} key - Component key to validate
   * @returns {boolean} Whether key is valid
   */
  static isValidComponentKey(key) {
    return typeof key === 'string' && /^[a-zA-Z0-9:\-_]+$/.test(key);
  }

  /**
   * Validate team ID format
   * @param {string} teamId - Team ID to validate
   * @returns {boolean} Whether team ID is valid
   */
  static isValidTeamId(teamId) {
    return typeof teamId === 'string' && /^\d+$/.test(teamId);
  }

  /**
   * Validate file key format
   * @param {string} fileKey - File key to validate
   * @returns {boolean} Whether file key is valid
   */
  static isValidFileKey(fileKey) {
    return typeof fileKey === 'string' && /^[a-zA-Z0-9\-_]+$/.test(fileKey);
  }

  /**
   * Get SDK statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return this.service.getStats();
  }

  /**
   * Perform health check
   * @returns {Promise<boolean>} Whether service is healthy
   */
  async healthCheck() {
    return this.service.healthCheck();
  }
}

export default FigmaComponentsSDK;