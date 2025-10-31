/**
 * Business logic layer for Figma Projects API operations
 * Provides high-level methods with data transformation and validation
 */

import {
  ValidationError,
  NotFoundError,
  FigmaProjectsError
} from './exceptions.mjs';

/**
 * Service layer for Figma Projects operations
 * Orchestrates client requests and implements business logic
 */
export class FigmaProjectsService {
  /**
   * @param {object} options - Service configuration
   * @param {FigmaProjectsClient} options.client - HTTP client instance
   * @param {object} [options.logger=console] - Logger instance
   * @param {object} [options.config={}] - Service configuration
   */
  constructor({ client, logger = console, config = {} } = {}) {
    if (!client) {
      throw new ValidationError('Client instance is required', 'client', client);
    }

    this.client = client;
    this.logger = logger;
    this.config = {
      maxConcurrentRequests: 5,
      defaultPageSize: 100,
      maxRetries: 3,
      ...config
    };

    this.logger.debug('FigmaProjectsService initialized', { config: this.config });
  }

  /**
   * Get all projects in a team with enhanced data
   * @param {string} teamId - Team ID
   * @param {object} [options={}] - Options
   * @param {boolean} [options.includeStats=false] - Include project statistics
   * @returns {Promise<object>} Enhanced projects data
   */
  async getTeamProjects(teamId, options = {}) {
    this._validateTeamId(teamId);

    try {
      this.logger.debug('Fetching team projects', { teamId, options });

      const response = await this.client.getTeamProjects(teamId);
      
      if (!response || !response.projects) {
        throw new ValidationError('Invalid response structure', 'response.projects', response);
      }

      const projects = response.projects.map(project => this._enrichProjectData(project));

      // Add statistics if requested
      if (options.includeStats) {
        for (const project of projects) {
          try {
            const stats = await this.getProjectStatistics(project.id);
            project.statistics = stats;
          } catch (error) {
            this.logger.warn('Failed to fetch project statistics', {
              projectId: project.id,
              error: error.message
            });
            project.statistics = null;
          }
        }
      }

      return {
        team: {
          id: teamId,
          name: response.name
        },
        projects,
        totalCount: projects.length,
        metadata: {
          fetchedAt: new Date().toISOString(),
          includeStats: options.includeStats
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch team projects', {
        teamId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all files in a project with metadata
   * @param {string} projectId - Project ID
   * @param {object} [options={}] - Options
   * @param {boolean} [options.branchData=false] - Include branch metadata
   * @param {boolean} [options.sortByModified=true] - Sort by last modified date
   * @returns {Promise<object>} Enhanced project files data
   */
  async getProjectFiles(projectId, options = {}) {
    this._validateProjectId(projectId);

    try {
      this.logger.debug('Fetching project files', { projectId, options });

      const response = await this.client.getProjectFiles(projectId, {
        branchData: options.branchData
      });

      if (!response || !response.files) {
        throw new ValidationError('Invalid response structure', 'response.files', response);
      }

      let files = response.files.map(file => this._enrichFileData(file));

      // Sort by modification date if requested
      if (options.sortByModified !== false) {
        files = files.sort((a, b) => 
          new Date(b.lastModified) - new Date(a.lastModified)
        );
      }

      return {
        project: {
          id: projectId,
          name: response.name
        },
        files,
        totalCount: files.length,
        metadata: {
          fetchedAt: new Date().toISOString(),
          branchData: options.branchData,
          sortByModified: options.sortByModified !== false
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch project files', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get projects with their files included
   * @param {string} teamId - Team ID
   * @param {object} [options={}] - Options
   * @param {number} [options.maxConcurrency=5] - Max concurrent file requests
   * @param {boolean} [options.includeEmptyProjects=true] - Include projects with no files
   * @returns {Promise<object>} Projects with files
   */
  async getProjectsWithFiles(teamId, options = {}) {
    this._validateTeamId(teamId);

    const maxConcurrency = options.maxConcurrency || this.config.maxConcurrentRequests;
    const includeEmptyProjects = options.includeEmptyProjects !== false;

    try {
      this.logger.debug('Fetching projects with files', { teamId, options });

      // Get all projects first
      const projectsResponse = await this.getTeamProjects(teamId);
      const projects = projectsResponse.projects;

      // Fetch files for each project with concurrency control
      const projectsWithFiles = await this._processConcurrently(
        projects,
        async (project) => {
          try {
            const filesResponse = await this.getProjectFiles(project.id);
            return {
              ...project,
              files: filesResponse.files,
              fileCount: filesResponse.totalCount
            };
          } catch (error) {
            this.logger.warn('Failed to fetch files for project', {
              projectId: project.id,
              error: error.message
            });
            return {
              ...project,
              files: [],
              fileCount: 0,
              error: error.message
            };
          }
        },
        maxConcurrency
      );

      // Filter out empty projects if requested
      const filteredProjects = includeEmptyProjects 
        ? projectsWithFiles 
        : projectsWithFiles.filter(project => project.fileCount > 0);

      return {
        team: projectsResponse.team,
        projects: filteredProjects,
        totalProjects: filteredProjects.length,
        totalFiles: filteredProjects.reduce((sum, project) => sum + project.fileCount, 0),
        metadata: {
          fetchedAt: new Date().toISOString(),
          maxConcurrency,
          includeEmptyProjects
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch projects with files', {
        teamId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search projects by name or description
   * @param {string} teamId - Team ID
   * @param {string} query - Search query
   * @param {object} [options={}] - Search options
   * @param {boolean} [options.caseSensitive=false] - Case sensitive search
   * @param {boolean} [options.exactMatch=false] - Exact match only
   * @returns {Promise<object>} Search results
   */
  async searchProjects(teamId, query, options = {}) {
    this._validateTeamId(teamId);
    this._validateSearchQuery(query);

    try {
      this.logger.debug('Searching projects', { teamId, query, options });

      const projectsResponse = await this.getTeamProjects(teamId);
      const searchTerm = options.caseSensitive ? query : query.toLowerCase();

      const matchingProjects = projectsResponse.projects.filter(project => {
        const projectName = options.caseSensitive ? project.name : project.name.toLowerCase();
        
        if (options.exactMatch) {
          return projectName === searchTerm;
        }
        
        return projectName.includes(searchTerm);
      });

      return {
        team: projectsResponse.team,
        query: {
          term: query,
          caseSensitive: options.caseSensitive,
          exactMatch: options.exactMatch
        },
        results: matchingProjects,
        totalMatches: matchingProjects.length,
        totalProjects: projectsResponse.totalCount,
        metadata: {
          searchedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to search projects', {
        teamId,
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get project statistics
   * @param {string} projectId - Project ID
   * @returns {Promise<object>} Project statistics
   */
  async getProjectStatistics(projectId) {
    this._validateProjectId(projectId);

    try {
      this.logger.debug('Calculating project statistics', { projectId });

      const filesResponse = await this.getProjectFiles(projectId);
      const files = filesResponse.files;

      if (files.length === 0) {
        return {
          projectId,
          fileCount: 0,
          totalSize: 0,
          averageSize: 0,
          lastModified: null,
          oldestFile: null,
          newestFile: null,
          fileTypes: {},
          activitySummary: {
            lastWeek: 0,
            lastMonth: 0,
            lastYear: 0
          }
        };
      }

      // Calculate basic statistics
      const sortedByDate = [...files].sort((a, b) => 
        new Date(a.lastModified) - new Date(b.lastModified)
      );

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const activitySummary = {
        lastWeek: files.filter(f => new Date(f.lastModified) >= oneWeekAgo).length,
        lastMonth: files.filter(f => new Date(f.lastModified) >= oneMonthAgo).length,
        lastYear: files.filter(f => new Date(f.lastModified) >= oneYearAgo).length
      };

      return {
        projectId,
        projectName: filesResponse.project.name,
        fileCount: files.length,
        lastModified: sortedByDate[sortedByDate.length - 1].lastModified,
        oldestFile: {
          name: sortedByDate[0].name,
          lastModified: sortedByDate[0].lastModified
        },
        newestFile: {
          name: sortedByDate[sortedByDate.length - 1].name,
          lastModified: sortedByDate[sortedByDate.length - 1].lastModified
        },
        activitySummary,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to calculate project statistics', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Batch get multiple projects
   * @param {string[]} projectIds - Array of project IDs
   * @param {object} [options={}] - Options
   * @param {number} [options.maxConcurrency=5] - Max concurrent requests
   * @returns {Promise<object[]>} Array of project data
   */
  async batchGetProjects(projectIds, options = {}) {
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      throw new ValidationError('Project IDs must be a non-empty array', 'projectIds', projectIds);
    }

    const maxConcurrency = options.maxConcurrency || this.config.maxConcurrentRequests;

    try {
      this.logger.debug('Batch fetching projects', { 
        projectCount: projectIds.length, 
        maxConcurrency 
      });

      const results = await this._processConcurrently(
        projectIds,
        async (projectId) => {
          try {
            return await this.getProjectFiles(projectId);
          } catch (error) {
            this.logger.warn('Failed to fetch project in batch', {
              projectId,
              error: error.message
            });
            return {
              projectId,
              error: error.message,
              success: false
            };
          }
        },
        maxConcurrency
      );

      const successful = results.filter(result => !result.error);
      const failed = results.filter(result => result.error);

      return {
        results,
        summary: {
          total: projectIds.length,
          successful: successful.length,
          failed: failed.length,
          successRate: successful.length / projectIds.length
        },
        metadata: {
          fetchedAt: new Date().toISOString(),
          maxConcurrency
        }
      };

    } catch (error) {
      this.logger.error('Failed to batch fetch projects', {
        projectIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find file by name in a project
   * @param {string} projectId - Project ID
   * @param {string} fileName - File name to search for
   * @param {object} [options={}] - Search options
   * @param {boolean} [options.caseSensitive=false] - Case sensitive search
   * @param {boolean} [options.exactMatch=true] - Exact match only
   * @returns {Promise<object|null>} File data or null if not found
   */
  async findFileByName(projectId, fileName, options = {}) {
    this._validateProjectId(projectId);
    this._validateFileName(fileName);

    try {
      this.logger.debug('Finding file by name', { projectId, fileName, options });

      const filesResponse = await this.getProjectFiles(projectId);
      const searchTerm = options.caseSensitive ? fileName : fileName.toLowerCase();

      const matchingFile = filesResponse.files.find(file => {
        const fileNameToSearch = options.caseSensitive ? file.name : file.name.toLowerCase();
        
        if (options.exactMatch !== false) {
          return fileNameToSearch === searchTerm;
        }
        
        return fileNameToSearch.includes(searchTerm);
      });

      if (!matchingFile) {
        throw new NotFoundError('File', fileName, { projectId });
      }

      return {
        ...matchingFile,
        project: filesResponse.project,
        searchCriteria: {
          fileName,
          caseSensitive: options.caseSensitive,
          exactMatch: options.exactMatch !== false
        }
      };

    } catch (error) {
      this.logger.error('Failed to find file by name', {
        projectId,
        fileName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recently modified files across projects
   * @param {string} teamId - Team ID
   * @param {number} [limit=10] - Maximum number of files to return
   * @param {number} [daysBack=7] - Number of days to look back
   * @returns {Promise<object>} Recent files data
   */
  async getRecentFiles(teamId, limit = 10, daysBack = 7) {
    this._validateTeamId(teamId);

    try {
      this.logger.debug('Fetching recent files', { teamId, limit, daysBack });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const projectsWithFiles = await this.getProjectsWithFiles(teamId);
      
      // Flatten all files and add project context
      const allFiles = projectsWithFiles.projects.flatMap(project =>
        project.files.map(file => ({
          ...file,
          projectId: project.id,
          projectName: project.name
        }))
      );

      // Filter by date and sort by modification time
      const recentFiles = allFiles
        .filter(file => new Date(file.lastModified) >= cutoffDate)
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, limit);

      return {
        team: projectsWithFiles.team,
        files: recentFiles,
        criteria: {
          limit,
          daysBack,
          cutoffDate: cutoffDate.toISOString()
        },
        totalFound: recentFiles.length,
        metadata: {
          fetchedAt: new Date().toISOString(),
          totalProjectsScanned: projectsWithFiles.totalProjects,
          totalFilesScanned: projectsWithFiles.totalFiles
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch recent files', {
        teamId,
        limit,
        daysBack,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Export project structure as structured data
   * @param {string} teamId - Team ID
   * @param {string} [format='json'] - Export format (json, csv)
   * @returns {Promise<string>} Exported data
   */
  async exportProjectStructure(teamId, format = 'json') {
    this._validateTeamId(teamId);

    if (!['json', 'csv'].includes(format)) {
      throw new ValidationError('Format must be json or csv', 'format', format);
    }

    try {
      this.logger.debug('Exporting project structure', { teamId, format });

      const projectsWithFiles = await this.getProjectsWithFiles(teamId);

      if (format === 'json') {
        return JSON.stringify(projectsWithFiles, null, 2);
      }

      // CSV format
      const rows = [];
      
      // Header
      rows.push([
        'Team Name',
        'Project ID',
        'Project Name',
        'File Key',
        'File Name',
        'Last Modified',
        'Thumbnail URL'
      ]);

      // Data rows
      for (const project of projectsWithFiles.projects) {
        for (const file of project.files) {
          rows.push([
            projectsWithFiles.team.name,
            project.id,
            project.name,
            file.key,
            file.name,
            file.lastModified,
            file.thumbnailUrl || ''
          ]);
        }
      }

      return rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

    } catch (error) {
      this.logger.error('Failed to export project structure', {
        teamId,
        format,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Enrich project data with computed fields
   * @private
   */
  _enrichProjectData(project) {
    return {
      ...project,
      enriched: {
        createdAt: project.created_at || null,
        updatedAt: project.updated_at || null,
        slug: this._createSlug(project.name)
      }
    };
  }

  /**
   * Enrich file data with computed fields
   * @private
   */
  _enrichFileData(file) {
    const lastModified = new Date(file.last_modified);
    const now = new Date();
    const daysSinceModified = Math.floor((now - lastModified) / (1000 * 60 * 60 * 24));

    return {
      ...file,
      lastModified: file.last_modified,
      thumbnailUrl: file.thumbnail_url,
      enriched: {
        daysSinceModified,
        isRecent: daysSinceModified <= 7,
        slug: this._createSlug(file.name),
        extension: this._getFileExtension(file.name)
      }
    };
  }

  /**
   * Process items concurrently with limit
   * @private
   */
  async _processConcurrently(items, processor, maxConcurrency) {
    const results = [];
    
    for (let i = 0; i < items.length; i += maxConcurrency) {
      const batch = items.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(processor);
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Create URL-friendly slug from text
   * @private
   */
  _createSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get file extension from filename
   * @private
   */
  _getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Validation helpers
   * @private
   */
  _validateTeamId(teamId) {
    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
      throw new ValidationError('Team ID is required and must be a non-empty string', 'teamId', teamId);
    }
  }

  _validateProjectId(projectId) {
    if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw new ValidationError('Project ID is required and must be a non-empty string', 'projectId', projectId);
    }
  }

  _validateSearchQuery(query) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new ValidationError('Search query is required and must be a non-empty string', 'query', query);
    }
  }

  _validateFileName(fileName) {
    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      throw new ValidationError('File name is required and must be a non-empty string', 'fileName', fileName);
    }
  }
}

export default FigmaProjectsService;