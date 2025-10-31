# Figma Variables SDK

A comprehensive Node.js library for interacting with the Figma Variables API. This library provides Enterprise-grade access to Figma's variables functionality with proper error handling, rate limiting, and batch operations.

## Features

- **Enterprise-only API Support**: Access to Figma's Variables API (requires Enterprise organization)
- **Complete CRUD Operations**: Create, read, update, and delete variables and collections
- **Batch Operations**: Efficient bulk operations for managing multiple variables
- **Type Safety**: Full TypeScript definitions and runtime validation
- **Rate Limiting**: Built-in request throttling and retry logic
- **Caching**: Optional response caching for improved performance
- **CLI Interface**: Command-line tool for variable management
- **Comprehensive Testing**: Full test suite with Jest

## Requirements

- Node.js 20.0.0 or higher
- Figma Enterprise organization access
- Valid Figma access token with `file_variables:read` and/or `file_variables:write` scopes

## Installation

```bash
npm install figma-variables-sdk
```

## Quick Start

### SDK Usage

```javascript
import { FigmaVariablesSDK } from 'figma-variables-sdk';

const sdk = new FigmaVariablesSDK({
  accessToken: 'your-figma-access-token'
});

// Get all variables from a file
const variables = await sdk.getVariables('your-file-key');
console.log(`Found ${variables.stats.variableCount} variables`);

// Create a new variable
const result = await sdk.createVariable('your-file-key', {
  name: 'Primary Color',
  variableCollectionId: 'collection-id',
  resolvedType: 'COLOR',
  values: {
    'mode-id': { r: 0.2, g: 0.4, b: 0.8, a: 1.0 }
  }
});
```

### CLI Usage

```bash
# Test connection and permissions
figma-variables test <file-key> --access-token <token>

# Get all variables
figma-variables get <file-key>

# Search variables by name
figma-variables search <file-key> --name "color"

# Create a new variable
figma-variables create-variable <file-key> \
  --name "Primary Color" \
  --collection <collection-id> \
  --type COLOR \
  --mode <mode-id> \
  --value '{"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}'

# Export variables to file
figma-variables export <file-key> --output variables.json
```

## API Reference

### FigmaVariablesSDK

The main SDK class providing high-level access to variables operations.

#### Constructor

```javascript
const sdk = new FigmaVariablesSDK({
  accessToken: string,        // Required: Figma access token
  baseUrl?: string,          // Optional: API base URL (default: https://api.figma.com)
  timeout?: number,          // Optional: Request timeout in ms (default: 30000)
  logger?: object           // Optional: Custom logger (default: console)
});
```

#### Methods

##### Variables Operations

- `getVariables(fileKey, options?)` - Get all local variables and collections
- `getPublishedVariables(fileKey, options?)` - Get published variables
- `getVariable(fileKey, variableId, options?)` - Get specific variable
- `searchVariables(fileKey, criteria, options?)` - Search variables by criteria

##### Variable Management

- `createVariable(fileKey, config)` - Create a new variable
- `createVariables(fileKey, configs)` - Batch create variables
- `updateVariable(fileKey, variableId, updates)` - Update existing variable
- `deleteVariable(fileKey, variableId)` - Delete a variable

##### Collection Management

- `getCollection(fileKey, collectionId, options?)` - Get variable collection
- `createCollection(fileKey, name, config?)` - Create new collection

##### Convenience Methods

- `createColorVariable(fileKey, name, collectionId, colorValue, modeId)`
- `createStringVariable(fileKey, name, collectionId, stringValue, modeId)`
- `createNumberVariable(fileKey, name, collectionId, numberValue, modeId)`
- `createBooleanVariable(fileKey, name, collectionId, booleanValue, modeId)`

##### Aliases and Advanced

- `createAlias(fileKey, aliasVariableId, targetVariableId, modeId)` - Create variable alias
- `importVariables(fileKey, data)` - Import variables from structured data
- `exportVariables(fileKey, options?)` - Export variables to structured format

##### Utilities

- `testConnection(fileKey)` - Test API access and permissions
- `getStats()` - Get SDK statistics and configuration

### Error Handling

The SDK provides structured error classes for different failure scenarios:

```javascript
import { 
  EnterpriseAccessError,
  ScopeError,
  ValidationError,
  RateLimitError 
} from 'figma-variables-sdk';

try {
  await sdk.getVariables(fileKey);
} catch (error) {
  if (error instanceof EnterpriseAccessError) {
    console.error('Enterprise organization access required');
  } else if (error instanceof ScopeError) {
    console.error('Missing required OAuth scope:', error.meta.requiredScope);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited, retry after:', error.retryAfter);
  }
}
```

### Variable Types

The API supports four variable types:

- `COLOR` - RGBA color values
- `STRING` - Text values
- `FLOAT` - Numeric values
- `BOOLEAN` - True/false values

### Data Structures

#### Variable Object

```javascript
{
  id: string,
  name: string,
  key: string,
  variableCollectionId: string,
  resolvedType: 'COLOR' | 'STRING' | 'FLOAT' | 'BOOLEAN',
  description?: string,
  hiddenFromPublishing?: boolean,
  scopes?: string[],
  codeSyntax?: object
}
```

#### Variable Collection Object

```javascript
{
  id: string,
  name: string,
  key: string,
  modes: Array<{
    modeId: string,
    name: string
  }>,
  defaultModeId: string,
  remote?: boolean,
  hiddenFromPublishing?: boolean
}
```

## CLI Commands

### Authentication

Set your access token via environment variable:

```bash
export FIGMA_ACCESS_TOKEN="your-token-here"
```

Or pass it with each command:

```bash
figma-variables get <file-key> --access-token <token>
```

### Available Commands

- `test <file-key>` - Test connection and permissions
- `get <file-key>` - Get all variables and collections
- `get-variable <file-key> <variable-id>` - Get specific variable
- `search <file-key>` - Search variables with filters
- `create-collection <file-key> <name>` - Create variable collection
- `create-variable <file-key>` - Create new variable
- `update-variable <file-key> <variable-id>` - Update existing variable
- `delete-variable <file-key> <variable-id>` - Delete variable
- `create-alias <file-key> <alias-id> <target-id> <mode-id>` - Create variable alias
- `export <file-key>` - Export variables to JSON
- `import <file-key> <input-file>` - Import variables from JSON
- `stats` - Show SDK configuration and statistics

## Configuration

### Environment Variables

- `FIGMA_ACCESS_TOKEN` - Your Figma access token
- `FIGMA_BASE_URL` - Custom API base URL (optional)

### Rate Limiting

The SDK includes built-in rate limiting with exponential backoff:

```javascript
const sdk = new FigmaVariablesSDK({
  accessToken: token,
  rateLimiter: {
    requests: 100,      // Requests per window
    window: 60000,      // Window size in ms
    burst: 10           // Burst allowance
  }
});
```

### Caching

Enable response caching for improved performance:

```javascript
const sdk = new FigmaVariablesSDK({
  accessToken: token,
  cache: {
    ttl: 300000,        // Cache TTL in ms (5 minutes)
    maxSize: 100        // Maximum cache entries
  }
});
```

## Examples

### Creating a Design System

```javascript
// Create a color collection
const collectionResult = await sdk.createCollection(fileKey, 'Brand Colors', {
  initialMode: { name: 'Light Mode' }
});

const collectionId = collectionResult.meta.tempIdToRealId['temp_collection_1'];
const modeId = collectionResult.meta.tempIdToRealId['temp_mode_1'];

// Create color variables
const colors = [
  { name: 'Primary', value: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 } },
  { name: 'Secondary', value: { r: 0.8, g: 0.2, b: 0.4, a: 1.0 } },
  { name: 'Background', value: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } }
];

for (const color of colors) {
  await sdk.createColorVariable(
    fileKey,
    color.name,
    collectionId,
    color.value,
    modeId
  );
}
```

### Batch Operations

```javascript
// Create multiple variables at once
const variables = [
  {
    name: 'Font Size Small',
    variableCollectionId: typographyCollectionId,
    resolvedType: 'FLOAT',
    values: { [modeId]: 12 }
  },
  {
    name: 'Font Size Medium',
    variableCollectionId: typographyCollectionId,
    resolvedType: 'FLOAT',
    values: { [modeId]: 16 }
  },
  {
    name: 'Font Size Large',
    variableCollectionId: typographyCollectionId,
    resolvedType: 'FLOAT',
    values: { [modeId]: 24 }
  }
];

const result = await sdk.createVariables(fileKey, variables);
```

### Variable Aliases

```javascript
// Create semantic color aliases
await sdk.createAlias(
  fileKey,
  semanticColorVariableId,  // The variable that will become an alias
  brandColorVariableId,     // The variable to alias to
  modeId
);
```

## Error Codes

| Code | Description |
|------|-------------|
| `ENTERPRISE_ACCESS_ERROR` | Variables API requires Enterprise organization |
| `SCOPE_ERROR` | Missing required OAuth scope |
| `VALIDATION_ERROR` | Invalid input data |
| `RATE_LIMIT` | Rate limit exceeded |
| `NETWORK_ERROR` | Network connectivity issue |
| `NOT_FOUND` | Resource not found |
| `VARIABLE_LIMIT_ERROR` | Variable limit exceeded (5000 per collection) |
| `MODE_LIMIT_ERROR` | Mode limit exceeded (40 per collection) |
| `ALIAS_ERROR` | Invalid variable alias configuration |

## Development

### Setup

```bash
git clone <repository>
cd figma-variables-sdk
npm install
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check everything
npm run check
```

## License

MIT License - see LICENSE file for details.

## Support

For Enterprise support and feature requests, please contact Figma support or open an issue in this repository.

## Changelog

See CHANGELOG.md for version history and breaking changes.