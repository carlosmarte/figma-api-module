/**
 * SDK facade for figma-dev-resources-client
 * Provides ergonomic API for Dev Resources operations
 */

import { FigmaDevResourcesService } from './service.mjs';

/**
 * High-level SDK for Figma Dev Resources API
 *
 * @example
 * import { FigmaApiClient } from '@figma-api/fetch';
 * import { FigmaDevResourcesSDK } from 'figma-dev-resources';
 *
 * const fetcher = new FigmaApiClient({ apiToken: process.env.FIGMA_TOKEN });
 * const sdk = new FigmaDevResourcesSDK({ fetcher });
 */
export class FigmaDevResourcesSDK {
  /**
   * @param {Object} config - SDK configuration
   * @param {Object} config.fetcher - FigmaApiClient instance (required)
   * @param {Object} [config.logger] - Logger instance
   */
  constructor({ fetcher, logger } = {}) {
    if (!fetcher) {
      throw new Error('fetcher parameter is required. Please create and pass a FigmaApiClient instance.');
    }

    this.fetcher = fetcher;
    this.service = new FigmaDevResourcesService({ fetcher, logger });
  }

  // High-level methods that compose client operations

  /**
   * Get all dev resources for a file
   * @param {string} fileKey - The file key
   * @param {string|string[]} [nodeIds] - Optional node IDs to filter by
   * @returns {Promise<Object[]>} Array of dev resources
   */
  async getFileDevResources(fileKey, nodeIds = null) {
    const options = nodeIds ? { nodeIds } : {};
    const response = await this.service.getDevResources(fileKey, options);
    return response.dev_resources || [];
  }

  /**
   * Get dev resources for specific nodes
   * @param {string} fileKey - The file key
   * @param {string[]} nodeIds - Array of node IDs
   * @returns {Promise<Object[]>} Array of dev resources for the specified nodes
   */
  async getNodeDevResources(fileKey, nodeIds) {
    return this.getFileDevResources(fileKey, nodeIds);
  }

  /**
   * Create a single dev resource
   * @param {string} fileKey - The file key
   * @param {string} nodeId - The node ID
   * @param {string} name - The resource name
   * @param {string} url - The resource URL
   * @returns {Promise<Object>} Created dev resource
   */
  async createDevResource(fileKey, nodeId, name, url) {
    const response = await this.service.createDevResources([{
      file_key: fileKey,
      node_id: nodeId,
      name,
      url
    }]);

    if (response.links_created && response.links_created.length > 0) {
      return response.links_created[0];
    }

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].error);
    }

    throw new Error('Unknown error creating dev resource');
  }

  /**
   * Create multiple dev resources for a single file
   * @param {string} fileKey - The file key
   * @param {Object[]} resources - Array of resource objects
   * @param {string} resources[].nodeId - The node ID
   * @param {string} resources[].name - The resource name
   * @param {string} resources[].url - The resource URL
   * @returns {Promise<Object>} Creation results
   */
  async createFileDevResources(fileKey, resources) {
    const devResources = resources.map(resource => ({
      file_key: fileKey,
      node_id: resource.nodeId,
      name: resource.name,
      url: resource.url
    }));

    return this.service.createDevResources(devResources);
  }

  /**
   * Create dev resources across multiple files
   * @param {Object[]} resources - Array of resource objects
   * @param {string} resources[].fileKey - The file key
   * @param {string} resources[].nodeId - The node ID
   * @param {string} resources[].name - The resource name
   * @param {string} resources[].url - The resource URL
   * @returns {Promise<Object>} Creation results
   */
  async createMultiFileDevResources(resources) {
    const devResources = resources.map(resource => ({
      file_key: resource.fileKey,
      node_id: resource.nodeId,
      name: resource.name,
      url: resource.url
    }));

    return this.service.createDevResources(devResources);
  }

  /**
   * Update a single dev resource
   * @param {string} devResourceId - The dev resource ID
   * @param {Object} updates - Updates to apply
   * @param {string} [updates.name] - New name
   * @param {string} [updates.url] - New URL
   * @returns {Promise<Object>} Updated dev resource
   */
  async updateDevResource(devResourceId, updates) {
    const response = await this.service.updateDevResources([{
      id: devResourceId,
      ...updates
    }]);

    if (response.links_updated && response.links_updated.length > 0) {
      return response.links_updated[0];
    }

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].error);
    }

    throw new Error('Unknown error updating dev resource');
  }

  /**
   * Update multiple dev resources
   * @param {Object[]} updates - Array of update objects
   * @param {string} updates[].id - The dev resource ID
   * @param {string} [updates[].name] - New name
   * @param {string} [updates[].url] - New URL
   * @returns {Promise<Object>} Update results
   */
  async updateMultipleDevResources(updates) {
    return this.service.updateDevResources(updates);
  }

  /**
   * Delete a dev resource
   * @param {string} fileKey - The file key
   * @param {string} devResourceId - The dev resource ID
   * @returns {Promise<void>}
   */
  async deleteDevResource(fileKey, devResourceId) {
    await this.service.deleteDevResource(fileKey, devResourceId);
  }

  /**
   * Delete multiple dev resources
   * @param {Object[]} resources - Array of resource identifiers
   * @param {string} resources[].fileKey - The file key
   * @param {string} resources[].id - The dev resource ID
   * @returns {Promise<Object[]>} Array of deletion results
   */
  async deleteMultipleDevResources(resources) {
    const promises = resources.map(async (resource) => {
      try {
        await this.deleteDevResource(resource.fileKey, resource.id);
        return { success: true, fileKey: resource.fileKey, id: resource.id };
      } catch (error) {
        return { 
          success: false, 
          fileKey: resource.fileKey, 
          id: resource.id, 
          error: error.message 
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Sync dev resources - create missing, update existing, delete orphaned
   * @param {string} fileKey - The file key
   * @param {Object[]} targetResources - Desired state of resources
   * @param {string} targetResources[].nodeId - The node ID
   * @param {string} targetResources[].name - The resource name
   * @param {string} targetResources[].url - The resource URL
   * @param {string} [targetResources[].id] - Existing resource ID (for updates)
   * @returns {Promise<Object>} Sync results
   */
  async syncFileDevResources(fileKey, targetResources) {
    // Get current resources
    const currentResources = await this.getFileDevResources(fileKey);
    const currentById = new Map(currentResources.map(r => [r.id, r]));
    const currentByNodeUrl = new Map(
      currentResources.map(r => [`${r.node_id}:${r.url}`, r])
    );

    const results = {
      created: [],
      updated: [],
      deleted: [],
      errors: []
    };

    // Determine operations needed
    const toCreate = [];
    const toUpdate = [];
    const targetIds = new Set();

    for (const target of targetResources) {
      const key = `${target.nodeId}:${target.url}`;
      const existing = currentByNodeUrl.get(key);

      if (existing) {
        targetIds.add(existing.id);
        // Check if update needed
        if (existing.name !== target.name) {
          toUpdate.push({
            id: existing.id,
            name: target.name,
            url: target.url
          });
        }
      } else {
        toCreate.push({
          file_key: fileKey,
          node_id: target.nodeId,
          name: target.name,
          url: target.url
        });
      }
    }

    // Resources to delete (not in target list)
    const toDelete = currentResources.filter(r => !targetIds.has(r.id));

    // Execute operations
    try {
      // Create new resources
      if (toCreate.length > 0) {
        const createResponse = await this.service.createDevResources(toCreate);
        results.created = createResponse.links_created || [];
        results.errors.push(...(createResponse.errors || []));
      }

      // Update existing resources
      if (toUpdate.length > 0) {
        const updateResponse = await this.service.updateDevResources(toUpdate);
        results.updated = updateResponse.links_updated || [];
        results.errors.push(...(updateResponse.errors || []));
      }

      // Delete orphaned resources
      if (toDelete.length > 0) {
        const deleteResults = await this.deleteMultipleDevResources(
          toDelete.map(r => ({ fileKey, id: r.id }))
        );
        results.deleted = deleteResults.filter(r => r.success);
        results.errors.push(...deleteResults.filter(r => !r.success));
      }
    } catch (error) {
      results.errors.push({ error: error.message });
    }

    return results;
  }

  /**
   * Search dev resources by name pattern
   * @param {string} fileKey - The file key
   * @param {string|RegExp} pattern - Search pattern
   * @returns {Promise<Object[]>} Matching dev resources
   */
  async searchDevResources(fileKey, pattern) {
    const resources = await this.getFileDevResources(fileKey);
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    return resources.filter(resource => regex.test(resource.name));
  }

  /**
   * Get dev resources by URL pattern
   * @param {string} fileKey - The file key
   * @param {string|RegExp} urlPattern - URL pattern to match
   * @returns {Promise<Object[]>} Matching dev resources
   */
  async getDevResourcesByUrl(fileKey, urlPattern) {
    const resources = await this.getFileDevResources(fileKey);
    const regex = urlPattern instanceof RegExp ? urlPattern : new RegExp(urlPattern, 'i');
    return resources.filter(resource => regex.test(resource.url));
  }

  /**
   * Get statistics about dev resources in a file
   * @param {string} fileKey - The file key
   * @returns {Promise<Object>} Statistics object
   */
  async getDevResourcesStats(fileKey) {
    const resources = await this.getFileDevResources(fileKey);
    const nodeGroups = new Map();
    const urlDomains = new Map();

    resources.forEach(resource => {
      // Count by node
      const nodeCount = nodeGroups.get(resource.node_id) || 0;
      nodeGroups.set(resource.node_id, nodeCount + 1);

      // Count by domain
      try {
        const domain = new URL(resource.url).hostname;
        const domainCount = urlDomains.get(domain) || 0;
        urlDomains.set(domain, domainCount + 1);
      } catch {
        // Invalid URL, skip domain counting
      }
    });

    return {
      total: resources.length,
      byNode: Object.fromEntries(nodeGroups),
      byDomain: Object.fromEntries(urlDomains),
      nodesWithResources: nodeGroups.size,
      domains: urlDomains.size
    };
  }

  /**
   * Validate dev resource URLs
   * Note: URL validation requires external HTTP client capabilities.
   * This method validates URL format only. For live URL validation,
   * use a separate HTTP client or service.
   *
   * @param {string} fileKey - The file key
   * @returns {Promise<Object[]>} Resources with invalid URL formats
   */
  async validateDevResourceUrls(fileKey) {
    const resources = await this.getFileDevResources(fileKey);
    const invalid = [];

    for (const resource of resources) {
      try {
        // Validate URL format
        new URL(resource.url);
        // URL is valid, skip
      } catch (error) {
        invalid.push({
          ...resource,
          error: `Invalid URL format: ${error.message}`
        });
      }
    }

    return invalid;
  }
}

export default FigmaDevResourcesSDK;