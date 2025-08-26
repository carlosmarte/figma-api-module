/**
 * Unit tests for FigmaProjectsService
 */

import { jest } from '@jest/globals';
import { FigmaProjectsService } from '../../src/core/service.mjs';
import {
  ValidationError,
  NotFoundError
} from '../../src/core/exceptions.mjs';

describe('FigmaProjectsService', () => {
  let mockClient;
  let service;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockClient = {
      getTeamProjects: jest.fn(),
      getProjectFiles: jest.fn()
    };

    service = new FigmaProjectsService({
      client: mockClient,
      logger: mockLogger
    });
  });

  describe('constructor', () => {
    it('should create service with valid client', () => {
      expect(service.client).toBe(mockClient);
      expect(service.logger).toBe(mockLogger);
    });

    it('should throw ValidationError without client', () => {
      expect(() => {
        new FigmaProjectsService({});
      }).toThrow(ValidationError);
    });

    it('should use console as default logger', () => {
      const serviceWithoutLogger = new FigmaProjectsService({
        client: mockClient
      });

      expect(serviceWithoutLogger.logger).toBe(console);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        maxConcurrentRequests: 10,
        defaultPageSize: 50
      };

      const customService = new FigmaProjectsService({
        client: mockClient,
        logger: mockLogger,
        config: customConfig
      });

      expect(customService.config.maxConcurrentRequests).toBe(10);
      expect(customService.config.defaultPageSize).toBe(50);
    });
  });

  describe('getTeamProjects', () => {
    const mockTeamResponse = {
      name: 'Test Team',
      projects: [
        { id: 'proj1', name: 'Project 1' },
        { id: 'proj2', name: 'Project 2' }
      ]
    };

    beforeEach(() => {
      mockClient.getTeamProjects.mockResolvedValue(mockTeamResponse);
    });

    it('should validate teamId parameter', async () => {
      await expect(service.getTeamProjects(''))
        .rejects.toThrow(ValidationError);

      await expect(service.getTeamProjects(null))
        .rejects.toThrow(ValidationError);
    });

    it('should fetch and enrich team projects', async () => {
      const result = await service.getTeamProjects('team123');

      expect(mockClient.getTeamProjects).toHaveBeenCalledWith('team123');
      expect(result).toHaveProperty('team');
      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('metadata');

      expect(result.team.id).toBe('team123');
      expect(result.team.name).toBe('Test Team');
      expect(result.totalCount).toBe(2);
      expect(result.projects).toHaveLength(2);

      // Check enrichment
      expect(result.projects[0]).toHaveProperty('enriched');
      expect(result.projects[0].enriched).toHaveProperty('slug');
    });

    it('should include statistics when requested', async () => {
      const mockStatsResponse = {
        projectId: 'proj1',
        fileCount: 5,
        lastModified: '2023-01-01T00:00:00Z'
      };

      // Mock getProjectStatistics to avoid infinite recursion
      service.getProjectStatistics = jest.fn().mockResolvedValue(mockStatsResponse);

      const result = await service.getTeamProjects('team123', { includeStats: true });

      expect(result.projects[0]).toHaveProperty('statistics');
      expect(result.projects[0].statistics).toEqual(mockStatsResponse);
    });

    it('should handle statistics fetch errors gracefully', async () => {
      service.getProjectStatistics = jest.fn().mockRejectedValue(new Error('Stats error'));

      const result = await service.getTeamProjects('team123', { includeStats: true });

      expect(result.projects[0].statistics).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should throw error for invalid response structure', async () => {
      mockClient.getTeamProjects.mockResolvedValue({ invalid: 'response' });

      await expect(service.getTeamProjects('team123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getProjectFiles', () => {
    const mockFilesResponse = {
      name: 'Test Project',
      files: [
        {
          key: 'file1',
          name: 'Design 1.fig',
          last_modified: '2023-01-01T00:00:00Z',
          thumbnail_url: 'https://example.com/thumb1.png'
        },
        {
          key: 'file2',
          name: 'Design 2.fig',
          last_modified: '2023-01-02T00:00:00Z',
          thumbnail_url: 'https://example.com/thumb2.png'
        }
      ]
    };

    beforeEach(() => {
      mockClient.getProjectFiles.mockResolvedValue(mockFilesResponse);
    });

    it('should validate projectId parameter', async () => {
      await expect(service.getProjectFiles(''))
        .rejects.toThrow(ValidationError);

      await expect(service.getProjectFiles(null))
        .rejects.toThrow(ValidationError);
    });

    it('should fetch and enrich project files', async () => {
      const result = await service.getProjectFiles('proj123');

      expect(mockClient.getProjectFiles).toHaveBeenCalledWith('proj123', { branchData: undefined });
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('totalCount');

      expect(result.project.id).toBe('proj123');
      expect(result.project.name).toBe('Test Project');
      expect(result.totalCount).toBe(2);

      // Check enrichment
      expect(result.files[0]).toHaveProperty('enriched');
      expect(result.files[0].enriched).toHaveProperty('daysSinceModified');
      expect(result.files[0].enriched).toHaveProperty('isRecent');
      expect(result.files[0].enriched).toHaveProperty('extension');
      expect(result.files[0].enriched.extension).toBe('fig');
    });

    it('should sort files by modification date', async () => {
      const result = await service.getProjectFiles('proj123');

      // Should be sorted newest first
      expect(new Date(result.files[0].lastModified).getTime())
        .toBeGreaterThan(new Date(result.files[1].lastModified).getTime());
    });

    it('should skip sorting when requested', async () => {
      const result = await service.getProjectFiles('proj123', { sortByModified: false });

      // Should maintain original order
      expect(result.files[0].key).toBe('file1');
      expect(result.files[1].key).toBe('file2');
    });

    it('should pass through branchData option', async () => {
      await service.getProjectFiles('proj123', { branchData: true });

      expect(mockClient.getProjectFiles).toHaveBeenCalledWith('proj123', { branchData: true });
    });
  });

  describe('getProjectsWithFiles', () => {
    const mockTeamResponse = {
      team: { id: 'team123', name: 'Test Team' },
      projects: [
        { id: 'proj1', name: 'Project 1' },
        { id: 'proj2', name: 'Project 2' }
      ],
      totalCount: 2
    };

    const mockFilesResponse1 = {
      files: [{ key: 'file1', name: 'File 1' }],
      totalCount: 1
    };

    const mockFilesResponse2 = {
      files: [{ key: 'file2', name: 'File 2' }, { key: 'file3', name: 'File 3' }],
      totalCount: 2
    };

    beforeEach(() => {
      service.getTeamProjects = jest.fn().mockResolvedValue(mockTeamResponse);
      service.getProjectFiles = jest.fn()
        .mockResolvedValueOnce(mockFilesResponse1)
        .mockResolvedValueOnce(mockFilesResponse2);
    });

    it('should fetch projects with their files', async () => {
      const result = await service.getProjectsWithFiles('team123');

      expect(service.getTeamProjects).toHaveBeenCalledWith('team123');
      expect(service.getProjectFiles).toHaveBeenCalledTimes(2);

      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].files).toEqual(mockFilesResponse1.files);
      expect(result.projects[0].fileCount).toBe(1);
      expect(result.projects[1].files).toEqual(mockFilesResponse2.files);
      expect(result.projects[1].fileCount).toBe(2);

      expect(result.totalFiles).toBe(3);
    });

    it('should handle file fetch errors gracefully', async () => {
      service.getProjectFiles = jest.fn()
        .mockResolvedValueOnce(mockFilesResponse1)
        .mockRejectedValueOnce(new Error('Files error'));

      const result = await service.getProjectsWithFiles('team123');

      expect(result.projects[0].files).toEqual(mockFilesResponse1.files);
      expect(result.projects[1].files).toEqual([]);
      expect(result.projects[1].error).toBe('Files error');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should filter out empty projects when requested', async () => {
      const emptyFilesResponse = { files: [], totalCount: 0 };
      service.getProjectFiles = jest.fn()
        .mockResolvedValueOnce(mockFilesResponse1)
        .mockResolvedValueOnce(emptyFilesResponse);

      const result = await service.getProjectsWithFiles('team123', { includeEmptyProjects: false });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('proj1');
    });
  });

  describe('searchProjects', () => {
    const mockTeamResponse = {
      team: { id: 'team123', name: 'Test Team' },
      projects: [
        { id: 'proj1', name: 'Design System' },
        { id: 'proj2', name: 'Mobile App' },
        { id: 'proj3', name: 'Web Design' }
      ],
      totalCount: 3
    };

    beforeEach(() => {
      service.getTeamProjects = jest.fn().mockResolvedValue(mockTeamResponse);
    });

    it('should validate search parameters', async () => {
      await expect(service.searchProjects('', 'query'))
        .rejects.toThrow(ValidationError);

      await expect(service.searchProjects('team123', ''))
        .rejects.toThrow(ValidationError);
    });

    it('should search projects by name (case insensitive)', async () => {
      const result = await service.searchProjects('team123', 'design');

      expect(result.results).toHaveLength(2);
      expect(result.results[0].name).toBe('Design System');
      expect(result.results[1].name).toBe('Web Design');
      expect(result.totalMatches).toBe(2);
      expect(result.totalProjects).toBe(3);
    });

    it('should search projects with exact match', async () => {
      const result = await service.searchProjects('team123', 'Mobile App', { exactMatch: true });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Mobile App');
    });

    it('should search projects with case sensitivity', async () => {
      const result = await service.searchProjects('team123', 'DESIGN', { caseSensitive: true });

      expect(result.results).toHaveLength(0);
    });

    it('should return empty results for no matches', async () => {
      const result = await service.searchProjects('team123', 'nonexistent');

      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    });
  });

  describe('getProjectStatistics', () => {
    const mockFilesResponse = {
      project: { name: 'Test Project' },
      files: [
        {
          name: 'File 1',
          lastModified: '2023-01-01T00:00:00Z'
        },
        {
          name: 'File 2',
          lastModified: '2023-12-01T00:00:00Z'
        },
        {
          name: 'File 3',
          lastModified: '2023-11-01T00:00:00Z'
        }
      ]
    };

    beforeEach(() => {
      service.getProjectFiles = jest.fn().mockResolvedValue(mockFilesResponse);
    });

    it('should calculate project statistics', async () => {
      const result = await service.getProjectStatistics('proj123');

      expect(result.projectId).toBe('proj123');
      expect(result.projectName).toBe('Test Project');
      expect(result.fileCount).toBe(3);
      expect(result.lastModified).toBe('2023-12-01T00:00:00Z');
      expect(result.oldestFile.name).toBe('File 1');
      expect(result.newestFile.name).toBe('File 2');
      expect(result).toHaveProperty('activitySummary');
    });

    it('should handle empty projects', async () => {
      service.getProjectFiles = jest.fn().mockResolvedValue({
        project: { name: 'Empty Project' },
        files: []
      });

      const result = await service.getProjectStatistics('proj123');

      expect(result.fileCount).toBe(0);
      expect(result.lastModified).toBeNull();
      expect(result.oldestFile).toBeNull();
      expect(result.newestFile).toBeNull();
    });
  });

  describe('findFileByName', () => {
    const mockFilesResponse = {
      project: { id: 'proj123', name: 'Test Project' },
      files: [
        { key: 'file1', name: 'Design.fig' },
        { key: 'file2', name: 'Prototype.fig' },
        { key: 'file3', name: 'design-v2.fig' }
      ]
    };

    beforeEach(() => {
      service.getProjectFiles = jest.fn().mockResolvedValue(mockFilesResponse);
    });

    it('should validate parameters', async () => {
      await expect(service.findFileByName('', 'file'))
        .rejects.toThrow(ValidationError);

      await expect(service.findFileByName('proj123', ''))
        .rejects.toThrow(ValidationError);
    });

    it('should find file by exact name', async () => {
      const result = await service.findFileByName('proj123', 'Design.fig');

      expect(result.name).toBe('Design.fig');
      expect(result.key).toBe('file1');
      expect(result.project).toEqual(mockFilesResponse.project);
    });

    it('should find file with partial match', async () => {
      const result = await service.findFileByName('proj123', 'design', { exactMatch: false });

      expect(result.name).toBe('Design.fig');
    });

    it('should be case insensitive by default', async () => {
      const result = await service.findFileByName('proj123', 'DESIGN.FIG');

      expect(result.name).toBe('Design.fig');
    });

    it('should respect case sensitivity option', async () => {
      await expect(
        service.findFileByName('proj123', 'DESIGN.FIG', { caseSensitive: true })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when file not found', async () => {
      await expect(
        service.findFileByName('proj123', 'nonexistent.fig')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRecentFiles', () => {
    const mockProjectsWithFiles = {
      team: { id: 'team123', name: 'Test Team' },
      projects: [
        {
          id: 'proj1',
          name: 'Project 1',
          files: [
            {
              name: 'Recent File',
              lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
              key: 'recent1'
            }
          ]
        },
        {
          id: 'proj2',
          name: 'Project 2',
          files: [
            {
              name: 'Old File',
              lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
              key: 'old1'
            },
            {
              name: 'Very Recent File',
              lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
              key: 'recent2'
            }
          ]
        }
      ],
      totalProjects: 2,
      totalFiles: 3
    };

    beforeEach(() => {
      service.getProjectsWithFiles = jest.fn().mockResolvedValue(mockProjectsWithFiles);
    });

    it('should get recent files within date range', async () => {
      const result = await service.getRecentFiles('team123', 10, 7);

      expect(result.files).toHaveLength(2); // Only files from last 7 days
      expect(result.files[0].name).toBe('Very Recent File'); // Sorted by recency
      expect(result.files[1].name).toBe('Recent File');
      expect(result.totalFound).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const result = await service.getRecentFiles('team123', 1, 7);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('Very Recent File');
    });

    it('should add project context to files', async () => {
      const result = await service.getRecentFiles('team123', 10, 7);

      expect(result.files[0]).toHaveProperty('projectId');
      expect(result.files[0]).toHaveProperty('projectName');
      expect(result.files[0].projectId).toBe('proj2');
      expect(result.files[0].projectName).toBe('Project 2');
    });
  });

  describe('exportProjectStructure', () => {
    const mockProjectsWithFiles = {
      team: { name: 'Test Team' },
      projects: [
        {
          id: 'proj1',
          name: 'Project 1',
          files: [
            {
              key: 'file1',
              name: 'Design.fig',
              lastModified: '2023-01-01T00:00:00Z',
              thumbnailUrl: 'https://example.com/thumb1.png'
            }
          ]
        }
      ]
    };

    beforeEach(() => {
      service.getProjectsWithFiles = jest.fn().mockResolvedValue(mockProjectsWithFiles);
    });

    it('should export as JSON by default', async () => {
      const result = await service.exportProjectStructure('team123');

      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toEqual(mockProjectsWithFiles);
    });

    it('should export as CSV when requested', async () => {
      const result = await service.exportProjectStructure('team123', 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('"Team Name","Project ID","Project Name"');
      expect(result).toContain('"Test Team","proj1","Project 1"');
    });

    it('should validate format parameter', async () => {
      await expect(service.exportProjectStructure('team123', 'invalid'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('batchGetProjects', () => {
    beforeEach(() => {
      service.getProjectFiles = jest.fn()
        .mockResolvedValueOnce({ project: { id: 'proj1' }, files: [] })
        .mockResolvedValueOnce({ project: { id: 'proj2' }, files: [] })
        .mockRejectedValueOnce(new Error('Project not found'));
    });

    it('should validate projectIds parameter', async () => {
      await expect(service.batchGetProjects([]))
        .rejects.toThrow(ValidationError);

      await expect(service.batchGetProjects('not-array'))
        .rejects.toThrow(ValidationError);
    });

    it('should fetch multiple projects', async () => {
      const result = await service.batchGetProjects(['proj1', 'proj2', 'proj3']);

      expect(result.results).toHaveLength(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.successRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('utility methods', () => {
    it('should create proper slugs', () => {
      const project = { name: 'My Project Name!' };
      const enriched = service._enrichProjectData(project);
      
      expect(enriched.enriched.slug).toBe('my-project-name');
    });

    it('should extract file extensions', () => {
      const file = { 
        name: 'design.fig',
        last_modified: '2023-01-01T00:00:00Z'
      };
      const enriched = service._enrichFileData(file);
      
      expect(enriched.enriched.extension).toBe('fig');
    });

    it('should calculate days since modification', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const file = { 
        name: 'design.fig',
        last_modified: threeDaysAgo
      };
      const enriched = service._enrichFileData(file);
      
      expect(enriched.enriched.daysSinceModified).toBe(3);
      expect(enriched.enriched.isRecent).toBe(true); // Within 7 days
    });
  });
});