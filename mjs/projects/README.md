# Figma Projects API Client

A comprehensive Node.js library for interacting with the Figma Projects API. Provides both programmatic SDK and command-line interfaces with advanced features like rate limiting, caching, retry logic, and detailed metrics.

## Features

- **Complete API Coverage**: All Figma Projects API endpoints
- **Production Ready**: Rate limiting, retry logic, error handling
- **Performance Optimized**: Request caching, connection pooling, metrics
- **Developer Friendly**: Rich TypeScript support via JSDoc, comprehensive logging
- **CLI Interface**: Full command-line tool for automation and scripting
- **Highly Configurable**: Extensive configuration options for different use cases

## Installation

```bash
npm install figma-projects
```

## Quick Start

### SDK Usage

```javascript
import FigmaProjectsSDK from 'figma-projects';

// Initialize with API token
const figma = new FigmaProjectsSDK({
  apiToken: 'your-figma-token'
});

// Get all projects in a team
const projects = await figma.getTeamProjects('team-id');
console.log(`Found ${projects.totalCount} projects`);

// Get files in a project
const files = await figma.getProjectFiles('project-id');
console.log(`Found ${files.totalCount} files`);

// Get complete project tree
const tree = await figma.getProjectTree('team-id');
console.log(`${tree.totalProjects} projects, ${tree.totalFiles} files`);
```

### CLI Usage

```bash
# Set your API token
export FIGMA_TOKEN="your-figma-token"

# List all projects in a team
figma-projects list-projects --team-id "team-id"

# Get files in a project
figma-projects list-files --project-id "project-id"

# Search for projects
figma-projects search --team-id "team-id" --query "design system"

# Export project structure
figma-projects export --team-id "team-id" --format csv --output projects.csv

# Get team overview
figma-projects overview --team-id "team-id"
```

## API Reference

### Core Classes

#### FigmaProjectsSDK

The main SDK class providing high-level methods for common operations.

```javascript
const sdk = new FigmaProjectsSDK({
  apiToken: 'your-token',
  baseUrl: 'https://api.figma.com', // optional
  timeout: 30000, // optional, in milliseconds
  maxRetries: 3, // optional
  enableCache: true, // optional
  enableMetrics: true, // optional
  rateLimitRpm: 60 // optional, requests per minute
});
```

#### Methods

##### `getTeamProjects(teamId, options)`

Get all projects in a team.

```javascript
const result = await sdk.getTeamProjects('team-id', {
  includeStats: true // Include project statistics
});
```

##### `getProjectFiles(projectId, options)`

Get all files in a project.

```javascript
const result = await sdk.getProjectFiles('project-id', {
  branchData: true, // Include branch metadata
  sortByModified: true // Sort by modification date
});
```

##### `getProjectTree(teamId, options)`

Get complete project hierarchy with files.

```javascript
const result = await sdk.getProjectTree('team-id', {
  maxConcurrency: 5, // Concurrent requests
  includeEmptyProjects: false // Exclude projects with no files
});
```

##### `searchProjects(teamId, query, options)`

Search for projects by name.

```javascript
const result = await sdk.searchProjects('team-id', 'design system', {
  caseSensitive: false,
  exactMatch: false
});
```

##### `getProjectStats(projectId)`

Get detailed project statistics.

```javascript
const stats = await sdk.getProjectStats('project-id');
console.log(`${stats.fileCount} files, last modified: ${stats.lastModified}`);
```

##### `findFile(projectId, fileName, options)`

Find a specific file by name.

```javascript
const file = await sdk.findFile('project-id', 'design.fig', {
  caseSensitive: false,
  exactMatch: true
});
```

##### `getRecentFiles(teamId, limit, daysBack)`

Get recently modified files across all projects.

```javascript
const recent = await sdk.getRecentFiles('team-id', 10, 7);
console.log(`${recent.totalFound} files modified in last 7 days`);
```

##### `exportProjects(teamId, format)`

Export project structure to JSON or CSV.

```javascript
const csvData = await sdk.exportProjects('team-id', 'csv');
const jsonData = await sdk.exportProjects('team-id', 'json');
```

##### `healthCheck()`

Check API connectivity and authentication.

```javascript
const health = await sdk.healthCheck();
console.log(`API Status: ${health.status}`);
```

### Advanced Features

#### Rate Limiting

Automatic rate limiting compliance (60 requests/minute by default):

```javascript
// Check current rate limit status
const status = sdk.client.getRateLimitStatus();
console.log(`${status.requestsRemaining} requests remaining`);
```

#### Request Caching

Automatic caching of GET requests to reduce API calls:

```javascript
// Get cache statistics
const stats = sdk.client.getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);

// Clear cache manually
sdk.client.clearCache();
```

#### Request Metrics

Detailed performance metrics collection:

```javascript
const metrics = sdk.getMetrics();
console.log(`Success rate: ${metrics.client.successRate * 100}%`);
console.log(`Average response time: ${metrics.client.averageResponseTime}ms`);
```

#### Error Handling

Comprehensive error types with context:

```javascript
import { 
  AuthenticationError, 
  RateLimitError, 
  NotFoundError,
  ValidationError 
} from 'figma-projects';

try {
  await sdk.getTeamProjects('invalid-team');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API token');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited, retry after ${error.retryAfter} seconds`);
  } else if (error instanceof NotFoundError) {
    console.error(`Team not found: ${error.identifier}`);
  }
}
```

## CLI Reference

### Global Options

- `--token <token>` - Figma API token (or set FIGMA_TOKEN env var)
- `--verbose` - Enable verbose logging
- `--format <format>` - Output format: json, table (default: json)
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)
- `--max-retries <count>` - Maximum retry attempts (default: 3)
- `--no-cache` - Disable response caching
- `--no-metrics` - Disable request metrics

### Commands

#### `list-projects`

List all projects in a team.

```bash
figma-projects list-projects --team-id "team-id" [--include-stats]
```

#### `list-files`

List all files in a project.

```bash
figma-projects list-files --project-id "project-id" [--branch-data]
```

#### `get-tree`

Get complete project tree.

```bash
figma-projects get-tree --team-id "team-id" [--max-concurrency 5] [--exclude-empty]
```

#### `search`

Search for projects by name.

```bash
figma-projects search --team-id "team-id" --query "search term" [--case-sensitive] [--exact-match]
```

#### `stats`

Get project statistics.

```bash
figma-projects stats --project-id "project-id"
```

#### `export`

Export project structure.

```bash
figma-projects export --team-id "team-id" [--format json|csv] [--output file.csv]
```

#### `find-file`

Find a file by name in a project.

```bash
figma-projects find-file --project-id "project-id" --file-name "design.fig" [--case-sensitive] [--partial-match]
```

#### `recent`

Get recently modified files.

```bash
figma-projects recent --team-id "team-id" [--limit 10] [--days 7]
```

#### `overview`

Get comprehensive team overview.

```bash
figma-projects overview --team-id "team-id" [--no-stats] [--no-recent] [--recent-limit 20]
```

#### `health`

Check API connectivity.

```bash
figma-projects health
```

#### `metrics`

Show performance metrics.

```bash
figma-projects metrics
```

## Configuration

### Environment Variables

- `FIGMA_TOKEN` - Your Figma API personal access token

### API Token Setup

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to "Personal access tokens"
3. Click "Create a new personal access token"
4. Give it a name and click "Create token"
5. Copy the token and use it in your application

### Required Permissions

Your API token needs access to:
- `projects:read` - Read projects and project files
- `files:read` - Read file metadata

## Error Handling

The library provides structured error handling with specific error types:

```javascript
import { 
  FigmaProjectsError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  ValidationError,
  NotFoundError,
  PermissionError,
  HttpError,
  TimeoutError
} from 'figma-projects';
```

All errors include:
- `message` - Human-readable error description
- `code` - Machine-readable error code
- `meta` - Additional error context
- `timestamp` - When the error occurred

## Performance Considerations

### Rate Limiting

- Default limit: 60 requests per minute
- Automatic backoff and retry
- Configurable rate limiting

### Caching

- GET requests cached by default
- Configurable TTL (default: 5 minutes)
- LRU eviction policy

### Concurrency

- Configurable concurrent request limits
- Default: 5 concurrent requests for batch operations
- Prevents overwhelming the API

### Memory Usage

- Streaming response processing
- Efficient data structures
- Configurable cache size limits

## Examples

### Basic Usage

```javascript
import FigmaProjectsSDK from 'figma-projects';

const figma = new FigmaProjectsSDK(process.env.FIGMA_TOKEN);

// Get team overview
const overview = await figma.getTeamOverview('team-id');
console.log(`Team: ${overview.team.name}`);
console.log(`Projects: ${overview.summary.totalProjects}`);
console.log(`Files: ${overview.summary.totalFiles}`);
```

### Advanced Configuration

```javascript
import { FigmaProjectsSDK, FigmaProjectsClient } from 'figma-projects';

const sdk = new FigmaProjectsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  timeout: 60000,
  maxRetries: 5,
  enableCache: true,
  enableMetrics: true,
  rateLimitRpm: 30, // More conservative rate limiting
  logger: customLogger,
  serviceConfig: {
    maxConcurrentRequests: 3,
    defaultPageSize: 50
  }
});
```

### Error Handling

```javascript
import { AuthenticationError, RateLimitError } from 'figma-projects';

try {
  const projects = await figma.getTeamProjects('team-id');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Check your API token');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
    // Implement exponential backoff
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

### Batch Operations

```javascript
// Get multiple projects efficiently
const projectIds = ['proj1', 'proj2', 'proj3'];
const results = await figma.getMultipleProjects(projectIds, {
  maxConcurrency: 3
});

console.log(`Success rate: ${results.summary.successRate * 100}%`);
```

### Search and Filter

```javascript
// Find projects containing "design"
const searchResults = await figma.searchProjects('team-id', 'design');

// Find recent files across all projects
const recentFiles = await figma.getRecentFiles('team-id', 20, 7);

// Find a specific file
const file = await figma.findFileAcrossProjects('team-id', 'component-library.fig');
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

- [GitHub Issues](https://github.com/thinkeloquent/figma-projects/issues)
- [API Documentation](https://www.figma.com/developers/api)
- [Figma Community](https://www.figma.com/community)