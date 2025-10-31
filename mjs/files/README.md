# Figma Files API Client

A comprehensive Node.js client library for the Figma Files API, providing both programmatic SDK access and command-line interface tools.

## Features

- **Complete API Coverage**: All Figma Files API endpoints
- **TypeScript Support**: Full type definitions via JSDoc
- **Rate Limiting**: Built-in request throttling and retry logic
- **Error Handling**: Structured error types with context
- **CLI Interface**: Command-line tools for all operations
- **Testing**: Comprehensive unit test coverage
- **Performance**: Optimized for production use with caching and connection pooling

## Installation

```bash
npm install figma-files-api
```

## Quick Start

### SDK Usage

```javascript
import { FigmaFilesSDK } from 'figma-files-api';

const sdk = new FigmaFilesSDK({
  apiToken: 'your-figma-token'
});

// Get file data
const file = await sdk.getFile('your-file-key');

// Render images
const images = await sdk.renderPNG('your-file-key', ['node-id-1', 'node-id-2']);

// Get file metadata
const metadata = await sdk.getMetadata('your-file-key');
```

### CLI Usage

```bash
# Set your API token
export FIGMA_API_TOKEN="your-figma-token"

# Get file data
figma-files get --file-key YOUR_FILE_KEY

# Render images
figma-files render-images --file-key YOUR_FILE_KEY --ids "1:2,3:4" --format png

# Get file metadata
figma-files get-metadata --file-key YOUR_FILE_KEY

# Get version history
figma-files get-versions --file-key YOUR_FILE_KEY
```

## API Reference

### SDK Methods

#### Core File Operations

##### `getFile(fileKey, options?)`
Get complete file JSON data.

```javascript
const file = await sdk.getFile('file-key', {
  version: 'specific-version-id',
  ids: 'node-id-1,node-id-2',  // Get specific nodes only
  depth: 2,                     // Limit tree depth
  geometry: 'paths',            // Include vector data
  pluginData: 'plugin-id',      // Include plugin data
  branchData: true              // Include branch metadata
});
```

##### `getNodes(fileKey, nodeIds, options?)`
Get specific nodes from a file.

```javascript
const nodes = await sdk.getNodes('file-key', ['1:2', '3:4'], {
  version: 'specific-version-id',
  depth: 1,
  geometry: 'paths',
  pluginData: 'plugin-id'
});
```

##### `getMetadata(fileKey)`
Get file metadata (lightweight operation).

```javascript
const metadata = await sdk.getMetadata('file-key');
// Returns: name, lastModified, thumbnailUrl, version, etc.
```

##### `getVersions(fileKey, options?)`
Get file version history.

```javascript
const versions = await sdk.getVersions('file-key', {
  pageSize: 20,
  before: 123,  // Get versions before this ID
  after: 456    // Get versions after this ID
});
```

#### Image Operations

##### `renderPNG(fileKey, nodeIds, options?)`
Render PNG images for specified nodes.

```javascript
const images = await sdk.renderPNG('file-key', ['1:2', '3:4'], {
  scale: 2,               // 0.01 to 4
  version: 'version-id',
  contentsOnly: true,
  useAbsoluteBounds: false
});
```

##### `renderJPG(fileKey, nodeIds, options?)`
Render JPG images for specified nodes.

```javascript
const images = await sdk.renderJPG('file-key', ['1:2'], {
  scale: 1.5
});
```

##### `renderSVG(fileKey, nodeIds, options?)`
Render SVG images with additional SVG-specific options.

```javascript
const images = await sdk.renderSVG('file-key', ['1:2'], {
  svgOutlineText: true,      // Render text as paths
  svgIncludeId: false,       // Include ID attributes
  svgIncludeNodeId: true,    // Include node ID attributes
  svgSimplifyStroke: true    // Simplify stroke rendering
});
```

##### `renderPDF(fileKey, nodeIds, options?)`
Render PDF documents.

```javascript
const pdfs = await sdk.renderPDF('file-key', ['1:2']);
```

##### `getImageFills(fileKey)`
Get download URLs for all image fills in a document.

```javascript
const imageFills = await sdk.getImageFills('file-key');
```

#### Convenience Methods

##### `getPages(fileKey)`
Get all pages (top-level canvas nodes) in a file.

```javascript
const pages = await sdk.getPages('file-key');
```

##### `searchNodesByName(fileKey, searchTerm)`
Search for nodes by name within a file.

```javascript
const matches = await sdk.searchNodesByName('file-key', 'button');
```

##### `getComponents(fileKey)`
Get all components defined in a file.

```javascript
const components = await sdk.getComponents('file-key');
```

##### `getStyles(fileKey)`
Get all styles defined in a file.

```javascript
const styles = await sdk.getStyles('file-key');
```

##### `extractTextContent(fileKey)`
Extract all text content from a file.

```javascript
const textContent = await sdk.extractTextContent('file-key');
```

##### `getFileAnalytics(fileKey)`
Get comprehensive analytics about a file.

```javascript
const analytics = await sdk.getFileAnalytics('file-key');
// Returns: nodeCount, pageCount, componentCount, etc.
```

#### Batch Operations

##### `batchGetFiles(fileKeys, options?)`
Get multiple files in parallel.

```javascript
const result = await sdk.batchGetFiles(['key1', 'key2', 'key3']);
console.log(`Success: ${result.successful.length}, Failed: ${result.failed.length}`);
```

##### `batchRenderImages(requests)`
Render images for multiple files.

```javascript
const requests = [
  { fileKey: 'key1', nodeIds: ['1:2'], options: { format: 'png' } },
  { fileKey: 'key2', nodeIds: ['3:4'], options: { format: 'jpg' } }
];

const results = await sdk.batchRenderImages(requests);
```

#### Utility Methods

##### Static Methods

```javascript
// Parse file key from Figma URL
const fileKey = FigmaFilesSDK.parseFileKeyFromUrl(
  'https://www.figma.com/file/abc123/My-Design'
);

// Parse node ID from Figma URL
const nodeId = FigmaFilesSDK.parseNodeIdFromUrl(
  'https://www.figma.com/file/abc123/My-Design?node-id=1%3A2'
);

// Validate file key format
const isValid = FigmaFilesSDK.isValidFileKey('abc123');
```

##### Instance Methods

```javascript
// Get client statistics
const stats = sdk.getStats();

// Health check
const isHealthy = await sdk.healthCheck();
```

## CLI Commands

### File Operations

```bash
# Get complete file data
figma-files get --file-key FILE_KEY [options]

# Get specific nodes
figma-files get-nodes --file-key FILE_KEY --ids "1:2,3:4" [options]

# Get file metadata
figma-files get-metadata --file-key FILE_KEY

# Get version history
figma-files get-versions --file-key FILE_KEY [--page-size 20] [--before 123]
```

### Image Operations

```bash
# Render images
figma-files render-images --file-key FILE_KEY --ids "1:2,3:4" [options]
  --format png|jpg|svg|pdf
  --scale 2
  --svg-outline-text
  --svg-include-id
  --use-absolute-bounds

# Get image fills
figma-files get-image-fills --file-key FILE_KEY
```

### Convenience Commands

```bash
# Get pages
figma-files pages --file-key FILE_KEY

# Search nodes by name
figma-files search --file-key FILE_KEY --query "button"

# Extract text content
figma-files extract-text --file-key FILE_KEY

# Get file analytics
figma-files analytics --file-key FILE_KEY
```

### Utility Commands

```bash
# Health check
figma-files health

# Show statistics
figma-files stats

# Parse Figma URL
figma-files parse-url --url "https://www.figma.com/file/abc123/Design"
```

### Global Options

```bash
--token TOKEN           # Figma API token (or set FIGMA_API_TOKEN)
--verbose               # Verbose output
--timeout MS            # Request timeout (default: 30000)
--max-retries N         # Max retry attempts (default: 3)
--json                  # Output as JSON
```

## Configuration

### Environment Variables

```bash
export FIGMA_API_TOKEN="your-figma-personal-access-token"
```

### SDK Configuration

```javascript
const sdk = new FigmaFilesSDK({
  apiToken: 'your-token',
  logger: console,  // Custom logger
  clientConfig: {
    timeout: 60000,
    retryConfig: {
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 30000,
      backoffFactor: 2
    },
    rateLimitConfig: {
      requestsPerMinute: 60,
      burstLimit: 10
    }
  }
});
```

## Error Handling

The library provides structured error types:

```javascript
import { 
  FigmaApiError,
  RateLimitError,
  AuthenticationError,
  FileNotFoundError,
  ValidationError 
} from 'figma-files-api';

try {
  const file = await sdk.getFile('invalid-key');
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.log('File not found:', error.meta.fileKey);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API token');
  }
}
```

## Performance Considerations

- **Rate Limiting**: Automatic request throttling (60 requests/minute by default)
- **Retry Logic**: Exponential backoff for transient failures
- **Connection Pooling**: Reuses HTTP connections for better performance
- **Memory Efficiency**: Streams large responses when possible
- **Caching**: Optional response caching for repeated requests

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## Examples

### Basic File Information

```javascript
import { FigmaFilesSDK } from 'figma-files-api';

const sdk = new FigmaFilesSDK({ apiToken: process.env.FIGMA_API_TOKEN });

async function getFileInfo(fileKey) {
  const [file, metadata, versions] = await Promise.all([
    sdk.getFile(fileKey, { depth: 1 }),
    sdk.getMetadata(fileKey),
    sdk.getVersions(fileKey, { pageSize: 5 })
  ]);

  console.log('File:', file.name);
  console.log('Last Modified:', metadata.lastModified);
  console.log('Recent Versions:', versions.versions.length);
  console.log('Pages:', file.document.children.map(page => page.name));
}
```

### Export All Artboards as Images

```javascript
async function exportArtboards(fileKey) {
  // Get all pages
  const pages = await sdk.getPages(fileKey);
  
  // Find all frames (artboards) in pages
  const frameIds = [];
  for (const page of pages) {
    const pageNodes = await sdk.getNodes(fileKey, [page.id], { depth: 1 });
    const frames = pageNodes.nodes[page.id].children.filter(
      node => node.type === 'FRAME'
    );
    frameIds.push(...frames.map(frame => frame.id));
  }

  // Render all frames as PNG
  if (frameIds.length > 0) {
    const images = await sdk.renderPNG(fileKey, frameIds, { scale: 2 });
    return images.images;
  }

  return {};
}
```

### Component Library Analysis

```javascript
async function analyzeComponentLibrary(fileKey) {
  const [components, file] = await Promise.all([
    sdk.getComponents(fileKey),
    sdk.getFile(fileKey)
  ]);

  const analysis = {
    totalComponents: Object.keys(components).length,
    componentsByPage: {},
    componentUsage: {}
  };

  // Count components by page
  function countComponentsInNode(node, pageName) {
    if (node.type === 'COMPONENT') {
      analysis.componentsByPage[pageName] = 
        (analysis.componentsByPage[pageName] || 0) + 1;
    }
    if (node.children) {
      node.children.forEach(child => 
        countComponentsInNode(child, pageName)
      );
    }
  }

  file.document.children.forEach(page => {
    analysis.componentsByPage[page.name] = 0;
    countComponentsInNode(page, page.name);
  });

  return analysis;
}
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [Figma API Documentation](https://www.figma.com/developers/api)
- [GitHub Issues](https://github.com/figma/rest-api-spec/issues)
- [Figma Community](https://spectrum.chat/figma)