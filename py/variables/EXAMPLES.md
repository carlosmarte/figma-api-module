# Figma Variables API Examples

This document provides comprehensive examples of using the Figma Variables Python library for various use cases.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Reading Variables](#reading-variables)
- [Creating Variables](#creating-variables)
- [Modifying Variables](#modifying-variables)
- [Working with Collections](#working-with-collections)
- [Variable Values and Modes](#variable-values-and-modes)
- [Batch Operations](#batch-operations)
- [CLI Examples](#cli-examples)
- [Server API Examples](#server-api-examples)
- [Advanced Use Cases](#advanced-use-cases)

## Basic Setup

### Environment Configuration

```python
import os
import asyncio
from figma_variables import FigmaVariablesSDK

# Set your API token
os.environ["FIGMA_TOKEN"] = "your_figma_token_here"

# Your file key (extract from Figma URL)
FILE_KEY = "ABC123DEF456"  # From https://www.figma.com/file/ABC123DEF456/Your-File
```

### SDK Initialization

```python
# Basic initialization
async with FigmaVariablesSDK(api_token="your_token") as sdk:
    # Your code here
    pass

# With custom configuration
async with FigmaVariablesSDK(
    api_token="your_token",
    base_url="https://api.figma.com",
    timeout=60.0,
    max_retries=5
) as sdk:
    # Your code here
    pass
```

## Reading Variables

### Get All Local Variables

```python
async def get_all_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Get complete response with variables and collections
        response = await sdk.get_local_variables(FILE_KEY)
        
        print(f"Status: {response.status}")
        print(f"Variables count: {len(response.variables)}")
        print(f"Collections count: {len(response.variable_collections)}")
        
        # Access variables
        for var_id, variable in response.variables.items():
            print(f"Variable: {variable.name} ({variable.resolvedType})")
            print(f"  Collection: {variable.variableCollectionId}")
            print(f"  Description: {variable.description}")
            
        # Access collections
        for coll_id, collection in response.variable_collections.items():
            print(f"Collection: {collection.name}")
            print(f"  Modes: {[mode.name for mode in collection.modes]}")
            print(f"  Variables: {len(collection.variableIds)}")
```

### Get Published Variables

```python
async def get_published_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        response = await sdk.get_published_variables(FILE_KEY)
        
        for var_id, variable in response.variables.items():
            print(f"Published Variable: {variable.name}")
            print(f"  Subscribed ID: {variable.subscribed_id}")
            print(f"  Updated: {variable.updatedAt}")
```

### Get Specific Variable

```python
async def get_variable_details():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        variable = await sdk.get_variable(FILE_KEY, "variable_id_here")
        
        print(f"Name: {variable.name}")
        print(f"Type: {variable.resolvedType}")
        print(f"Collection: {variable.variableCollectionId}")
        print(f"Scopes: {variable.scopes}")
        
        # Variable values by mode
        for mode_id, value in variable.valuesByMode.items():
            print(f"Mode {mode_id}: {value}")
```

### List and Filter Variables

```python
async def list_filtered_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # All variables
        all_variables = await sdk.list_variables(FILE_KEY)
        
        # Variables in specific collection
        collection_variables = await sdk.list_variables(
            FILE_KEY, 
            collection_id="collection_id_here"
        )
        
        # Published variables only
        published_variables = await sdk.list_variables(
            FILE_KEY, 
            published=True
        )
        
        # Filter by type
        color_variables = [
            var for var in all_variables 
            if var.resolvedType == "COLOR"
        ]
        
        print(f"Total variables: {len(all_variables)}")
        print(f"Collection variables: {len(collection_variables)}")
        print(f"Published variables: {len(published_variables)}")
        print(f"Color variables: {len(color_variables)}")
```

### Search Variables

```python
async def search_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Search by name
        primary_vars = await sdk.search_variables(FILE_KEY, "primary")
        color_vars = await sdk.search_variables(FILE_KEY, "color")
        
        print("Primary variables:")
        for var in primary_vars:
            print(f"  {var.name} - {var.resolvedType}")
        
        print("Color variables:")
        for var in color_vars:
            print(f"  {var.name} - {var.resolvedType}")
```

## Creating Variables

### Create Variable Collection

```python
async def create_collection():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        collection_id = await sdk.create_variable_collection(
            FILE_KEY,
            name="Brand Colors",
            hidden_from_publishing=False,
            initial_mode_name="Light Mode"
        )
        
        print(f"Created collection: {collection_id}")
        return collection_id
```

### Create Variables

```python
async def create_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # First create a collection
        collection_id = await sdk.create_variable_collection(
            FILE_KEY, 
            "UI Colors"
        )
        
        # Create color variable
        primary_color_id = await sdk.create_variable(
            FILE_KEY,
            name="Primary Color",
            collection_id=collection_id,
            variable_type="COLOR",
            description="Main brand color",
            scopes=["ALL_FILLS", "STROKE_COLOR"],
            hidden_from_publishing=False
        )
        
        # Create number variable
        border_radius_id = await sdk.create_variable(
            FILE_KEY,
            name="Border Radius",
            collection_id=collection_id,
            variable_type="FLOAT",
            description="Standard border radius",
            scopes=["CORNER_RADIUS"]
        )
        
        # Create string variable
        font_family_id = await sdk.create_variable(
            FILE_KEY,
            name="Font Family",
            collection_id=collection_id,
            variable_type="STRING",
            description="Primary font family",
            scopes=["FONT_FAMILY"]
        )
        
        print(f"Created variables:")
        print(f"  Primary Color: {primary_color_id}")
        print(f"  Border Radius: {border_radius_id}")
        print(f"  Font Family: {font_family_id}")
```

### Create with Custom Scopes

```python
from figma_variables.models import VariableScope

async def create_scoped_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        collection_id = await sdk.create_variable_collection(FILE_KEY, "Semantic Colors")
        
        # Text-specific color
        text_color_id = await sdk.create_variable(
            FILE_KEY,
            name="Text Primary",
            collection_id=collection_id,
            variable_type="COLOR",
            scopes=[VariableScope.TEXT_FILL]
        )
        
        # Frame-specific color
        bg_color_id = await sdk.create_variable(
            FILE_KEY,
            name="Background",
            collection_id=collection_id,
            variable_type="COLOR",
            scopes=[VariableScope.FRAME_FILL]
        )
        
        # Spacing variable
        spacing_id = await sdk.create_variable(
            FILE_KEY,
            name="Spacing Unit",
            collection_id=collection_id,
            variable_type="FLOAT",
            scopes=[VariableScope.GAP, VariableScope.WIDTH_HEIGHT]
        )
```

## Modifying Variables

### Update Variable Properties

```python
async def update_variable():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        await sdk.update_variable(
            FILE_KEY,
            variable_id="variable_id_here",
            name="Updated Variable Name",
            description="Updated description",
            scopes=["ALL_FILLS"],
            hidden_from_publishing=False
        )
        
        print("Variable updated successfully")
```

### Set Variable Values

```python
async def set_variable_values():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Get collection to find mode IDs
        collections = await sdk.list_variable_collections(FILE_KEY)
        collection = collections[0]  # First collection
        light_mode_id = collection.modes[0].modeId
        
        # Set color value
        await sdk.set_variable_value(
            FILE_KEY,
            variable_id="color_variable_id",
            mode_id=light_mode_id,
            value={"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}
        )
        
        # Set number value
        await sdk.set_variable_value(
            FILE_KEY,
            variable_id="number_variable_id", 
            mode_id=light_mode_id,
            value=8.0
        )
        
        # Set string value
        await sdk.set_variable_value(
            FILE_KEY,
            variable_id="string_variable_id",
            mode_id=light_mode_id,
            value="Inter, sans-serif"
        )
        
        # Set boolean value
        await sdk.set_variable_value(
            FILE_KEY,
            variable_id="boolean_variable_id",
            mode_id=light_mode_id,
            value=True
        )
```

### Delete Variables

```python
async def delete_variable():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        await sdk.delete_variable(FILE_KEY, "variable_id_to_delete")
        print("Variable deleted successfully")
```

## Working with Collections

### Manage Collections and Modes

```python
from figma_variables.models import VariablesRequest

async def manage_collections():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Complex operation using direct API
        request = VariablesRequest(
            variableCollections=[
                {
                    "action": "CREATE",
                    "id": "temp_collection_1",
                    "name": "Theme Colors",
                    "hiddenFromPublishing": False,
                    "initialModeId": "temp_mode_light"
                }
            ],
            variableModes=[
                {
                    "action": "CREATE",
                    "id": "temp_mode_light",
                    "name": "Light",
                    "variableCollectionId": "temp_collection_1"
                },
                {
                    "action": "CREATE", 
                    "id": "temp_mode_dark",
                    "name": "Dark",
                    "variableCollectionId": "temp_collection_1"
                }
            ],
            variables=[
                {
                    "action": "CREATE",
                    "id": "temp_var_primary",
                    "name": "Primary",
                    "variableCollectionId": "temp_collection_1",
                    "resolvedType": "COLOR",
                    "description": "Primary brand color"
                }
            ],
            variableModeValues=[
                {
                    "variableId": "temp_var_primary",
                    "modeId": "temp_mode_light",
                    "value": {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}
                },
                {
                    "variableId": "temp_var_primary",
                    "modeId": "temp_mode_dark",
                    "value": {"r": 0.3, "g": 0.5, "b": 0.9, "a": 1.0}
                }
            ]
        )
        
        response = await sdk.modify_variables(FILE_KEY, request)
        
        # Get real IDs from temp ID mapping
        real_collection_id = response.temp_id_to_real_id["temp_collection_1"]
        real_variable_id = response.temp_id_to_real_id["temp_var_primary"]
        
        print(f"Created collection: {real_collection_id}")
        print(f"Created variable: {real_variable_id}")
```

## Variable Values and Modes

### Work with Multiple Modes

```python
async def setup_theme_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Get existing collection with modes
        collections = await sdk.list_variable_collections(FILE_KEY)
        theme_collection = next(
            (c for c in collections if "theme" in c.name.lower()), 
            collections[0]
        )
        
        # Find light and dark modes
        light_mode = next(
            (m for m in theme_collection.modes if "light" in m.name.lower()), 
            theme_collection.modes[0]
        )
        dark_mode = next(
            (m for m in theme_collection.modes if "dark" in m.name.lower()),
            theme_collection.modes[1] if len(theme_collection.modes) > 1 else light_mode
        )
        
        # Create color variable
        primary_id = await sdk.create_variable(
            FILE_KEY,
            "Primary Color",
            theme_collection.id,
            "COLOR"
        )
        
        # Set values for both modes
        await sdk.set_variable_value(
            FILE_KEY,
            primary_id,
            light_mode.modeId,
            {"r": 0.0, "g": 0.4, "b": 0.8, "a": 1.0}  # Blue
        )
        
        await sdk.set_variable_value(
            FILE_KEY,
            primary_id,
            dark_mode.modeId,
            {"r": 0.2, "g": 0.6, "b": 1.0, "a": 1.0}  # Lighter blue
        )
```

### Variable Aliases

```python
async def create_alias_system():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Create base colors collection
        base_collection_id = await sdk.create_variable_collection(
            FILE_KEY, "Base Colors"
        )
        
        # Create semantic colors collection  
        semantic_collection_id = await sdk.create_variable_collection(
            FILE_KEY, "Semantic Colors"
        )
        
        # Create base color
        blue_500_id = await sdk.create_variable(
            FILE_KEY,
            "Blue 500",
            base_collection_id,
            "COLOR"
        )
        
        # Create semantic color that aliases the base color
        primary_id = await sdk.create_variable(
            FILE_KEY,
            "Primary",
            semantic_collection_id,
            "COLOR"
        )
        
        # Get mode IDs
        collections = await sdk.list_variable_collections(FILE_KEY)
        base_collection = next(c for c in collections if c.id == base_collection_id)
        semantic_collection = next(c for c in collections if c.id == semantic_collection_id)
        
        base_mode_id = base_collection.modes[0].modeId
        semantic_mode_id = semantic_collection.modes[0].modeId
        
        # Set base color value
        await sdk.set_variable_value(
            FILE_KEY,
            blue_500_id,
            base_mode_id,
            {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}
        )
        
        # Set alias value
        await sdk.set_variable_value(
            FILE_KEY,
            primary_id,
            semantic_mode_id,
            {"type": "VARIABLE_ALIAS", "id": blue_500_id}
        )
```

## Batch Operations

### Batch Create Variables

```python
async def batch_create_color_palette():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        collection_id = await sdk.create_variable_collection(
            FILE_KEY, "Color Palette"
        )
        
        colors = [
            {"name": "Red 100", "color": {"r": 1.0, "g": 0.9, "b": 0.9, "a": 1.0}},
            {"name": "Red 500", "color": {"r": 0.9, "g": 0.2, "b": 0.2, "a": 1.0}},
            {"name": "Red 900", "color": {"r": 0.6, "g": 0.1, "b": 0.1, "a": 1.0}},
            {"name": "Blue 100", "color": {"r": 0.9, "g": 0.95, "b": 1.0, "a": 1.0}},
            {"name": "Blue 500", "color": {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}},
            {"name": "Blue 900", "color": {"r": 0.1, "g": 0.2, "b": 0.5, "a": 1.0}},
        ]
        
        variables_data = [
            {
                "name": color["name"],
                "variableCollectionId": collection_id,
                "resolvedType": "COLOR",
                "description": f"{color['name']} color",
                "scopes": ["ALL_FILLS"]
            }
            for color in colors
        ]
        
        # Create all variables at once
        temp_id_mapping = await sdk.batch_create_variables(FILE_KEY, variables_data)
        
        # Set values for each variable
        collections = await sdk.list_variable_collections(FILE_KEY)
        collection = next(c for c in collections if c.id == collection_id)
        mode_id = collection.modes[0].modeId
        
        for i, (temp_id, real_id) in enumerate(temp_id_mapping.items()):
            await sdk.set_variable_value(
                FILE_KEY,
                real_id,
                mode_id,
                colors[i]["color"]
            )
        
        print(f"Created {len(colors)} color variables")
```

### Batch Get Variables

```python
async def analyze_variables():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Get all variables first
        all_variables = await sdk.list_variables(FILE_KEY)
        
        # Get specific variables by ID
        variable_ids = [var.id for var in all_variables[:5]]  # First 5
        specific_variables = await sdk.batch_get_variables(FILE_KEY, variable_ids)
        
        # Analyze by type
        by_type = {}
        for var in all_variables:
            var_type = var.resolvedType
            if var_type not in by_type:
                by_type[var_type] = []
            by_type[var_type].append(var)
        
        print("Variables by type:")
        for var_type, vars_list in by_type.items():
            print(f"  {var_type}: {len(vars_list)}")
```

## CLI Examples

### Basic CLI Commands

```bash
# Set environment variable
export FIGMA_TOKEN="your_token_here"

# List all variables
figma-variables list-variables ABC123DEF456

# List variables in table format
figma-variables list-variables ABC123DEF456 --format table

# List variables in JSON format
figma-variables list-variables ABC123DEF456 --format json

# List published variables only
figma-variables list-variables ABC123DEF456 --published

# Filter by collection
figma-variables list-variables ABC123DEF456 --collection collection_id_here

# List collections
figma-variables list-collections ABC123DEF456

# Get specific variable
figma-variables get-variable ABC123DEF456 variable_id_here

# Search variables
figma-variables search ABC123DEF456 "primary"

# Create collection
figma-variables create-collection ABC123DEF456 "Brand Colors"

# Create variable
figma-variables create-variable ABC123DEF456 "Primary Color" collection_id COLOR --description "Main brand color"

# Export to JSON file
figma-variables export ABC123DEF456 variables.json --published --pretty
```

### Advanced CLI Usage

```bash
# Using Figma URL instead of file key
figma-variables list-variables "https://www.figma.com/file/ABC123DEF456/My-Design-File"

# Provide token via command line
figma-variables list-variables ABC123DEF456 --token "your_token_here"

# Create hidden collection
figma-variables create-collection ABC123DEF456 "Internal Colors" --hidden --mode-name "Default"

# Create variable with description
figma-variables create-variable ABC123DEF456 "Border Radius" collection_id FLOAT \
  --description "Standard border radius for components" \
  --hidden

# Export with specific formatting
figma-variables export ABC123DEF456 variables.json --published --pretty
```

## Server API Examples

### Starting the Server

```bash
# Basic server start
figma-variables serve

# Custom configuration
figma-variables serve --port 3000 --host 127.0.0.1 --reload

# With API key
figma-variables serve --api-key "your_token_here"
```

### API Requests

```bash
# Get local variables
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/local"

# Get published variables
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/published"

# List variables with filtering
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables?collection_id=collection_123"

# Search variables
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/search?q=primary"

# Get specific variable
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/variable_123"

# Create variable collection
curl -X POST \
  -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/collections?name=New Collection"

# Create variable
curl -X POST \
  -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/create?name=New Variable&collection_id=collection_123&variable_type=COLOR"

# Delete variable
curl -X DELETE \
  -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/variable_123"

# Batch get variables
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/ABC123DEF456/variables/batch?variable_ids=var1,var2,var3"
```

### Complex API Operations

```bash
# Create variables with complex request
curl -X POST \
  -H "X-Figma-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "variableCollections": [
      {
        "action": "CREATE",
        "id": "temp_collection_1",
        "name": "Theme Colors",
        "hiddenFromPublishing": false,
        "initialModeId": "temp_mode_1"
      }
    ],
    "variableModes": [
      {
        "action": "CREATE",
        "id": "temp_mode_1",
        "name": "Light",
        "variableCollectionId": "temp_collection_1"
      },
      {
        "action": "CREATE",
        "id": "temp_mode_2", 
        "name": "Dark",
        "variableCollectionId": "temp_collection_1"
      }
    ],
    "variables": [
      {
        "action": "CREATE",
        "id": "temp_var_1",
        "name": "Primary Color",
        "variableCollectionId": "temp_collection_1",
        "resolvedType": "COLOR",
        "description": "Primary brand color"
      }
    ],
    "variableModeValues": [
      {
        "variableId": "temp_var_1",
        "modeId": "temp_mode_1",
        "value": {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}
      },
      {
        "variableId": "temp_var_1",
        "modeId": "temp_mode_2",
        "value": {"r": 0.3, "g": 0.5, "b": 0.9, "a": 1.0}
      }
    ]
  }' \
  "http://localhost:8000/v1/files/ABC123DEF456/variables"
```

## Advanced Use Cases

### Design Token Pipeline

```python
async def design_token_pipeline():
    """Complete pipeline for managing design tokens."""
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # 1. Create base token collections
        primitives_id = await sdk.create_variable_collection(
            FILE_KEY, "Primitives"
        )
        semantic_id = await sdk.create_variable_collection(
            FILE_KEY, "Semantic"
        )
        component_id = await sdk.create_variable_collection(
            FILE_KEY, "Component"
        )
        
        # 2. Create primitive tokens
        primitive_tokens = {
            "Gray 50": {"r": 0.98, "g": 0.98, "b": 0.98, "a": 1.0},
            "Gray 100": {"r": 0.95, "g": 0.95, "b": 0.95, "a": 1.0},
            "Gray 900": {"r": 0.1, "g": 0.1, "b": 0.1, "a": 1.0},
            "Blue 500": {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0},
            "Red 500": {"r": 0.9, "g": 0.2, "b": 0.2, "a": 1.0},
        }
        
        primitive_vars = {}
        for name, color in primitive_tokens.items():
            var_id = await sdk.create_variable(
                FILE_KEY, name, primitives_id, "COLOR"
            )
            primitive_vars[name] = var_id
            
            # Set color value
            collections = await sdk.list_variable_collections(FILE_KEY)
            primitives_collection = next(c for c in collections if c.id == primitives_id)
            mode_id = primitives_collection.modes[0].modeId
            
            await sdk.set_variable_value(FILE_KEY, var_id, mode_id, color)
        
        # 3. Create semantic tokens (aliases to primitives)
        semantic_tokens = {
            "Surface": "Gray 50",
            "Border": "Gray 100", 
            "Text": "Gray 900",
            "Primary": "Blue 500",
            "Danger": "Red 500"
        }
        
        semantic_vars = {}
        for name, primitive_name in semantic_tokens.items():
            var_id = await sdk.create_variable(
                FILE_KEY, name, semantic_id, "COLOR"
            )
            semantic_vars[name] = var_id
            
            # Set alias value
            collections = await sdk.list_variable_collections(FILE_KEY)
            semantic_collection = next(c for c in collections if c.id == semantic_id)
            mode_id = semantic_collection.modes[0].modeId
            
            await sdk.set_variable_value(
                FILE_KEY,
                var_id,
                mode_id,
                {"type": "VARIABLE_ALIAS", "id": primitive_vars[primitive_name]}
            )
        
        # 4. Create component tokens
        component_tokens = {
            "Button Background": "Primary",
            "Button Text": "Surface",
            "Card Background": "Surface",
            "Card Border": "Border"
        }
        
        for name, semantic_name in component_tokens.items():
            var_id = await sdk.create_variable(
                FILE_KEY, name, component_id, "COLOR"
            )
            
            collections = await sdk.list_variable_collections(FILE_KEY)
            component_collection = next(c for c in collections if c.id == component_id)
            mode_id = component_collection.modes[0].modeId
            
            await sdk.set_variable_value(
                FILE_KEY,
                var_id,
                mode_id,
                {"type": "VARIABLE_ALIAS", "id": semantic_vars[semantic_name]}
            )
        
        print("Design token pipeline complete!")
```

### Theme Management

```python
async def setup_theming_system():
    """Set up a complete theming system with light/dark modes."""
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Create theme collection with multiple modes
        request = VariablesRequest(
            variableCollections=[
                {
                    "action": "CREATE",
                    "id": "theme_collection",
                    "name": "Theme",
                    "hiddenFromPublishing": False,
                    "initialModeId": "light_mode"
                }
            ],
            variableModes=[
                {
                    "action": "CREATE",
                    "id": "light_mode",
                    "name": "Light",
                    "variableCollectionId": "theme_collection"
                },
                {
                    "action": "CREATE",
                    "id": "dark_mode",
                    "name": "Dark", 
                    "variableCollectionId": "theme_collection"
                },
                {
                    "action": "CREATE",
                    "id": "high_contrast_mode",
                    "name": "High Contrast",
                    "variableCollectionId": "theme_collection"
                }
            ],
            variables=[
                {
                    "action": "CREATE",
                    "id": "bg_primary",
                    "name": "Background Primary",
                    "variableCollectionId": "theme_collection",
                    "resolvedType": "COLOR",
                    "scopes": ["FRAME_FILL"]
                },
                {
                    "action": "CREATE",
                    "id": "text_primary",
                    "name": "Text Primary",
                    "variableCollectionId": "theme_collection", 
                    "resolvedType": "COLOR",
                    "scopes": ["TEXT_FILL"]
                }
            ],
            variableModeValues=[
                # Light mode values
                {
                    "variableId": "bg_primary",
                    "modeId": "light_mode",
                    "value": {"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}
                },
                {
                    "variableId": "text_primary",
                    "modeId": "light_mode",
                    "value": {"r": 0.1, "g": 0.1, "b": 0.1, "a": 1.0}
                },
                # Dark mode values
                {
                    "variableId": "bg_primary",
                    "modeId": "dark_mode",
                    "value": {"r": 0.1, "g": 0.1, "b": 0.1, "a": 1.0}
                },
                {
                    "variableId": "text_primary",
                    "modeId": "dark_mode",
                    "value": {"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}
                },
                # High contrast values
                {
                    "variableId": "bg_primary",
                    "modeId": "high_contrast_mode",
                    "value": {"r": 0.0, "g": 0.0, "b": 0.0, "a": 1.0}
                },
                {
                    "variableId": "text_primary",
                    "modeId": "high_contrast_mode",
                    "value": {"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}
                }
            ]
        )
        
        response = await sdk.modify_variables(FILE_KEY, request)
        print("Theme system created with Light, Dark, and High Contrast modes")
```

### Variable Audit and Cleanup

```python
async def audit_variables():
    """Audit variables and identify issues."""
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Get all variables and collections
        response = await sdk.get_local_variables(FILE_KEY)
        variables = response.variables
        collections = response.variable_collections
        
        # Analysis
        issues = []
        
        # Check for variables without descriptions
        no_description = [
            var for var in variables.values()
            if not var.description.strip()
        ]
        if no_description:
            issues.append(f"{len(no_description)} variables missing descriptions")
        
        # Check for variables without scopes
        no_scopes = [
            var for var in variables.values()
            if not var.scopes
        ]
        if no_scopes:
            issues.append(f"{len(no_scopes)} variables missing scopes")
        
        # Check for empty collections
        empty_collections = [
            coll for coll in collections.values()
            if not coll.variableIds
        ]
        if empty_collections:
            issues.append(f"{len(empty_collections)} empty collections")
        
        # Check for variables with no values
        no_values = [
            var for var in variables.values()
            if not var.valuesByMode
        ]
        if no_values:
            issues.append(f"{len(no_values)} variables with no values")
        
        # Report issues
        if issues:
            print("Variable Issues Found:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("No issues found!")
        
        # Usage statistics
        print(f"\nStatistics:")
        print(f"  Total variables: {len(variables)}")
        print(f"  Total collections: {len(collections)}")
        
        by_type = {}
        for var in variables.values():
            var_type = var.resolvedType
            by_type[var_type] = by_type.get(var_type, 0) + 1
        
        print("  Variables by type:")
        for var_type, count in by_type.items():
            print(f"    {var_type}: {count}")
```

These examples demonstrate the full capabilities of the Figma Variables Python library, from basic operations to complex design system management. Each example is self-contained and can be adapted to your specific use case.