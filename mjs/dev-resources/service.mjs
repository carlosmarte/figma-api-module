/**
 * project: figma-dev-resources
 * purpose: Business logic layer for Figma Dev Resources operations
 * use-cases:
 *  - Dev resource CRUD operations
 *  - Link management for design components
 *  - Resource validation and search
 *  - Bulk operations and synchronization
 * performance:
 *  - Efficient resource filtering and sorting
 *  - Optimized search algorithms
 *  - Memory-efficient bulk operations
 */

/**
 * Core service for Figma Dev Resources business logic
 */
export class FigmaDevResourcesService {
  /**
   * @param {Object} options - Service configuration
   * @param {Object} options.fetcher - FigmaApiClient instance (required)
   * @param {Object} [options.logger=console] - Logger instance
   * @param {boolean} [options.validateInputs=true] - Whether to validate inputs
   */
  constructor({
    fetcher,
    logger = console,
    validateInputs = true
  } = {}) {
    if (!fetcher) {
      throw new Error('fetcher parameter is required. Please create and pass a FigmaApiClient instance.');
    }

    this.fetcher = fetcher;
    this.logger = logger;
    this.validateInputs = validateInputs;
  }

  /**
   * Get dev resources for a file
   * @param {string} fileKey - Figma file key
   * @param {Object} options - Request options
   * @param {string|string[]} [options.nodeIds] - Node IDs to filter by
   * @returns {Promise<Object>} Response with dev_resources array
   */
  async getDevResources(fileKey, options = {}) {
    if (this.validateInputs && !fileKey) {
      throw new Error('fileKey is required');
    }

    const params = {};
    if (options.nodeIds) {
      const nodeIds = Array.isArray(options.nodeIds) ? options.nodeIds : [options.nodeIds];
      params.node_ids = nodeIds.join(',');
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const path = `/v1/files/${fileKey}/dev_resources${queryString ? `?${queryString}` : ''}`;

      const response = await this.fetcher.request(path, {
        method: 'GET'
      });

      this.logger.debug(`Retrieved ${response.dev_resources?.length || 0} dev resources for file ${fileKey}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get dev resources for file ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Create dev resources
   * @param {Object[]} devResources - Array of dev resource objects
   * @param {string} devResources[].file_key - File key
   * @param {string} devResources[].node_id - Node ID
   * @param {string} devResources[].name - Resource name
   * @param {string} devResources[].url - Resource URL
   * @returns {Promise<Object>} Response with links_created and errors arrays
   */
  async createDevResources(devResources) {
    if (this.validateInputs) {
      if (!Array.isArray(devResources) || devResources.length === 0) {
        throw new Error('devResources must be a non-empty array');
      }

      devResources.forEach((resource, index) => {
        if (!resource.file_key) {
          throw new Error(`devResources[${index}] missing file_key`);
        }
        if (!resource.node_id) {
          throw new Error(`devResources[${index}] missing node_id`);
        }
        if (!resource.name) {
          throw new Error(`devResources[${index}] missing name`);
        }
        if (!resource.url) {
          throw new Error(`devResources[${index}] missing url`);
        }
      });
    }

    try {
      const response = await this.fetcher.request('/v1/dev_resources', {
        method: 'POST',
        body: JSON.stringify({ dev_resources: devResources })
      });

      this.logger.debug(`Created ${response.links_created?.length || 0} dev resources`);
      return response;
    } catch (error) {
      this.logger.error('Failed to create dev resources:', error);
      throw error;
    }
  }

  /**
   * Update dev resources
   * @param {Object[]} updates - Array of update objects
   * @param {string} updates[].id - Dev resource ID
   * @param {string} [updates[].name] - New name
   * @param {string} [updates[].url] - New URL
   * @returns {Promise<Object>} Response with links_updated and errors arrays
   */
  async updateDevResources(updates) {
    if (this.validateInputs) {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('updates must be a non-empty array');
      }

      updates.forEach((update, index) => {
        if (!update.id) {
          throw new Error(`updates[${index}] missing id`);
        }
        if (!update.name && !update.url) {
          throw new Error(`updates[${index}] must have at least name or url`);
        }
      });
    }

    try {
      const response = await this.fetcher.request('/v1/dev_resources', {
        method: 'PUT',
        body: JSON.stringify({ dev_resources: updates })
      });

      this.logger.debug(`Updated ${response.links_updated?.length || 0} dev resources`);
      return response;
    } catch (error) {
      this.logger.error('Failed to update dev resources:', error);
      throw error;
    }
  }

  /**
   * Delete a dev resource
   * @param {string} fileKey - File key
   * @param {string} devResourceId - Dev resource ID
   * @returns {Promise<void>}
   */
  async deleteDevResource(fileKey, devResourceId) {
    if (this.validateInputs) {
      if (!fileKey) {
        throw new Error('fileKey is required');
      }
      if (!devResourceId) {
        throw new Error('devResourceId is required');
      }
    }

    try {
      await this.fetcher.request(`/v1/files/${fileKey}/dev_resources/${devResourceId}`, {
        method: 'DELETE'
      });

      this.logger.debug(`Deleted dev resource ${devResourceId} from file ${fileKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete dev resource ${devResourceId}:`, error);
      throw error;
    }
  }
}

export default FigmaDevResourcesService;
