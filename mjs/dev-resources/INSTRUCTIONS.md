# Figma Dev Resources SDK

A Node.js client library and CLI for the Figma Dev Resources API, enabling programmatic management of development resources in Figma's Dev Mode.

## Installation

```bash
# Install dependencies
npm install

# Make CLI executable (if needed)
chmod +x cli.mjs
```

## Quick Start

### Environment Setup

Get your Figma access token from [Figma's developer settings](https://www.figma.com/developers/api#access-tokens).

Set your token as an environment variable:
```bash
export FIGMA_ACCESS_TOKEN="your-token-here"
```

### CLI Usage

```bash
# Get dev resources from a file
./cli.mjs get <file-key>

# Create a dev resource
./cli.mjs create <file-key> <node-id> --name "My Resource" --url "https://example.com"

# Update a dev resource
./cli.mjs update <resource-id> --name "Updated Name" --url "https://newurl.com"

# Delete a dev resource
./cli.mjs delete <file-key> <resource-id>

# Search resources by name
./cli.mjs search <file-key> "pattern"

# Get statistics
./cli.mjs stats <file-key>

# Validate resource URLs
./cli.mjs validate <file-key>
```

### SDK Usage

```javascript
import { FigmaDevResourcesSDK } from './sdk.mjs';

const sdk = new FigmaDevResourcesSDK({
  accessToken: 'your-token-here'
});

// Get dev resources
const resources = await sdk.getFileDevResources('file-key');

// Create a dev resource
const resource = await sdk.createDevResource(
  'file-key',
  'node-id', 
  'Resource Name',
  'https://example.com'
);

// Update a dev resource
const updated = await sdk.updateDevResource('resource-id', {
  name: 'New Name',
  url: 'https://newurl.com'
});

// Delete a dev resource
await sdk.deleteDevResource('file-key', 'resource-id');
```

## Authentication & Scopes

The Figma Dev Resources API requires specific authentication scopes:

- **Read operations**: `file_dev_resources:read`
- **Write operations**: `file_dev_resources:write`

When creating your personal access token or OAuth app, ensure these scopes are included.

## API Endpoints Covered

| Method | Endpoint | Description | Auth Scope |
|--------|----------|-------------|------------|
| GET | `/v1/files/{file_key}/dev_resources` | Get dev resources | `file_dev_resources:read` |
| POST | `/v1/dev_resources` | Create dev resources | `file_dev_resources:write` |
| PUT | `/v1/dev_resources` | Update dev resources | `file_dev_resources:write` |
| DELETE | `/v1/files/{file_key}/dev_resources/{dev_resource_id}` | Delete dev resource | `file_dev_resources:write` |

## Configuration Options

### SDK Configuration

```javascript
const sdk = new FigmaDevResourcesSDK({
  accessToken: 'required-token',
  baseUrl: 'https://api.figma.com', // optional
  timeout: 30000, // optional, in milliseconds
  logger: console, // optional
  rateLimiter: null, // optional rate limiter
  cache: null // optional cache implementation
});
```

### CLI Configuration

```bash
# Use environment variable
export FIGMA_ACCESS_TOKEN="your-token"

# Or pass via flag
./cli.mjs get file-key --token your-token

# Additional options
./cli.mjs get file-key --verbose --timeout 60000
```

## Rate Limiting

The SDK includes built-in rate limiting protection:

- Automatic retry with exponential backoff
- Respects `Retry-After` headers
- Configurable retry limits and delays
- Jitter to prevent thundering herd

## Error Handling

The SDK provides structured error handling:

```javascript
import { 
  FigmaApiError, 
  FigmaRateLimitError, 
  FigmaAuthError, 
  FigmaValidationError 
} from './client.mjs';

try {
  await sdk.getFileDevResources('file-key');
} catch (error) {
  if (error instanceof FigmaAuthError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof FigmaRateLimitError) {
    console.error('Rate limited, retry after:', error.meta.retryAfter);
  } else if (error instanceof FigmaValidationError) {
    console.error('Validation errors:', error.meta.validationErrors);
  }
}
```

## Batch Operations

For bulk operations, use batch methods to handle rate limits and errors gracefully:

```javascript
// Batch create with progress tracking
const results = await sdk.client.batchCreateDevResources(
  resources,
  (progress) => console.log(`${progress.processed}/${progress.total}`),
  10 // batch size
);

// Sync resources (create/update/delete to match target state)
const syncResults = await sdk.syncFileDevResources(fileKey, targetResources);
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Watch mode
npm test:watch
```

## Data Formats

### Dev Resource Object

```javascript
{
  id: "string",           // Unique identifier (read-only)
  name: "string",         // Resource name
  url: "string",          // Resource URL
  file_key: "string",     // File key (read-only)
  node_id: "string"       // Target node ID (read-only)
}
```

### Create Resource Input

```javascript
{
  name: "Resource Name",           // Required
  url: "https://example.com",      // Required, must be valid URL
  file_key: "file-key",           // Required
  node_id: "node-id"              // Required
}
```

### Update Resource Input

```javascript
{
  id: "resource-id",              // Required
  name: "New Name",               // Optional
  url: "https://newurl.com"       // Optional, must be valid URL if provided
}
```

## Advanced Usage

### Custom Rate Limiter

```javascript
class CustomRateLimiter {
  async checkLimit() {
    // Your rate limiting logic
  }
}

const sdk = new FigmaDevResourcesSDK({
  accessToken: 'token',
  rateLimiter: new CustomRateLimiter()
});
```

### Custom Cache

```javascript
class CustomCache {
  async get(key) {
    // Your cache get logic
  }
  
  async set(key, value) {
    // Your cache set logic
  }
}

const sdk = new FigmaDevResourcesSDK({
  accessToken: 'token',
  cache: new CustomCache()
});
```

### Multiple File Operations

```javascript
// Get resources from multiple files
const results = await sdk.client.getMultipleFileDevResources([
  'file1-key',
  'file2-key'
]);

// Delete multiple resources
const deleteResults = await sdk.deleteMultipleDevResources([
  { fileKey: 'file1', id: 'resource1' },
  { fileKey: 'file2', id: 'resource2' }
]);
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your access token is valid
   - Check token scopes include `file_dev_resources:read` or `file_dev_resources:write`
   - Ensure token hasn't expired

2. **Rate Limiting**
   - SDK automatically handles rate limits with retries
   - Use batch operations for bulk work
   - Consider implementing custom rate limiter for fine control

3. **Validation Errors**
   - Check required fields are present
   - Verify URLs are valid format
   - Ensure file keys and node IDs exist

4. **Network Issues**
   - SDK includes retry logic for transient failures
   - Adjust timeout settings if needed
   - Check network connectivity

### Debug Mode

Enable verbose logging for debugging:

```bash
# CLI
./cli.mjs get file-key --verbose

# SDK
const sdk = new FigmaDevResourcesSDK({
  accessToken: 'token',
  logger: console
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT