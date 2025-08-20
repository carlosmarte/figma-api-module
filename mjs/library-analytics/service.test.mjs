/**
 * Tests for FigmaLibraryAnalyticsService
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import FigmaLibraryAnalyticsService from './service.mjs';
import { LibraryAnalyticsError } from './client.mjs';

describe('FigmaLibraryAnalyticsService', () => {
  let service;
  let mockClient;
  const mockFileKey = 'test-file-key';

  beforeEach(() => {
    mockClient = {
      getAll: jest.fn(),
      getComponentActions: jest.fn(),
      getComponentUsages: jest.fn(),
      getStyleActions: jest.fn(),
      getStyleUsages: jest.fn(),
      getVariableActions: jest.fn(),
      getVariableUsages: jest.fn()
    };

    service = new FigmaLibraryAnalyticsService({
      client: mockClient
    });
  });

  describe('Constructor', () => {
    test('should initialize with client', () => {
      expect(service.client).toBe(mockClient);
    });

    test('should throw error without client', () => {
      expect(() => {
        new FigmaLibraryAnalyticsService({});
      }).toThrow(LibraryAnalyticsError);
    });
  });

  describe('Component Analytics', () => {
    test('should get component adoption metrics', async () => {
      const mockActions = [
        { component_name: 'Button', action_count: 10 },
        { component_name: 'Input', action_count: 5 }
      ];

      const mockUsages = [
        { component_name: 'Button', usage_count: 50 },
        { component_name: 'Input', usage_count: 25 }
      ];

      mockClient.getAll
        .mockResolvedValueOnce(mockActions)
        .mockResolvedValueOnce(mockUsages);

      const result = await service.getComponentAdoption(mockFileKey, {
        period: 'lastMonth'
      });

      expect(result.totalComponents).toBe(2);
      expect(result.totalActions).toBe(15);
      expect(result.totalUsages).toBe(75);
      expect(result.activeComponents).toBe(2);
      expect(result.period).toBe('lastMonth');
    });

    test('should handle empty component data', async () => {
      mockClient.getAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getComponentAdoption(mockFileKey);

      expect(result.totalComponents).toBe(0);
      expect(result.totalActions).toBe(0);
      expect(result.totalUsages).toBe(0);
      expect(result.activeComponents).toBe(0);
    });

    test('should get component leaderboard', async () => {
      const mockUsages = [
        { component_name: 'Button', usage_count: 50 },
        { component_name: 'Input', usage_count: 25 },
        { component_name: 'Card', usage_count: 75 }
      ];

      mockClient.getAll.mockResolvedValueOnce(mockUsages);

      const result = await service.getComponentLeaderboard(mockFileKey, {
        limit: 2
      });

      expect(result).toHaveLength(2);
      expect(result[0].component_name).toBe('Card');
      expect(result[0].rank).toBe(1);
      expect(result[1].component_name).toBe('Button');
      expect(result[1].rank).toBe(2);
    });

    test('should get component team engagement', async () => {
      const mockTeamActions = [
        { team_name: 'Design Team', action_count: 30 },
        { team_name: 'Product Team', action_count: 20 },
        { team_name: 'Engineering Team', action_count: 0 }
      ];

      mockClient.getAll.mockResolvedValueOnce(mockTeamActions);

      const result = await service.getComponentTeamEngagement(mockFileKey);

      expect(result.totalTeams).toBe(3);
      expect(result.activeTeams).toBe(2);
      expect(result.totalEngagement).toBe(50);
      expect(result.engagementRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('Style Analytics', () => {
    test('should get style adoption metrics', async () => {
      const mockActions = [
        { style_name: 'Primary Color', action_count: 8 },
        { style_name: 'Secondary Color', action_count: 3 }
      ];

      const mockUsages = [
        { style_name: 'Primary Color', usage_count: 40 },
        { style_name: 'Secondary Color', usage_count: 15 }
      ];

      mockClient.getAll
        .mockResolvedValueOnce(mockActions)
        .mockResolvedValueOnce(mockUsages);

      const result = await service.getStyleAdoption(mockFileKey);

      expect(result.totalStyles).toBe(2);
      expect(result.totalActions).toBe(11);
      expect(result.totalUsages).toBe(55);
      expect(result.activeStyles).toBe(2);
    });

    test('should get style leaderboard', async () => {
      const mockUsages = [
        { style_name: 'Primary Color', usage_count: 40 },
        { style_name: 'Secondary Color', usage_count: 15 },
        { style_name: 'Accent Color', usage_count: 60 }
      ];

      mockClient.getAll.mockResolvedValueOnce(mockUsages);

      const result = await service.getStyleLeaderboard(mockFileKey, {
        limit: 2
      });

      expect(result).toHaveLength(2);
      expect(result[0].style_name).toBe('Accent Color');
      expect(result[1].style_name).toBe('Primary Color');
    });
  });

  describe('Variable Analytics', () => {
    test('should get variable adoption metrics', async () => {
      const mockActions = [
        { variable_name: 'Primary Token', action_count: 12 },
        { variable_name: 'Secondary Token', action_count: 7 }
      ];

      const mockUsages = [
        { variable_name: 'Primary Token', usage_count: 60 },
        { variable_name: 'Secondary Token', usage_count: 35 }
      ];

      mockClient.getAll
        .mockResolvedValueOnce(mockActions)
        .mockResolvedValueOnce(mockUsages);

      const result = await service.getVariableAdoption(mockFileKey);

      expect(result.totalVariables).toBe(2);
      expect(result.totalActions).toBe(19);
      expect(result.totalUsages).toBe(95);
      expect(result.activeVariables).toBe(2);
    });
  });

  describe('Library Health Report', () => {
    test('should generate comprehensive health report', async () => {
      // Mock component metrics
      const componentMetrics = {
        totalComponents: 10,
        activeComponents: 8,
        totalActions: 50,
        totalUsages: 200
      };

      // Mock style metrics
      const styleMetrics = {
        totalStyles: 5,
        activeStyles: 4,
        totalActions: 20,
        totalUsages: 100
      };

      // Mock variable metrics
      const variableMetrics = {
        totalVariables: 8,
        activeVariables: 6,
        totalActions: 30,
        totalUsages: 150
      };

      service.getComponentAdoption = jest.fn().mockResolvedValueOnce(componentMetrics);
      service.getStyleAdoption = jest.fn().mockResolvedValueOnce(styleMetrics);
      service.getVariableAdoption = jest.fn().mockResolvedValueOnce(variableMetrics);

      const result = await service.getLibraryHealthReport(mockFileKey);

      expect(result.fileKey).toBe(mockFileKey);
      expect(result.summary.totalAssets).toBe(23); // 10 + 5 + 8
      expect(result.summary.activeAssets).toBe(18); // 8 + 4 + 6
      expect(result.summary.totalUsages).toBe(450); // 200 + 100 + 150
      expect(result.summary.adoptionRate).toBeCloseTo(0.783, 2); // 18/23
      expect(result.components).toBe(componentMetrics);
      expect(result.styles).toBe(styleMetrics);
      expect(result.variables).toBe(variableMetrics);
      expect(result.recommendations).toBeDefined();
    });

    test('should generate recommendations for low adoption', async () => {
      const componentMetrics = {
        totalComponents: 10,
        activeComponents: 4, // 40% adoption
        totalActions: 20,
        totalUsages: 80
      };

      const styleMetrics = {
        totalStyles: 10,
        activeStyles: 2, // 20% adoption
        totalActions: 10,
        totalUsages: 40
      };

      const variableMetrics = {
        totalVariables: 10,
        activeVariables: 5, // 50% adoption
        totalActions: 25,
        totalUsages: 100
      };

      service.getComponentAdoption = jest.fn().mockResolvedValueOnce(componentMetrics);
      service.getStyleAdoption = jest.fn().mockResolvedValueOnce(styleMetrics);
      service.getVariableAdoption = jest.fn().mockResolvedValueOnce(variableMetrics);

      const result = await service.getLibraryHealthReport(mockFileKey);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should have recommendations for low component and style adoption
      const componentRec = result.recommendations.find(r => r.type === 'component');
      const styleRec = result.recommendations.find(r => r.type === 'style');

      expect(componentRec).toBeDefined();
      expect(componentRec.priority).toBe('high');
      expect(styleRec).toBeDefined();
      expect(styleRec.priority).toBe('medium');
    });
  });

  describe('Library Trends', () => {
    test('should analyze trends across multiple periods', async () => {
      const lastWeekMetrics = {
        totalComponents: 10,
        activeComponents: 8,
        totalActions: 30,
        totalUsages: 100
      };

      const lastMonthMetrics = {
        totalComponents: 8,
        activeComponents: 6,
        totalActions: 20,
        totalUsages: 80
      };

      service.getComponentAdoption = jest.fn()
        .mockResolvedValueOnce(lastWeekMetrics)
        .mockResolvedValueOnce(lastWeekMetrics) // style adoption
        .mockResolvedValueOnce(lastWeekMetrics) // variable adoption
        .mockResolvedValueOnce(lastMonthMetrics)
        .mockResolvedValueOnce(lastMonthMetrics)
        .mockResolvedValueOnce(lastMonthMetrics);

      service.getStyleAdoption = jest.fn()
        .mockResolvedValue(lastWeekMetrics);

      service.getVariableAdoption = jest.fn()
        .mockResolvedValue(lastWeekMetrics);

      const result = await service.getLibraryTrends(mockFileKey, {
        periods: ['lastWeek', 'lastMonth']
      });

      expect(result.trends.lastWeek).toBeDefined();
      expect(result.trends.lastMonth).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.comparison.components.totalChange).toBe(25); // (10-8)/8 * 100
    });
  });

  describe('Private Helper Methods', () => {
    test('should calculate health score correctly', () => {
      const componentMetrics = { totalComponents: 10, activeComponents: 8 }; // 80%
      const styleMetrics = { totalStyles: 5, activeStyles: 3 }; // 60%
      const variableMetrics = { totalVariables: 10, activeVariables: 7 }; // 70%

      const healthScore = service._calculateHealthScore(componentMetrics, styleMetrics, variableMetrics);
      expect(healthScore).toBe(70); // (80 + 60 + 70) / 3 = 70
    });

    test('should calculate percentage change correctly', () => {
      expect(service._calculatePercentageChange(10, 15)).toBe(50);
      expect(service._calculatePercentageChange(20, 15)).toBe(-25);
      expect(service._calculatePercentageChange(0, 10)).toBe(100);
      expect(service._calculatePercentageChange(10, 10)).toBe(0);
    });

    test('should extract trend metrics correctly', () => {
      const componentMetrics = {
        totalComponents: 10,
        activeComponents: 8,
        totalActions: 30,
        totalUsages: 100
      };

      const trendMetrics = service._extractTrendMetrics(componentMetrics);
      expect(trendMetrics.total).toBe(10);
      expect(trendMetrics.active).toBe(8);
      expect(trendMetrics.actions).toBe(30);
      expect(trendMetrics.usages).toBe(100);
    });

    test('should create leaderboard correctly', () => {
      const data = [
        { name: 'Item A', usage_count: 10 },
        { name: 'Item B', usage_count: 20 },
        { name: 'Item C', usage_count: 15 }
      ];

      const leaderboard = service._createLeaderboard(data, {
        limit: 2,
        sortBy: 'total_usage',
        type: 'test'
      });

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].name).toBe('Item B');
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].name).toBe('Item C');
      expect(leaderboard[1].rank).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle client errors gracefully', async () => {
      mockClient.getAll.mockRejectedValueOnce(new Error('Client error'));

      await expect(service.getComponentAdoption(mockFileKey)).rejects.toThrow('Client error');
    });

    test('should log errors appropriately', async () => {
      const mockLogger = {
        error: jest.fn(),
        debug: jest.fn()
      };

      const serviceWithLogger = new FigmaLibraryAnalyticsService({
        client: mockClient,
        logger: mockLogger
      });

      mockClient.getAll.mockRejectedValueOnce(new Error('Test error'));

      await expect(serviceWithLogger.getComponentAdoption(mockFileKey)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get component adoption metrics',
        expect.any(Error)
      );
    });
  });
});