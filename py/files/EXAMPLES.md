# Figma Files SDK Examples

This document provides comprehensive examples of using the Figma Files SDK for various common tasks.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [File Operations](#file-operations)
3. [Image Rendering](#image-rendering)
4. [Metadata and Versions](#metadata-and-versions)
5. [Search and Discovery](#search-and-discovery)
6. [Error Handling](#error-handling)
7. [CLI Examples](#cli-examples)
8. [Advanced Patterns](#advanced-patterns)

## Basic Usage

### Initialize the SDK

```python
import asyncio
from figma_files import FigmaFileSDK, ImageFormat

async def main():
    # Method 1: Using environment variable FIGMA_API_KEY
    async with FigmaFileSDK() as sdk:
        # Your code here
        pass
    
    # Method 2: Explicit API key
    async with FigmaFileSDK(api_key="your-figma-token") as sdk:
        # Your code here
        pass

asyncio.run(main())
```

### Extract Information from URLs

```python
from figma_files.utils import extract_file_key_from_url, extract_node_id_from_url

# Extract file key from Figma URL
url = "https://www.figma.com/file/abc123def456/My-Design-File"
file_key = extract_file_key_from_url(url)
print(f"File key: {file_key}")  # abc123def456

# Extract node ID from URL with node parameter
url_with_node = "https://www.figma.com/file/abc123def456/My-Design?node-id=1%3A2"
node_id = extract_node_id_from_url(url_with_node)
print(f"Node ID: {node_id}")  # 1:2
```

## File Operations

### Get Complete File Data

```python
async def get_complete_file():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Get file with all default settings
        file_data = await sdk.get_file("abc123def456")
        
        print(f"File: {file_data.name}")
        print(f"Role: {file_data.role.value}")
        print(f"Editor: {file_data.editor_type.value}")
        print(f"Components: {len(file_data.components)}")
        print(f"Last modified: {file_data.last_modified}")
        
        # Access document structure
        print(f"Document type: {file_data.document.type}")
        print(f"Document children: {len(file_data.document.children)}")
```

### Get File with Specific Options

```python
async def get_file_with_options():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        file_data = await sdk.get_file(
            "abc123def456",
            version="123",  # Specific version
            node_ids=["1:2", "3:4"],  # Only these nodes
            depth=2,  # Limit tree depth
            include_geometry=True,  # Include vector paths
            plugin_data=["plugin123"],  # Include plugin data
            include_branch_data=True  # Include branch info
        )
        
        print(f"Specific file data retrieved: {file_data.name}")
```

### Get Specific Nodes

```python
async def get_specific_nodes():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Get multiple specific nodes
        nodes_data = await sdk.get_file_nodes(
            "abc123def456",
            ["1:2", "3:4", "5:6"],
            depth=1,
            include_geometry=True
        )
        
        print(f"Retrieved nodes from: {nodes_data.name}")
        
        # Check which nodes were found
        for node_id, node_data in nodes_data.nodes.items():
            if node_data:
                print(f"✓ Node {node_id} found")
            else:
                print(f"✗ Node {node_id} not found")
```

### Get Node from URL

```python
async def get_node_from_url():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        figma_url = "https://www.figma.com/file/abc123/Design?node-id=1%3A2"
        
        node_data = await sdk.get_node_from_url(
            figma_url,
            depth=2,
            include_geometry=True
        )
        
        print(f"Node retrieved from: {node_data.name}")
```

## Image Rendering

### Basic Image Rendering

```python
async def render_basic_images():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        images = await sdk.render_images(
            "abc123def456",
            ["1:2", "3:4"],
            format=ImageFormat.PNG,
            scale=2.0
        )
        
        if images.err:
            print(f"Error: {images.err}")
            return
        
        for node_id, url in images.images.items():
            if url:
                print(f"Node {node_id}: {url}")
            else:
                print(f"Node {node_id}: Failed to render")
```

### Advanced Image Rendering

```python
async def render_advanced_images():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # SVG with custom options
        svg_images = await sdk.render_images(
            "abc123def456",
            ["1:2"],
            format=ImageFormat.SVG,
            scale=1.0,
            svg_options={
                "svg_outline_text": False,  # Keep text as <text> elements
                "svg_include_id": True,     # Include layer names as IDs
                "svg_include_node_id": True, # Include node IDs
                "svg_simplify_stroke": False # Keep complex strokes
            },
            contents_only=False,  # Include overlapping content
            use_absolute_bounds=True  # Use full node dimensions
        )
        
        # PDF export
        pdf_images = await sdk.render_images(
            "abc123def456",
            ["1:2"],
            format=ImageFormat.PDF,
            scale=1.0
        )
        
        print("Advanced rendering completed")
```

### Render from URL

```python
async def render_from_url():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        figma_url = "https://www.figma.com/file/abc123/Design?node-id=1%3A2"
        
        image = await sdk.render_node_from_url(
            figma_url,
            scale=3.0,
            format=ImageFormat.PNG
        )
        
        if not image.err:
            # Get the image URL (first and only item)
            url = next(iter(image.images.values()))
            print(f"Rendered image: {url}")
```

### Download Rendered Images

```python
import httpx
from pathlib import Path

async def download_images():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Render images
        images = await sdk.render_images(
            "abc123def456",
            ["1:2", "3:4"],
            format=ImageFormat.PNG,
            scale=2.0
        )
        
        if images.err:
            print(f"Render error: {images.err}")
            return
        
        # Download each image
        output_dir = Path("./downloads")
        output_dir.mkdir(exist_ok=True)
        
        async with httpx.AsyncClient() as client:
            for node_id, url in images.images.items():
                if url:
                    try:
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        filename = f"{node_id.replace(':', '-')}.png"
                        filepath = output_dir / filename
                        
                        with open(filepath, "wb") as f:
                            f.write(response.content)
                        
                        print(f"Downloaded: {filename}")
                    except Exception as e:
                        print(f"Failed to download {node_id}: {e}")
```

### Batch Image Rendering

```python
async def batch_render_images():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Define multiple render requests
        requests = [
            {
                "file_key_or_url": "file1",
                "node_ids": ["1:1", "1:2"],
                "format": ImageFormat.PNG,
                "scale": 1.0
            },
            {
                "file_key_or_url": "file2", 
                "node_ids": ["2:1"],
                "format": ImageFormat.SVG,
                "scale": 2.0
            },
            {
                "file_key_or_url": "https://www.figma.com/file/file3/Design?node-id=3%3A1",
                "node_ids": ["3:1"],
                "format": ImageFormat.JPG,
                "scale": 0.5
            }
        ]
        
        # Execute all requests in parallel
        results = await sdk.batch_render_images(requests)
        
        for i, result in enumerate(results):
            print(f"Request {i+1}:")
            if result.err:
                print(f"  Error: {result.err}")
            else:
                print(f"  Success: {len(result.images)} images")
```

## Metadata and Versions

### Get File Metadata

```python
async def get_file_metadata():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        meta = await sdk.get_file_metadata("abc123def456")
        
        print(f"File: {meta.name}")
        print(f"Creator: {meta.creator.handle}")
        print(f"Created: {meta.last_touched_at}")
        print(f"Editor: {meta.editor_type.value}")
        print(f"Role: {meta.role.value}")
        
        if meta.folder_name:
            print(f"Project: {meta.folder_name}")
        
        if meta.last_touched_by:
            print(f"Last modified by: {meta.last_touched_by.handle}")
```

### Get Version History

```python
async def get_version_history():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        versions = await sdk.get_file_versions(
            "abc123def456",
            page_size=20
        )
        
        print(f"Found {len(versions.versions)} versions:")
        
        for version in versions.versions:
            print(f"  {version.id}: {version.label}")
            print(f"    Created: {version.created_at}")
            print(f"    By: {version.user.handle}")
            if version.description:
                print(f"    Description: {version.description}")
            print()
        
        # Check for pagination
        if versions.pagination.next_page:
            print("More versions available...")
```

### Get Image Fills

```python
async def get_image_fills():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        fills = await sdk.get_image_fills("abc123def456")
        
        if fills.error:
            print("Error retrieving image fills")
            return
        
        print(f"Found {len(fills.meta.images)} image fills:")
        
        for reference, url in fills.meta.images.items():
            print(f"  {reference}: {url}")
```

## Search and Discovery

### Search Nodes by Name

```python
async def search_nodes():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Case-insensitive search
        matches = await sdk.search_nodes_by_name(
            "abc123def456",
            "button",
            case_sensitive=False
        )
        
        print(f"Found {len(matches)} nodes matching 'button':")
        
        for match in matches:
            print(f"  {match['id']}: {match['name']} ({match['type']})")
        
        # Case-sensitive search
        exact_matches = await sdk.search_nodes_by_name(
            "abc123def456",
            "Button",
            case_sensitive=True
        )
        
        print(f"Found {len(exact_matches)} exact matches for 'Button'")
```

### List All Components

```python
async def list_components():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        components = await sdk.get_components_in_file("abc123def456")
        
        if not components:
            print("No components found in file")
            return
        
        print(f"Found {len(components)} components:")
        
        for component in components:
            print(f"  {component['name']} (ID: {component['id']})")
            print(f"    Key: {component['key']}")
            if component.get('description'):
                print(f"    Description: {component['description']}")
            print()
```

### Advanced File Analysis

```python
async def analyze_file_structure():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        file_data = await sdk.get_file("abc123def456")
        
        def analyze_node(node, depth=0):
            indent = "  " * depth
            print(f"{indent}{node.name} ({node.type})")
            
            if hasattr(node, 'children') and node.children:
                for child in node.children:
                    analyze_node(child, depth + 1)
        
        print("File structure:")
        analyze_node(file_data.document)
        
        print(f"\nSummary:")
        print(f"Components: {len(file_data.components)}")
        print(f"Styles: {len(file_data.styles)}")
        
        # Analyze component usage
        if file_data.components:
            print(f"\nComponents in file:")
            for comp_id, component in file_data.components.items():
                print(f"  {component.name}: {component.key}")
```

## Error Handling

### Comprehensive Error Handling

```python
from figma_files import (
    FigmaFileSDK, 
    ApiError, 
    RateLimitError, 
    AuthenticationError,
    ValidationError
)
import asyncio

async def robust_api_call():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        try:
            file_data = await sdk.get_file("abc123def456")
            print(f"Successfully retrieved: {file_data.name}")
            
        except AuthenticationError as e:
            print(f"Authentication failed: {e.message}")
            print("Check your API token and permissions")
            
        except RateLimitError as e:
            print(f"Rate limited. Retry after {e.retry_after} seconds")
            await asyncio.sleep(e.retry_after)
            # Retry the request
            
        except ValidationError as e:
            print(f"Validation error: {e.message}")
            print("Check your input parameters")
            
        except ApiError as e:
            print(f"API error: {e.message}")
            if e.status_code:
                print(f"Status code: {e.status_code}")
            
        except Exception as e:
            print(f"Unexpected error: {e}")
```

### Retry Logic with Exponential Backoff

```python
async def retry_with_backoff(func, max_retries=3):
    """Execute function with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            return await func()
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = min(e.retry_after, 2 ** attempt)
                print(f"Rate limited, waiting {wait_time}s (attempt {attempt + 1})")
                await asyncio.sleep(wait_time)
            else:
                raise
        except ApiError as e:
            if e.status_code and 500 <= e.status_code < 600:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"Server error, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                else:
                    raise
            else:
                raise

# Usage
async def safe_get_file():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        result = await retry_with_backoff(
            lambda: sdk.get_file("abc123def456")
        )
        return result
```

## CLI Examples

### Basic CLI Usage

```bash
# Set API key as environment variable
export FIGMA_API_KEY="your-figma-token"

# Get file information (table format)
figma-files get-file abc123def456

# Get file information (JSON format)
figma-files get-file abc123def456 --output json

# Use file URL instead of key
figma-files get-file "https://www.figma.com/file/abc123def456/My-Design"
```

### File Operations

```bash
# Get file with specific version and depth
figma-files get-file abc123def456 --version 123 --depth 2 --geometry

# Get specific nodes
figma-files get-nodes abc123def456 "1:2,3:4,5:6" --depth 1

# Get single node from URL
figma-files get-node "https://www.figma.com/file/abc123/Design?node-id=1%3A2"

# Save file data to JSON
figma-files get-file abc123def456 --save file-data.json
```

### Image Rendering

```bash
# Render images in PNG format
figma-files render-images abc123def456 "1:2,3:4" --format png --scale 2.0

# Render with output directory (downloads images)
figma-files render-images abc123def456 "1:2,3:4" --output-dir ./images/

# Render single node from URL
figma-files render-node "https://www.figma.com/file/abc123/Design?node-id=1%3A2" --format svg --output node.svg

# Render in different formats
figma-files render-images abc123def456 "1:2" --format pdf --scale 1.0
```

### Metadata and Search

```bash
# Get file metadata
figma-files get-metadata abc123def456

# Get version history
figma-files get-versions abc123def456 --page-size 10

# Search for nodes
figma-files search-nodes abc123def456 "Button" --limit 20 --case-sensitive

# List all components
figma-files list-components abc123def456 --output json
```

### Utility Commands

```bash
# Extract file key and node ID from URL
figma-files extract-url-info "https://www.figma.com/file/abc123/Design?node-id=1%3A2"

# Get image fills
figma-files get-image-fills abc123def456 --save image-fills.json
```

## Advanced Patterns

### Custom Client Configuration

```python
from figma_files import FigmaFileClient, FigmaFileSDK

async def custom_client_example():
    # Create client with custom settings
    client = FigmaFileClient(
        api_key="your-token",
        base_url="https://api.figma.com",
        timeout=60.0,
        max_retries=5,
        rate_limit=5  # 5 requests per second
    )
    
    # Use custom client with SDK
    sdk = FigmaFileSDK(client=client)
    
    async with sdk:
        file_data = await sdk.get_file("abc123def456")
        print(f"Retrieved with custom client: {file_data.name}")
```

### Processing Large Files Efficiently

```python
async def process_large_file():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Get file structure first (without full content)
        file_meta = await sdk.get_file_metadata("large-file-key")
        print(f"Processing large file: {file_meta.name}")
        
        # Get file with limited depth to understand structure
        file_structure = await sdk.get_file(
            "large-file-key",
            depth=2  # Only get top 2 levels
        )
        
        # Extract specific node IDs you need
        target_nodes = []
        def find_target_nodes(node, target_type="FRAME"):
            if node.type == target_type:
                target_nodes.append(node.id)
            if hasattr(node, 'children'):
                for child in node.children:
                    find_target_nodes(child, target_type)
        
        find_target_nodes(file_structure.document)
        
        # Process nodes in batches
        batch_size = 10
        for i in range(0, len(target_nodes), batch_size):
            batch = target_nodes[i:i + batch_size]
            
            # Get detailed node data
            nodes_data = await sdk.get_file_nodes(
                "large-file-key",
                batch,
                include_geometry=True
            )
            
            # Render images for this batch
            images = await sdk.render_images(
                "large-file-key",
                batch,
                format=ImageFormat.PNG,
                scale=1.0
            )
            
            print(f"Processed batch {i//batch_size + 1}: {len(batch)} nodes")
```

### Multi-File Processing

```python
async def process_multiple_files():
    file_keys = ["file1", "file2", "file3"]
    
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Process files concurrently
        tasks = []
        for file_key in file_keys:
            task = sdk.get_file_metadata(file_key)
            tasks.append(task)
        
        # Wait for all metadata
        metadata_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(metadata_results):
            if isinstance(result, Exception):
                print(f"Error processing {file_keys[i]}: {result}")
            else:
                print(f"File {file_keys[i]}: {result.name}")
        
        # Now process each file individually
        for file_key in file_keys:
            try:
                components = await sdk.get_components_in_file(file_key)
                print(f"File {file_key} has {len(components)} components")
            except Exception as e:
                print(f"Error getting components for {file_key}: {e}")
```

### Monitoring and Logging

```python
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def monitored_processing():
    async with FigmaFileSDK(api_key="your-token") as sdk:
        start_time = datetime.now()
        
        try:
            # Log start
            logging.info("Starting file processing...")
            
            # Get file
            file_data = await sdk.get_file("abc123def456")
            logging.info(f"Retrieved file: {file_data.name} ({len(file_data.components)} components)")
            
            # Render images
            images = await sdk.render_images(
                "abc123def456",
                ["1:2", "3:4"],
                format=ImageFormat.PNG
            )
            
            successful_renders = sum(1 for url in images.images.values() if url)
            logging.info(f"Rendered {successful_renders}/{len(images.images)} images")
            
            # Log completion
            duration = datetime.now() - start_time
            logging.info(f"Processing completed in {duration.total_seconds():.2f} seconds")
            
        except Exception as e:
            duration = datetime.now() - start_time
            logging.error(f"Processing failed after {duration.total_seconds():.2f} seconds: {e}")
            raise
```

These examples demonstrate the full range of capabilities provided by the Figma Files SDK. You can combine these patterns to build powerful automation tools for your Figma workflows.