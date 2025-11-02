/**
 * SDK facade for Figma Files API
 * Provides ergonomic API over core service layer
 * Simplifies common operations and provides convenient methods
 */

import FigmaFilesService from '../core/service.mjs';

/**
 * High-level SDK for Figma Files API operations
 * Provides simplified interface for common use cases
 *
 * @example
 * import { FigmaApiClient } from '@figma-api/fetch';
 * import { FigmaFilesSDK } from 'figma-files-api';
 *
 * const fetcher = new FigmaApiClient({ apiToken: process.env.FIGMA_TOKEN });
 * const sdk = new FigmaFilesSDK({ fetcher });
 */
export class FigmaFilesSDK {
  /**
   * @param {Object} config - SDK configuration
   * @param {Object} config.fetcher - FigmaApiClient instance (required)
   * @param {Object} [config.logger=console] - Logger instance
   */
  constructor({ fetcher, logger = console } = {}) {
    this.service = new FigmaFilesService({
      fetcher,
      logger
    });
    this.logger = logger;
  }

  // ==========================================
  // Core File Operations
  // ==========================================

  /**
   * Get complete file data
   * @param {string} fileKey - File key from Figma URL
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Complete file data
   */
  async getFile(fileKey, options = {}) {
    return this.service.getFile(fileKey, options);
  }

  /**
   * Get specific nodes from a file
   * @param {string} fileKey - File key from Figma URL
   * @param {string|string[]} nodeIds - Node IDs to retrieve
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Node data
   */
  async getNodes(fileKey, nodeIds, options = {}) {
    return this.service.getFileNodes(fileKey, nodeIds, options);
  }

  /**
   * Get file metadata only (lightweight)
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<Object>} File metadata
   */
  async getMetadata(fileKey) {
    return this.service.getFileMetadata(fileKey);
  }

  /**
   * Get file version history
   * @param {string} fileKey - File key from Figma URL
   * @param {Object} [options] - Pagination options
   * @returns {Promise<Object>} Version history
   */
  async getVersions(fileKey, options = {}) {
    return this.service.getFileVersions(fileKey, options);
  }

  // ==========================================
  // Image Operations
  // ==========================================

  /**
   * Render PNG images for nodes
   * @param {string} fileKey - File key from Figma URL
   * @param {string|string[]} nodeIds - Node IDs to render
   * @param {Object} [options] - Rendering options
   * @returns {Promise<Object>} Image URLs
   */
  async renderPNG(fileKey, nodeIds, options = {}) {
    return this.service.renderImages(fileKey, nodeIds, {
      format: 'png',
      ...options
    });
  }

  /**
   * Render JPG images for nodes
   * @param {string} fileKey - File key from Figma URL
   * @param {string|string[]} nodeIds - Node IDs to render
   * @param {Object} [options] - Rendering options
   * @returns {Promise<Object>} Image URLs
   */
  async renderJPG(fileKey, nodeIds, options = {}) {
    return this.service.renderImages(fileKey, nodeIds, {
      format: 'jpg',
      ...options
    });
  }

  /**
   * Render SVG images for nodes
   * @param {string} fileKey - File key from Figma URL
   * @param {string|string[]} nodeIds - Node IDs to render
   * @param {Object} [options] - Rendering options
   * @returns {Promise<Object>} Image URLs
   */
  async renderSVG(fileKey, nodeIds, options = {}) {
    return this.service.renderImages(fileKey, nodeIds, {
      format: 'svg',
      ...options
    });
  }

  /**
   * Render PDF for nodes
   * @param {string} fileKey - File key from Figma URL
   * @param {string|string[]} nodeIds - Node IDs to render
   * @param {Object} [options] - Rendering options
   * @returns {Promise<Object>} PDF URLs
   */
  async renderPDF(fileKey, nodeIds, options = {}) {
    return this.service.renderImages(fileKey, nodeIds, {
      format: 'pdf',
      ...options
    });
  }

  /**
   * Get all image fills from a file
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<Object>} Image fill URLs
   */
  async getImageFills(fileKey) {
    return this.service.getImageFills(fileKey);
  }

  // ==========================================
  // Convenience Methods
  // ==========================================

  /**
   * Get file pages (top-level canvas nodes)
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<Object[]>} Array of page objects
   */
  async getPages(fileKey) {
    const file = await this.getFile(fileKey, { depth: 1 });
    return file.document?.children || [];
  }

  /**
   * Search for nodes by name in a file
   * @param {string} fileKey - File key from Figma URL
   * @param {string} searchTerm - Name to search for
   * @param {Object} [options] - Search options
   * @returns {Promise<Object[]>} Matching nodes
   */
  async searchNodesByName(fileKey, searchTerm, options = {}) {
    const file = await this.getFile(fileKey);
    const matches = [];

    function searchRecursive(node) {
      if (node.name && node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        matches.push(node);
      }
      if (node.children) {
        node.children.forEach(searchRecursive);
      }
    }

    if (file.document) {
      searchRecursive(file.document);
    }

    return matches;
  }

  /**
   * Get all components in a file
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<Object>} Components data
   */
  async getComponents(fileKey) {
    const file = await this.getFile(fileKey);
    return file.components || {};
  }

  /**
   * Get all styles in a file
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<Object>} Styles data
   */
  async getStyles(fileKey) {
    const file = await this.getFile(fileKey);
    return file.styles || {};
  }

  /**
   * Extract text content from a file
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<string[]>} Array of text content
   */
  async extractTextContent(fileKey) {
    const file = await this.getFile(fileKey);
    const textContent = [];

    function extractTextRecursive(node) {
      if (node.type === 'TEXT' && node.characters) {
        textContent.push(node.characters);
      }
      if (node.children) {
        node.children.forEach(extractTextRecursive);
      }
    }

    if (file.document) {
      extractTextRecursive(file.document);
    }

    return textContent;
  }

  /**
   * Get file analytics summary
   * @param {string} fileKey - File key from Figma URL
   * @returns {Promise<Object>} File analytics
   */
  async getFileAnalytics(fileKey) {
    const [file, metadata] = await Promise.all([
      this.getFile(fileKey, { depth: 1 }),
      this.getMetadata(fileKey)
    ]);

    let nodeCount = 0;
    let pageCount = 0;
    let componentCount = 0;

    function countNodes(node) {
      nodeCount++;
      if (node.type === 'CANVAS') pageCount++;
      if (node.type === 'COMPONENT') componentCount++;
      if (node.children) {
        node.children.forEach(countNodes);
      }
    }

    if (file.document) {
      countNodes(file.document);
    }

    return {
      name: file.name,
      lastModified: file.lastModified,
      version: file.version,
      thumbnailUrl: file.thumbnailUrl,
      nodeCount,
      pageCount,
      componentCount,
      stylesCount: Object.keys(file.styles || {}).length,
      metadata
    };
  }

  // ==========================================
  // Batch Operations
  // ==========================================

  /**
   * Get multiple files in parallel
   * @param {string[]} fileKeys - Array of file keys
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Batch results
   */
  async batchGetFiles(fileKeys, options = {}) {
    return this.service.batchGetFiles(fileKeys, options);
  }

  /**
   * Render images for multiple files
   * @param {Object[]} requests - Array of {fileKey, nodeIds, options}
   * @returns {Promise<Object[]>} Array of render results
   */
  async batchRenderImages(requests) {
    const promises = requests.map(async ({ fileKey, nodeIds, options = {} }) => {
      try {
        const result = await this.service.renderImages(fileKey, nodeIds, options);
        return { fileKey, success: true, result };
      } catch (error) {
        return { fileKey, success: false, error: error.message };
      }
    });

    return Promise.all(promises);
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Parse file key from Figma URL
   * @param {string} url - Figma file URL
   * @returns {string} Extracted file key
   */
  static parseFileKeyFromUrl(url) {
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9\-_]+)/);
    if (!match) {
      throw new Error('Invalid Figma file URL');
    }
    return match[1];
  }

  /**
   * Parse node ID from Figma URL
   * @param {string} url - Figma file URL with node-id parameter
   * @returns {string|null} Extracted node ID
   */
  static parseNodeIdFromUrl(url) {
    const match = url.match(/node-id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
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

export default FigmaFilesSDK;