# Figma Dev Resources SDK Examples

This document provides comprehensive examples of using the Figma Dev Resources SDK.

## Table of Contents

- [Basic Usage](#basic-usage)
- [CLI Examples](#cli-examples)
- [API Server Examples](#api-server-examples)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)
- [Batch Operations](#batch-operations)
- [Integration Examples](#integration-examples)

## Basic Usage

### Getting Started

```python
import asyncio
from figma_dev_resources import FigmaDevResourcesSDK

async def basic_example():
    # Initialize SDK
    async with FigmaDevResourcesSDK(api_key="your_figma_token") as sdk:
        # Get all dev resources in a file
        resources = await sdk.get_dev_resources("abc123xyz")
        
        for resource in resources:
            print(f"Resource: {resource.name}")
            print(f"URL: {resource.url}")
            print(f"Node: {resource.node_id}")
            print("---")

asyncio.run(basic_example())
```

### Creating Dev Resources

```python
from figma_dev_resources import DevResourceCreate

async def create_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Create a single resource
        resource = DevResourceCreate(
            name="Component Library",
            url="https://storybook.company.com",
            file_key="abc123xyz",
            node_id="1:2"
        )
        
        result = await sdk.create_dev_resources([resource])
        
        if result.links_created:
            print(f"Created resource: {result.links_created[0].id}")
        
        if result.errors:
            for error in result.errors:
                print(f"Error: {error.error}")
```

### Updating Dev Resources

```python
from figma_dev_resources import DevResourceUpdate

async def update_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Update resource name and URL
        update = DevResourceUpdate(
            id="resource_123",
            name="Updated Component Library",
            url="https://new-storybook.company.com"
        )
        
        result = await sdk.update_dev_resources([update])
        
        for updated in result.links_updated:
            print(f"Updated: {updated.name} -> {updated.url}")
```

### Deleting Dev Resources

```python
async def delete_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Delete a specific resource
        result = await sdk.delete_dev_resource("abc123xyz", "resource_123")
        
        if not result.error:
            print("Resource deleted successfully")
        else:
            print("Failed to delete resource")
```

## CLI Examples

### Basic Commands

```bash
# Set your API token
export FIGMA_TOKEN="your_figma_token"

# Get all dev resources in a file
figma-dev-resources get abc123xyz

# Get resources with table output (default)
figma-dev-resources get abc123xyz --format table

# Get resources with JSON output
figma-dev-resources get abc123xyz --format json

# Save output to file
figma-dev-resources get abc123xyz --output resources.json
```

### Filtering and Searching

```bash
# Get resources for specific nodes
figma-dev-resources get abc123xyz --node-ids "1:2,1:3,2:5"

# Search resources by name or URL
figma-dev-resources search abc123xyz "storybook"
figma-dev-resources search abc123xyz "documentation"

# Search with node filtering
figma-dev-resources search abc123xyz "api" --node-ids "1:2"
```

### Creating Resources

```bash
# Create a new dev resource
figma-dev-resources create abc123xyz "1:2" "Component Library" "https://storybook.company.com"

# Create with JSON output
figma-dev-resources create abc123xyz "1:2" "API Docs" "https://docs.api.com" --format json
```

### Updating Resources

```bash
# Update resource name
figma-dev-resources update resource_123 --name "New Library Name"

# Update resource URL
figma-dev-resources update resource_123 --url "https://new-url.com"

# Update both name and URL
figma-dev-resources update resource_123 --name "Complete Library" --url "https://complete.com"
```

### Deleting Resources

```bash
# Delete with confirmation prompt
figma-dev-resources delete abc123xyz resource_123

# Delete without confirmation
figma-dev-resources delete abc123xyz resource_123 --confirm
```

## API Server Examples

### Starting the Server

```bash
# Start with default settings (port 8000)
figma-dev-resources serve

# Start on custom port
figma-dev-resources serve --port 3000

# Start with API key from command line
figma-dev-resources serve --api-key "your_token" --port 8080

# Start with auto-reload for development
figma-dev-resources serve --reload --port 8000
```

### API Requests

#### Using cURL

```bash
# Get dev resources (header authentication)
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/abc123xyz/dev_resources"

# Get dev resources (query parameter authentication)
curl "http://localhost:8000/v1/files/abc123xyz/dev_resources?token=your_token"

# Get resources with node filtering
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/abc123xyz/dev_resources?node_ids=1:2,1:3"

# Create dev resources
curl -X POST \
  -H "X-Figma-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "dev_resources": [{
      "name": "Component Library",
      "url": "https://storybook.company.com",
      "file_key": "abc123xyz",
      "node_id": "1:2"
    }]
  }' \
  "http://localhost:8000/v1/dev_resources"

# Update dev resources
curl -X PUT \
  -H "X-Figma-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "dev_resources": [{
      "id": "resource_123",
      "name": "Updated Library",
      "url": "https://new-storybook.com"
    }]
  }' \
  "http://localhost:8000/v1/dev_resources"

# Delete dev resource
curl -X DELETE \
  -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/abc123xyz/dev_resources/resource_123"

# Search dev resources
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/abc123xyz/dev_resources/search?q=storybook"
```

#### Using Python requests

```python
import requests

# Set up authentication
headers = {"X-Figma-Token": "your_token"}
base_url = "http://localhost:8000"

# Get dev resources
response = requests.get(
    f"{base_url}/v1/files/abc123xyz/dev_resources",
    headers=headers
)
resources = response.json()

# Create dev resource
create_data = {
    "dev_resources": [{
        "name": "Component Library",
        "url": "https://storybook.company.com",
        "file_key": "abc123xyz",
        "node_id": "1:2"
    }]
}

response = requests.post(
    f"{base_url}/v1/dev_resources",
    json=create_data,
    headers=headers
)
result = response.json()
```

## Advanced Usage

### Custom Configuration

```python
from figma_dev_resources import FigmaDevResourcesSDK

# Custom SDK configuration
sdk = FigmaDevResourcesSDK(
    api_key="your_token",
    base_url="https://api.figma.com",
    max_retries=5,           # More retry attempts
    timeout=60.0,            # Longer timeout
    rate_limit_requests=50,  # Lower rate limit
    rate_limit_window=60,    # 1 minute window
)

async def advanced_example():
    async with sdk:
        # Your code here
        pass
```

### Working with Multiple Files

```python
async def multi_file_example():
    file_keys = ["file1", "file2", "file3"]
    
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        all_resources = []
        
        for file_key in file_keys:
            try:
                resources = await sdk.get_dev_resources(file_key)
                all_resources.extend(resources)
                print(f"File {file_key}: {len(resources)} resources")
            except Exception as e:
                print(f"Error processing {file_key}: {e}")
        
        print(f"Total resources across all files: {len(all_resources)}")
```

### URL Extraction Utilities

```python
from figma_dev_resources.utils import extract_file_key_from_url, extract_node_id_from_url

# Extract file key from Figma URL
figma_url = "https://www.figma.com/file/abc123xyz/My-Design"
file_key = extract_file_key_from_url(figma_url)
print(f"File key: {file_key}")  # Output: abc123xyz

# Extract node ID from URL with node selection
node_url = "https://www.figma.com/file/abc123xyz/My-Design?node-id=1%3A2"
node_id = extract_node_id_from_url(node_url)
print(f"Node ID: {node_id}")  # Output: 1:2
```

## Error Handling

### Comprehensive Error Handling

```python
from figma_dev_resources import (
    FigmaDevResourcesSDK,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError,
)

async def error_handling_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        try:
            resources = await sdk.get_dev_resources("invalid_file_key")
            
        except AuthenticationError:
            print("Invalid API token - check your FIGMA_TOKEN")
            
        except AuthorizationError:
            print("Insufficient permissions - need file_dev_resources:read scope")
            
        except NotFoundError:
            print("File not found or not accessible")
            
        except RateLimitError as e:
            print(f"Rate limited - retry after {e.retry_after} seconds")
            
        except ValidationError as e:
            print(f"Invalid request: {e.message}")
            
        except ApiError as e:
            print(f"API error: {e.message} (status: {e.status_code})")
```

### Retry Logic Example

```python
import asyncio
from figma_dev_resources import RateLimitError

async def retry_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                resources = await sdk.get_dev_resources("abc123xyz")
                print(f"Successfully got {len(resources)} resources")
                break
                
            except RateLimitError as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print("Max retries exceeded")
                    raise
                
                print(f"Rate limited, waiting {e.retry_after} seconds...")
                await asyncio.sleep(e.retry_after)
```

## Batch Operations

### Batch Creating Resources

```python
async def batch_create_example():
    # Create 500 dev resources across multiple files
    resources_to_create = []
    
    for i in range(500):
        resource = DevResourceCreate(
            name=f"Resource {i}",
            url=f"https://example.com/resource-{i}",
            file_key="abc123xyz",
            node_id=f"1:{i}"
        )
        resources_to_create.append(resource)
    
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Create in batches of 50
        results = await sdk.batch_create_dev_resources(
            resources_to_create, 
            batch_size=50
        )
        
        total_created = sum(len(result.links_created) for result in results)
        total_errors = sum(len(result.errors) for result in results)
        
        print(f"Created: {total_created}")
        print(f"Errors: {total_errors}")
        print(f"Batches processed: {len(results)}")
```

### Batch Updating Resources

```python
async def batch_update_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Get all resources first
        resources = await sdk.get_dev_resources("abc123xyz")
        
        # Create update objects
        updates = []
        for resource in resources:
            if "old-domain.com" in resource.url:
                update = DevResourceUpdate(
                    id=resource.id,
                    url=resource.url.replace("old-domain.com", "new-domain.com")
                )
                updates.append(update)
        
        # Batch update
        if updates:
            results = await sdk.batch_update_dev_resources(updates, batch_size=25)
            print(f"Updated {len(updates)} resources in {len(results)} batches")
```

### Bulk Operations

```python
async def bulk_operations_example():
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Get resources from multiple files
        file_keys = ["file1", "file2", "file3"]
        all_resources = []
        
        for file_key in file_keys:
            resources = await sdk.get_dev_resources(file_key)
            all_resources.extend(resources)
        
        # Find resources to delete (example: old URLs)
        deletions = []
        for resource in all_resources:
            if "deprecated-service.com" in resource.url:
                deletions.append((resource.file_key, resource.id))
        
        # Bulk delete
        if deletions:
            results = await sdk.bulk_delete_dev_resources(deletions)
            success_count = sum(1 for r in results if not r.error)
            print(f"Deleted {success_count}/{len(deletions)} resources")
```

## Integration Examples

### Django Integration

```python
# django_integration.py
from django.conf import settings
from django.http import JsonResponse
from figma_dev_resources import FigmaDevResourcesSDK
import asyncio

async def get_design_resources(request, file_key):
    """Django view to get dev resources for a file."""
    try:
        async with FigmaDevResourcesSDK(api_key=settings.FIGMA_TOKEN) as sdk:
            resources = await sdk.get_dev_resources(file_key)
            
            return JsonResponse({
                'resources': [
                    {
                        'id': r.id,
                        'name': r.name,
                        'url': r.url,
                        'node_id': r.node_id
                    } for r in resources
                ]
            })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Usage in Django view
def design_resources_view(request, file_key):
    return asyncio.run(get_design_resources(request, file_key))
```

### Flask Integration

```python
# flask_integration.py
from flask import Flask, jsonify, request
from figma_dev_resources import FigmaDevResourcesSDK
import asyncio
import os

app = Flask(__name__)

@app.route('/api/files/<file_key>/dev-resources')
def get_dev_resources(file_key):
    async def _get_resources():
        async with FigmaDevResourcesSDK(api_key=os.getenv('FIGMA_TOKEN')) as sdk:
            return await sdk.get_dev_resources(file_key)
    
    try:
        resources = asyncio.run(_get_resources())
        return jsonify([r.model_dump() for r in resources])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### CI/CD Pipeline Integration

```python
# ci_cd_integration.py
"""
Example script for CI/CD pipeline to sync dev resources.
"""
import asyncio
import json
from figma_dev_resources import FigmaDevResourcesSDK, DevResourceCreate

async def sync_dev_resources():
    """Sync dev resources from configuration file."""
    
    # Load configuration
    with open('dev-resources-config.json', 'r') as f:
        config = json.load(f)
    
    async with FigmaDevResourcesSDK(api_key=config['figma_token']) as sdk:
        for file_config in config['files']:
            file_key = file_config['file_key']
            
            # Get existing resources
            existing = await sdk.get_dev_resources(file_key)
            existing_urls = {r.url for r in existing}
            
            # Create new resources
            new_resources = []
            for resource_config in file_config['resources']:
                if resource_config['url'] not in existing_urls:
                    new_resource = DevResourceCreate(
                        name=resource_config['name'],
                        url=resource_config['url'],
                        file_key=file_key,
                        node_id=resource_config['node_id']
                    )
                    new_resources.append(new_resource)
            
            if new_resources:
                result = await sdk.create_dev_resources(new_resources)
                print(f"Created {len(result.links_created)} new resources for {file_key}")

if __name__ == "__main__":
    asyncio.run(sync_dev_resources())
```

### Configuration File Example

```json
{
  "figma_token": "${FIGMA_TOKEN}",
  "files": [
    {
      "file_key": "abc123xyz",
      "resources": [
        {
          "name": "Component Library",
          "url": "https://storybook.company.com",
          "node_id": "1:2"
        },
        {
          "name": "API Documentation",
          "url": "https://docs.api.company.com",
          "node_id": "1:3"
        }
      ]
    }
  ]
}
```

### Webhook Integration

```python
# webhook_integration.py
from fastapi import FastAPI, HTTPException
from figma_dev_resources import FigmaDevResourcesSDK
import asyncio

app = FastAPI()

@app.post("/webhook/figma-file-updated")
async def handle_figma_webhook(webhook_data: dict):
    """Handle Figma file update webhook and sync dev resources."""
    
    file_key = webhook_data.get('file_key')
    if not file_key:
        raise HTTPException(status_code=400, detail="Missing file_key")
    
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        # Get current dev resources
        resources = await sdk.get_dev_resources(file_key)
        
        # Log the update
        print(f"File {file_key} updated. Current dev resources: {len(resources)}")
        
        # Add your custom logic here
        # e.g., validate resources, send notifications, etc.
        
        return {"status": "processed", "resource_count": len(resources)}
```

This comprehensive set of examples should help you get started with the Figma Dev Resources SDK and integrate it into your workflows!