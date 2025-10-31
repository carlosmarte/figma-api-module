# Figma Library Analytics

A comprehensive Node.js client for the Figma Library Analytics API, providing insights into design system adoption, usage patterns, and team engagement.

## Features

- **Complete API Coverage**: All 6 Library Analytics endpoints
- **High-level Analytics**: Component, style, and variable adoption metrics
- **Team Insights**: Engagement tracking and collaboration analytics
- **Health Reporting**: Comprehensive library health assessments
- **Trend Analysis**: Multi-period comparison and growth tracking
- **CLI Interface**: Command-line tools for analytics workflows
- **Enterprise Ready**: Rate limiting, caching, retry logic, and proper error handling

## Installation

```bash
npm install figma-library-analytics
```

## Quick Start

### SDK Usage

```javascript
import { FigmaLibraryAnalyticsSDK } from 'figma-library-analytics';

const analytics = new FigmaLibraryAnalyticsSDK({
  apiToken: 'your-figma-token-with-library_analytics:read-scope'
});

// Get comprehensive library health report
const healthReport = await analytics.getLibraryHealthReport('your-library-file-key');
console.log(`Health Score: ${healthReport.summary.healthScore}/100`);
console.log(`Adoption Rate: ${Math.round(healthReport.summary.adoptionRate * 100)}%`);

// Get component performance leaderboard
const topComponents = await analytics.getComponentLeaderboard('your-library-file-key', {
  limit: 5
});
console.log('Top 5 Components:', topComponents);

// Compare adoption trends
const trends = await analytics.getLibraryTrends('your-library-file-key', {
  periods: ['lastWeek', 'lastMonth']
});
console.log('Adoption Growth:', trends.comparison);
```

### CLI Usage

```bash
# Set your Figma token
export FIGMA_TOKEN="your-figma-token"

# Get library health report
figma-library-analytics health-report your-library-file-key

# Get component leaderboard
figma-library-analytics component-leaderboard your-library-file-key --limit 10

# Get component usage data
figma-library-analytics component-usages your-library-file-key --group-by component --all

# Compare multiple libraries
figma-library-analytics compare lib1,lib2,lib3 --metric adoptionRate
```

## API Reference

### Core Analytics Methods

#### Component Analytics

```javascript
// Get component action data (when components are added/modified)
const actions = await analytics.getComponentActions(fileKey, {
  groupBy: 'component', // or 'team'
  startDate: '2023-01-01',
  endDate: '2023-12-31'
});

// Get component usage data (where components are used)
const usages = await analytics.getComponentUsages(fileKey, {
  groupBy: 'component' // or 'file'
});

// Get high-level component adoption metrics
const adoption = await analytics.getComponentAdoption(fileKey, {
  period: 'lastMonth', // 'lastWeek', 'lastMonth', 'lastQuarter'
  includeUsage: true
});

// Get component performance leaderboard
const leaderboard = await analytics.getComponentLeaderboard(fileKey, {
  limit: 10,
  sortBy: 'total_usage'
});
```

#### Style Analytics

```javascript
// Get style action data
const styleActions = await analytics.getStyleActions(fileKey, {
  groupBy: 'style', // or 'team'
  startDate: '2023-01-01',
  endDate: '2023-12-31'
});

// Get style usage data
const styleUsages = await analytics.getStyleUsages(fileKey, {
  groupBy: 'style' // or 'file'
});

// Get style adoption metrics
const styleAdoption = await analytics.getStyleAdoption(fileKey, {
  period: 'lastMonth'
});
```

#### Variable Analytics

```javascript
// Get variable action data
const varActions = await analytics.getVariableActions(fileKey, {
  groupBy: 'variable', // or 'team'
  startDate: '2023-01-01',
  endDate: '2023-12-31'
});

// Get variable usage data
const varUsages = await analytics.getVariableUsages(fileKey, {
  groupBy: 'variable' // or 'file'
});

// Get variable adoption metrics
const varAdoption = await analytics.getVariableAdoption(fileKey, {
  period: 'lastMonth'
});
```

### High-Level Business Operations

#### Library Health Assessment

```javascript
// Comprehensive health report with recommendations
const healthReport = await analytics.getLibraryHealthReport(fileKey, {
  period: 'lastMonth'
});

console.log(healthReport.summary);
// {
//   totalAssets: 150,
//   activeAssets: 120,
//   totalUsages: 2500,
//   adoptionRate: 0.8,
//   healthScore: 85
// }

// View recommendations
healthReport.recommendations.forEach(rec => {
  console.log(`[${rec.priority.toUpperCase()}] ${rec.message}`);
});
```

#### Trend Analysis

```javascript
// Multi-period trend analysis
const trends = await analytics.getLibraryTrends(fileKey, {
  periods: ['lastWeek', 'lastMonth', 'lastQuarter']
});

console.log('Component growth:', trends.comparison.components.totalChange);
console.log('Usage growth:', trends.comparison.components.usagesChange);
```

#### Multi-Library Operations

```javascript
// Analyze multiple libraries
const multiLibAnalytics = await analytics.getMultiLibraryAnalytics([
  'library-1-key',
  'library-2-key',
  'library-3-key'
], {
  period: 'lastMonth',
  includeHealthReports: true
});

// Compare libraries by adoption rate
const comparison = await analytics.compareLibraries([
  'library-1-key',
  'library-2-key'
], {
  metric: 'adoptionRate'
});

console.log('Best performing library:', comparison.rankings.best);
```

### Pagination Support

```javascript
// Stream through large datasets
for await (const batch of analytics.streamData(
  analytics.getComponentUsages,
  fileKey,
  { groupBy: 'component' }
)) {
  console.log(`Processing ${batch.length} records...`);
  // Process batch
}

// Get all data (handles pagination automatically)
const allComponentData = await analytics.getAllData(
  analytics.getComponentUsages,
  fileKey,
  { groupBy: 'component' }
);
```

## CLI Commands

### Component Commands

```bash
# Component actions by component
figma-library-analytics component-actions FILE_KEY -g component -s 2023-01-01 -e 2023-12-31

# Component actions by team
figma-library-analytics component-actions FILE_KEY -g team

# Component usages by component
figma-library-analytics component-usages FILE_KEY -g component --all

# Component adoption metrics
figma-library-analytics component-adoption FILE_KEY -p lastQuarter

# Component leaderboard
figma-library-analytics component-leaderboard FILE_KEY -l 5
```

### Style Commands

```bash
# Style actions
figma-library-analytics style-actions FILE_KEY -g style

# Style usages
figma-library-analytics style-usages FILE_KEY -g file

# Style adoption
figma-library-analytics style-adoption FILE_KEY -p lastMonth
```

### Variable Commands

```bash
# Variable actions
figma-library-analytics variable-actions FILE_KEY -g variable

# Variable usages
figma-library-analytics variable-usages FILE_KEY -g file

# Variable adoption
figma-library-analytics variable-adoption FILE_KEY
```

### Comprehensive Analytics

```bash
# Full health report with recommendations
figma-library-analytics health-report FILE_KEY -p lastMonth

# Trend analysis
figma-library-analytics trends FILE_KEY -p "lastWeek,lastMonth,lastQuarter"

# Multi-library comparison
figma-library-analytics compare "lib1,lib2,lib3" -m healthScore
```

### Utility Commands

```bash
# Validate file key format
figma-library-analytics validate FILE_KEY

# List supported options
figma-library-analytics options

# JSON output for automation
figma-library-analytics health-report FILE_KEY --json
```

## Configuration

### Environment Variables

```bash
# Required: Figma API token with library_analytics:read scope
FIGMA_TOKEN=your-figma-token

# Optional: Custom API base URL
FIGMA_BASE_URL=https://api.figma.com
```

### SDK Configuration

```javascript
const analytics = new FigmaLibraryAnalyticsSDK({
  apiToken: 'your-token',
  baseUrl: 'https://api.figma.com', // Optional
  logger: console, // Optional custom logger
  enableRetries: true, // Optional, default true
  enableCaching: false // Optional, default false
});
```

## Authentication

You need a Figma API token with the `library_analytics:read` scope. Get your token from:
https://www.figma.com/developers/api#access-tokens

For OAuth2 applications, ensure your token includes the `library_analytics:read` scope in the authorization flow.

## Error Handling

```javascript
import { 
  LibraryAnalyticsError,
  LibraryAnalyticsAuthError,
  LibraryAnalyticsValidationError,
  LibraryAnalyticsRateLimitError
} from 'figma-library-analytics';

try {
  const data = await analytics.getComponentActions(fileKey, options);
} catch (error) {
  if (error instanceof LibraryAnalyticsAuthError) {
    console.error('Authentication failed - check your token and scopes');
  } else if (error instanceof LibraryAnalyticsValidationError) {
    console.error('Invalid parameters:', error.meta);
  } else if (error instanceof LibraryAnalyticsRateLimitError) {
    console.error('Rate limited - retry after:', error.meta.retryAfter);
  } else {
    console.error('General error:', error.message);
  }
}
```

## Rate Limiting

The client includes built-in rate limiting and retry logic:

- Automatic exponential backoff for retryable errors
- Respects `Retry-After` headers from the API
- Configurable retry attempts and delays
- Jitter to prevent thundering herd issues

## Data Export

```javascript
// Export to JSON
const jsonData = analytics.exportToJSON(healthReport, { pretty: true });

// Export to CSV
const csvData = analytics.exportToCSV(componentLeaderboard, [
  'rank', 'component_name', 'usage_count'
]);
```

## TypeScript Support

While this is a JavaScript module, it includes comprehensive JSDoc comments for excellent TypeScript intellisense and type checking when used in TypeScript projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

MIT

## Links

- [Figma Library Analytics API Documentation](https://www.figma.com/developers/api#library-analytics)
- [Figma API Authentication](https://www.figma.com/developers/api#authentication)
- [GitHub Repository](https://github.com/thinkeloquent/figma-api-module)