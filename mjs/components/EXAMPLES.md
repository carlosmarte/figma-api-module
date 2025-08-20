# Figma Components API - Examples

This document provides practical examples for common use cases with the Figma Components API.

## Basic Setup

```javascript
import { FigmaComponentsSDK } from 'figma-components-api';

const sdk = new FigmaComponentsSDK({
  apiToken: process.env.FIGMA_API_TOKEN
});
```

## Example 1: Design System Audit

Analyze a team's design system to understand component usage and organization.

```javascript
async function auditDesignSystem(teamId) {
  console.log('🔍 Auditing design system...');
  
  // Get complete library
  const library = await sdk.getTeamLibrary(teamId);
  
  // Get analytics
  const analytics = await sdk.getTeamLibraryAnalytics(teamId);
  
  console.log('\n📊 Library Overview:');
  console.log(`Total Items: ${analytics.totalItems}`);
  console.log(`Components: ${analytics.breakdown.components}`);
  console.log(`Component Sets: ${analytics.breakdown.componentSets}`);
  console.log(`Styles: ${analytics.breakdown.styles}`);
  
  // Analyze component types
  console.log('\n🎨 Component Types:');
  Object.entries(analytics.componentsByType).forEach(([type, count]) => {
    console.log(`${type}: ${count}`);
  });
  
  // Analyze style types
  console.log('\n🎭 Style Types:');
  Object.entries(analytics.stylesByType).forEach(([type, count]) => {
    console.log(`${type}: ${count}`);
  });
  
  // Find components without descriptions
  const allComponents = await sdk.getAllTeamComponents(teamId);
  const undocumented = allComponents.filter(c => !c.description);
  
  console.log(`\n📝 Components without descriptions: ${undocumented.length}`);
  undocumented.slice(0, 5).forEach(component => {
    console.log(`- ${component.name}`);
  });
  
  return {
    library,
    analytics,
    undocumented
  };
}

// Usage
auditDesignSystem('123456');
```

## Example 2: Component Search and Discovery

Search for specific components and analyze their properties.

```javascript
async function findAndAnalyzeComponents(teamId, searchTerm) {
  console.log(`🔎 Searching for "${searchTerm}" components...`);
  
  // Search by name
  const nameMatches = await sdk.searchComponents(teamId, searchTerm);
  console.log(`Found ${nameMatches.length} components with "${searchTerm}" in name`);
  
  // Advanced search with patterns
  const patternMatches = await sdk.findComponents(teamId, {
    name: searchTerm,
    nodeType: 'COMPONENT'
  });
  
  console.log('\n📋 Component Details:');
  patternMatches.forEach(component => {
    console.log(`\n${component.name}`);
    console.log(`  Key: ${component.key}`);
    console.log(`  Type: ${component.node_type}`);
    console.log(`  File: ${component.containing_frame?.name || 'Unknown'}`);
    if (component.description) {
      console.log(`  Description: ${component.description}`);
    }
  });
  
  return patternMatches;
}

// Usage
findAndAnalyzeComponents('123456', 'button');
```

## Example 3: Style Guide Generation

Generate a comprehensive style guide from Figma styles.

```javascript
async function generateStyleGuide(teamId) {
  console.log('📖 Generating style guide...');
  
  // Get all styles
  const allStyles = await sdk.getAllTeamStyles(teamId);
  
  // Group by style type
  const stylesByType = {
    FILL: [],
    TEXT: [],
    EFFECT: [],
    GRID: []
  };
  
  allStyles.forEach(style => {
    if (stylesByType[style.style_type]) {
      stylesByType[style.style_type].push(style);
    }
  });
  
  console.log('\n🎨 Style Guide:');
  
  // Color styles (fills)
  if (stylesByType.FILL.length > 0) {
    console.log('\n🌈 Colors:');
    stylesByType.FILL.forEach(style => {
      console.log(`  ${style.name}: ${style.key}`);
      if (style.description) {
        console.log(`    ${style.description}`);
      }
    });
  }
  
  // Typography styles
  if (stylesByType.TEXT.length > 0) {
    console.log('\n✍️ Typography:');
    stylesByType.TEXT.forEach(style => {
      console.log(`  ${style.name}: ${style.key}`);
      if (style.description) {
        console.log(`    ${style.description}`);
      }
    });
  }
  
  // Effect styles
  if (stylesByType.EFFECT.length > 0) {
    console.log('\n✨ Effects:');
    stylesByType.EFFECT.forEach(style => {
      console.log(`  ${style.name}: ${style.key}`);
    });
  }
  
  return stylesByType;
}

// Usage
generateStyleGuide('123456');
```

## Example 4: Component Usage Tracking

Track which components are being used across different files.

```javascript
async function trackComponentUsage(teamId, componentKeys) {
  console.log('📈 Tracking component usage...');
  
  const usageReport = [];
  
  for (const key of componentKeys) {
    try {
      const component = await sdk.getComponent(key);
      
      usageReport.push({
        name: component.meta.node.name,
        key: key,
        fileKey: component.meta.file_key,
        lastModified: component.meta.updated_at,
        thumbnail: component.meta.thumbnail_url
      });
      
    } catch (error) {
      console.warn(`⚠️ Could not fetch component ${key}: ${error.message}`);
    }
  }
  
  console.log('\n📊 Component Usage Report:');
  usageReport.forEach(item => {
    console.log(`\n${item.name}`);
    console.log(`  Key: ${item.key}`);
    console.log(`  File: ${item.fileKey}`);
    console.log(`  Last Modified: ${item.lastModified}`);
  });
  
  return usageReport;
}

// Usage
const componentKeys = ['123:456', '789:012', '345:678'];
trackComponentUsage('123456', componentKeys);
```

## Example 5: Library Comparison

Compare libraries between different teams or files.

```javascript
async function compareLibraries(teamId1, teamId2) {
  console.log('🔄 Comparing libraries...');
  
  const [library1, library2] = await Promise.all([
    sdk.getTeamLibrary(teamId1),
    sdk.getTeamLibrary(teamId2)
  ]);
  
  console.log('\n📊 Library Comparison:');
  console.log(`Team ${teamId1}:`);
  console.log(`  Components: ${library1.summary.componentsCount}`);
  console.log(`  Component Sets: ${library1.summary.componentSetsCount}`);
  console.log(`  Styles: ${library1.summary.stylesCount}`);
  
  console.log(`\nTeam ${teamId2}:`);
  console.log(`  Components: ${library2.summary.componentsCount}`);
  console.log(`  Component Sets: ${library2.summary.componentSetsCount}`);
  console.log(`  Styles: ${library2.summary.stylesCount}`);
  
  // Find common component names
  const names1 = new Set(library1.components.components?.map(c => c.name) || []);
  const names2 = new Set(library2.components.components?.map(c => c.name) || []);
  
  const commonNames = [...names1].filter(name => names2.has(name));
  const unique1 = [...names1].filter(name => !names2.has(name));
  const unique2 = [...names2].filter(name => !names1.has(name));
  
  console.log(`\n🤝 Common Components: ${commonNames.length}`);
  commonNames.slice(0, 5).forEach(name => console.log(`  - ${name}`));
  
  console.log(`\n🆕 Unique to Team ${teamId1}: ${unique1.length}`);
  unique1.slice(0, 5).forEach(name => console.log(`  - ${name}`));
  
  console.log(`\n🆕 Unique to Team ${teamId2}: ${unique2.length}`);
  unique2.slice(0, 5).forEach(name => console.log(`  - ${name}`));
  
  return {
    library1,
    library2,
    common: commonNames,
    unique1,
    unique2
  };
}

// Usage
compareLibraries('123456', '789012');
```

## Example 6: Batch Operations

Efficiently process multiple components, component sets, or styles.

```javascript
async function batchProcessLibraryItems(teamId) {
  console.log('⚡ Batch processing library items...');
  
  // Get all components first
  const allComponents = await sdk.getAllTeamComponents(teamId);
  const componentKeys = allComponents.slice(0, 10).map(c => c.key); // Limit for demo
  
  // Batch get detailed component information
  const componentDetails = await sdk.batchGetComponents(componentKeys);
  
  console.log('\n📦 Batch Results:');
  console.log(`Successfully processed: ${componentDetails.successful.length}`);
  console.log(`Failed: ${componentDetails.failed.length}`);
  
  // Process successful results
  componentDetails.successful.forEach(component => {
    console.log(`✅ ${component.meta.node.name}`);
  });
  
  // Handle failures
  componentDetails.failed.forEach(failure => {
    console.log(`❌ ${failure.key}: ${failure.error}`);
  });
  
  return componentDetails;
}

// Usage
batchProcessLibraryItems('123456');
```

## Example 7: Export and Backup

Export library data for backup or analysis.

```javascript
async function exportLibraryData(teamId, outputPath) {
  console.log('💾 Exporting library data...');
  
  // Export with metadata
  const exportData = await sdk.exportTeamLibrary(teamId, {
    includeMetadata: true,
    format: 'json'
  });
  
  // Add timestamp
  const timestampedData = {
    ...exportData,
    exportedAt: new Date().toISOString(),
    teamId: teamId
  };
  
  // Save to file (if in Node.js environment)
  if (typeof require !== 'undefined') {
    const fs = require('fs');
    fs.writeFileSync(outputPath, JSON.stringify(timestampedData, null, 2));
    console.log(`✅ Data exported to ${outputPath}`);
  }
  
  // Summary
  console.log('\n📋 Export Summary:');
  console.log(`Total Components: ${exportData.components.length}`);
  console.log(`Total Component Sets: ${exportData.componentSets.length}`);
  console.log(`Total Styles: ${exportData.styles.length}`);
  console.log(`Export Size: ${JSON.stringify(timestampedData).length} bytes`);
  
  return timestampedData;
}

// Usage
exportLibraryData('123456', './library-backup.json');
```

## Example 8: Health Monitoring

Monitor API health and performance.

```javascript
async function monitorAPIHealth() {
  console.log('🏥 Monitoring API health...');
  
  // Check basic connectivity
  const isHealthy = await sdk.healthCheck();
  console.log(`API Health: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  
  // Get performance stats
  const stats = sdk.getStats();
  console.log('\n📊 Performance Stats:');
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Success Rate: ${stats.successRate}`);
  console.log(`Failed Requests: ${stats.failedRequests}`);
  console.log(`Retry Attempts: ${stats.retryAttempts}`);
  console.log(`Rate Limit Hits: ${stats.rateLimitHits}`);
  
  return {
    healthy: isHealthy,
    stats
  };
}

// Usage
monitorAPIHealth();
```

## CLI Examples

Here are some practical CLI usage examples:

```bash
# Set your API token
export FIGMA_API_TOKEN="your-token-here"

# Get team library overview
figma-components library get-team 123456 --pretty

# Find all button components
figma-components components search 123456 button --json

# Get color styles only
figma-components styles list-team 123456 --type FILL --pretty

# Export complete library
figma-components library export 123456 --pretty > library-backup.json

# Batch get specific components
figma-components components batch-get --keys 123:456 789:012 345:678

# Library analytics
figma-components library analytics 123456 --pretty

# Health check
figma-components health
```

## Error Handling Examples

```javascript
import { 
  TeamNotFoundError,
  ComponentNotFoundError,
  RateLimitError,
  ValidationError 
} from 'figma-components-api';

async function robustComponentFetch(teamId, componentKey) {
  try {
    const component = await sdk.getComponent(componentKey);
    return component;
  } catch (error) {
    if (error instanceof ComponentNotFoundError) {
      console.error(`Component ${componentKey} not found`);
      return null;
    } else if (error instanceof RateLimitError) {
      console.warn(`Rate limited. Retrying after ${error.retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
      return robustComponentFetch(teamId, componentKey); // Retry
    } else if (error instanceof ValidationError) {
      console.error(`Invalid input: ${error.message}`);
      return null;
    } else {
      console.error(`Unexpected error: ${error.message}`);
      throw error;
    }
  }
}
```

## Tips and Best Practices

1. **Rate Limiting**: Always handle rate limits gracefully with exponential backoff
2. **Batch Operations**: Use batch methods for processing multiple items
3. **Pagination**: Use `getAllTeam*` methods for complete datasets
4. **Error Handling**: Implement proper error handling for production use
5. **Caching**: Consider caching frequently accessed data
6. **Monitoring**: Track API usage and performance metrics
7. **Validation**: Validate inputs before making API calls

These examples demonstrate the most common use cases for the Figma Components API. Adapt them to your specific needs and requirements.