# Figma Components Library Examples

This document provides comprehensive examples of using the Figma Components library.

## Table of Contents

1. [SDK Examples](#sdk-examples)
2. [CLI Examples](#cli-examples)
3. [Server Examples](#server-examples)
4. [Advanced Usage](#advanced-usage)
5. [Error Handling](#error-handling)
6. [Integration Examples](#integration-examples)

## SDK Examples

### Basic Component Operations

```python
import asyncio
from figma_components import FigmaComponentsSDK

async def component_examples():
    """Examples of working with components."""
    async with FigmaComponentsSDK("your-figma-token") as sdk:
        
        # Get a specific component
        component = await sdk.get_component("abc123def456")
        print(f"Component: {component.name}")
        print(f"Description: {component.description}")
        print(f"File: {component.file_key}")
        print(f"Updated: {component.updated_at}")
        print(f"Author: {component.user.handle}")
        
        # List all components in a team
        team_components = await sdk.list_team_components("team123")
        print(f"Found {len(team_components)} components in team")
        
        # List components with pagination
        components_page = await sdk.list_team_components(
            "team123",
            page_size=50,
            after=100  # Start after cursor position 100
        )
        
        # List components from a specific file
        file_components = await sdk.list_file_components("file123")
        for component in file_components:
            print(f"- {component.name} ({component.key})")
        
        # Search for components
        button_components = await sdk.search_team_components(
            "team123", 
            "button", 
            limit=10
        )
        print(f"Found {len(button_components)} button components")
        
        # Get multiple components at once
        component_keys = ["key1", "key2", "key3"]
        batch_components = await sdk.batch_get_components(component_keys)
        print(f"Retrieved {len(batch_components)} components")

asyncio.run(component_examples())
```

### Component Sets Operations

```python
import asyncio
from figma_components import FigmaComponentsSDK

async def component_set_examples():
    """Examples of working with component sets."""
    async with FigmaComponentsSDK("your-figma-token") as sdk:
        
        # Get a specific component set
        component_set = await sdk.get_component_set("cs123abc")
        print(f"Component Set: {component_set.name}")
        print(f"Contains variants of: {component_set.description}")
        
        # List team component sets
        team_sets = await sdk.list_team_component_sets("team123")
        for cs in team_sets:
            print(f"- {cs.name}: {cs.description}")
        
        # List component sets from a file
        file_sets = await sdk.list_file_component_sets("file123")
        print(f"File has {len(file_sets)} component sets")

asyncio.run(component_set_examples())
```

### Styles Operations

```python
import asyncio
from figma_components import FigmaComponentsSDK, StyleType

async def style_examples():
    """Examples of working with styles."""
    async with FigmaComponentsSDK("your-figma-token") as sdk:
        
        # Get a specific style
        style = await sdk.get_style("style123")
        print(f"Style: {style.name}")
        print(f"Type: {style.style_type}")
        print(f"Sort Position: {style.sort_position}")
        
        # List all team styles
        team_styles = await sdk.list_team_styles("team123")
        
        # Filter styles by type
        fill_styles = await sdk.list_team_styles(
            "team123", 
            style_type=StyleType.FILL
        )
        text_styles = await sdk.list_team_styles(
            "team123", 
            style_type=StyleType.TEXT
        )
        
        print(f"Fill styles: {len(fill_styles)}")
        print(f"Text styles: {len(text_styles)}")
        
        # List styles from a file
        file_styles = await sdk.list_file_styles(
            "file123", 
            style_type=StyleType.EFFECT
        )
        for style in file_styles:
            print(f"- {style.name} ({style.style_type.value})")

asyncio.run(style_examples())
```

### Convenience Methods

```python
import asyncio
from figma_components import FigmaComponentsSDK

async def convenience_examples():
    """Examples using convenience methods."""
    async with FigmaComponentsSDK("your-figma-token") as sdk:
        
        # Get components from any Figma URL
        figma_url = "https://www.figma.com/file/abc123/My-Design"
        components = await sdk.get_components_from_url(figma_url)
        print(f"Found {len(components)} components in file")
        
        # Get components from team URL
        team_url = "https://www.figma.com/team/123456"
        team_components = await sdk.get_components_from_url(team_url)
        print(f"Team has {len(team_components)} components")
        
        # Get all assets from a team at once
        all_assets = await sdk.get_all_team_assets("team123")
        
        print(f"Team Assets Summary:")
        print(f"- Components: {len(all_assets['components'])}")
        print(f"- Component Sets: {len(all_assets['component_sets'])}")
        print(f"- Styles: {len(all_assets['styles'])}")
        
        # Process each type of asset
        for component in all_assets['components']:
            print(f"Component: {component.name}")
            
        for component_set in all_assets['component_sets']:
            print(f"Component Set: {component_set.name}")
            
        for style in all_assets['styles']:
            print(f"Style: {style.name} ({style.style_type.value})")

asyncio.run(convenience_examples())
```

## CLI Examples

### Basic CLI Usage

```bash
# Set your API token
export FIGMA_TOKEN="your-figma-token"

# Or provide it with each command
alias figma-components='figma-components --api-key "your-token"'
```

### Component Commands

```bash
# List components from a team (table format)
figma-components components --team-id 123456

# List components from a file
figma-components components --file-key abc123def456

# Search for components
figma-components components --team-id 123456 --search "button"

# Limit results
figma-components components --team-id 123456 --limit 20

# Use Figma URL instead of IDs
figma-components components --url "https://www.figma.com/file/abc123/Design"

# JSON output
figma-components components --team-id 123456 --format json

# Save to file
figma-components components --team-id 123456 --format json --output components.json

# Get a specific component
figma-components component abc123def456 --format table
```

### Component Set Commands

```bash
# List component sets
figma-components component-sets --team-id 123456

# From a file
figma-components component-sets --file-key abc123

# JSON output to file
figma-components component-sets --team-id 123456 --format json --output sets.json
```

### Style Commands

```bash
# List all styles
figma-components styles --team-id 123456

# Filter by type
figma-components styles --team-id 123456 --type FILL
figma-components styles --team-id 123456 --type TEXT
figma-components styles --team-id 123456 --type EFFECT

# From a file with filtering
figma-components styles --file-key abc123 --type FILL --format json
```

### Bulk Operations

```bash
# Get all assets from a team
figma-components all 123456 --output team_assets.json

# This creates a comprehensive JSON file with all components, sets, and styles
```

### Server Commands

```bash
# Start server with defaults (port 8000)
figma-components serve

# Custom port
figma-components serve --port 3000

# Custom host and port
figma-components serve --host 127.0.0.1 --port 8080

# With API key
figma-components serve --api-key "your-token" --port 3000

# Development mode with auto-reload
figma-components serve --reload --port 8000
```

## Server Examples

### Starting the Server

```bash
# Basic server start
figma-components serve

# Server will be available at:
# - API docs: http://localhost:8000/docs
# - ReDoc: http://localhost:8000/redoc
# - Health check: http://localhost:8000/health
```

### API Usage Examples

```bash
# Health check (no authentication required)
curl http://localhost:8000/health

# Get a component (with header authentication)
curl -H "X-Figma-Token: your-token" \
     http://localhost:8000/v1/components/abc123def456

# Get a component (with query parameter authentication)
curl "http://localhost:8000/v1/components/abc123def456?token=your-token"

# List team components with pagination
curl -H "X-Figma-Token: your-token" \
     "http://localhost:8000/v1/teams/123456/components?page_size=50&after=100"

# Search components
curl -H "X-Figma-Token: your-token" \
     "http://localhost:8000/v1/teams/123456/components/search?q=button&limit=10"

# Get component sets
curl -H "X-Figma-Token: your-token" \
     http://localhost:8000/v1/teams/123456/component_sets

# Get styles with filtering
curl -H "X-Figma-Token: your-token" \
     "http://localhost:8000/v1/teams/123456/styles?style_type=FILL"

# Batch get components
curl -X POST \
     -H "X-Figma-Token: your-token" \
     -H "Content-Type: application/json" \
     -d '["key1", "key2", "key3"]' \
     http://localhost:8000/v1/components/batch

# Get all team assets
curl -H "X-Figma-Token: your-token" \
     http://localhost:8000/v1/teams/123456/assets

# Extract IDs from URL
curl "http://localhost:8000/v1/utils/extract-ids?url=https://www.figma.com/file/abc123/Design"
```

### Python Client for Server

```python
import httpx
import asyncio

async def api_client_example():
    """Example of using the API server from Python."""
    headers = {"X-Figma-Token": "your-token"}
    
    async with httpx.AsyncClient() as client:
        # Get a component
        response = await client.get(
            "http://localhost:8000/v1/components/abc123",
            headers=headers
        )
        component = response.json()
        print(f"Component: {component['name']}")
        
        # Search components
        response = await client.get(
            "http://localhost:8000/v1/teams/123456/components/search",
            params={"q": "button", "limit": 5},
            headers=headers
        )
        components = response.json()
        print(f"Found {len(components)} button components")
        
        # Get all team assets
        response = await client.get(
            "http://localhost:8000/v1/teams/123456/assets",
            headers=headers
        )
        assets = response.json()
        print(f"Summary: {assets['summary']}")

asyncio.run(api_client_example())
```

## Advanced Usage

### Custom Client Configuration

```python
import asyncio
from figma_components import FigmaComponentsClient, FigmaComponentsSDK

async def custom_client_example():
    """Example with custom client configuration."""
    
    # Custom low-level client
    async with FigmaComponentsClient(
        "your-token",
        timeout=60.0,
        max_retries=5,
        rate_limit_requests=200,  # 200 requests per minute
        rate_limit_window=60,
    ) as client:
        
        # Direct API calls
        response = await client.get_team_components("team123", page_size=100)
        print(f"API Response: {response}")
        
        # Pagination with custom client
        all_components = []
        async for component in client.paginate(
            "/v1/teams/team123/components",
            items_key="components"
        ):
            all_components.append(component)
            if len(all_components) >= 500:  # Limit to 500
                break
        
        print(f"Collected {len(all_components)} components")
    
    # Custom SDK with client settings
    sdk = FigmaComponentsSDK(
        "your-token",
        timeout=45.0,
        max_retries=3,
    )
    
    async with sdk:
        components = await sdk.list_team_components("team123")
        print(f"SDK found {len(components)} components")

asyncio.run(custom_client_example())
```

### Working with Large Datasets

```python
import asyncio
from figma_components import FigmaComponentsSDK

async def large_dataset_example():
    """Example of efficiently working with large datasets."""
    async with FigmaComponentsSDK("your-token") as sdk:
        
        # Process components in batches
        page_size = 100
        after_cursor = None
        all_components = []
        
        while True:
            components = await sdk.list_team_components(
                "team123",
                page_size=page_size,
                after=after_cursor
            )
            
            if not components:
                break
            
            all_components.extend(components)
            print(f"Loaded {len(all_components)} total components...")
            
            # Update cursor for next page
            # Note: You'd need to extract this from the response metadata
            # This is simplified for the example
            if len(components) < page_size:
                break
            
            # Simulate cursor update
            after_cursor = len(all_components)
        
        print(f"Final total: {len(all_components)} components")
        
        # Process in parallel where possible
        import asyncio
        
        # Get multiple specific items concurrently
        keys = [comp.key for comp in all_components[:10]]
        
        # Split into chunks for batch processing
        chunk_size = 5
        chunks = [keys[i:i + chunk_size] for i in range(0, len(keys), chunk_size)]
        
        detailed_components = []
        for chunk in chunks:
            batch = await sdk.batch_get_components(chunk)
            detailed_components.extend(batch)
        
        print(f"Got detailed info for {len(detailed_components)} components")

asyncio.run(large_dataset_example())
```

## Error Handling

### Comprehensive Error Handling

```python
import asyncio
from figma_components import (
    FigmaComponentsSDK,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    NetworkError,
    ValidationError,
)

async def error_handling_examples():
    """Examples of error handling."""
    
    # Basic error handling
    try:
        async with FigmaComponentsSDK("invalid-token") as sdk:
            component = await sdk.get_component("some-key")
    except AuthenticationError:
        print("❌ Invalid API token")
    except AuthorizationError:
        print("❌ Insufficient permissions")
    except NotFoundError:
        print("❌ Component not found")
    except RateLimitError as e:
        print(f"❌ Rate limited. Retry after {e.retry_after} seconds")
    except ApiError as e:
        print(f"❌ API error: {e.message} (status: {e.status_code})")
    except NetworkError:
        print("❌ Network connectivity issue")
    except ValidationError as e:
        print(f"❌ Validation error: {e.message}")
    
    # Retry logic for rate limiting
    async def get_component_with_retry(sdk, key, max_retries=3):
        """Get component with automatic retry on rate limit."""
        for attempt in range(max_retries):
            try:
                return await sdk.get_component(key)
            except RateLimitError as e:
                if attempt == max_retries - 1:
                    raise
                print(f"Rate limited, waiting {e.retry_after} seconds...")
                await asyncio.sleep(e.retry_after)
    
    # Graceful degradation
    async def get_components_safely(sdk, keys):
        """Get components with graceful error handling."""
        successful = []
        failed = []
        
        for key in keys:
            try:
                component = await sdk.get_component(key)
                successful.append(component)
            except NotFoundError:
                failed.append(key)
                print(f"⚠️  Component {key} not found, skipping...")
            except Exception as e:
                failed.append(key)
                print(f"⚠️  Error getting {key}: {e}")
        
        print(f"✅ Successfully loaded {len(successful)} components")
        print(f"❌ Failed to load {len(failed)} components")
        return successful, failed
    
    # Example usage
    try:
        async with FigmaComponentsSDK("your-token") as sdk:
            keys = ["valid-key", "invalid-key", "another-key"]
            successful, failed = await get_components_safely(sdk, keys)
    except Exception as e:
        print(f"Fatal error: {e}")

asyncio.run(error_handling_examples())
```

## Integration Examples

### Design System Audit

```python
import asyncio
from collections import defaultdict
from figma_components import FigmaComponentsSDK

async def design_system_audit():
    """Audit a design system for consistency and usage."""
    async with FigmaComponentsSDK("your-token") as sdk:
        
        # Get all assets
        assets = await sdk.get_all_team_assets("your-team-id")
        
        print("=== Design System Audit ===\n")
        
        # Component analysis
        components = assets['components']
        print(f"📦 Components: {len(components)}")
        
        # Group by user
        by_author = defaultdict(list)
        for comp in components:
            by_author[comp.user.handle].append(comp)
        
        print("\n👥 Components by Author:")
        for author, comps in by_author.items():
            print(f"  {author}: {len(comps)} components")
        
        # Find components without descriptions
        no_desc = [c for c in components if not c.description.strip()]
        print(f"\n⚠️  Components without descriptions: {len(no_desc)}")
        for comp in no_desc[:5]:  # Show first 5
            print(f"  - {comp.name}")
        
        # Component sets analysis
        component_sets = assets['component_sets']
        print(f"\n🔗 Component Sets: {len(component_sets)}")
        
        # Styles analysis
        styles = assets['styles']
        style_counts = defaultdict(int)
        for style in styles:
            style_counts[style.style_type.value] += 1
        
        print(f"\n🎨 Styles: {len(styles)}")
        for style_type, count in style_counts.items():
            print(f"  {style_type}: {count}")
        
        # Find potentially duplicate components
        name_groups = defaultdict(list)
        for comp in components:
            # Group by similar names
            base_name = comp.name.lower().replace(" ", "").replace("-", "")
            name_groups[base_name].append(comp)
        
        duplicates = {name: comps for name, comps in name_groups.items() if len(comps) > 1}
        print(f"\n🔍 Potential duplicate component names: {len(duplicates)}")
        for name, comps in list(duplicates.items())[:3]:
            print(f"  '{name}': {len(comps)} variants")
            for comp in comps:
                print(f"    - {comp.name} ({comp.key})")

asyncio.run(design_system_audit())
```

### Component Usage Report

```python
import asyncio
import json
from datetime import datetime
from figma_components import FigmaComponentsSDK

async def generate_usage_report():
    """Generate a usage report for components."""
    async with FigmaComponentsSDK("your-token") as sdk:
        
        print("Generating component usage report...")
        
        # Get all team components
        components = []
        try:
            # Use pagination to get all components
            page_size = 100
            after = None
            
            while True:
                batch = await sdk.list_team_components(
                    "your-team-id",
                    page_size=page_size,
                    after=after
                )
                
                if not batch:
                    break
                
                components.extend(batch)
                print(f"Loaded {len(components)} components...")
                
                if len(batch) < page_size:
                    break
                
                # Simulate pagination cursor
                after = len(components)
        
        except Exception as e:
            print(f"Error loading components: {e}")
            return
        
        # Generate report
        report = {
            "generated_at": datetime.now().isoformat(),
            "team_id": "your-team-id",
            "summary": {
                "total_components": len(components),
                "total_component_sets": 0,  # Would get from component sets
                "total_styles": 0,          # Would get from styles
            },
            "components": []
        }
        
        for comp in components:
            component_data = {
                "key": comp.key,
                "name": comp.name,
                "description": comp.description,
                "file_key": comp.file_key,
                "created_at": comp.created_at.isoformat(),
                "updated_at": comp.updated_at.isoformat(),
                "author": comp.user.handle,
                "thumbnail_url": comp.thumbnail_url,
            }
            
            if comp.containing_frame:
                component_data["frame"] = {
                    "name": comp.containing_frame.name,
                    "page_name": comp.containing_frame.page_name,
                }
            
            report["components"].append(component_data)
        
        # Save report
        filename = f"component_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"✅ Report saved to {filename}")
        print(f"📊 Total components analyzed: {len(components)}")

asyncio.run(generate_usage_report())
```

### Sync Components to External System

```python
import asyncio
import aiofiles
from figma_components import FigmaComponentsSDK

async def sync_to_external_system():
    """Example of syncing components to an external system."""
    async with FigmaComponentsSDK("your-token") as sdk:
        
        print("🔄 Syncing components to external system...")
        
        # Get components that have been updated recently
        components = await sdk.list_team_components("your-team-id")
        
        # Filter for recently updated (example: last 7 days)
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=7)
        recent_components = [
            c for c in components 
            if c.updated_at.replace(tzinfo=None) > cutoff_date
        ]
        
        print(f"📦 Found {len(recent_components)} recently updated components")
        
        # Process each component
        for comp in recent_components:
            try:
                # Example: Save component data to file system
                # (In practice, you'd sync to your design system tools)
                
                component_dir = f"components/{comp.key}"
                import os
                os.makedirs(component_dir, exist_ok=True)
                
                # Save metadata
                metadata = {
                    "name": comp.name,
                    "description": comp.description,
                    "updated_at": comp.updated_at.isoformat(),
                    "figma_url": f"https://www.figma.com/file/{comp.file_key}",
                    "author": comp.user.handle,
                }
                
                async with aiofiles.open(f"{component_dir}/metadata.json", 'w') as f:
                    await f.write(json.dumps(metadata, indent=2))
                
                # Download thumbnail if available
                if comp.thumbnail_url:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        response = await client.get(comp.thumbnail_url)
                        if response.status_code == 200:
                            async with aiofiles.open(f"{component_dir}/thumbnail.png", 'wb') as f:
                                await f.write(response.content)
                
                print(f"✅ Synced: {comp.name}")
                
            except Exception as e:
                print(f"❌ Failed to sync {comp.name}: {e}")
        
        print("🎉 Sync complete!")

# Note: This example requires aiofiles: pip install aiofiles
# asyncio.run(sync_to_external_system())
```

These examples demonstrate the flexibility and power of the Figma Components library for various use cases, from simple component retrieval to complex design system management workflows.