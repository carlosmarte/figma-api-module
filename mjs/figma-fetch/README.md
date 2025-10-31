# @figma-api/fetch

Abstract fetch client for Figma API with composable utilities for rate limiting, caching, retry logic, and proxy support.

## Features

- **Fetch Abstraction**: Use any fetch implementation (native fetch, undici, axios, etc.)
- **Composable Utilities**: Optional rate limiting, caching, and retry logic
- **Proxy Support**: Built-in support for HTTP proxies via undici
- **TypeScript**: Full TypeScript support with type definitions
- **Dual Output**: ESM (.mjs) and CommonJS (.js) builds
- **Error Handling**: Comprehensive error hierarchy for Figma API errors
- **Interceptors**: Request, response, and error interceptors
- **Statistics**: Built-in request statistics and monitoring

## Installation

```bash
npm install @figma-api/fetch
```

## Quick Start

### Basic Usage

```javascript
import { FigmaApiClient } from '@figma-api/fetch';

const client = new FigmaApiClient({
  apiToken: 'your-figma-token',
  // or it will use process.env.FIGMA_TOKEN
});

// Make requests
const fileData = await client.get('/v1/files/FILE_KEY');
const webhooks = await client.get('/v2/webhooks', { team_id: 'TEAM_ID' });
```

### With Proxy Support

```javascript
import { FigmaApiClient, UndiciFetchAdapter } from '@figma-api/fetch';

const client = new FigmaApiClient({
  apiToken: 'your-figma-token',
  fetchAdapter: new UndiciFetchAdapter({
    url: 'http://proxy.example.com:8080',
    token: 'proxy-auth-token'  // optional
  })
});

// Or use environment variables
// HTTP_PROXY=http://proxy.example.com:8080
// HTTP_PROXY_TOKEN=proxy-auth-token
const clientWithEnvProxy = new FigmaApiClient({
  apiToken: 'your-figma-token',
  proxy: { enabled: true }  // will use HTTP_PROXY from env
});
```

### With Rate Limiting and Caching

```javascript
import { FigmaApiClient } from '@figma-api/fetch';

const client = new FigmaApiClient({
  apiToken: 'your-figma-token',
  rateLimiter: {
    requestsPerMinute: 60,
    burstLimit: 10
  },
  cache: {
    maxSize: 100,
    ttl: 300000  // 5 minutes
  }
});
```

### Custom Retry Configuration

```javascript
import { FigmaApiClient } from '@figma-api/fetch';

const client = new FigmaApiClient({
  apiToken: 'your-figma-token',
  retry: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitterFactor: 0.1
  }
});
```

## Architecture

### Fetch Adapters

The module provides two built-in fetch adapters:

#### NativeFetchAdapter (Default)

Uses the native fetch API available in Node.js 18+:

```javascript
import { FigmaApiClient, NativeFetchAdapter } from '@figma-api/fetch';

const client = new FigmaApiClient({
  apiToken: 'your-token',
  fetchAdapter: new NativeFetchAdapter()
});
```

#### UndiciFetchAdapter (For Proxy Support)

Uses undici's fetch with support for HTTP proxies:

```javascript
import { FigmaApiClient, UndiciFetchAdapter } from '@figma-api/fetch';

const client = new FigmaApiClient({
  apiToken: 'your-token',
  fetchAdapter: new UndiciFetchAdapter({
    url: process.env.HTTP_PROXY,
    token: process.env.HTTP_PROXY_TOKEN
  })
});
```

### Custom Fetch Adapter

You can create your own fetch adapter by extending `FetchAdapter`:

```javascript
import { FetchAdapter } from '@figma-api/fetch';
import axios from 'axios';

class AxiosFetchAdapter extends FetchAdapter {
  async fetch(request) {
    try {
      const response = await axios({
        url: request.url,
        method: request.method || 'GET',
        headers: request.headers,
        data: request.body,
        timeout: request.timeout,
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        ok: response.status >= 200 && response.status < 300,
      };
    } catch (error) {
      // Handle errors
      throw error;
    }
  }
}

const client = new FigmaApiClient({
  apiToken: 'your-token',
  fetchAdapter: new AxiosFetchAdapter()
});
```

## Extending FigmaApiClient

Create custom clients by extending `FigmaApiClient`:

```javascript
import { FigmaApiClient } from '@figma-api/fetch';

export class FigmaWebhooksClient extends FigmaApiClient {
  constructor(options = {}) {
    super(options);
    this.eventTypes = ['PING', 'FILE_UPDATE', 'FILE_DELETE'];
  }

  async getWebhooks(params = {}) {
    return this.get('/v2/webhooks', params);
  }

  async createWebhook(webhookData) {
    return this.post('/v2/webhooks', webhookData);
  }

  async deleteWebhook(webhookId) {
    return this.delete(`/v2/webhooks/${webhookId}`);
  }
}
```

## Utilities

### RateLimiter

```javascript
import { RateLimiter } from '@figma-api/fetch';

const limiter = new RateLimiter({
  requestsPerMinute: 60,
  burstLimit: 10
});

await limiter.checkLimit();  // Throws RateLimitError if exceeded
const stats = limiter.getStats();
```

### RequestCache

```javascript
import { RequestCache } from '@figma-api/fetch';

const cache = new RequestCache({
  maxSize: 100,
  ttl: 300000  // 5 minutes
});

cache.set('/v1/files/abc', fileData);
const cached = cache.get('/v1/files/abc');
const stats = cache.getStats();
```

### RetryHandler

```javascript
import { RetryHandler } from '@figma-api/fetch';

const retryHandler = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 2
});

const result = await retryHandler.execute(
  async () => {
    return await someFlakyOperation();
  },
  (attempt, delay, error) => {
    console.log(`Retry attempt ${attempt} after ${delay}ms`, error);
  }
);
```

## Interceptors

Add custom behavior to requests and responses:

```javascript
const client = new FigmaApiClient({ apiToken: 'token' });

// Request interceptor
client.addRequestInterceptor(async (request) => {
  console.log('Making request:', request.url);
  request.headers['X-Custom-Header'] = 'value';
  return request;
});

// Response interceptor
client.addResponseInterceptor(async (response) => {
  console.log('Received response:', response.status);
  return response;
});

// Error interceptor
client.addErrorInterceptor(async (error) => {
  console.error('Request failed:', error.message);
  throw error;
});
```

## Error Handling

The module provides a comprehensive error hierarchy:

```javascript
import {
  FigmaFetchError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ServerError
} from '@figma-api/fetch';

try {
  await client.get('/v1/files/FILE_KEY');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded, retry after:', error.meta.retryAfter);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed');
  } else if (error instanceof NotFoundError) {
    console.log('Resource not found');
  }
}
```

## Statistics

Monitor client performance:

```javascript
const stats = client.getStats();
console.log({
  totalRequests: stats.totalRequests,
  successfulRequests: stats.successfulRequests,
  failedRequests: stats.failedRequests,
  cachedResponses: stats.cachedResponses,
  retries: stats.retries,
  avgResponseTime: stats.avgResponseTime,
  rateLimiter: stats.rateLimiter,  // if configured
  cache: stats.cache  // if configured
});

// Health check
const health = await client.healthCheck();
console.log(health.status);  // 'healthy' or 'unhealthy'
```

## Migration Guide

### Migrating Existing Modules to figma-fetch

If you have existing Figma API clients using undici directly, here's how to migrate:

#### Before:

```javascript
import { fetch, ProxyAgent } from 'undici';

class MyFigmaClient {
  constructor({ apiToken, baseUrl, proxyUrl }) {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const fetchOptions = {
      ...options,
      headers: {
        'X-Figma-Token': this.apiToken,
        ...options.headers
      }
    };

    if (this.proxyAgent) {
      fetchOptions.dispatcher = this.proxyAgent;
    }

    const response = await fetch(url, fetchOptions);
    return response.json();
  }
}
```

#### After:

```javascript
import { FigmaApiClient, UndiciFetchAdapter } from '../figma-fetch/dist/index.mjs';

class MyFigmaClient extends FigmaApiClient {
  constructor({ apiToken, baseUrl, proxyUrl, proxyToken }) {
    const fetchAdapter = proxyUrl ? new UndiciFetchAdapter({
      url: proxyUrl,
      token: proxyToken
    }) : undefined;

    super({
      apiToken,
      baseUrl,
      fetchAdapter,
      rateLimiter: { requestsPerMinute: 60 },  // optional
      cache: { maxSize: 100, ttl: 300000 },    // optional
      retry: { maxRetries: 3 }                 // optional
    });
  }

  // Your custom methods remain the same, but use this.get(), this.post(), etc.
}
```

### Key Changes:

1. **Extend `FigmaApiClient`** instead of implementing your own client
2. **Use `UndiciFetchAdapter`** for proxy support instead of `ProxyAgent` directly
3. **Remove manual fetch calls** - use `this.get()`, `this.post()`, etc.
4. **Remove manual retry logic** - handled by `RetryHandler`
5. **Remove manual rate limiting** - use built-in `RateLimiter`
6. **Module-specific errors** - throw your own error types in constructor if needed

## API Reference

### FigmaApiClient

#### Constructor Options

- `apiToken` (string): Figma API token (or use `FIGMA_TOKEN` env var)
- `baseUrl` (string): API base URL (default: 'https://api.figma.com')
- `logger` (Logger): Custom logger (default: console)
- `timeout` (number): Request timeout in ms (default: 30000)
- `fetchAdapter` (FetchAdapter): Custom fetch adapter
- `rateLimiter` (RateLimiterConfig | null): Rate limiter config
- `cache` (CacheConfig | null): Cache config
- `retry` (RetryConfig): Retry config
- `proxy` (ProxyConfig): Proxy config

#### Methods

- `get<T>(path, params?)`: Make GET request
- `post<T>(path, data?)`: Make POST request
- `put<T>(path, data?)`: Make PUT request
- `patch<T>(path, data?)`: Make PATCH request
- `delete<T>(path)`: Make DELETE request
- `request<T>(path, options?)`: Make custom request
- `healthCheck()`: Check API connectivity
- `getStats()`: Get client statistics
- `reset()`: Reset statistics and cache
- `addRequestInterceptor(fn)`: Add request interceptor
- `addResponseInterceptor(fn)`: Add response interceptor
- `addErrorInterceptor(fn)`: Add error interceptor

## License

MIT

## Contributing

See the main [figma-api-module](https://github.com/thinkeloquent/figma-api-module) repository.
