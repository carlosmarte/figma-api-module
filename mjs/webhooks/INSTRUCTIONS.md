# Figma Webhooks API Client

A comprehensive Node.js library for managing Figma Webhooks API v2 with enterprise-grade features including rate limiting, caching, and robust error handling.

## Installation

```bash
npm install figma-webhooks
```

## Quick Start

### SDK Usage

```javascript
import { FigmaWebhooksSDK } from 'figma-webhooks';

// Initialize with your Figma API token
const sdk = new FigmaWebhooksSDK('your-figma-token');

// Create a file update webhook
const webhook = await sdk.createFileWebhook({
  fileKey: 'your-file-key',
  endpoint: 'https://your-app.com/webhook',
  passcode: 'your-secret-passcode',
  description: 'File update notifications'
});

console.log('Created webhook:', webhook.id);
```

### CLI Usage

```bash
# Set your Figma token
export FIGMA_TOKEN="your-figma-token"

# List all webhooks
figma-webhooks list --plan your-plan-id

# Create a webhook
figma-webhooks create \
  --event FILE_UPDATE \
  --context file \
  --context-id your-file-key \
  --endpoint https://your-app.com/webhook \
  --passcode your-secret

# Check webhook health
figma-webhooks health webhook-id
```

## Authentication

Get your Figma API token from [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens).

Set it via:
- Environment variable: `FIGMA_TOKEN`
- CLI flag: `--token your-token`
- SDK constructor: `new FigmaWebhooksSDK('your-token')`

## Core Features

### Webhook Management

```javascript
// Create webhooks for different contexts
await sdk.createFileWebhook({ fileKey, endpoint, passcode });
await sdk.createProjectWebhook({ projectId, eventType: 'FILE_UPDATE', endpoint, passcode });
await sdk.createTeamWebhook({ teamId, eventType: 'LIBRARY_PUBLISH', endpoint, passcode });

// Get webhook by ID
const webhook = await sdk.getWebhook('webhook-id');

// Update webhook
await sdk.updateWebhook('webhook-id', {
  status: 'PAUSED',
  description: 'Updated description'
});

// Delete webhook
await sdk.deleteWebhook('webhook-id');
```

### Webhook Control

```javascript
// Pause/activate webhooks
await sdk.pauseWebhook('webhook-id');
await sdk.activateWebhook('webhook-id');

// Bulk operations
const results = await sdk.createBulkWebhooks(
  ['file1', 'file2', 'file3'],
  {
    context: 'file',
    eventType: 'FILE_UPDATE',
    endpoint: 'https://your-app.com/webhook',
    passcode: 'secret'
  }
);
```

### Monitoring & Health Checks

```javascript
// Get webhook delivery history
const history = await sdk.getWebhookHistory('webhook-id');

// Check webhook health
const health = await sdk.checkWebhookHealth('webhook-id');
console.log(`Status: ${health.status}, Success Rate: ${health.successRate * 100}%`);

// Test endpoint connectivity
const testResult = await sdk.testWebhookEndpoint('https://your-app.com/webhook');
```

### Search & Discovery

```javascript
// Find webhooks by criteria
const byEndpoint = await sdk.findWebhooksByEndpoint('https://your-app.com/webhook', planId);
const byEventType = await sdk.findWebhooksByEventType('FILE_UPDATE', planId);
const inactive = await sdk.findInactiveWebhooks(planId);
```

## Event Types

Supported webhook event types:

- `PING` - Test event sent when webhook is created
- `FILE_UPDATE` - File content changes after editing inactivity
- `FILE_VERSION_UPDATE` - Named version created in file history
- `FILE_DELETE` - File is deleted
- `LIBRARY_PUBLISH` - Library components/styles published
- `FILE_COMMENT` - New comment added to file
- `DEV_MODE_STATUS_UPDATE` - Dev mode layer status changes

## Context Types

Webhooks can monitor different scopes:

- `team` - All activity within a team
- `project` - All files within a project
- `file` - Specific file only

## Advanced Configuration

### Rate Limiting & Caching

```javascript
import { FigmaWebhooksSDK } from 'figma-webhooks';

const sdk = new FigmaWebhooksSDK({
  apiToken: 'your-token',
  enableRetries: true,
  enableCaching: true,
  logger: console, // Custom logger
  timeout: 30000   // Request timeout
});
```

### Custom Rate Limiter

```javascript
class CustomRateLimiter {
  async checkLimit() {
    // Your rate limiting logic
    await this.waitIfNeeded();
  }
}

const client = new FigmaWebhooksClient({
  apiToken: 'your-token',
  rateLimiter: new CustomRateLimiter()
});
```

### Custom Cache

```javascript
class CustomCache {
  async get(key) { /* get from cache */ }
  async set(key, value, options) { /* set in cache */ }
}

const client = new FigmaWebhooksClient({
  apiToken: 'your-token',
  cache: new CustomCache()
});
```

## Error Handling

The library provides specific error types:

```javascript
import { 
  WebhookError, 
  WebhookAuthError, 
  WebhookRateLimitError,
  WebhookValidationError 
} from 'figma-webhooks';

try {
  await sdk.createFileWebhook({ /* config */ });
} catch (error) {
  if (error instanceof WebhookAuthError) {
    console.error('Authentication failed - check your token');
  } else if (error instanceof WebhookRateLimitError) {
    console.error(`Rate limited - retry after ${error.meta.retryAfter}s`);
  } else if (error instanceof WebhookValidationError) {
    console.error(`Validation error in ${error.meta.field}: ${error.meta.value}`);
  }
}
```

## Webhook Payload Verification

```javascript
// In your webhook endpoint handler
const isValid = sdk.verifySignature(
  rawPayload,
  request.headers['x-figma-signature'],
  'your-passcode'
);

if (!isValid) {
  return response.status(401).send('Invalid signature');
}
```

## CLI Commands

### Webhook Management
```bash
figma-webhooks list [options]
figma-webhooks get <webhook-id>
figma-webhooks create [options]
figma-webhooks update <webhook-id> [options]
figma-webhooks delete <webhook-id> [--force]
```

### Webhook Control
```bash
figma-webhooks pause <webhook-id>
figma-webhooks activate <webhook-id>
```

### Monitoring
```bash
figma-webhooks history <webhook-id>
figma-webhooks health <webhook-id>
```

### Utilities
```bash
figma-webhooks test-endpoint <url>
figma-webhooks search --plan <id> [--endpoint <url>]
figma-webhooks info  # Show supported event/context types
```

### Bulk Operations
```bash
# Create from JSON file
figma-webhooks bulk-create --file webhooks.json
```

Example `webhooks.json`:
```json
{
  "contextIds": ["file1", "file2", "file3"],
  "config": {
    "context": "file",
    "eventType": "FILE_UPDATE",
    "endpoint": "https://your-app.com/webhook",
    "passcode": "your-secret",
    "status": "ACTIVE"
  }
}
```

## Environment Variables

- `FIGMA_TOKEN` - Your Figma API token
- `FIGMA_BASE_URL` - Custom API base URL (default: https://api.figma.com)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Watch mode
npm test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

The library follows a layered architecture:

- **Client Layer** (`client.mjs`) - Low-level HTTP client with retry logic
- **SDK Layer** (`sdk.mjs`) - High-level convenience methods
- **CLI Layer** (`cli.mjs`) - Command-line interface

## Performance Considerations

- **Connection Pooling**: HTTP/1.1 keep-alive enabled by default
- **Request Caching**: Optional response caching for GET requests
- **Exponential Backoff**: Automatic retry with jitter for transient failures
- **Rate Limiting**: Built-in support for custom rate limiters
- **Memory Efficiency**: Streaming support for large paginated responses

## Security

- **Token Security**: API tokens are never logged or cached
- **Signature Verification**: Built-in webhook payload verification
- **HTTPS Only**: All API requests use HTTPS
- **Input Validation**: Comprehensive parameter validation

## License

MIT - see LICENSE file for details