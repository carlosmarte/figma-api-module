# Figma Comments API Client

A comprehensive Node.js library for interacting with the Figma Comments API, featuring a complete CLI, SDK, and robust client implementation.

## Features

- 🔄 **Complete API Coverage**: All Figma Comments endpoints (GET, POST, DELETE)
- ⚡ **Production Ready**: Rate limiting, retries, caching, and error handling
- 🧰 **Developer Friendly**: High-level SDK with intuitive methods
- 🖥️ **CLI Interface**: Full command-line tool for comment management
- 📊 **Analytics**: Comment statistics, engagement metrics, and activity tracking
- 🔍 **Search & Filter**: Advanced comment search and filtering capabilities
- 📤 **Export**: JSON, CSV, and Markdown export formats
- 🔧 **Extensible**: Modular architecture with dependency injection
- ✅ **Well Tested**: Comprehensive unit test suite
- 📝 **TypeScript Ready**: JSDoc annotations for IDE support

## Installation

```bash
npm install figma-comments
```

## Quick Start

### API Token

Get your Figma API token from [Figma Developer Settings](https://www.figma.com/developers/api#authentication).

### Environment Variable

```bash
export FIGMA_TOKEN="your-figma-token"
```

### Basic Usage

```javascript
import FigmaCommentsSDK from 'figma-comments';

const sdk = new FigmaCommentsSDK({
  apiToken: process.env.FIGMA_TOKEN
});

// Get all comments in a file
const comments = await sdk.getComments('file-key');

// Add a comment
const comment = await sdk.addComment('file-key', 'Hello from API!');

// Add a comment at specific coordinates
const positionedComment = await sdk.addCommentAtCoordinates(
  'file-key', 
  100, 
  200, 
  'Comment at (100, 200)'
);

// Reply to a comment
const reply = await sdk.replyToComment('file-key', 'comment-id', 'Great point!');

// Search comments
const results = await sdk.searchComments('file-key', 'design feedback');

// Get comment statistics
const stats = await sdk.getCommentStatistics('file-key');
```

## CLI Usage

Install globally for CLI access:

```bash
npm install -g figma-comments
```

### CLI Commands

```bash
# List all comments
figma-comments list <file-key>

# Add a comment
figma-comments add <file-key> -m "Your comment here"

# Add a comment at coordinates
figma-comments add <file-key> -m "Positioned comment" -x 100 -y 200

# Add a comment to a specific node
figma-comments add <file-key> -m "Node comment" -n "node-id"

# Reply to a comment
figma-comments reply <file-key> <comment-id> -m "Reply message"

# Search comments
figma-comments search <file-key> "search term"

# Delete a comment
figma-comments delete <file-key> <comment-id> --confirm

# Export comments
figma-comments export <file-key> -f json -o comments.json
figma-comments export <file-key> -f csv -o comments.csv
figma-comments export <file-key> -f markdown -o comments.md

# Get statistics
figma-comments stats <file-key>
figma-comments stats <file-key> --engagement
figma-comments stats <file-key> --activity 30

# Get recent comments
figma-comments recent <file-key> -d 7

# Get comment thread
figma-comments thread <file-key> <comment-id>

# Bulk operations
figma-comments bulk-delete <file-key> -i "id1,id2,id3" --confirm

# Health check
figma-comments health

# List unresolved comments
figma-comments list <file-key> --unresolved

# List comments by user
figma-comments list <file-key> --user <user-id>

# Group comments by thread
figma-comments list <file-key> --threads
```

### CLI Options

- `-t, --token <token>`: Figma API token (or set FIGMA_TOKEN env var)
- `-v, --verbose`: Verbose output
- `--no-cache`: Disable request caching
- `--timeout <ms>`: Request timeout in milliseconds
- `-f, --format <format>`: Output format (json|table|csv|markdown)
- `-o, --output <file>`: Output to file instead of stdout

## API Reference

### Core Classes

#### FigmaCommentsSDK

The main SDK class providing high-level methods:

```javascript
import { FigmaCommentsSDK } from 'figma-comments';

const sdk = new FigmaCommentsSDK({
  apiToken: 'your-token',
  logger: console,
  timeout: 30000,
  retries: 3
});
```

#### FigmaCommentsService

Business logic layer for comment operations:

```javascript
import { FigmaCommentsService } from 'figma-comments';

const service = new FigmaCommentsService({
  apiToken: 'your-token'
});
```

#### FigmaCommentsClient

Low-level HTTP client with rate limiting and retries:

```javascript
import { FigmaCommentsClient } from 'figma-comments';

const client = new FigmaCommentsClient({
  apiToken: 'your-token',
  baseUrl: 'https://api.figma.com',
  rateLimiter: null, // Custom rate limiter
  cache: null,       // Custom cache
  timeout: 30000,
  retries: 3
});
```

### SDK Methods

#### Comment Operations

```javascript
// Get all comments
const comments = await sdk.getComments(fileKey, options);

// Add a comment
const comment = await sdk.addComment(fileKey, message, options);

// Add comment at coordinates
const comment = await sdk.addCommentAtCoordinates(fileKey, x, y, message);

// Add comment to node
const comment = await sdk.addCommentToNode(fileKey, nodeId, message, offset);

// Delete a comment
const result = await sdk.deleteComment(fileKey, commentId);

// Reply to a comment
const reply = await sdk.replyToComment(fileKey, commentId, message);
```

#### Search & Filter

```javascript
// Search comments
const results = await sdk.searchComments(fileKey, query, options);

// Get comments by user
const userComments = await sdk.getCommentsByUser(fileKey, userId);

// Get unresolved comments
const unresolved = await sdk.getUnresolvedComments(fileKey);

// Get recent comments
const recent = await sdk.getRecentComments(fileKey, days);

// Get comment thread
const thread = await sdk.getCommentThread(fileKey, commentId);

// Find mentions
const mentions = await sdk.findMentions(fileKey, userId);
```

#### Analytics & Statistics

```javascript
// Get comment statistics
const stats = await sdk.getCommentStatistics(fileKey);

// Get engagement metrics
const engagement = await sdk.getEngagementMetrics(fileKey);

// Get comment activity
const activity = await sdk.getCommentActivity(fileKey, days);

// Group comments by thread
const threads = await sdk.getCommentsGroupedByThread(fileKey);
```

#### Bulk Operations

```javascript
// Export comments
const jsonData = await sdk.exportComments(fileKey, 'json');
const csvData = await sdk.exportComments(fileKey, 'csv');
const markdownData = await sdk.exportComments(fileKey, 'markdown');

// Bulk add comments
const results = await sdk.bulkAddComments(fileKey, commentsArray);

// Bulk delete comments
const results = await sdk.bulkDeleteComments(fileKey, commentIds);
```

#### Health & Monitoring

```javascript
// Health check
const health = await sdk.healthCheck();

// Get client statistics
const stats = sdk.getStats();

// Reset cache and stats
sdk.reset();
```

## Advanced Usage

### Custom Rate Limiting

```javascript
import { FigmaCommentsSDK, RateLimiter } from 'figma-comments';

const customRateLimiter = new RateLimiter({
  requestsPerMinute: 30,  // Custom rate limit
  burstLimit: 5           // Burst allowance
});

const sdk = new FigmaCommentsSDK({
  apiToken: 'your-token',
  rateLimiter: customRateLimiter
});
```

### Custom Caching

```javascript
import { FigmaCommentsSDK, RequestCache } from 'figma-comments';

const customCache = new RequestCache({
  maxSize: 200,     // Cache up to 200 requests
  ttl: 600000      // 10-minute TTL
});

const sdk = new FigmaCommentsSDK({
  apiToken: 'your-token',
  cache: customCache
});
```

### Error Handling

```javascript
import { 
  FigmaCommentsSDK, 
  RateLimitError, 
  AuthenticationError,
  ValidationError,
  NotFoundError 
} from 'figma-comments';

try {
  const comments = await sdk.getComments('file-key');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API token');
  } else if (error instanceof ValidationError) {
    console.log(`Validation error: ${error.message}`);
  } else if (error instanceof NotFoundError) {
    console.log('File or comment not found');
  } else {
    console.log(`Unexpected error: ${error.message}`);
  }
}
```

### Custom Logging

```javascript
const customLogger = {
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
  info: (msg) => console.info(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`)
};

const sdk = new FigmaCommentsSDK({
  apiToken: 'your-token',
  logger: customLogger
});
```

## Comment Positioning

Comments can be positioned in several ways:

### Canvas Coordinates

```javascript
await sdk.addCommentAtCoordinates(fileKey, 100, 200, 'Comment at (100, 200)');
```

### Node Attachment

```javascript
await sdk.addCommentToNode(fileKey, 'node-id', 'Comment on node', { x: 10, y: 20 });
```

### Advanced Positioning

```javascript
await sdk.addComment(fileKey, 'Advanced comment', {
  position: {
    nodeId: 'frame-node-id',
    offsetX: 50,
    offsetY: 100
  }
});
```

## Export Formats

### JSON Export

```javascript
const jsonData = await sdk.exportComments(fileKey, 'json');
// Full comment objects with all metadata
```

### CSV Export

```javascript
const csvData = await sdk.exportComments(fileKey, 'csv');
// CSV format: ID, Message, User, Created At, Resolved At, Parent ID
```

### Markdown Export

```javascript
const markdownData = await sdk.exportComments(fileKey, 'markdown');
// Formatted markdown with threads and replies
```

## Performance Considerations

- **Rate Limiting**: Default 60 requests/minute with burst capacity
- **Caching**: GET requests cached for 5 minutes by default
- **Retries**: Automatic retry with exponential backoff for transient errors
- **Memory**: Efficient streaming for large comment datasets
- **Timeouts**: 30-second default timeout with configurable values

## Development

### Setup

```bash
git clone <repository-url>
cd figma-comments
npm install
```

### Testing

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Linting

```bash
npm run lint            # ESLint
npm run format          # Prettier
```

### Local CLI Development

```bash
npm link                # Link for global CLI usage
figma-comments --help  # Test CLI
npm unlink             # Unlink when done
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Run linting and tests: `npm run lint && npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- [GitHub Issues](https://github.com/figma/figma-api-module/issues)
- [Figma Developer Documentation](https://www.figma.com/developers/api#comments)
- [Figma Community](https://www.figma.com/community)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.