# Figma Components API

A comprehensive Node.js library for Figma's Components, Component Sets, and Styles API. Built with enterprise-grade architecture focusing on reliability, performance, and developer experience.

## Features

- **Complete API Coverage**: Components, Component Sets, and Styles endpoints
- **Rate Limiting**: Built-in request rate limiting with exponential backoff
- **Error Handling**: Structured error classes with context and retry logic
- **Pagination Support**: Automatic pagination handling for large datasets
- **TypeScript Ready**: Full JSDoc documentation for IntelliSense
- **CLI Interface**: Command-line tools for all operations
- **Batch Operations**: Efficient bulk operations with parallel processing
- **Search & Filter**: Advanced search capabilities for library content
- **Library Analytics**: Comprehensive analytics for design systems

## Installation

```bash
npm install figma-components-api
```

## Quick Start

### SDK Usage

```javascript
import { FigmaComponentsSDK } from 'figma-components-api';

const sdk = new FigmaComponentsSDK({
  apiToken: 'your-figma-token'
});

// Get team components
const components = await sdk.getTeamComponents('team-id');

// Get complete team library
const library = await sdk.getTeamLibrary('team-id');

// Search components
const buttons = await sdk.searchComponents('team-id', 'button');
```

### CLI Usage

```bash
# Install globally for CLI access
npm install -g figma-components-api

# Set your API token
export FIGMA_API_TOKEN="your-token"

# List team components
figma-components components list-team 123456

# Get complete team library
figma-components library get-team 123456

# Search components
figma-components components search 123456 button

# Export library data
figma-components library export 123456 --pretty
```

## API Reference

### Components

#### Get Team Components
```javascript
// Basic usage
const components = await sdk.getTeamComponents('team-id');

// With pagination
const components = await sdk.getTeamComponents('team-id', {
  pageSize: 50,
  after: 100
});

// Get all components (auto-pagination)
const allComponents = await sdk.getAllTeamComponents('team-id');
```

#### Get File Components
```javascript
const components = await sdk.getFileComponents('file-key');
```

#### Get Component by Key
```javascript
const component = await sdk.getComponent('component-key');
```

### Component Sets

#### Get Team Component Sets
```javascript
const componentSets = await sdk.getTeamComponentSets('team-id');
```

#### Get File Component Sets
```javascript
const componentSets = await sdk.getFileComponentSets('file-key');
```

#### Get Component Set by Key
```javascript
const componentSet = await sdk.getComponentSet('component-set-key');
```

### Styles

#### Get Team Styles
```javascript
const styles = await sdk.getTeamStyles('team-id');
```

#### Get File Styles
```javascript
const styles = await sdk.getFileStyles('file-key');
```

#### Get Style by Key
```javascript
const style = await sdk.getStyle('style-key');
```

### Library Operations

#### Get Complete Library
```javascript
// Team library (components, component sets, styles)
const teamLibrary = await sdk.getTeamLibrary('team-id');

// File library
const fileLibrary = await sdk.getFileLibrary('file-key');
```

#### Library Analytics
```javascript
const analytics = await sdk.getTeamLibraryAnalytics('team-id');
console.log(`Total items: ${analytics.totalItems}`);
console.log(`Components: ${analytics.breakdown.components}`);
console.log(`Styles: ${analytics.breakdown.styles}`);
```

#### Export Library
```javascript
const exportData = await sdk.exportTeamLibrary('team-id', {
  includeMetadata: true,
  format: 'json'
});
```

### Batch Operations

#### Batch Get Components
```javascript
const result = await sdk.batchGetComponents([
  'component-key-1',
  'component-key-2',
  'component-key-3'
]);

console.log(`Successful: ${result.successful.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### Search and Filter

#### Search Components
```javascript
// Simple name search
const buttons = await sdk.searchComponents('team-id', 'button');

// Advanced pattern search
const components = await sdk.findComponents('team-id', {
  name: 'button',
  nodeType: 'COMPONENT',
  description: 'primary'
});
```

#### Filter Styles by Type
```javascript
const fillStyles = await sdk.findStylesByType('team-id', 'FILL');
const textStyles = await sdk.findStylesByType('team-id', 'TEXT');
```

## CLI Commands

### Components
```bash
# List team components
figma-components components list-team <team-id> [options]

# List file components  
figma-components components list-file <file-key>

# Get component details
figma-components components get <component-key>

# Search components
figma-components components search <team-id> <search-term>

# Batch get components
figma-components components batch-get --keys key1 key2 key3
```

### Component Sets
```bash
# List team component sets
figma-components component-sets list-team <team-id> [options]

# List file component sets
figma-components component-sets list-file <file-key>

# Get component set details
figma-components component-sets get <component-set-key>
```

### Styles
```bash
# List team styles
figma-components styles list-team <team-id> [options]

# List file styles
figma-components styles list-file <file-key>

# Get style details
figma-components styles get <style-key>

# Filter by style type
figma-components styles list-team <team-id> --type FILL
```

### Library
```bash
# Get complete team library
figma-components library get-team <team-id>

# Get complete file library
figma-components library get-file <file-key>

# Library analytics
figma-components library analytics <team-id>

# Export library
figma-components library export <team-id> --pretty
```

### Search
```bash
# Find components by pattern
figma-components search components <team-id> --name button --node-type COMPONENT
```

### Utility
```bash
# Health check
figma-components health

# Show statistics
figma-components stats
```

## Configuration

### Environment Variables
```bash
FIGMA_API_TOKEN=your-figma-personal-access-token
```

### SDK Configuration
```javascript
const sdk = new FigmaComponentsSDK({
  apiToken: 'your-token',
  logger: console, // Custom logger
  clientConfig: {
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000
    },
    rateLimitConfig: {
      requestsPerMinute: 60
    }
  }
});
```

## OAuth Scopes

Make sure your API token or OAuth app has the required scopes:

- **team_library_content:read** - For team library endpoints
- **library_content:read** - For file library endpoints  
- **library_assets:read** - For individual component/style endpoints
- **files:read** - Required for all endpoints

## Error Handling

The library provides structured error classes:

```javascript
import { 
  TeamNotFoundError,
  ComponentNotFoundError,
  ValidationError,
  RateLimitError 
} from 'figma-components-api';

try {
  const components = await sdk.getTeamComponents('invalid-team');
} catch (error) {
  if (error instanceof TeamNotFoundError) {
    console.error(`Team not found: ${error.meta.teamId}`);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after: ${error.retryAfter}s`);
  }
}
```

## Performance

- **Rate Limiting**: Automatic rate limiting with configurable limits
- **Request Batching**: Efficient parallel processing for bulk operations
- **Pagination**: Automatic pagination handling for large datasets
- **Caching**: Built-in request caching for improved performance
- **Connection Pooling**: HTTP connection reuse for better throughput

## Examples

See the `examples/` directory for complete usage examples:

- Basic library exploration
- Design system analysis
- Component usage tracking
- Style guide generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite: `npm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- [Figma API Documentation](https://www.figma.com/developers/api#library-items)
- [GitHub Issues](https://github.com/figma/rest-api-spec/issues)
- [Community Forum](https://forum.figma.com/)