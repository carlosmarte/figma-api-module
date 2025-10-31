# Figma Comments API - Setup & Configuration Instructions

Complete guide for installing and configuring the Figma Comments API client.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Basic Configuration](#basic-configuration)
- [Proxy Configuration](#proxy-configuration)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [Retry Logic](#retry-logic)
- [Logging](#logging)
- [Environment Variables](#environment-variables)
- [Corporate Networks](#corporate-networks)
- [Testing Setup](#testing-setup)
- [Troubleshooting](#troubleshooting)

## Installation

### npm

```bash
npm install figma-comments
```

### yarn

```bash
yarn add figma-comments
```

### pnpm

```bash
pnpm add figma-comments
```

## Authentication

### Obtaining a Figma API Token

1. Go to [Figma Settings > Account](https://www.figma.com/settings)
2. Scroll to "Personal Access Tokens"
3. Click "Create new token"
4. Give it a descriptive name (e.g., "Comments API Development")
5. Copy the token immediately (you won't see it again)

### Required Scopes

For comment operations, ensure your token has these scopes:
- `file_comments:read` - Read comments and reactions
- `file_comments:write` - Create, update, delete comments and reactions
- `files:read` - Access file information (required for some operations)

### Setting Up Your Token

**Option 1: Environment Variable (Recommended)**

```bash
# Add to your .env file
FIGMA_TOKEN=your-figma-token-here

# Or export in your shell
export FIGMA_TOKEN="your-figma-token-here"
```

**Option 2: Direct Configuration**

```javascript
import FigmaCommentsSDK from 'figma-comments';

const sdk = new FigmaCommentsSDK({
  apiToken: 'your-figma-token-here'
});
```

**Security Note**: Never commit tokens to version control. Always use environment variables or secrets management.

## Basic Configuration

### Minimal Setup

```javascript
import FigmaCommentsSDK from 'figma-comments';

const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN
});
```

### Recommended Setup

```javascript
import FigmaCommentsSDK from 'figma-comments';

const sdk = new FigmaCommentsSDK({
  // Required
  apiToken: process.env.FIGMA_TOKEN,

  // Recommended
  logger: console,        // Enable logging for debugging
  timeout: 30000,         // 30 second timeout
  retryConfig: {          // Automatic retries
    maxRetries: 3
  }
});
```

### Full Configuration

```javascript
const sdk = new FigmaCommentsSDK({
  // Authentication
  apiToken: process.env.FIGMA_TOKEN,

  // Network
  baseUrl: 'https://api.figma.com',
  timeout: 30000,

  // Proxy (optional)
  proxyUrl: process.env.HTTP_PROXY,
  proxyToken: process.env.HTTP_PROXY_TOKEN,

  // Retry logic
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  },

  // Rate limiting
  rateLimitConfig: {
    requestsPerMinute: 60,
    burstLimit: 10
  },

  // Caching
  cache: {
    maxSize: 100,
    ttl: 300000
  },

  // Logging
  logger: console
});
```

## Proxy Configuration

### Why Use a Proxy?

- Corporate network requirements
- Security compliance
- Request monitoring and auditing
- IP-based access control
- Request transformation or inspection

### Environment Variable Setup (Recommended)

```bash
# HTTP Proxy
export HTTP_PROXY="http://proxy.company.com:8080"

# With authentication
export HTTP_PROXY="http://username:password@proxy.company.com:8080"

# Or use separate token
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTP_PROXY_TOKEN="proxy-auth-token"

# HTTPS Proxy
export HTTPS_PROXY="https://proxy.company.com:8443"
```

Then use the SDK normally:

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN
  // Proxy is automatically detected from environment
});
```

### Direct Proxy Configuration

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  proxyUrl: 'http://proxy.company.com:8080',
  proxyToken: 'your-proxy-auth-token'  // Optional
});
```

### Authenticated Proxy

```javascript
// Option 1: Include credentials in URL
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  proxyUrl: 'http://username:password@proxy.company.com:8080'
});

// Option 2: Separate token
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  proxyUrl: 'http://proxy.company.com:8080',
  proxyToken: Buffer.from('username:password').toString('base64')
});
```

### Corporate Proxy Example

```javascript
// Corporate environment with strict network policies
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,

  // Use corporate proxy
  proxyUrl: process.env.CORPORATE_PROXY || 'http://proxy.corp.internal:3128',
  proxyToken: process.env.PROXY_AUTH,

  // Longer timeouts for proxy overhead
  timeout: 60000,

  // More retries for network issues
  retryConfig: {
    maxRetries: 5,
    initialDelay: 2000
  }
});
```

### Proxy Troubleshooting

```javascript
// Enable detailed logging to debug proxy issues
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  proxyUrl: process.env.HTTP_PROXY,

  logger: {
    debug: (msg) => console.log(`[DEBUG] ${msg}`),
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
  }
});
```

## Rate Limiting

### Default Rate Limits

The Figma API has rate limits:
- **60 requests per minute** per token
- **Burst allowance** of up to 10 requests

The client automatically handles rate limiting with a token bucket algorithm.

### Custom Rate Limiting

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  rateLimitConfig: {
    requestsPerMinute: 60,  // Align with Figma's limits
    burstLimit: 10          // Allow burst of requests
  }
});
```

### Disable Rate Limiting

```javascript
// Only if you're managing rate limits externally
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  rateLimitConfig: null
});
```

### Handling Rate Limit Errors

```javascript
import { RateLimitError } from 'figma-comments';

try {
  const comments = await sdk.getComments(fileKey);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
    // The client will automatically retry with exponential backoff
  }
}
```

## Caching

### Default Caching

GET requests are automatically cached for 5 minutes.

```javascript
// Default cache configuration
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  cache: {
    maxSize: 100,     // Cache up to 100 responses
    ttl: 300000       // 5 minutes
  }
});
```

### Custom Cache Settings

```javascript
// Longer cache for less frequently updated data
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  cache: {
    maxSize: 500,     // Cache more responses
    ttl: 900000       // 15 minutes
  }
});
```

### Disable Caching

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  cache: null
});
```

### Bypass Cache for Specific Requests

```javascript
// Cache is automatically bypassed for POST, PUT, DELETE
// For GET requests, use a unique parameter to bypass cache
const comments = await sdk.getComments(fileKey);
```

## Retry Logic

### Default Retry Behavior

- **Automatic retries** for network errors and 5xx server errors
- **Exponential backoff** with jitter to prevent thundering herd
- **No retries** for 4xx client errors (except 429 rate limit)

### Custom Retry Configuration

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  retryConfig: {
    maxRetries: 5,        // Retry up to 5 times
    initialDelay: 2000,   // Start with 2 second delay
    maxDelay: 60000,      // Max 60 second delay
    backoffFactor: 2      // Double delay each retry
  }
});
```

### Disable Retries

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  retryConfig: {
    maxRetries: 0
  }
});
```

### What Gets Retried

✅ **Retried automatically:**
- Network errors
- Timeout errors
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 429 Rate Limit (with backoff)

❌ **Not retried:**
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 422 Validation Error

## Logging

### Enable Logging

```javascript
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  logger: console
});
```

### Custom Logger

```javascript
const customLogger = {
  debug: (msg) => { /* your debug logic */ },
  info: (msg) => { /* your info logic */ },
  warn: (msg) => { /* your warn logic */ },
  error: (msg) => { /* your error logic */ }
};

const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  logger: customLogger
});
```

### Production Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN,
  logger: {
    debug: (msg) => logger.debug(msg),
    info: (msg) => logger.info(msg),
    warn: (msg) => logger.warn(msg),
    error: (msg) => logger.error(msg)
  }
});
```

## Environment Variables

### Recommended Variables

```bash
# Required
FIGMA_TOKEN=your-figma-personal-access-token

# Optional - Proxy
HTTP_PROXY=http://proxy.company.com:8080
HTTP_PROXY_TOKEN=your-proxy-auth-token
HTTPS_PROXY=https://proxy.company.com:8443

# Optional - Custom API endpoint
FIGMA_API_URL=https://api.figma.com

# Optional - Configuration
FIGMA_TIMEOUT=30000
FIGMA_MAX_RETRIES=3
FIGMA_CACHE_TTL=300000
```

### Loading from .env File

```bash
# .env file
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxx
HTTP_PROXY=http://localhost:8080
```

```javascript
// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Use in SDK
const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN
});
```

## Corporate Networks

### Complete Corporate Setup

```javascript
import FigmaCommentsSDK from 'figma-comments';

// Corporate environment configuration
const sdk = new FigmaCommentsSDK({
  // Authentication
  apiToken: process.env.FIGMA_TOKEN,

  // Corporate proxy with authentication
  proxyUrl: process.env.CORPORATE_PROXY,
  proxyToken: process.env.PROXY_TOKEN,

  // Network configuration
  timeout: 90000,  // 90 seconds for slow corporate networks

  // Aggressive retry for network issues
  retryConfig: {
    maxRetries: 5,
    initialDelay: 3000,
    maxDelay: 120000,
    backoffFactor: 2
  },

  // Conservative rate limiting
  rateLimitConfig: {
    requestsPerMinute: 50,  // Below Figma's limit for safety
    burstLimit: 5
  },

  // Longer cache for reduced network calls
  cache: {
    maxSize: 200,
    ttl: 900000  // 15 minutes
  },

  // Production logging
  logger: {
    debug: () => {},  // Disable debug in production
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
    error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
  }
});
```

### Firewall and Security

If you encounter connection issues:

1. **Whitelist Figma API endpoints**:
   - `api.figma.com`
   - `*.figma.com` (for CDN resources)

2. **Required ports**:
   - HTTPS: 443
   - HTTP: 80 (if needed)

3. **SSL/TLS**:
   - Ensure your corporate firewall allows TLS 1.2 or higher
   - Some firewalls do SSL inspection - ensure certificates are valid

## Testing Setup

### Mock Client for Tests

```javascript
import { jest } from '@jest/globals';
import FigmaCommentsSDK from 'figma-comments';

// Create mock fetch adapter
const mockFetch = jest.fn();
const mockFetchAdapter = { fetch: mockFetch };

const sdk = new FigmaCommentsSDK({
  apiToken: 'test-token',
  fetchFunction: mockFetchAdapter
});

// Mock responses
mockFetch.mockResolvedValueOnce({
  ok: true,
  status: 200,
  data: { comments: [] }
});
```

### Test Environment Variables

```bash
# .env.test
FIGMA_TOKEN=test-token-for-local-development
HTTP_PROXY=http://localhost:8888  # Local proxy for debugging
```

## Troubleshooting

### Connection Errors

**Problem**: `NetworkError: Network request failed`

**Solutions**:
1. Check internet connectivity
2. Verify proxy configuration
3. Check firewall rules
4. Ensure `api.figma.com` is accessible

```bash
# Test connectivity
curl https://api.figma.com/v1/me -H "X-Figma-Token: $FIGMA_TOKEN"
```

### Authentication Errors

**Problem**: `AuthenticationError: Authentication failed`

**Solutions**:
1. Verify your token is valid
2. Check token hasn't expired
3. Ensure token has required scopes
4. Regenerate token if needed

### Rate Limit Errors

**Problem**: `RateLimitError: Rate limit exceeded`

**Solutions**:
1. The client automatically retries with backoff
2. Reduce `requestsPerMinute` in config
3. Implement request batching
4. Cache responses when possible

### Proxy Errors

**Problem**: `ProxyError: Proxy authentication required`

**Solutions**:
1. Verify proxy credentials
2. Check `HTTP_PROXY_TOKEN` is set correctly
3. Test proxy connection:

```bash
# Test proxy
curl -x http://proxy.company.com:8080 https://api.figma.com/v1/me
```

### Timeout Errors

**Problem**: `TimeoutError: Request timeout`

**Solutions**:
1. Increase timeout value
2. Check network speed
3. Verify proxy isn't causing delays
4. Reduce payload size if possible

### Cache Issues

**Problem**: Stale data returned

**Solutions**:
1. Reduce `ttl` value
2. Disable cache for critical requests
3. Force cache clear by recreating client

## Next Steps

- **Examples**: See [EXAMPLES.md](./EXAMPLES.md) for usage examples
- **API Reference**: See [README.md](./README.md) for full API documentation
- **Source Code**: Browse the [GitHub repository](https://github.com/figma/figma-api-module)

## Support

- **Issues**: [GitHub Issues](https://github.com/figma/figma-api-module/issues)
- **Figma API Docs**: [developers.figma.com](https://www.figma.com/developers/api)
- **Community**: [Figma Community Forums](https://forum.figma.com)
