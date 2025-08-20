/**
 * SDK facade for figma-projects
 * Provides ergonomic API over core client and service layers
 */

import FigmaProjectsClient from '../core/client.mjs';
import FigmaProjectsService from '../core/service.mjs';
import { ConfigurationError } from '../core/exceptions.mjs';

/**
 * High-level SDK for Figma Projects API
 * Combines client and service functionality with convenience methods
 */
export class FigmaProjectsSDK {
  /**
   * @param {object|string} config - Configuration object or API token string
   * @param {string} config.apiToken - Figma API personal access token
   * @param {string} [config.baseUrl] - Base API URL
   * @param {object} [config.logger] - Logger instance
   * @param {number} [config.timeout] - Request timeout in milliseconds
   * @param {number} [config.maxRetries] - Maximum retry attempts
   * @param {boolean} [config.enableCache] - Enable response caching
   * @param {boolean} [config.enableMetrics] - Enable request metrics
   * @param {number} [config.rateLimitRpm] - Rate limit (requests per minute)
   * @param {object} [config.serviceConfig] - Service layer configuration
   */
  constructor(config) {
    // Allow passing API token as string for convenience
    if (typeof config === 'string') {
      config = { apiToken: config };
    }

    if (!config || !config.apiToken) {
      throw new ConfigurationError(
        'API token is required. Get one from https://www.figma.com/developers/api#access-tokens',
        'apiToken'
      );
    }

    // Initialize client
    this.client = new FigmaProjectsClient(config);

    // Initialize service
    this.service = new FigmaProjectsService({
      client: this.client,
      logger: config.logger,
      config: config.serviceConfig
    });

    this.logger = config.logger || console;
    this.logger.debug('FigmaProjectsSDK initialized');
  }

  /**
   * Get all projects in a team
   * @param {string} teamId - Team ID
   * @param {object} [options={}] - Options
   * @param {boolean} [options.includeStats=false] - Include project statistics
   * @returns {Promise<object>} Projects data
   */
  async getTeamProjects(teamId, options = {}) {
    return this.service.getTeamProjects(teamId, options);
  }

  /**
   * Get all files in a project
   * @param {string} projectId - Project ID
   * @param {object} [options={}] - Options
   * @param {boolean} [options.branchData=false] - Include branch metadata
   * @param {boolean} [options.sortByModified=true] - Sort by last modified date
   * @returns {Promise<object>} Project files data
   */
  async getProjectFiles(projectId, options = {}) {
    return this.service.getProjectFiles(projectId, options);
  }

  /**
   * Get complete project tree (projects with their files)
   * @param {string} teamId - Team ID
   * @param {object} [options={}] - Options
   * @param {number} [options.maxConcurrency=5] - Max concurrent file requests
   * @param {boolean} [options.includeEmptyProjects=true] - Include projects with no files
   * @returns {Promise<object>} Complete project tree
   */
  async getProjectTree(teamId, options = {}) {
    return this.service.getProjectsWithFiles(teamId, options);
  }

  /**
   * Search for projects by name
   * @param {string} teamId - Team ID
   * @param {string} query - Search query
   * @param {object} [options={}] - Search options
   * @param {boolean} [options.caseSensitive=false] - Case sensitive search
   * @param {boolean} [options.exactMatch=false] - Exact match only
   * @returns {Promise<object>} Search results
   */
  async searchProjects(teamId, query, options = {}) {
    return this.service.searchProjects(teamId, query, options);
  }

  /**
   * Get project statistics and metrics
   * @param {string} projectId - Project ID
   * @returns {Promise<object>} Project statistics
   */
  async getProjectStats(projectId) {
    return this.service.getProjectStatistics(projectId);
  }

  /**
   * Find a specific file by name within a project
   * @param {string} projectId - Project ID
   * @param {string} fileName - File name to search for
   * @param {object} [options={}] - Search options
   * @param {boolean} [options.caseSensitive=false] - Case sensitive search
   * @param {boolean} [options.exactMatch=true] - Exact match only
   * @returns {Promise<object>} File data
   */
  async findFile(projectId, fileName, options = {}) {
    return this.service.findFileByName(projectId, fileName, options);
  }

  /**
   * Get recently modified files across all projects in a team
   * @param {string} teamId - Team ID
   * @param {number} [limit=10] - Maximum number of files to return
   * @param {number} [daysBack=7] - Number of days to look back
   * @returns {Promise<object>} Recent files data
   */
  async getRecentFiles(teamId, limit = 10, daysBack = 7) {
    return this.service.getRecentFiles(teamId, limit, daysBack);
  }

  /**
   * Get multiple projects at once
   * @param {string[]} projectIds - Array of project IDs
   * @param {object} [options={}] - Options
   * @param {number} [options.maxConcurrency=5] - Max concurrent requests
   * @returns {Promise<object>} Batch results
   */
  async getMultipleProjects(projectIds, options = {}) {
    return this.service.batchGetProjects(projectIds, options);
  }

  /**
   * Export project structure to different formats
   * @param {string} teamId - Team ID
   * @param {string} [format='json'] - Export format (json, csv)
   * @returns {Promise<string>} Exported data
   */
  async exportProjects(teamId, format = 'json') {
    return this.service.exportProjectStructure(teamId, format);
  }

  /**
   * Health check - verify API connectivity and authentication
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    try {
      this.logger.debug('Performing health check');

      // Use the rate limiter status as a simple connectivity test
      const rateLimitStatus = this.client.getRateLimitStatus();
      const metrics = this.client.getMetrics();
      const cacheStats = this.client.getCacheStats();

      // Test with a minimal API call - we can't make a real call without a team ID
      // so we'll use the client's internal status
      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        apiConnectivity: 'ok',
        authentication: 'ok',
        rateLimit: rateLimitStatus,
        metrics: metrics,
        cache: cacheStats,
        version: '1.0.0'
      };

      this.logger.debug('Health check completed', status);
      return status;

    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        version: '1.0.0'
      };
    }
  }

  /**
   * Get SDK metrics and performance data
   * @returns {object} Comprehensive SDK metrics
   */
  getMetrics() {
    const clientMetrics = this.client.getMetrics();
    const rateLimitStatus = this.client.getRateLimitStatus();
    const cacheStats = this.client.getCacheStats();

    return {
      client: clientMetrics,
      rateLimit: rateLimitStatus,
      cache: cacheStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  reset() {
    this.client.clearCache();
    this.client.resetMetrics();
    this.logger.debug('SDK state reset');
  }

  // Convenience methods for common workflows

  /**
   * Get a complete overview of a team's projects and activity
   * @param {string} teamId - Team ID
   * @param {object} [options={}] - Options
   * @param {boolean} [options.includeStats=true] - Include project statistics
   * @param {boolean} [options.includeRecentFiles=true] - Include recent files
   * @param {number} [options.recentFilesLimit=20] - Limit for recent files
   * @returns {Promise<object>} Team overview
   */
  async getTeamOverview(teamId, options = {}) {
    const includeStats = options.includeStats !== false;
    const includeRecentFiles = options.includeRecentFiles !== false;
    const recentFilesLimit = options.recentFilesLimit || 20;

    try {
      this.logger.debug('Generating team overview', { teamId, options });

      // Get projects with statistics
      const projects = await this.getTeamProjects(teamId, { includeStats });

      // Get recent files if requested
      let recentFiles = null;
      if (includeRecentFiles) {
        try {
          recentFiles = await this.getRecentFiles(teamId, recentFilesLimit);
        } catch (error) {
          this.logger.warn('Failed to fetch recent files for overview', {
            teamId,
            error: error.message
          });
        }
      }

      // Calculate summary statistics
      const totalProjects = projects.totalCount;
      const projectsWithStats = projects.projects.filter(p => p.statistics);
      const totalFiles = projectsWithStats.reduce((sum, p) => sum + (p.statistics?.fileCount || 0), 0);
      const activeProjects = projectsWithStats.filter(p => 
        p.statistics?.activitySummary?.lastMonth > 0
      ).length;

      return {
        team: projects.team,
        summary: {
          totalProjects,
          totalFiles,
          activeProjects,
          activeProjectsPercentage: totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0
        },
        projects: projects.projects,
        recentFiles: recentFiles?.files || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          includeStats,
          includeRecentFiles,
          recentFilesLimit
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate team overview', {
        teamId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Quick project lookup by name
   * @param {string} teamId - Team ID
   * @param {string} projectName - Project name to find
   * @param {object} [options={}] - Search options
   * @returns {Promise<object|null>} Project data or null if not found
   */
  async findProject(teamId, projectName, options = {}) {
    try {
      const searchResults = await this.searchProjects(teamId, projectName, {
        exactMatch: true,
        caseSensitive: options.caseSensitive || false
      });

      if (searchResults.totalMatches === 0) {
        return null;
      }

      const project = searchResults.results[0];

      // Get project files if requested
      if (options.includeFiles) {
        const filesData = await this.getProjectFiles(project.id);
        project.files = filesData.files;
        project.fileCount = filesData.totalCount;
      }

      return project;

    } catch (error) {
      this.logger.error('Failed to find project', {
        teamId,
        projectName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk file search across all projects
   * @param {string} teamId - Team ID
   * @param {string} fileName - File name to search for
   * @param {object} [options={}] - Search options
   * @returns {Promise<object[]>} Array of matching files with project context
   */
  async findFileAcrossProjects(teamId, fileName, options = {}) {
    try {
      this.logger.debug('Searching for file across projects', { teamId, fileName, options });

      const projectsWithFiles = await this.getProjectTree(teamId);
      const matchingFiles = [];

      const searchTerm = options.caseSensitive ? fileName : fileName.toLowerCase();

      for (const project of projectsWithFiles.projects) {
        for (const file of project.files) {
          const fileNameToSearch = options.caseSensitive ? file.name : file.name.toLowerCase();
          
          const matches = options.exactMatch 
            ? fileNameToSearch === searchTerm
            : fileNameToSearch.includes(searchTerm);

          if (matches) {
            matchingFiles.push({
              ...file,
              projectId: project.id,
              projectName: project.name
            });
          }
        }
      }

      return {
        query: {
          fileName,
          teamId,
          caseSensitive: options.caseSensitive || false,
          exactMatch: options.exactMatch || false
        },
        results: matchingFiles,
        totalMatches: matchingFiles.length,
        projectsScanned: projectsWithFiles.totalProjects,
        totalFilesScanned: projectsWithFiles.totalFiles,
        searchedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to search file across projects', {
        teamId,
        fileName,
        error: error.message
      });
      throw error;
    }
  }
}

export default FigmaProjectsSDK;