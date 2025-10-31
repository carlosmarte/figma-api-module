# Figma Variables SDK - Examples

This document provides practical examples of using the Figma Variables SDK for common design system and variable management tasks.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Reading Variables](#reading-variables)
- [Creating Variables](#creating-variables)
- [Managing Collections](#managing-collections)
- [Variable Aliases](#variable-aliases)
- [Batch Operations](#batch-operations)
- [Design System Examples](#design-system-examples)
- [CLI Examples](#cli-examples)
- [Error Handling](#error-handling)

## Basic Setup

### SDK Initialization

```javascript
import { FigmaVariablesSDK } from 'figma-variables-sdk';

// Basic setup
const sdk = new FigmaVariablesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});

// Advanced setup with caching and custom timeout
const advancedSdk = new FigmaVariablesSDK({
  accessToken: process.env.FIGMA_ACCESS_TOKEN,
  timeout: 60000,
  logger: console,
  cache: {
    ttl: 300000,  // 5 minutes
    maxSize: 100
  }
});
```

### Testing Connection

```javascript
async function testConnection() {
  const fileKey = 'your-file-key';
  
  try {
    const result = await sdk.testConnection(fileKey);
    
    if (result.success) {
      console.log('✅ Connected successfully!');
      console.log(`Variables: ${result.stats.variableCount}`);
      console.log(`Collections: ${result.stats.collectionCount}`);
    } else {
      console.error('❌ Connection failed:', result.error);
    }
  } catch (error) {
    console.error('Connection test failed:', error.message);
  }
}
```

## Reading Variables

### Get All Variables

```javascript
async function getAllVariables(fileKey) {
  try {
    const data = await sdk.getVariables(fileKey);
    
    console.log(`Found ${data.stats.variableCount} variables in ${data.stats.collectionCount} collections`);
    
    // Iterate through collections
    Object.entries(data.variableCollections).forEach(([id, collection]) => {
      console.log(`Collection: ${collection.name} (${id})`);
      
      // Find variables in this collection
      const collectionVariables = Object.entries(data.variables)
        .filter(([_, variable]) => variable.variableCollectionId === id);
      
      collectionVariables.forEach(([varId, variable]) => {
        console.log(`  - ${variable.name} (${variable.resolvedType})`);
      });
    });
    
    return data;
  } catch (error) {
    console.error('Failed to get variables:', error.message);
  }
}
```

### Get Published Variables

```javascript
async function getPublishedVariables(fileKey) {
  try {
    const data = await sdk.getPublishedVariables(fileKey);
    
    console.log('Published Variables:');
    Object.entries(data.variables).forEach(([id, variable]) => {
      console.log(`- ${variable.name} (subscribed_id: ${variable.subscribed_id})`);
    });
    
    return data;
  } catch (error) {
    console.error('Failed to get published variables:', error.message);
  }
}
```

### Search Variables

```javascript
async function searchColorVariables(fileKey) {
  try {
    // Search for color variables containing "primary"
    const results = await sdk.searchVariables(fileKey, {
      name: 'primary',
      type: 'COLOR'
    });
    
    console.log(`Found ${results.length} matching color variables:`);
    results.forEach(variable => {
      console.log(`- ${variable.name} (${variable.id})`);
    });
    
    return results;
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

async function findVariablesByCollection(fileKey, collectionName) {
  try {
    // First, get all data
    const data = await sdk.getVariables(fileKey);
    
    // Find collection by name
    const collection = Object.entries(data.variableCollections)
      .find(([_, col]) => col.name.toLowerCase().includes(collectionName.toLowerCase()));
    
    if (!collection) {
      console.log(`Collection containing "${collectionName}" not found`);
      return [];
    }
    
    const [collectionId] = collection;
    
    // Search variables in this collection
    const results = await sdk.searchVariables(fileKey, {
      collectionId: collectionId
    });
    
    console.log(`Found ${results.length} variables in collection "${collection[1].name}"`);
    return results;
  } catch (error) {
    console.error('Collection search failed:', error.message);
  }
}
```

## Creating Variables

### Create Color Variables

```javascript
async function createColorVariable(fileKey, collectionId, modeId) {
  try {
    const result = await sdk.createColorVariable(
      fileKey,
      'Primary Blue',
      collectionId,
      { r: 0.2, g: 0.4, b: 0.8, a: 1.0 },
      modeId
    );
    
    console.log('Color variable created:', result);
    return result;
  } catch (error) {
    console.error('Failed to create color variable:', error.message);
  }
}

async function createColorPalette(fileKey, collectionId, modeId) {
  const colors = [
    { name: 'Blue 50', value: { r: 0.937, g: 0.953, b: 1.0, a: 1.0 } },
    { name: 'Blue 100', value: { r: 0.875, g: 0.906, b: 1.0, a: 1.0 } },
    { name: 'Blue 500', value: { r: 0.247, g: 0.318, b: 0.710, a: 1.0 } },
    { name: 'Blue 900', value: { r: 0.172, g: 0.243, b: 0.588, a: 1.0 } }
  ];
  
  const results = [];
  
  for (const color of colors) {
    try {
      const result = await sdk.createColorVariable(
        fileKey,
        color.name,
        collectionId,
        color.value,
        modeId
      );
      results.push(result);
      console.log(`✅ Created ${color.name}`);
    } catch (error) {
      console.error(`❌ Failed to create ${color.name}:`, error.message);
    }
  }
  
  return results;
}
```

### Create Typography Variables

```javascript
async function createTypographySystem(fileKey, collectionId, modeId) {
  const fontSizes = [
    { name: 'Text XS', size: 12 },
    { name: 'Text SM', size: 14 },
    { name: 'Text Base', size: 16 },
    { name: 'Text LG', size: 18 },
    { name: 'Text XL', size: 20 },
    { name: 'Text 2XL', size: 24 },
    { name: 'Text 3XL', size: 30 },
    { name: 'Text 4XL', size: 36 }
  ];
  
  const results = [];
  
  for (const font of fontSizes) {
    try {
      const result = await sdk.createNumberVariable(
        fileKey,
        font.name,
        collectionId,
        font.size,
        modeId
      );
      results.push(result);
      console.log(`✅ Created ${font.name}: ${font.size}px`);
    } catch (error) {
      console.error(`❌ Failed to create ${font.name}:`, error.message);
    }
  }
  
  return results;
}
```

### Create Custom Variables

```javascript
async function createCustomVariable(fileKey) {
  try {
    const result = await sdk.createVariable(fileKey, {
      name: 'Component Padding',
      variableCollectionId: 'spacing-collection-id',
      resolvedType: 'FLOAT',
      description: 'Standard padding for component containers',
      values: {
        'light-mode-id': 16,
        'compact-mode-id': 12
      }
    });
    
    console.log('Custom variable created:', result);
    return result;
  } catch (error) {
    console.error('Failed to create custom variable:', error.message);
  }
}
```

## Managing Collections

### Create Collection with Modes

```javascript
async function createThemeCollection(fileKey) {
  try {
    // Create collection
    const collectionResult = await sdk.createCollection(fileKey, 'Theme Colors', {
      initialMode: { name: 'Light Mode' }
    });
    
    console.log('Collection created:', collectionResult);
    
    // Extract real IDs from response
    const tempToRealId = collectionResult.meta.tempIdToRealId;
    const collectionId = Object.values(tempToRealId)[0]; // First ID is collection
    const lightModeId = Object.values(tempToRealId)[1];  // Second ID is initial mode
    
    console.log(`Collection ID: ${collectionId}`);
    console.log(`Light Mode ID: ${lightModeId}`);
    
    return { collectionId, lightModeId };
  } catch (error) {
    console.error('Failed to create collection:', error.message);
  }
}

async function createMultiModeCollection(fileKey) {
  try {
    // First create the collection
    const { collectionId, lightModeId } = await createThemeCollection(fileKey);
    
    // Then add a dark mode (this would require additional API calls)
    // Note: Mode creation requires separate API implementation
    
    return { collectionId, lightModeId };
  } catch (error) {
    console.error('Failed to create multi-mode collection:', error.message);
  }
}
```

## Variable Aliases

### Create Semantic Color System

```javascript
async function createSemanticColors(fileKey) {
  try {
    // First, create brand colors
    const brandColors = await createColorPalette(fileKey, 'brand-collection-id', 'mode-id');
    
    // Create semantic collection
    const semanticCollection = await sdk.createCollection(fileKey, 'Semantic Colors');
    const semanticCollectionId = Object.values(semanticCollection.meta.tempIdToRealId)[0];
    const semanticModeId = Object.values(semanticCollection.meta.tempIdToRealId)[1];
    
    // Create semantic variables that alias to brand colors
    const semanticResult = await sdk.createVariable(fileKey, {
      name: 'Text Primary',
      variableCollectionId: semanticCollectionId,
      resolvedType: 'COLOR'
    });
    
    const semanticVariableId = Object.values(semanticResult.meta.tempIdToRealId)[0];
    const brandBlueId = 'brand-blue-variable-id'; // From previous creation
    
    // Create the alias
    await sdk.createAlias(fileKey, semanticVariableId, brandBlueId, semanticModeId);
    
    console.log('✅ Semantic color system created with aliases');
    
    return { semanticCollectionId, semanticModeId };
  } catch (error) {
    console.error('Failed to create semantic colors:', error.message);
  }
}
```

### Component Token Aliases

```javascript
async function createComponentTokens(fileKey, primitiveCollectionId, primitiveMode) {
  try {
    // Create component-specific collection
    const componentCollection = await sdk.createCollection(fileKey, 'Button Tokens');
    const componentCollectionId = Object.values(componentCollection.meta.tempIdToRealId)[0];
    const componentModeId = Object.values(componentCollection.meta.tempIdToRealId)[1];
    
    // Create component tokens that alias to primitives
    const componentTokens = [
      { name: 'Button Background', aliasTo: 'primary-500-id' },
      { name: 'Button Border', aliasTo: 'primary-600-id' },
      { name: 'Button Text', aliasTo: 'neutral-white-id' }
    ];
    
    for (const token of componentTokens) {
      // Create the component variable
      const varResult = await sdk.createVariable(fileKey, {
        name: token.name,
        variableCollectionId: componentCollectionId,
        resolvedType: 'COLOR'
      });
      
      const componentVarId = Object.values(varResult.meta.tempIdToRealId)[0];
      
      // Create alias to primitive
      await sdk.createAlias(fileKey, componentVarId, token.aliasTo, componentModeId);
      
      console.log(`✅ Created component token: ${token.name}`);
    }
    
    return componentCollectionId;
  } catch (error) {
    console.error('Failed to create component tokens:', error.message);
  }
}
```

## Batch Operations

### Batch Create Variables

```javascript
async function createDesignSystemBatch(fileKey, collectionId, modeId) {
  const variables = [
    // Spacing scale
    { name: 'Space 1', type: 'FLOAT', value: 4 },
    { name: 'Space 2', type: 'FLOAT', value: 8 },
    { name: 'Space 3', type: 'FLOAT', value: 12 },
    { name: 'Space 4', type: 'FLOAT', value: 16 },
    { name: 'Space 5', type: 'FLOAT', value: 20 },
    { name: 'Space 6', type: 'FLOAT', value: 24 },
    
    // Border radius
    { name: 'Radius None', type: 'FLOAT', value: 0 },
    { name: 'Radius SM', type: 'FLOAT', value: 4 },
    { name: 'Radius MD', type: 'FLOAT', value: 8 },
    { name: 'Radius LG', type: 'FLOAT', value: 12 },
    { name: 'Radius Full', type: 'FLOAT', value: 9999 },
    
    // Shadow values
    { name: 'Shadow SM', type: 'STRING', value: '0 1px 2px rgba(0,0,0,0.05)' },
    { name: 'Shadow MD', type: 'STRING', value: '0 4px 6px rgba(0,0,0,0.07)' },
    { name: 'Shadow LG', type: 'STRING', value: '0 10px 15px rgba(0,0,0,0.1)' },
    { name: 'Shadow XL', type: 'STRING', value: '0 20px 25px rgba(0,0,0,0.1)' }
  ];
  
  const variableConfigs = variables.map(v => ({
    name: v.name,
    variableCollectionId: collectionId,
    resolvedType: v.type,
    values: { [modeId]: v.value }
  }));
  
  try {
    const result = await sdk.createVariables(fileKey, variableConfigs);
    console.log(`✅ Created ${variables.length} variables in batch`);
    return result;
  } catch (error) {
    console.error('Batch creation failed:', error.message);
  }
}
```

### Import/Export Operations

```javascript
async function exportVariables(fileKey, outputFile) {
  try {
    const data = await sdk.exportVariables(fileKey);
    
    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(outputFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ Exported ${data.variables.length} variables to ${outputFile}`);
    return data;
  } catch (error) {
    console.error('Export failed:', error.message);
  }
}

async function importVariables(fileKey, inputFile) {
  try {
    const fs = await import('fs/promises');
    const data = JSON.parse(await fs.readFile(inputFile, 'utf8'));
    
    const result = await sdk.importVariables(fileKey, data);
    
    console.log(`✅ Import completed:`);
    console.log(`- Collections: ${result.collections.length}`);
    console.log(`- Variables: ${result.variables.length}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.type}: ${error.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Import failed:', error.message);
  }
}
```

## Design System Examples

### Complete Design System Setup

```javascript
async function setupCompleteDesignSystem(fileKey) {
  console.log('🚀 Setting up complete design system...');
  
  try {
    // 1. Create base collections
    const colorCollection = await sdk.createCollection(fileKey, 'Colors');
    const spacingCollection = await sdk.createCollection(fileKey, 'Spacing');
    const typographyCollection = await sdk.createCollection(fileKey, 'Typography');
    
    // Extract IDs
    const colorCollectionId = Object.values(colorCollection.meta.tempIdToRealId)[0];
    const colorModeId = Object.values(colorCollection.meta.tempIdToRealId)[1];
    
    const spacingCollectionId = Object.values(spacingCollection.meta.tempIdToRealId)[0];
    const spacingModeId = Object.values(spacingCollection.meta.tempIdToRealId)[1];
    
    const typoCollectionId = Object.values(typographyCollection.meta.tempIdToRealId)[0];
    const typoModeId = Object.values(typographyCollection.meta.tempIdToRealId)[1];
    
    console.log('✅ Created base collections');
    
    // 2. Create color palette
    await createColorPalette(fileKey, colorCollectionId, colorModeId);
    console.log('✅ Created color palette');
    
    // 3. Create spacing system
    await createDesignSystemBatch(fileKey, spacingCollectionId, spacingModeId);
    console.log('✅ Created spacing system');
    
    // 4. Create typography system
    await createTypographySystem(fileKey, typoCollectionId, typoModeId);
    console.log('✅ Created typography system');
    
    // 5. Create semantic tokens
    await createSemanticColors(fileKey);
    console.log('✅ Created semantic color tokens');
    
    console.log('🎉 Design system setup complete!');
    
    return {
      colorCollectionId,
      spacingCollectionId,
      typoCollectionId
    };
    
  } catch (error) {
    console.error('❌ Design system setup failed:', error.message);
  }
}
```

### Theme Switching System

```javascript
async function setupThemeSystem(fileKey) {
  try {
    // Create theme collection with light and dark modes
    const themeCollection = await sdk.createCollection(fileKey, 'Theme Tokens', {
      initialMode: { name: 'Light' }
    });
    
    const collectionId = Object.values(themeCollection.meta.tempIdToRealId)[0];
    const lightModeId = Object.values(themeCollection.meta.tempIdToRealId)[1];
    
    // Create theme variables with different values per mode
    const themeVariables = [
      {
        name: 'Background Primary',
        lightValue: { r: 1, g: 1, b: 1, a: 1 },        // White
        darkValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 }    // Dark gray
      },
      {
        name: 'Text Primary',
        lightValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },  // Dark gray
        darkValue: { r: 0.9, g: 0.9, b: 0.9, a: 1 }    // Light gray
      }
    ];
    
    for (const theme of themeVariables) {
      // Create variable with light mode value
      await sdk.createColorVariable(
        fileKey,
        theme.name,
        collectionId,
        theme.lightValue,
        lightModeId
      );
      
      console.log(`✅ Created theme variable: ${theme.name}`);
    }
    
    // Note: Dark mode values would need to be set via additional API calls
    // as the current API doesn't support creating modes in the same request
    
    return { collectionId, lightModeId };
  } catch (error) {
    console.error('Theme system setup failed:', error.message);
  }
}
```

## CLI Examples

### Basic CLI Usage

```bash
# Set access token
export FIGMA_ACCESS_TOKEN="your-token-here"

# Test connection
figma-variables test ABcd1234efgh5678

# Get all variables
figma-variables get ABcd1234efgh5678

# Get published variables
figma-variables get ABcd1234efgh5678 --published
```

### Creating Variables via CLI

```bash
# Create a collection
figma-variables create-collection ABcd1234efgh5678 "Brand Colors" --mode-name "Light Mode"

# Create a color variable
figma-variables create-variable ABcd1234efgh5678 \
  --name "Primary Blue" \
  --collection "collection-id-here" \
  --type COLOR \
  --mode "mode-id-here" \
  --value '{"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}'

# Create a string variable
figma-variables create-variable ABcd1234efgh5678 \
  --name "Button Label" \
  --collection "collection-id-here" \
  --type STRING \
  --mode "mode-id-here" \
  --value "Click me"

# Create a number variable
figma-variables create-variable ABcd1234efgh5678 \
  --name "Border Radius" \
  --collection "collection-id-here" \
  --type FLOAT \
  --mode "mode-id-here" \
  --value "8"
```

### Search and Filter

```bash
# Search by name
figma-variables search ABcd1234efgh5678 --name "primary"

# Filter by type
figma-variables search ABcd1234efgh5678 --type COLOR

# Filter by collection
figma-variables search ABcd1234efgh5678 --collection "collection-id"

# Combined filters
figma-variables search ABcd1234efgh5678 --name "blue" --type COLOR
```

### Import/Export via CLI

```bash
# Export variables to file
figma-variables export ABcd1234efgh5678 --output design-system.json

# Import variables from file
figma-variables import ABcd1234efgh5678 design-system.json

# Export with pretty formatting
figma-variables export ABcd1234efgh5678 | jq '.' > formatted-export.json
```

### Batch Operations via CLI

```bash
# Delete variable (requires confirmation)
figma-variables delete-variable ABcd1234efgh5678 variable-id --confirm

# Update variable
figma-variables update-variable ABcd1234efgh5678 variable-id \
  --updates '{"name": "New Variable Name", "description": "Updated description"}'

# Create alias
figma-variables create-alias ABcd1234efgh5678 \
  alias-variable-id target-variable-id mode-id
```

## Error Handling

### Comprehensive Error Handling

```javascript
import { 
  EnterpriseAccessError,
  ScopeError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  VariableError
} from 'figma-variables-sdk';

async function robustVariableOperation(fileKey) {
  try {
    const result = await sdk.getVariables(fileKey);
    return result;
    
  } catch (error) {
    // Handle specific error types
    if (error instanceof EnterpriseAccessError) {
      console.error('❌ Enterprise Access Required');
      console.error('The Variables API is only available to Enterprise organizations.');
      console.error('Please upgrade your Figma plan or contact your admin.');
      
    } else if (error instanceof ScopeError) {
      console.error('❌ Insufficient Permissions');
      console.error(`Missing required scope: ${error.meta.requiredScope}`);
      console.error('Please check your access token permissions.');
      
    } else if (error instanceof ValidationError) {
      console.error('❌ Validation Error');
      console.error(`Field: ${error.meta.field}`);
      console.error(`Value: ${error.meta.value}`);
      console.error(`Message: ${error.message}`);
      
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate Limited');
      console.error(`Retry after: ${error.retryAfter}ms`);
      
      // Implement retry logic
      console.log('⏳ Waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, error.retryAfter));
      return robustVariableOperation(fileKey); // Retry
      
    } else if (error instanceof NotFoundError) {
      console.error('❌ Resource Not Found');
      console.error(`Resource: ${error.meta.resource}`);
      console.error(`Identifier: ${error.meta.identifier}`);
      
    } else if (error instanceof VariableError) {
      console.error('❌ Variable Operation Failed');
      console.error(`Variable ID: ${error.meta.variableId}`);
      console.error(`Operation: ${error.meta.operation}`);
      
    } else {
      console.error('❌ Unexpected Error:', error.message);
    }
    
    throw error; // Re-throw for upstream handling
  }
}
```

### Retry with Exponential Backoff

```javascript
async function withRetry(operation, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on certain error types
      if (error instanceof RateLimitError || 
          error instanceof NetworkError ||
          (error instanceof ApiError && error.meta.status >= 500)) {
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Don't retry on these errors
      break;
    }
  }
  
  throw lastError;
}

// Usage
const result = await withRetry(() => sdk.getVariables(fileKey));
```

### Graceful Degradation

```javascript
async function getVariablesWithFallback(fileKey) {
  try {
    // Try to get local variables first
    return await sdk.getVariables(fileKey);
    
  } catch (error) {
    if (error instanceof EnterpriseAccessError) {
      console.warn('⚠️  Variables API not available, falling back to file data');
      
      // Fallback: You could implement alternative data fetching here
      // For example, using the regular Files API to get some variable info
      return {
        variables: {},
        variableCollections: {},
        stats: { variableCount: 0, collectionCount: 0 },
        fallback: true
      };
    }
    
    throw error; // Re-throw other errors
  }
}
```

These examples demonstrate the full capabilities of the Figma Variables SDK and provide practical patterns for building robust design system automation and variable management workflows.