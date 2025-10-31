# Figma Files API - Examples

This document provides practical examples for using the Figma Files API client library.

## Table of Contents

- [Setup and Authentication](#setup-and-authentication)
- [Basic File Operations](#basic-file-operations)
- [Image Rendering](#image-rendering)
- [Batch Operations](#batch-operations)
- [Component Management](#component-management)
- [Text and Content Extraction](#text-and-content-extraction)
- [Version Control](#version-control)
- [Advanced Use Cases](#advanced-use-cases)
- [CLI Examples](#cli-examples)
- [Error Handling](#error-handling)

## Setup and Authentication

### Getting Your API Token

1. Go to your [Figma account settings](https://www.figma.com/settings)
2. Navigate to the "Personal access tokens" section
3. Click "Create new token"
4. Give it a descriptive name and copy the token

### Basic Setup

```javascript
import { FigmaFilesSDK } from 'figma-files-api';

// Method 1: Direct token
const sdk = new FigmaFilesSDK({
  apiToken: 'figd_your_token_here'
});

// Method 2: Environment variable
process.env.FIGMA_API_TOKEN = 'figd_your_token_here';
const sdk = new FigmaFilesSDK({
  apiToken: process.env.FIGMA_API_TOKEN
});

// Method 3: With custom configuration
const sdk = new FigmaFilesSDK({
  apiToken: process.env.FIGMA_API_TOKEN,
  clientConfig: {
    timeout: 60000,  // 60 second timeout
    retryConfig: {
      maxRetries: 5,
      initialDelay: 2000
    }
  }
});
```

### Extracting File Key from URL

```javascript
// From a Figma file URL
const fileUrl = 'https://www.figma.com/file/abc123xyz/My-Awesome-Design?node-id=1%3A2';
const fileKey = FigmaFilesSDK.parseFileKeyFromUrl(fileUrl);
console.log('File Key:', fileKey); // 'abc123xyz'

const nodeId = FigmaFilesSDK.parseNodeIdFromUrl(fileUrl);
console.log('Node ID:', nodeId); // '1:2'
```

## Basic File Operations

### Get Complete File Data

```javascript
async function getFileOverview(fileKey) {
  try {
    const file = await sdk.getFile(fileKey);
    
    console.log('File Name:', file.name);
    console.log('Last Modified:', file.lastModified);
    console.log('Version:', file.version);
    console.log('Pages:', file.document.children.map(page => ({
      id: page.id,
      name: page.name,
      type: page.type
    })));

    return file;
  } catch (error) {
    console.error('Failed to get file:', error.message);
  }
}

// Usage
await getFileOverview('your-file-key');
```

### Get File with Specific Nodes Only

```javascript
async function getSpecificNodes(fileKey, nodeIds) {
  // Get only specific nodes to reduce payload size
  const nodes = await sdk.getNodes(fileKey, nodeIds, {
    depth: 2,  // Limit how deep we traverse
    geometry: 'paths'  // Include vector data
  });

  return nodes;
}

// Usage
const nodeData = await getSpecificNodes('file-key', ['1:2', '3:4', '5:6']);
```

### Get Lightweight File Metadata

```javascript
async function getQuickFileInfo(fileKey) {
  // Just metadata, very fast
  const metadata = await sdk.getMetadata(fileKey);
  
  console.log({
    name: metadata.name,
    lastModified: metadata.lastModified,
    thumbnailUrl: metadata.thumbnailUrl,
    version: metadata.version,
    role: metadata.role
  });

  return metadata;
}
```

## Image Rendering

### Export All Artboards as PNG

```javascript
async function exportAllArtboards(fileKey, outputDir = './exports') {
  try {
    // Get file structure
    const file = await sdk.getFile(fileKey, { depth: 2 });
    
    // Find all frame nodes (artboards)
    const frames = [];
    
    function findFrames(node) {
      if (node.type === 'FRAME') {
        frames.push({
          id: node.id,
          name: node.name,
          page: node.parent?.name || 'Unknown'
        });
      }
      if (node.children) {
        node.children.forEach(findFrames);
      }
    }

    file.document.children.forEach(findFrames);
    
    console.log(`Found ${frames.length} artboards`);

    // Render all frames as PNG
    if (frames.length > 0) {
      const frameIds = frames.map(frame => frame.id);
      const images = await sdk.renderPNG(fileKey, frameIds, {
        scale: 2,  // 2x resolution
        format: 'png'
      });

      // Save images (you'd implement the actual saving)
      for (const frame of frames) {
        const imageUrl = images.images[frame.id];
        if (imageUrl) {
          console.log(`Export: ${frame.name} -> ${imageUrl}`);
          // await downloadImage(imageUrl, `${outputDir}/${frame.name}.png`);
        }
      }

      return images;
    }
  } catch (error) {
    console.error('Export failed:', error.message);
  }
}
```

### Export Component Variations

```javascript
async function exportComponentVariations(fileKey) {
  // Get components
  const components = await sdk.getComponents(fileKey);
  
  // Find component sets (variations)
  const componentSets = Object.values(components).filter(
    comp => comp.componentSetId
  );

  // Group by component set
  const setGroups = {};
  componentSets.forEach(comp => {
    const setId = comp.componentSetId;
    if (!setGroups[setId]) {
      setGroups[setId] = [];
    }
    setGroups[setId].push(comp);
  });

  // Export each variation
  for (const [setId, variations] of Object.entries(setGroups)) {
    const nodeIds = variations.map(v => v.nodeId);
    const images = await sdk.renderPNG(fileKey, nodeIds, { scale: 2 });
    
    variations.forEach(variation => {
      const imageUrl = images.images[variation.nodeId];
      console.log(`${variation.name}: ${imageUrl}`);
    });
  }
}
```

### Generate Style Guide Images

```javascript
async function generateStyleGuide(fileKey) {
  // Get styles and components
  const [styles, components, file] = await Promise.all([
    sdk.getStyles(fileKey),
    sdk.getComponents(fileKey),
    sdk.getFile(fileKey, { depth: 1 })
  ]);

  const exports = {
    colors: [],
    typography: [],
    components: []
  };

  // Find style showcase nodes (you'd need to identify these)
  function findStyleNodes(node) {
    if (node.name?.toLowerCase().includes('color palette')) {
      exports.colors.push(node.id);
    }
    if (node.name?.toLowerCase().includes('typography')) {
      exports.typography.push(node.id);
    }
    if (node.children) {
      node.children.forEach(findStyleNodes);
    }
  }

  file.document.children.forEach(findStyleNodes);

  // Export component library overview
  const componentIds = Object.values(components).map(c => c.nodeId);
  exports.components = componentIds.slice(0, 20); // Limit to first 20

  // Render all style guide sections
  const results = {};
  
  if (exports.colors.length > 0) {
    results.colors = await sdk.renderPNG(fileKey, exports.colors);
  }
  
  if (exports.typography.length > 0) {
    results.typography = await sdk.renderPNG(fileKey, exports.typography);
  }
  
  if (exports.components.length > 0) {
    results.components = await sdk.renderPNG(fileKey, exports.components);
  }

  return results;
}
```

## Batch Operations

### Process Multiple Design Files

```javascript
async function processDesignSystem(fileKeys) {
  // Get all files in parallel
  const results = await sdk.batchGetFiles(fileKeys);
  
  console.log(`Successfully loaded ${results.successful.length} files`);
  console.log(`Failed to load ${results.failed.length} files`);

  // Process successful files
  const analysis = {
    totalComponents: 0,
    totalStyles: 0,
    fileDetails: []
  };

  for (const file of results.successful) {
    const components = Object.keys(file.components || {}).length;
    const styles = Object.keys(file.styles || {}).length;
    
    analysis.totalComponents += components;
    analysis.totalStyles += styles;
    analysis.fileDetails.push({
      name: file.name,
      components,
      styles,
      pages: file.document.children.length
    });
  }

  return analysis;
}

// Usage
const systemFiles = ['main-components', 'icons', 'patterns', 'templates'];
const analysis = await processDesignSystem(systemFiles);
```

### Bulk Image Export with Progress

```javascript
async function bulkImageExport(requests, onProgress) {
  const total = requests.length;
  let completed = 0;

  const results = await Promise.allSettled(
    requests.map(async (request) => {
      try {
        const images = await sdk.renderPNG(
          request.fileKey, 
          request.nodeIds, 
          request.options
        );
        
        completed++;
        onProgress && onProgress(completed, total);
        
        return {
          success: true,
          fileKey: request.fileKey,
          images: images.images
        };
      } catch (error) {
        completed++;
        onProgress && onProgress(completed, total);
        
        return {
          success: false,
          fileKey: request.fileKey,
          error: error.message
        };
      }
    })
  );

  return results.map(result => result.value);
}

// Usage
const exportRequests = [
  { fileKey: 'file1', nodeIds: ['1:2', '3:4'], options: { scale: 2 } },
  { fileKey: 'file2', nodeIds: ['5:6'], options: { format: 'jpg' } }
];

const results = await bulkImageExport(exportRequests, (completed, total) => {
  console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
});
```

## Component Management

### Component Library Inventory

```javascript
async function inventoryComponentLibrary(fileKey) {
  const [file, components] = await Promise.all([
    sdk.getFile(fileKey),
    sdk.getComponents(fileKey)
  ]);

  const inventory = {
    summary: {
      totalComponents: Object.keys(components).length,
      componentsByPage: {},
      componentsByType: {}
    },
    components: []
  };

  // Analyze each component
  for (const [nodeId, component] of Object.entries(components)) {
    const componentInfo = {
      id: nodeId,
      name: component.name,
      description: component.description,
      componentSetId: component.componentSetId,
      createdAt: component.createdAt,
      updatedAt: component.updatedAt
    };

    // Find the component node in the file structure
    function findComponentNode(node) {
      if (node.id === nodeId) {
        componentInfo.size = {
          width: node.absoluteBoundingBox?.width,
          height: node.absoluteBoundingBox?.height
        };
        componentInfo.constraints = node.constraints;
        return true;
      }
      if (node.children) {
        return node.children.some(findComponentNode);
      }
      return false;
    }

    file.document.children.forEach(findComponentNode);
    inventory.components.push(componentInfo);
  }

  // Group by page and type
  inventory.components.forEach(comp => {
    // You'd implement logic to determine page and type
    const page = comp.page || 'Unknown';
    const type = comp.type || 'Component';
    
    inventory.summary.componentsByPage[page] = 
      (inventory.summary.componentsByPage[page] || 0) + 1;
    inventory.summary.componentsByType[type] = 
      (inventory.summary.componentsByType[type] || 0) + 1;
  });

  return inventory;
}
```

### Find Component Usage

```javascript
async function findComponentUsage(fileKey, componentId) {
  const file = await sdk.getFile(fileKey);
  const usage = [];

  function findInstances(node, path = []) {
    if (node.componentId === componentId) {
      usage.push({
        instanceId: node.id,
        instanceName: node.name,
        path: [...path, node.name],
        page: path[0] || 'Unknown',
        overrides: node.overrides || []
      });
    }

    if (node.children) {
      node.children.forEach(child => 
        findInstances(child, [...path, node.name])
      );
    }
  }

  file.document.children.forEach(page => 
    findInstances(page, [page.name])
  );

  return {
    componentId,
    usageCount: usage.length,
    instances: usage
  };
}
```

## Text and Content Extraction

### Extract All Text for Localization

```javascript
async function extractTextForLocalization(fileKey) {
  const textContent = await sdk.extractTextContent(fileKey);
  
  // Get more detailed text information
  const file = await sdk.getFile(fileKey);
  const textNodes = [];

  function extractTextNodes(node, path = []) {
    if (node.type === 'TEXT' && node.characters) {
      textNodes.push({
        id: node.id,
        text: node.characters,
        style: node.style,
        path: [...path, node.name].join(' > '),
        fontSize: node.style?.fontSize,
        fontFamily: node.style?.fontFamily,
        fontWeight: node.style?.fontWeight
      });
    }

    if (node.children) {
      node.children.forEach(child => 
        extractTextNodes(child, [...path, node.name])
      );
    }
  }

  file.document.children.forEach(page => 
    extractTextNodes(page, [page.name])
  );

  // Group by text content for deduplication
  const uniqueTexts = {};
  textNodes.forEach(node => {
    const text = node.text.trim();
    if (text && text.length > 0) {
      if (!uniqueTexts[text]) {
        uniqueTexts[text] = [];
      }
      uniqueTexts[text].push(node);
    }
  });

  return {
    totalTextNodes: textNodes.length,
    uniqueTexts: Object.keys(uniqueTexts).length,
    textMap: uniqueTexts,
    allNodes: textNodes
  };
}
```

### Generate Content Audit Report

```javascript
async function generateContentAudit(fileKey) {
  const [file, textContent] = await Promise.all([
    sdk.getFile(fileKey),
    sdk.extractTextContent(fileKey)
  ]);

  const audit = {
    overview: {
      totalPages: file.document.children.length,
      totalTextElements: textContent.length,
      totalCharacters: textContent.join('').length
    },
    issues: {
      longText: [],
      emptyText: [],
      duplicateText: {},
      mixedLanguages: []
    },
    statistics: {
      avgWordsPerElement: 0,
      longestText: '',
      shortestText: ''
    }
  };

  // Analyze text content
  const words = textContent.map(text => text.split(/\s+/).length);
  audit.statistics.avgWordsPerElement = words.reduce((a, b) => a + b, 0) / words.length;
  
  audit.statistics.longestText = textContent.reduce((a, b) => 
    a.length > b.length ? a : b, ''
  );
  
  audit.statistics.shortestText = textContent.reduce((a, b) => 
    a.length < b.length ? a : b, ''
  );

  // Find issues
  textContent.forEach((text, index) => {
    if (text.length > 100) {
      audit.issues.longText.push({ index, text: text.substring(0, 50) + '...' });
    }
    
    if (text.trim().length === 0) {
      audit.issues.emptyText.push(index);
    }

    // Track duplicates
    if (audit.issues.duplicateText[text]) {
      audit.issues.duplicateText[text]++;
    } else {
      audit.issues.duplicateText[text] = 1;
    }
  });

  // Remove non-duplicates
  Object.keys(audit.issues.duplicateText).forEach(text => {
    if (audit.issues.duplicateText[text] === 1) {
      delete audit.issues.duplicateText[text];
    }
  });

  return audit;
}
```

## Version Control

### Version Comparison

```javascript
async function compareVersions(fileKey, versionId1, versionId2) {
  const [version1, version2] = await Promise.all([
    sdk.getFile(fileKey, { version: versionId1 }),
    sdk.getFile(fileKey, { version: versionId2 })
  ]);

  const comparison = {
    version1: {
      id: versionId1,
      name: version1.name,
      lastModified: version1.lastModified,
      pageCount: version1.document.children.length
    },
    version2: {
      id: versionId2,
      name: version2.name,
      lastModified: version2.lastModified,
      pageCount: version2.document.children.length
    },
    differences: {
      pagesAdded: [],
      pagesRemoved: [],
      pagesModified: []
    }
  };

  // Compare pages
  const v1Pages = new Map(version1.document.children.map(p => [p.name, p]));
  const v2Pages = new Map(version2.document.children.map(p => [p.name, p]));

  // Find added and removed pages
  v2Pages.forEach((page, name) => {
    if (!v1Pages.has(name)) {
      comparison.differences.pagesAdded.push(name);
    }
  });

  v1Pages.forEach((page, name) => {
    if (!v2Pages.has(name)) {
      comparison.differences.pagesRemoved.push(name);
    }
  });

  return comparison;
}
```

### Track Design System Changes

```javascript
async function trackDesignSystemChanges(fileKey, days = 30) {
  const versions = await sdk.getVersions(fileKey, { pageSize: 50 });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentVersions = versions.versions.filter(version => 
    new Date(version.created_at) > cutoffDate
  );

  const changes = [];

  for (let i = 0; i < recentVersions.length - 1; i++) {
    const comparison = await compareVersions(
      fileKey,
      recentVersions[i + 1].id,  // Older version
      recentVersions[i].id       // Newer version
    );

    changes.push({
      date: recentVersions[i].created_at,
      author: recentVersions[i].user,
      label: recentVersions[i].label,
      description: recentVersions[i].description,
      changes: comparison.differences
    });
  }

  return {
    fileKey,
    period: `${days} days`,
    totalVersions: recentVersions.length,
    changes
  };
}
```

## Advanced Use Cases

### Design Token Extraction

```javascript
async function extractDesignTokens(fileKey) {
  const [file, styles] = await Promise.all([
    sdk.getFile(fileKey),
    sdk.getStyles(fileKey)
  ]);

  const tokens = {
    colors: {},
    typography: {},
    spacing: {},
    effects: {}
  };

  // Extract from styles
  Object.values(styles).forEach(style => {
    switch (style.styleType) {
      case 'FILL':
        tokens.colors[style.name] = style.description;
        break;
      case 'TEXT':
        tokens.typography[style.name] = style.description;
        break;
      case 'EFFECT':
        tokens.effects[style.name] = style.description;
        break;
    }
  });

  // Extract spacing from components (would need custom logic)
  // This is a simplified example
  function extractSpacingTokens(node) {
    if (node.type === 'FRAME' && node.name.includes('spacing')) {
      // Extract spacing values from layout
      if (node.paddingLeft) {
        tokens.spacing[`${node.name}-padding`] = node.paddingLeft;
      }
    }

    if (node.children) {
      node.children.forEach(extractSpacingTokens);
    }
  }

  file.document.children.forEach(extractSpacingTokens);

  return tokens;
}
```

### Accessibility Audit

```javascript
async function auditAccessibility(fileKey) {
  const file = await sdk.getFile(fileKey);
  const issues = [];

  function auditNode(node, path = []) {
    const currentPath = [...path, node.name];

    // Check contrast for text nodes
    if (node.type === 'TEXT') {
      // This would require color analysis
      if (node.style && node.fills) {
        issues.push({
          type: 'contrast',
          node: node.id,
          path: currentPath.join(' > '),
          message: 'Manual contrast check required'
        });
      }
    }

    // Check for alt text on images
    if (node.type === 'RECTANGLE' && node.fills?.some(fill => fill.type === 'IMAGE')) {
      if (!node.description) {
        issues.push({
          type: 'alt-text',
          node: node.id,
          path: currentPath.join(' > '),
          message: 'Image missing description'
        });
      }
    }

    // Check for proper heading hierarchy
    if (node.type === 'TEXT' && node.name.toLowerCase().includes('heading')) {
      // Would need to implement heading level detection
    }

    if (node.children) {
      node.children.forEach(child => auditNode(child, currentPath));
    }
  }

  file.document.children.forEach(page => auditNode(page, [page.name]));

  return {
    totalIssues: issues.length,
    issuesByType: issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {}),
    issues
  };
}
```

## CLI Examples

### Basic File Information

```bash
# Get file overview
figma-files get --file-key abc123 --depth 1 --json

# Get specific nodes
figma-files get-nodes --file-key abc123 --ids "1:2,3:4" --geometry paths

# Get file metadata only
figma-files get-metadata --file-key abc123
```

### Image Export

```bash
# Export PNG images
figma-files render-images \
  --file-key abc123 \
  --ids "1:2,3:4" \
  --format png \
  --scale 2

# Export SVG with custom options
figma-files render-images \
  --file-key abc123 \
  --ids "1:2" \
  --format svg \
  --svg-outline-text \
  --svg-include-id

# Export all image fills
figma-files get-image-fills --file-key abc123
```

### Content Analysis

```bash
# Search for specific elements
figma-files search --file-key abc123 --query "button"

# Extract all text content
figma-files extract-text --file-key abc123

# Get file analytics
figma-files analytics --file-key abc123
```

### Utility Commands

```bash
# Parse Figma URL
figma-files parse-url --url "https://www.figma.com/file/abc123/Design?node-id=1%3A2"

# Health check
figma-files health

# View statistics
figma-files stats
```

### Batch Processing with Shell Scripts

```bash
#!/bin/bash

# Export all artboards from multiple files
FILES=("file1" "file2" "file3")
OUTPUT_DIR="./exports"

mkdir -p $OUTPUT_DIR

for FILE_KEY in "${FILES[@]}"; do
  echo "Processing $FILE_KEY..."
  
  # Get pages
  PAGES=$(figma-files pages --file-key $FILE_KEY --json | jq -r '.[].id')
  
  # Export each page
  for PAGE_ID in $PAGES; do
    figma-files render-images \
      --file-key $FILE_KEY \
      --ids $PAGE_ID \
      --format png \
      --scale 2 \
      --json > "$OUTPUT_DIR/${FILE_KEY}_${PAGE_ID}.json"
  done
done
```

## Error Handling

### Comprehensive Error Handling

```javascript
import { 
  AuthenticationError,
  AuthorizationError,
  FileNotFoundError,
  NodeNotFoundError,
  RateLimitError,
  ValidationError,
  NetworkError
} from 'figma-files-api';

async function robustFileOperation(fileKey, nodeIds) {
  try {
    const result = await sdk.renderPNG(fileKey, nodeIds);
    return result;
    
  } catch (error) {
    switch (error.constructor) {
      case AuthenticationError:
        console.error('Invalid API token. Please check your credentials.');
        break;
        
      case AuthorizationError:
        console.error('Insufficient permissions. Required scopes:', error.meta.requiredScopes);
        break;
        
      case FileNotFoundError:
        console.error(`File not found: ${error.meta.fileKey}`);
        break;
        
      case NodeNotFoundError:
        console.error('Nodes not found:', error.meta.nodeIds);
        break;
        
      case RateLimitError:
        console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
        // Implement retry logic
        await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
        return robustFileOperation(fileKey, nodeIds); // Retry
        
      case ValidationError:
        console.error(`Validation error in field ${error.meta.field}:`, error.message);
        break;
        
      case NetworkError:
        console.error('Network error. Check your connection and try again.');
        break;
        
      default:
        console.error('Unexpected error:', error.message);
    }
    
    throw error; // Re-throw if you want calling code to handle it
  }
}
```

### Retry with Exponential Backoff

```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof RateLimitError) {
        const delay = error.retryAfter ? error.retryAfter * 1000 : Math.pow(2, attempt) * 1000;
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (attempt === maxRetries - 1) {
        throw error; // Last attempt failed
      }
      
      if (error instanceof NetworkError) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // Non-retryable error
    }
  }
}

// Usage
const result = await withRetry(() => sdk.getFile('file-key'));
```

These examples should give you a comprehensive understanding of how to use the Figma Files API client library effectively in various scenarios.