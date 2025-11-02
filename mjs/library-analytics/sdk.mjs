/**
 * SDK facade for figma-library-analytics
 * Provides ergonomic API for library analytics operations
 */

import FigmaLibraryAnalyticsService from './service.mjs';

/**
 * High-level SDK for Figma Library Analytics API
 * Provides convenient methods for library analytics operations
 *
 * @example
 * import { FigmaApiClient } from '@figma-api/fetch';
 * import { FigmaLibraryAnalyticsSDK } from 'figma-library-analytics';
 *
 * const fetcher = new FigmaApiClient({ apiToken: process.env.FIGMA_TOKEN });
 * const sdk = new FigmaLibraryAnalyticsSDK({ fetcher });
 */
export class FigmaLibraryAnalyticsSDK {
  /**
   * Initialize the Figma Library Analytics SDK
   * @param {Object} config - Configuration object
   * @param {Object} config.fetcher - FigmaApiClient instance (required)
   * @param {Object} [config.logger=console] - Custom logger
   */
  constructor({ fetcher, logger = console } = {}) {
    if (!fetcher) {
      throw new Error('fetcher parameter is required. Please create and pass a FigmaApiClient instance.');
    }

    this.service = new FigmaLibraryAnalyticsService({
      fetcher,
      logger
    });
    this.logger = logger;
  }

  // === Direct Client Access (Low-level API) ===

  /**
   * Get component action analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('component' or 'team')
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Component actions analytics data
   */
  async getComponentActions(fileKey, options) {
    return this.service.getComponentActions(fileKey, options);
  }

  /**
   * Get component usage analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('component' or 'file')
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Component usage analytics data
   */
  async getComponentUsages(fileKey, options) {
    return this.service.getComponentUsages(fileKey, options);
  }

  /**
   * Get style action analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('style' or 'team')
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Style actions analytics data
   */
  async getStyleActions(fileKey, options) {
    return this.service.getStyleActions(fileKey, options);
  }

  /**
   * Get style usage analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('style' or 'file')
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Style usage analytics data
   */
  async getStyleUsages(fileKey, options) {
    return this.service.getStyleUsages(fileKey, options);
  }

  /**
   * Get variable action analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('variable' or 'team')
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Variable actions analytics data
   */
  async getVariableActions(fileKey, options) {
    return this.service.getVariableActions(fileKey, options);
  }

  /**
   * Get variable usage analytics data
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @param {string} options.groupBy - Dimension to group by ('variable' or 'file')
   * @param {string} [options.cursor] - Pagination cursor
   * @returns {Promise<Object>} - Variable usage analytics data
   */
  async getVariableUsages(fileKey, options) {
    return this.service.getVariableUsages(fileKey, options);
  }

  // === High-level Business Operations (Service Layer) ===

  /**
   * Get comprehensive component adoption metrics
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period ('lastWeek', 'lastMonth', 'lastQuarter')
   * @param {boolean} [options.includeUsage=true] - Include usage data
   * @returns {Promise<Object>} - Component adoption analytics
   */
  async getComponentAdoption(fileKey, options = {}) {
    return this.service.getComponentAdoption(fileKey, options);
  }

  /**
   * Get component performance leaderboard
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {number} [options.limit=10] - Number of top components to return
   * @param {string} [options.sortBy='total_usage'] - Sort criteria
   * @returns {Promise<Array>} - Top performing components
   */
  async getComponentLeaderboard(fileKey, options = {}) {
    return this.service.getComponentLeaderboard(fileKey, options);
  }

  /**
   * Get team engagement with components
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @returns {Promise<Object>} - Team engagement metrics
   */
  async getComponentTeamEngagement(fileKey, options = {}) {
    return this.service.getComponentTeamEngagement(fileKey, options);
  }

  /**
   * Get comprehensive style adoption metrics
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @param {boolean} [options.includeUsage=true] - Include usage data
   * @returns {Promise<Object>} - Style adoption analytics
   */
  async getStyleAdoption(fileKey, options = {}) {
    return this.service.getStyleAdoption(fileKey, options);
  }

  /**
   * Get style performance leaderboard
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {number} [options.limit=10] - Number of top styles to return
   * @param {string} [options.sortBy='total_usage'] - Sort criteria
   * @returns {Promise<Array>} - Top performing styles
   */
  async getStyleLeaderboard(fileKey, options = {}) {
    return this.service.getStyleLeaderboard(fileKey, options);
  }

  /**
   * Get comprehensive variable adoption metrics
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @param {boolean} [options.includeUsage=true] - Include usage data
   * @returns {Promise<Object>} - Variable adoption analytics
   */
  async getVariableAdoption(fileKey, options = {}) {
    return this.service.getVariableAdoption(fileKey, options);
  }

  /**
   * Get comprehensive library health report
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @returns {Promise<Object>} - Complete library health metrics
   */
  async getLibraryHealthReport(fileKey, options = {}) {
    return this.service.getLibraryHealthReport(fileKey, options);
  }

  /**
   * Get library adoption trends over time
   * @param {string} fileKey - Library file key
   * @param {Object} [options] - Options
   * @param {Array<string>} [options.periods=['lastWeek', 'lastMonth']] - Time periods to compare
   * @returns {Promise<Object>} - Adoption trends
   */
  async getLibraryTrends(fileKey, options = {}) {
    return this.service.getLibraryTrends(fileKey, options);
  }

  // === Batch Operations ===

  /**
   * Get all analytics data for multiple libraries
   * @param {Array<string>} fileKeys - Array of library file keys
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @param {boolean} [options.includeHealthReports=true] - Include health reports
   * @returns {Promise<Object>} - Multi-library analytics
   */
  async getMultiLibraryAnalytics(fileKeys, options = {}) {
    const { period = 'lastMonth', includeHealthReports = true } = options;
    const results = {
      libraries: {},
      summary: {
        totalLibraries: fileKeys.length,
        successfulReports: 0,
        errors: []
      }
    };

    for (const fileKey of fileKeys) {
      try {
        if (includeHealthReports) {
          results.libraries[fileKey] = await this.getLibraryHealthReport(fileKey, { period });
        } else {
          const [componentMetrics, styleMetrics, variableMetrics] = await Promise.all([
            this.getComponentAdoption(fileKey, { period }),
            this.getStyleAdoption(fileKey, { period }),
            this.getVariableAdoption(fileKey, { period })
          ]);

          results.libraries[fileKey] = {
            fileKey,
            period,
            components: componentMetrics,
            styles: styleMetrics,
            variables: variableMetrics
          };
        }

        results.summary.successfulReports++;
      } catch (error) {
        results.summary.errors.push({
          fileKey,
          error: error.message,
          code: error.code
        });
        this.logger.error(`Failed to get analytics for library ${fileKey}:`, error);
      }
    }

    return results;
  }

  /**
   * Compare adoption metrics between multiple libraries
   * @param {Array<string>} fileKeys - Array of library file keys
   * @param {Object} [options] - Options
   * @param {string} [options.period='lastMonth'] - Time period
   * @param {string} [options.metric='adoptionRate'] - Metric to compare
   * @returns {Promise<Object>} - Library comparison
   */
  async compareLibraries(fileKeys, options = {}) {
    const { period = 'lastMonth', metric = 'adoptionRate' } = options;
    
    const multiLibraryData = await this.getMultiLibraryAnalytics(fileKeys, { 
      period, 
      includeHealthReports: true 
    });

    const comparison = {
      metric,
      period,
      libraries: [],
      rankings: {
        best: null,
        worst: null,
        average: 0
      }
    };

    const libraryScores = [];

    Object.entries(multiLibraryData.libraries).forEach(([fileKey, data]) => {
      let score = 0;
      
      if (metric === 'adoptionRate' && data.summary) {
        score = data.summary.adoptionRate;
      } else if (metric === 'healthScore' && data.summary) {
        score = data.summary.healthScore;
      } else if (metric === 'totalUsages' && data.summary) {
        score = data.summary.totalUsages;
      }

      const libraryData = {
        fileKey,
        score,
        data
      };

      comparison.libraries.push(libraryData);
      libraryScores.push(score);
    });

    // Sort by score (descending)
    comparison.libraries.sort((a, b) => b.score - a.score);

    // Calculate rankings
    if (comparison.libraries.length > 0) {
      comparison.rankings.best = comparison.libraries[0];
      comparison.rankings.worst = comparison.libraries[comparison.libraries.length - 1];
      comparison.rankings.average = libraryScores.reduce((a, b) => a + b, 0) / libraryScores.length;
    }

    return comparison;
  }

  // === Pagination Support ===

  /**
   * Get all data for any analytics endpoint by paginating through results
   * @param {Function} apiMethod - The API method to paginate (e.g., this.getComponentActions)
   * @param {string} fileKey - Library file key
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - All paginated data
   */
  async getAllData(apiMethod, fileKey, options = {}) {
    return this.service.getAll(apiMethod.bind(this.service), fileKey, options);
  }

  // === Utility Methods ===

  /**
   * Get available time periods for analytics
   * @returns {Array<string>} - Available time periods
   */
  getAvailableTimePeriods() {
    return ['lastWeek', 'lastMonth', 'lastQuarter'];
  }

  /**
   * Format date for API consumption
   * @param {Date|string} date - Date to format
   * @returns {string} - Formatted date (YYYY-MM-DD)
   */
  formatDate(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * Generate date range for a period
   * @param {string} period - Period name ('lastWeek', 'lastMonth', 'lastQuarter')
   * @returns {Object} - Date range with startDate and endDate
   */
  getDateRangeForPeriod(period) {
    const ranges = this.service.defaultDateRanges;
    return ranges[period] ? ranges[period]() : null;
  }

  /**
   * Export analytics data to JSON
   * @param {Object} data - Analytics data to export
   * @param {Object} [options] - Export options
   * @param {boolean} [options.pretty=true] - Pretty print JSON
   * @returns {string} - JSON string
   */
  exportToJSON(data, options = {}) {
    const { pretty = true } = options;
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Export analytics data to CSV format
   * @param {Array} data - Array of analytics data
   * @param {Array<string>} [columns] - Columns to include
   * @returns {string} - CSV string
   */
  exportToCSV(data, columns = null) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = columns || Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : String(value || '');
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async close() {
    // Clean up any resources if needed
    this.logger.debug('FigmaLibraryAnalyticsSDK closed');
  }
}

export default FigmaLibraryAnalyticsSDK;