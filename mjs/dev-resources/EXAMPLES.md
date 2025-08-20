# Figma Dev Resources SDK Examples

This document provides practical examples for using the Figma Dev Resources SDK.

## Basic Operations

### Getting Dev Resources

```javascript
import { FigmaDevResourcesSDK } from './sdk.mjs';

const sdk = new FigmaDevResourcesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

// Get all dev resources in a file
const allResources = await sdk.getFileDevResources('file-key');
console.log(`Found ${allResources.length} dev resources`);

// Get resources for specific nodes
const nodeResources = await sdk.getNodeDevResources('file-key', ['node-1', 'node-2']);
console.log('Resources for specific nodes:', nodeResources);
```

### Creating Dev Resources

```javascript
// Create a single dev resource
const resource = await sdk.createDevResource(
  'file-key',
  'node-id',
  'Documentation Link',
  'https://docs.example.com/component'
);
console.log('Created resource:', resource);

// Create multiple resources for one file
const resources = await sdk.createFileDevResources('file-key', [
  {
    nodeId: 'button-node',
    name: 'Button Component Docs',
    url: 'https://storybook.example.com/button'
  },
  {
    nodeId: 'input-node', 
    name: 'Input Component Docs',
    url: 'https://storybook.example.com/input'
  }
]);
console.log('Creation results:', resources);
```

### Updating Dev Resources

```javascript
// Update a single resource
const updated = await sdk.updateDevResource('resource-id', {
  name: 'Updated Component Name',
  url: 'https://new-docs.example.com'
});

// Batch update multiple resources
const updates = await sdk.updateMultipleDevResources([
  { id: 'resource-1', name: 'New Name 1' },
  { id: 'resource-2', url: 'https://updated-url.com' }
]);
```

### Deleting Dev Resources

```javascript
// Delete a single resource
await sdk.deleteDevResource('file-key', 'resource-id');

// Delete multiple resources
const deleteResults = await sdk.deleteMultipleDevResources([
  { fileKey: 'file-1', id: 'resource-1' },
  { fileKey: 'file-2', id: 'resource-2' }
]);

console.log('Successful deletions:', deleteResults.filter(r => r.success));
console.log('Failed deletions:', deleteResults.filter(r => !r.success));
```

## Advanced Patterns

### Resource Synchronization

```javascript
// Sync dev resources to match a desired state
const targetResources = [
  {
    nodeId: 'button-component',
    name: 'Button Documentation',
    url: 'https://design-system.com/button'
  },
  {
    nodeId: 'input-component', 
    name: 'Input Documentation',
    url: 'https://design-system.com/input'
  }
];

const syncResults = await sdk.syncFileDevResources('file-key', targetResources);

console.log(`Created: ${syncResults.created.length}`);
console.log(`Updated: ${syncResults.updated.length}`);
console.log(`Deleted: ${syncResults.deleted.length}`);
console.log(`Errors: ${syncResults.errors.length}`);
```

### Batch Operations with Progress

```javascript
import { FigmaDevResourcesClient } from './client.mjs';

const client = new FigmaDevResourcesClient({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

const largeResourceList = [
  // ... hundreds of resources
];

// Create with progress tracking
const results = await client.batchCreateDevResources(
  largeResourceList,
  (progress) => {
    console.log(`Progress: ${progress.processed}/${progress.total} (${Math.round(progress.processed/progress.total*100)}%)`);
  },
  20 // batch size
);

console.log(`Successfully created: ${results.links_created.length}`);
console.log(`Errors: ${results.errors.length}`);
```

### Multi-File Operations

```javascript
// Get resources from multiple files at once
const fileKeys = ['file-1', 'file-2', 'file-3'];
const multiFileResults = await client.getMultipleFileDevResources(fileKeys);

for (const [fileKey, result] of Object.entries(multiFileResults)) {
  if (result.error) {
    console.error(`Error for ${fileKey}:`, result.error);
  } else {
    console.log(`${fileKey}: ${result.dev_resources.length} resources`);
  }
}
```

### Error Handling Patterns

```javascript
import { 
  FigmaApiError, 
  FigmaRateLimitError, 
  FigmaAuthError, 
  FigmaValidationError 
} from './client.mjs';

async function robustResourceCreation(fileKey, nodeId, name, url) {
  try {
    return await sdk.createDevResource(fileKey, nodeId, name, url);
  } catch (error) {
    if (error instanceof FigmaRateLimitError) {
      console.log(`Rate limited, waiting ${error.meta.retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, error.meta.retryAfter * 1000));
      // Retry the operation
      return await sdk.createDevResource(fileKey, nodeId, name, url);
    } else if (error instanceof FigmaAuthError) {
      console.error('Authentication failed. Check your access token.');
      throw error;
    } else if (error instanceof FigmaValidationError) {
      console.error('Validation failed:', error.meta.validationErrors);
      throw error;
    } else {
      console.error('Unexpected error:', error.message);
      throw error;
    }
  }
}
```

## Utility Functions

### Search and Filter

```javascript
// Search resources by name pattern
const searchResults = await sdk.searchDevResources('file-key', 'documentation');
console.log('Found documentation resources:', searchResults);

// Get resources by URL pattern
const storyBookResources = await sdk.getDevResourcesByUrl('file-key', /storybook/i);
console.log('Storybook resources:', storyBookResources);

// Custom filtering
const allResources = await sdk.getFileDevResources('file-key');
const externalResources = allResources.filter(r => {
  try {
    const url = new URL(r.url);
    return !url.hostname.includes('figma.com');
  } catch {
    return false;
  }
});
console.log('External resources:', externalResources);
```

### Analytics and Reporting

```javascript
// Get comprehensive statistics
const stats = await sdk.getDevResourcesStats('file-key');
console.log('Dev Resources Statistics:', {
  total: stats.total,
  nodesWithResources: stats.nodesWithResources,
  uniqueDomains: stats.domains,
  topDomains: Object.entries(stats.byDomain)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
});

// Validate all resource URLs
const invalidResources = await sdk.validateDevResourceUrls('file-key');
if (invalidResources.length > 0) {
  console.warn(`Found ${invalidResources.length} invalid URLs:`);
  invalidResources.forEach(r => {
    console.warn(`- ${r.name}: ${r.url} (${r.error})`);
  });
}
```

## CLI Examples

### Basic CLI Usage

```bash
# Get all resources with table format
./cli.mjs get file-key --format table

# Create a new resource
./cli.mjs create file-key node-id \
  --name "API Documentation" \
  --url "https://api-docs.example.com"

# Update resource name and URL
./cli.mjs update resource-id \
  --name "Updated Documentation" \
  --url "https://new-docs.example.com"

# Search with pattern
./cli.mjs search file-key "storybook"

# Get detailed statistics
./cli.mjs stats file-key
```

### Batch Operations via CLI

```bash
# Create resources from JSON file
echo '[
  {
    "name": "Button Docs",
    "url": "https://docs.example.com/button",
    "file_key": "file-key",
    "node_id": "button-node"
  },
  {
    "name": "Input Docs", 
    "url": "https://docs.example.com/input",
    "file_key": "file-key",
    "node_id": "input-node"
  }
]' | ./cli.mjs create-batch --progress

# Sync resources from file
./cli.mjs sync file-key --file target-resources.json

# Validate all URLs
./cli.mjs validate file-key
```

## Integration Examples

### CI/CD Pipeline Integration

```javascript
// sync-dev-resources.mjs - CI script
import { FigmaDevResourcesSDK } from './sdk.mjs';
import { readFileSync } from 'fs';

const sdk = new FigmaDevResourcesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

// Read target resources from config
const targetResources = JSON.parse(readFileSync('./dev-resources-config.json', 'utf8'));

async function syncResources() {
  for (const fileConfig of targetResources) {
    console.log(`Syncing resources for file: ${fileConfig.fileKey}`);
    
    try {
      const results = await sdk.syncFileDevResources(
        fileConfig.fileKey, 
        fileConfig.resources
      );
      
      console.log(`✅ ${fileConfig.fileKey}: ${results.created.length} created, ${results.updated.length} updated, ${results.deleted.length} deleted`);
      
      if (results.errors.length > 0) {
        console.error(`❌ Errors:`, results.errors);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${fileConfig.fileKey}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('🎉 All resources synced successfully');
}

syncResources();
```

### Monitoring Script

```javascript
// monitor-resources.mjs - Health check script
import { FigmaDevResourcesSDK } from './sdk.mjs';

const sdk = new FigmaDevResourcesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

async function monitorResources(fileKeys) {
  const report = {
    timestamp: new Date().toISOString(),
    files: {}
  };

  for (const fileKey of fileKeys) {
    try {
      const [resources, invalidUrls] = await Promise.all([
        sdk.getFileDevResources(fileKey),
        sdk.validateDevResourceUrls(fileKey)
      ]);

      report.files[fileKey] = {
        totalResources: resources.length,
        invalidUrls: invalidUrls.length,
        healthScore: resources.length > 0 ? 
          ((resources.length - invalidUrls.length) / resources.length * 100).toFixed(1) : 100
      };

      if (invalidUrls.length > 0) {
        console.warn(`⚠️ ${fileKey}: ${invalidUrls.length} invalid URLs found`);
      }
    } catch (error) {
      report.files[fileKey] = {
        error: error.message
      };
      console.error(`❌ ${fileKey}: ${error.message}`);
    }
  }

  return report;
}

// Example usage
const fileKeys = ['file-1', 'file-2', 'file-3'];
const report = await monitorResources(fileKeys);
console.log('Health Report:', JSON.stringify(report, null, 2));
```

### Design System Integration

```javascript
// design-system-sync.mjs
import { FigmaDevResourcesSDK } from './sdk.mjs';

const sdk = new FigmaDevResourcesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

// Map component names to documentation URLs
const componentDocs = {
  'button': 'https://design-system.example.com/components/button',
  'input': 'https://design-system.example.com/components/input',
  'card': 'https://design-system.example.com/components/card'
};

async function syncDesignSystemDocs(fileKey) {
  // Get existing resources
  const existing = await sdk.getFileDevResources(fileKey);
  
  // Create map of node to documentation
  const targetResources = [];
  
  // This would typically come from your design system registry
  const componentNodes = await getComponentNodesFromFile(fileKey); // Your implementation
  
  for (const node of componentNodes) {
    const componentName = extractComponentName(node.name); // Your implementation
    const docUrl = componentDocs[componentName];
    
    if (docUrl) {
      targetResources.push({
        nodeId: node.id,
        name: `${node.name} Documentation`,
        url: docUrl
      });
    }
  }

  // Sync resources
  const results = await sdk.syncFileDevResources(fileKey, targetResources);
  console.log('Design system docs synced:', results);
}
```

## Configuration Examples

### Custom Rate Limiter

```javascript
class TokenBucketRateLimiter {
  constructor(tokensPerSecond = 2, bucketSize = 10) {
    this.tokensPerSecond = tokensPerSecond;
    this.bucketSize = bucketSize;
    this.tokens = bucketSize;
    this.lastRefill = Date.now();
  }

  async checkLimit() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    
    // Refill tokens
    this.tokens = Math.min(
      this.bucketSize,
      this.tokens + (timePassed * this.tokensPerSecond)
    );
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.tokensPerSecond * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 0;
    } else {
      this.tokens -= 1;
    }
  }
}

const sdk = new FigmaDevResourcesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN,
  rateLimiter: new TokenBucketRateLimiter(2, 10) // 2 requests per second, burst of 10
});
```

### Redis Cache Implementation

```javascript
import Redis from 'redis';

class RedisCache {
  constructor(redisClient, ttl = 300) { // 5 minute TTL
    this.redis = redisClient;
    this.ttl = ttl;
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key, value) {
    try {
      await this.redis.setEx(key, this.ttl, JSON.stringify(value));
    } catch {
      // Ignore cache set errors
    }
  }
}

const redis = Redis.createClient();
await redis.connect();

const sdk = new FigmaDevResourcesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN,
  cache: new RedisCache(redis, 600) // 10 minute cache
});
```

These examples demonstrate the flexibility and power of the Figma Dev Resources SDK for various use cases, from simple CRUD operations to complex automation workflows.