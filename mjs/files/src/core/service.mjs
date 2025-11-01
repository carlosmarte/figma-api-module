/**
 * Service layer for Figma Files API operations
 * Implements business logic for all file-related endpoints
 * Provides high-level methods that compose HTTP client operations
 */

import FigmaFilesClient from './client.mjs';
import { ValidationError, NodeNotFoundError } from './exceptions.mjs';

/**
 * Service class for Figma Files API operations
 * Handles business logic and validation for file operations
 */
export class FigmaFilesService {
  /**
   * @param {Object} options - Service configuration
   * @param {string} options.apiToken - Figma personal access token
   * @param {Object} [options.clientConfig={}] - HTTP client configuration
   * @param {Object} [options.logger=console] - Logger instance
   */
  constructor({ apiToken, clientConfig = {}, logger = console } = {}) {
    this.client = new FigmaFilesClient({
      apiToken,
      logger,
      ...clientConfig
    });
    this.logger = logger;
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
   * Validate node IDs format
   * @private
   */
  _validateNodeIds(nodeIds) {
    if (!nodeIds) {
      throw new ValidationError('Node IDs are required', 'nodeIds', nodeIds);
    }

    const ids = Array.isArray(nodeIds) ? nodeIds : nodeIds.split(',');
    
    if (ids.length === 0) {
      throw new ValidationError('At least one node ID is required', 'nodeIds', nodeIds);
    }

    // Validate each node ID format (typically contains colons and numbers)
    const invalidIds = ids.filter(id => !/^[\d:]+$/.test(id.trim()));
    if (invalidIds.length > 0) {
      throw new ValidationError(
        `Invalid node ID format: ${invalidIds.join(', ')}`, 
        'nodeIds', 
        invalidIds
      );
    }

    return ids.map(id => id.trim());
  }

  /**
   * Validate scale parameter for image rendering
   * @private
   */
  _validateScale(scale) {
    if (scale !== undefined && scale !== null) {
      const numScale = Number(scale);
      if (isNaN(numScale) || numScale < 0.01 || numScale > 4) {
        throw new ValidationError(
          'Scale must be a number between 0.01 and 4', 
          'scale', 
          scale
        );
      }
    }
  }

  /**
   * Validate image format parameter
   * @private
   */
  _validateImageFormat(format) {
    if (format !== undefined && format !== null) {
      const validFormats = ['jpg', 'png', 'svg', 'pdf'];
      if (!validFormats.includes(format)) {
        throw new ValidationError(
          `Format must be one of: ${validFormats.join(', ')}`, 
          'format', 
          format
        );
      }
    }
  }

  /**
   * Get file JSON
   * Returns the document identified by file_key as a JSON object
   * 
   * @param {string} fileKey - File to export JSON from
   * @param {Object} [options={}] - Request options
   * @param {string} [options.version] - Specific version ID to get
   * @param {string} [options.ids] - Comma separated list of node IDs to include
   * @param {number} [options.depth] - How deep into the document tree to traverse
   * @param {string} [options.geometry] - Set to "paths" to export vector data
   * @param {string} [options.pluginData] - Plugin IDs to include data for
   * @param {boolean} [options.branchData=false] - Return branch metadata
   * @returns {Promise<Object>} File JSON data
   */
  async getFile(fileKey, options = {}) {
    this._validateFileKey(fileKey);

    const params = {};
    
    if (options.version) params.version = options.version;
    if (options.ids) params.ids = options.ids;
    if (options.depth !== undefined) params.depth = options.depth;
    if (options.geometry) params.geometry = options.geometry;
    if (options.pluginData) params.plugin_data = options.pluginData;
    if (options.branchData) params.branch_data = options.branchData;

    this.logger.debug(`Getting file: ${fileKey}`, params);

    return this.client.get(`/v1/files/${fileKey}`, params);
  }

  /**
   * Get file JSON for specific nodes
   * Returns the nodes referenced by IDs as a JSON object
   * 
   * @param {string} fileKey - File to export JSON from
   * @param {string|string[]} nodeIds - Node IDs to retrieve
   * @param {Object} [options={}] - Request options
   * @param {string} [options.version] - Specific version ID to get
   * @param {number} [options.depth] - How deep into the node tree to traverse
   * @param {string} [options.geometry] - Set to "paths" to export vector data
   * @param {string} [options.pluginData] - Plugin IDs to include data for
   * @returns {Promise<Object>} Node JSON data
   */
  async getFileNodes(fileKey, nodeIds, options = {}) {
    this._validateFileKey(fileKey);
    const validatedNodeIds = this._validateNodeIds(nodeIds);

    const params = {
      ids: validatedNodeIds.join(',')
    };
    
    if (options.version) params.version = options.version;
    if (options.depth !== undefined) params.depth = options.depth;
    if (options.geometry) params.geometry = options.geometry;
    if (options.pluginData) params.plugin_data = options.pluginData;

    this.logger.debug(`Getting file nodes: ${fileKey}`, params);

    const response = await this.client.get(`/v1/files/${fileKey}/nodes`, params);

    // Check for null nodes in response (indicates nodes don't exist)
    if (response.nodes) {
      const nullNodes = Object.entries(response.nodes)
        .filter(([_, node]) => node === null)
        .map(([id, _]) => id);

      if (nullNodes.length > 0) {
        throw new NodeNotFoundError(nullNodes, fileKey);
      }
    }

    return response;
  }

  /**
   * Render images of file nodes
   * Renders images from a file for the specified node IDs
   * 
   * @param {string} fileKey - File to export images from
   * @param {string|string[]} nodeIds - Node IDs to render
   * @param {Object} [options={}] - Request options
   * @param {string} [options.version] - Specific version ID to get
   * @param {number} [options.scale] - Image scaling factor (0.01 to 4)
   * @param {string} [options.format='png'] - Image output format (jpg, png, svg, pdf)
   * @param {boolean} [options.svgOutlineText=true] - Whether to outline text in SVGs
   * @param {boolean} [options.svgIncludeId=false] - Whether to include ID attributes in SVGs
   * @param {boolean} [options.svgIncludeNodeId=false] - Whether to include node ID attributes
   * @param {boolean} [options.svgSimplifyStroke=true] - Whether to simplify strokes in SVGs
   * @param {boolean} [options.contentsOnly=true] - Whether to exclude overlapping content
   * @param {boolean} [options.useAbsoluteBounds=false] - Use full node dimensions
   * @returns {Promise<Object>} Image URLs mapped by node ID
   */
  async renderImages(fileKey, nodeIds, options = {}) {
    this._validateFileKey(fileKey);
    const validatedNodeIds = this._validateNodeIds(nodeIds);
    this._validateScale(options.scale);
    this._validateImageFormat(options.format);

    const params = {
      ids: validatedNodeIds.join(',')
    };
    
    if (options.version) params.version = options.version;
    if (options.scale !== undefined) params.scale = options.scale;
    if (options.format) params.format = options.format;
    if (options.svgOutlineText !== undefined) params.svg_outline_text = options.svgOutlineText;
    if (options.svgIncludeId !== undefined) params.svg_include_id = options.svgIncludeId;
    if (options.svgIncludeNodeId !== undefined) params.svg_include_node_id = options.svgIncludeNodeId;
    if (options.svgSimplifyStroke !== undefined) params.svg_simplify_stroke = options.svgSimplifyStroke;
    if (options.contentsOnly !== undefined) params.contents_only = options.contentsOnly;
    if (options.useAbsoluteBounds !== undefined) params.use_absolute_bounds = options.useAbsoluteBounds;

    this.logger.debug(`Rendering images for file: ${fileKey}`, params);

    const response = await this.client.get(`/v1/images/${fileKey}`, params);

    // Check for null images in response (indicates rendering failed)
    if (response.images) {
      const failedNodes = Object.entries(response.images)
        .filter(([_, url]) => url === null)
        .map(([id, _]) => id);

      if (failedNodes.length > 0) {
        this.logger.warn(`Failed to render images for nodes: ${failedNodes.join(', ')}`);
      }
    }

    return response;
  }

  /**
   * Get image fills
   * Returns download links for all images present in image fills in a document
   * 
   * @param {string} fileKey - File to get image URLs from
   * @returns {Promise<Object>} Image URLs mapped by image reference
   */
  async getImageFills(fileKey) {
    this._validateFileKey(fileKey);

    this.logger.debug(`Getting image fills for file: ${fileKey}`);

    return this.client.get(`/v1/files/${fileKey}/images`);
  }

  /**
   * Get file metadata
   * Returns metadata about the specified file
   * 
   * @param {string} fileKey - File to get metadata for
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileKey) {
    this._validateFileKey(fileKey);

    this.logger.debug(`Getting metadata for file: ${fileKey}`);

    return this.client.get(`/v1/files/${fileKey}/meta`);
  }

  /**
   * Get versions of a file
   * Returns version history of a file
   * 
   * @param {string} fileKey - File to get version history from
   * @param {Object} [options={}] - Request options
   * @param {number} [options.pageSize=30] - Number of items per page (max 50)
   * @param {number} [options.before] - Get versions before this ID
   * @param {number} [options.after] - Get versions after this ID
   * @returns {Promise<Object>} File version history
   */
  async getFileVersions(fileKey, options = {}) {
    this._validateFileKey(fileKey);

    const params = {};
    
    if (options.pageSize !== undefined) {
      if (options.pageSize > 50) {
        throw new ValidationError('Page size cannot exceed 50', 'pageSize', options.pageSize);
      }
      params.page_size = options.pageSize;
    }
    
    if (options.before !== undefined) params.before = options.before;
    if (options.after !== undefined) params.after = options.after;

    this.logger.debug(`Getting versions for file: ${fileKey}`, params);

    return this.client.get(`/v1/files/${fileKey}/versions`, params);
  }

  /**
   * Batch get multiple files
   * Convenience method to get multiple files in parallel
   * 
   * @param {string[]} fileKeys - Array of file keys to retrieve
   * @param {Object} [options={}] - Request options (same as getFile)
   * @returns {Promise<Object[]>} Array of file data
   */
  async batchGetFiles(fileKeys, options = {}) {
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      throw new ValidationError('File keys must be a non-empty array', 'fileKeys', fileKeys);
    }

    this.logger.debug(`Batch getting ${fileKeys.length} files`);

    const promises = fileKeys.map(fileKey =>
      this.getFile(fileKey, options)
        .then(data => ({ success: true, fileKey, data }))
        .catch(error => ({
          success: false,
          fileKey,
          error: error.message
        }))
    );

    const results = await Promise.all(promises);

    // Separate successful and failed results
    const successful = results.filter(result => result.success === true).map(r => r.data);
    const failed = results.filter(result => result.success === false);

    if (failed.length > 0) {
      this.logger.warn(`Failed to get ${failed.length} files:`, failed);
    }

    return {
      successful,
      failed,
      total: fileKeys.length
    };
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

export default FigmaFilesService;