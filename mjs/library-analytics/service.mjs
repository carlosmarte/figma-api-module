/**
 * Service layer for figma-library-analytics
 * Contains business logic and orchestration for library analytics operations
 */

import { 
  LibraryAnalyticsError, 
  LibraryAnalyticsValidationError,
  LibraryAnalyticsAuthError 
} from './client.mjs';

/**
 * Service layer for Figma Library Analytics
 * Provides high-level business operations and data aggregation
 */
export class FigmaLibraryAnalyticsService {
  constructor({ client, validator = null, logger = console, cache = null } = {}) {
    if (!client) {
      throw new LibraryAnalyticsError('Client is required for service', 'MISSING_CLIENT');
    }
    
    this.client = client;
    this.validator = validator;
    this.logger = logger;
    this.cache = cache;
    this._initializeDefaults();
  }

  _initializeDefaults() {
    this.cacheConfig = {
      ttl: 10 * 60 * 1000, // 10 minutes for analytics data
      maxSize: 50
    };
    
    this.aggregationConfig = {
      maxConcurrency: 3,
      batchSize: 100
    };

    // Default date ranges for analytics
    this.defaultDateRanges = {
      lastWeek: () => {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        };
      },
      lastMonth: () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        };
      },
      lastQuarter: () => {
        const end = new Date();
        const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        };
      }
    };
  }

  // === Component Analytics Business Logic ===

  /**
   * Get component adoption metrics
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} [options.period='lastMonth'] - Time period ('lastWeek', 'lastMonth', 'lastQuarter')
   * @param {boolean} [options.includeUsage=true] - Include usage data
   * @returns {Promise<Object>} - Component adoption analytics
   */
  async getComponentAdoption(fileKey, options = {}) {
    const { period = 'lastMonth', includeUsage = true } = options;
    const dateRange = this.defaultDateRanges[period]?.() || this.defaultDateRanges.lastMonth();

    try {
      // Get component actions grouped by component
      const actionsPromise = this.client.getAll(
        this.client.getComponentActions.bind(this.client),
        fileKey,
        {
          groupBy: 'component',
          ...dateRange
        }
      );

      let usagesPromise = null;
      if (includeUsage) {
        // Get component usages grouped by component
        usagesPromise = this.client.getAll(
          this.client.getComponentUsages.bind(this.client),
          fileKey,
          { groupBy: 'component' }
        );
      }

      const [actions, usages] = await Promise.all([
        actionsPromise,
        usagesPromise
      ]);

      return this._aggregateComponentMetrics(actions, usages, { period, dateRange });

    } catch (error) {
      this.logger.error('Failed to get component adoption metrics', error);
      throw error;
    }
  }

  /**
   * Get component performance leaderboard
   * @param {string} fileKey - Library file key
   * @param {Object} options - Options
   * @param {number} [options.limit=10] - Number of top components to return
   * @param {string} [options.sortBy='total_usage'] - Sort criteria
   * @returns {Promise<Array>} - Top performing components
   */
  async getComponentLeaderboard(fileKey, options = {}) {
    const { limit = 10, sortBy = 'total_usage' } = options;

    try {
      const usages = await this.client.getAll(
        this.client.getComponentUsages.bind(this.client),
        fileKey,
        { groupBy: 'component' }
      );

      return this._createLeaderboard(usages, { limit, sortBy, type: 'component' });

    } catch (error) {
      this.logger.error('Failed to get component leaderboard', error);
      throw error;
    }
  }

  /**
   * Get team engagement with components
   * @param {string} fileKey - Library file key
   * @param {Object} options - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @returns {Promise<Object>} - Team engagement metrics
   */
  async getComponentTeamEngagement(fileKey, options = {}) {
    const { period = 'lastMonth' } = options;
    const dateRange = this.defaultDateRanges[period]?.() || this.defaultDateRanges.lastMonth();

    try {
      const teamActions = await this.client.getAll(
        this.client.getComponentActions.bind(this.client),
        fileKey,
        {
          groupBy: 'team',
          ...dateRange
        }
      );

      return this._aggregateTeamEngagement(teamActions, { type: 'component', period, dateRange });

    } catch (error) {
      this.logger.error('Failed to get component team engagement', error);
      throw error;
    }
  }

  // === Style Analytics Business Logic ===

  /**
   * Get style adoption metrics
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} [options.period='lastMonth'] - Time period
   * @param {boolean} [options.includeUsage=true] - Include usage data
   * @returns {Promise<Object>} - Style adoption analytics
   */
  async getStyleAdoption(fileKey, options = {}) {
    const { period = 'lastMonth', includeUsage = true } = options;
    const dateRange = this.defaultDateRanges[period]?.() || this.defaultDateRanges.lastMonth();

    try {
      const actionsPromise = this.client.getAll(
        this.client.getStyleActions.bind(this.client),
        fileKey,
        {
          groupBy: 'style',
          ...dateRange
        }
      );

      let usagesPromise = null;
      if (includeUsage) {
        usagesPromise = this.client.getAll(
          this.client.getStyleUsages.bind(this.client),
          fileKey,
          { groupBy: 'style' }
        );
      }

      const [actions, usages] = await Promise.all([
        actionsPromise,
        usagesPromise
      ]);

      return this._aggregateStyleMetrics(actions, usages, { period, dateRange });

    } catch (error) {
      this.logger.error('Failed to get style adoption metrics', error);
      throw error;
    }
  }

  /**
   * Get style performance leaderboard
   * @param {string} fileKey - Library file key
   * @param {Object} options - Options
   * @param {number} [options.limit=10] - Number of top styles to return
   * @param {string} [options.sortBy='total_usage'] - Sort criteria
   * @returns {Promise<Array>} - Top performing styles
   */
  async getStyleLeaderboard(fileKey, options = {}) {
    const { limit = 10, sortBy = 'total_usage' } = options;

    try {
      const usages = await this.client.getAll(
        this.client.getStyleUsages.bind(this.client),
        fileKey,
        { groupBy: 'style' }
      );

      return this._createLeaderboard(usages, { limit, sortBy, type: 'style' });

    } catch (error) {
      this.logger.error('Failed to get style leaderboard', error);
      throw error;
    }
  }

  // === Variable Analytics Business Logic ===

  /**
   * Get variable adoption metrics
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} [options.period='lastMonth'] - Time period
   * @param {boolean} [options.includeUsage=true] - Include usage data
   * @returns {Promise<Object>} - Variable adoption analytics
   */
  async getVariableAdoption(fileKey, options = {}) {
    const { period = 'lastMonth', includeUsage = true } = options;
    const dateRange = this.defaultDateRanges[period]?.() || this.defaultDateRanges.lastMonth();

    try {
      const actionsPromise = this.client.getAll(
        this.client.getVariableActions.bind(this.client),
        fileKey,
        {
          groupBy: 'variable',
          ...dateRange
        }
      );

      let usagesPromise = null;
      if (includeUsage) {
        usagesPromise = this.client.getAll(
          this.client.getVariableUsages.bind(this.client),
          fileKey,
          { groupBy: 'variable' }
        );
      }

      const [actions, usages] = await Promise.all([
        actionsPromise,
        usagesPromise
      ]);

      return this._aggregateVariableMetrics(actions, usages, { period, dateRange });

    } catch (error) {
      this.logger.error('Failed to get variable adoption metrics', error);
      throw error;
    }
  }

  // === Comprehensive Library Analytics ===

  /**
   * Get comprehensive library health report
   * @param {string} fileKey - Library file key
   * @param {Object} options - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @returns {Promise<Object>} - Complete library health metrics
   */
  async getLibraryHealthReport(fileKey, options = {}) {
    const { period = 'lastMonth' } = options;

    try {
      const [componentMetrics, styleMetrics, variableMetrics] = await Promise.all([
        this.getComponentAdoption(fileKey, { period }),
        this.getStyleAdoption(fileKey, { period }),
        this.getVariableAdoption(fileKey, { period })
      ]);

      return {
        fileKey,
        period,
        generatedAt: new Date().toISOString(),
        summary: this._generateHealthSummary(componentMetrics, styleMetrics, variableMetrics),
        components: componentMetrics,
        styles: styleMetrics,
        variables: variableMetrics,
        recommendations: this._generateRecommendations(componentMetrics, styleMetrics, variableMetrics)
      };

    } catch (error) {
      this.logger.error('Failed to generate library health report', error);
      throw error;
    }
  }

  /**
   * Get library adoption trends over time
   * @param {string} fileKey - Library file key
   * @param {Object} options - Options
   * @param {Array<string>} [options.periods=['lastWeek', 'lastMonth']] - Time periods to compare
   * @returns {Promise<Object>} - Adoption trends
   */
  async getLibraryTrends(fileKey, options = {}) {
    const { periods = ['lastWeek', 'lastMonth'] } = options;

    try {
      const trends = {};

      for (const period of periods) {
        const [componentMetrics, styleMetrics, variableMetrics] = await Promise.all([
          this.getComponentAdoption(fileKey, { period, includeUsage: false }),
          this.getStyleAdoption(fileKey, { period, includeUsage: false }),
          this.getVariableAdoption(fileKey, { period, includeUsage: false })
        ]);

        trends[period] = {
          components: this._extractTrendMetrics(componentMetrics),
          styles: this._extractTrendMetrics(styleMetrics),
          variables: this._extractTrendMetrics(variableMetrics)
        };
      }

      return {
        fileKey,
        trends,
        comparison: this._calculateTrendComparisons(trends),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get library trends', error);
      throw error;
    }
  }

  // === Private Helper Methods ===

  _aggregateComponentMetrics(actions, usages, context) {
    const metrics = {
      totalComponents: 0,
      activeComponents: 0,
      totalActions: 0,
      totalUsages: 0,
      avgActionsPerComponent: 0,
      avgUsagesPerComponent: 0,
      topComponents: [],
      period: context.period,
      dateRange: context.dateRange
    };

    if (actions && actions.length > 0) {
      metrics.totalComponents = actions.length;
      metrics.totalActions = actions.reduce((sum, item) => sum + (item.action_count || 0), 0);
      metrics.activeComponents = actions.filter(item => (item.action_count || 0) > 0).length;
      metrics.avgActionsPerComponent = metrics.totalActions / metrics.totalComponents;
    }

    if (usages && usages.length > 0) {
      metrics.totalUsages = usages.reduce((sum, item) => sum + (item.usage_count || 0), 0);
      metrics.avgUsagesPerComponent = metrics.totalUsages / usages.length;
      metrics.topComponents = usages
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 10);
    }

    return metrics;
  }

  _aggregateStyleMetrics(actions, usages, context) {
    const metrics = {
      totalStyles: 0,
      activeStyles: 0,
      totalActions: 0,
      totalUsages: 0,
      avgActionsPerStyle: 0,
      avgUsagesPerStyle: 0,
      topStyles: [],
      period: context.period,
      dateRange: context.dateRange
    };

    if (actions && actions.length > 0) {
      metrics.totalStyles = actions.length;
      metrics.totalActions = actions.reduce((sum, item) => sum + (item.action_count || 0), 0);
      metrics.activeStyles = actions.filter(item => (item.action_count || 0) > 0).length;
      metrics.avgActionsPerStyle = metrics.totalActions / metrics.totalStyles;
    }

    if (usages && usages.length > 0) {
      metrics.totalUsages = usages.reduce((sum, item) => sum + (item.usage_count || 0), 0);
      metrics.avgUsagesPerStyle = metrics.totalUsages / usages.length;
      metrics.topStyles = usages
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 10);
    }

    return metrics;
  }

  _aggregateVariableMetrics(actions, usages, context) {
    const metrics = {
      totalVariables: 0,
      activeVariables: 0,
      totalActions: 0,
      totalUsages: 0,
      avgActionsPerVariable: 0,
      avgUsagesPerVariable: 0,
      topVariables: [],
      period: context.period,
      dateRange: context.dateRange
    };

    if (actions && actions.length > 0) {
      metrics.totalVariables = actions.length;
      metrics.totalActions = actions.reduce((sum, item) => sum + (item.action_count || 0), 0);
      metrics.activeVariables = actions.filter(item => (item.action_count || 0) > 0).length;
      metrics.avgActionsPerVariable = metrics.totalActions / metrics.totalVariables;
    }

    if (usages && usages.length > 0) {
      metrics.totalUsages = usages.reduce((sum, item) => sum + (item.usage_count || 0), 0);
      metrics.avgUsagesPerVariable = metrics.totalUsages / usages.length;
      metrics.topVariables = usages
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 10);
    }

    return metrics;
  }

  _aggregateTeamEngagement(teamActions, context) {
    const engagement = {
      totalTeams: teamActions.length,
      activeTeams: teamActions.filter(team => (team.action_count || 0) > 0).length,
      totalEngagement: teamActions.reduce((sum, team) => sum + (team.action_count || 0), 0),
      topTeams: teamActions
        .sort((a, b) => (b.action_count || 0) - (a.action_count || 0))
        .slice(0, 10),
      engagementRate: 0,
      period: context.period,
      dateRange: context.dateRange,
      type: context.type
    };

    engagement.engagementRate = engagement.totalTeams > 0 
      ? engagement.activeTeams / engagement.totalTeams 
      : 0;

    return engagement;
  }

  _createLeaderboard(data, options) {
    const { limit, sortBy, type } = options;
    const sortField = sortBy === 'total_usage' ? 'usage_count' : sortBy;

    return data
      .sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
        type
      }));
  }

  _generateHealthSummary(componentMetrics, styleMetrics, variableMetrics) {
    const totalAssets = (componentMetrics.totalComponents || 0) + 
                       (styleMetrics.totalStyles || 0) + 
                       (variableMetrics.totalVariables || 0);

    const totalUsages = (componentMetrics.totalUsages || 0) + 
                       (styleMetrics.totalUsages || 0) + 
                       (variableMetrics.totalUsages || 0);

    const activeAssets = (componentMetrics.activeComponents || 0) + 
                        (styleMetrics.activeStyles || 0) + 
                        (variableMetrics.activeVariables || 0);

    return {
      totalAssets,
      activeAssets,
      totalUsages,
      adoptionRate: totalAssets > 0 ? activeAssets / totalAssets : 0,
      healthScore: this._calculateHealthScore(componentMetrics, styleMetrics, variableMetrics)
    };
  }

  _calculateHealthScore(componentMetrics, styleMetrics, variableMetrics) {
    // Simple health score based on adoption rates and usage
    const componentScore = componentMetrics.totalComponents > 0 
      ? (componentMetrics.activeComponents / componentMetrics.totalComponents) * 100 
      : 0;

    const styleScore = styleMetrics.totalStyles > 0 
      ? (styleMetrics.activeStyles / styleMetrics.totalStyles) * 100 
      : 0;

    const variableScore = variableMetrics.totalVariables > 0 
      ? (variableMetrics.activeVariables / variableMetrics.totalVariables) * 100 
      : 0;

    return Math.round((componentScore + styleScore + variableScore) / 3);
  }

  _generateRecommendations(componentMetrics, styleMetrics, variableMetrics) {
    const recommendations = [];

    // Component recommendations
    if (componentMetrics.totalComponents > 0 && componentMetrics.activeComponents / componentMetrics.totalComponents < 0.5) {
      recommendations.push({
        type: 'component',
        priority: 'high',
        message: 'Low component adoption rate. Consider reviewing unused components or improving documentation.',
        metric: 'adoption_rate',
        value: componentMetrics.activeComponents / componentMetrics.totalComponents
      });
    }

    // Style recommendations
    if (styleMetrics.totalStyles > 0 && styleMetrics.activeStyles / styleMetrics.totalStyles < 0.3) {
      recommendations.push({
        type: 'style',
        priority: 'medium',
        message: 'Many styles are unused. Consider consolidating or removing redundant styles.',
        metric: 'adoption_rate',
        value: styleMetrics.activeStyles / styleMetrics.totalStyles
      });
    }

    // Variable recommendations
    if (variableMetrics.totalVariables > 0 && variableMetrics.activeVariables / variableMetrics.totalVariables < 0.7) {
      recommendations.push({
        type: 'variable',
        priority: 'medium',
        message: 'Variable adoption could be improved. Consider promoting variable usage in design guidelines.',
        metric: 'adoption_rate',
        value: variableMetrics.activeVariables / variableMetrics.totalVariables
      });
    }

    return recommendations;
  }

  _extractTrendMetrics(metrics) {
    return {
      total: metrics.totalComponents || metrics.totalStyles || metrics.totalVariables || 0,
      active: metrics.activeComponents || metrics.activeStyles || metrics.activeVariables || 0,
      actions: metrics.totalActions || 0,
      usages: metrics.totalUsages || 0
    };
  }

  _calculateTrendComparisons(trends) {
    const periods = Object.keys(trends);
    if (periods.length < 2) return {};

    // First period is most recent (current), second is older (previous)
    const [current, previous] = periods;
    const comparison = {};

    ['components', 'styles', 'variables'].forEach(type => {
      if (trends[current][type] && trends[previous][type]) {
        const currentData = trends[current][type];
        const previousData = trends[previous][type];

        comparison[type] = {
          totalChange: this._calculatePercentageChange(previousData.total, currentData.total),
          activeChange: this._calculatePercentageChange(previousData.active, currentData.active),
          actionsChange: this._calculatePercentageChange(previousData.actions, currentData.actions),
          usagesChange: this._calculatePercentageChange(previousData.usages, currentData.usages)
        };
      }
    });

    return comparison;
  }

  _calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }
}

export default FigmaLibraryAnalyticsService;