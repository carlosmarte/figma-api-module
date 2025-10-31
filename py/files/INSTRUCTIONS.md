# Figma Files SDK - Setup and Usage Instructions

This document provides step-by-step instructions for setting up and using the Figma Files SDK.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Authentication Setup](#authentication-setup)
4. [Quick Start Guide](#quick-start-guide)
5. [Development Setup](#development-setup)
6. [Testing](#testing)
7. [CLI Usage](#cli-usage)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

## Prerequisites

- Python 3.9 or higher
- pip (Python package installer)
- A Figma account with API access
- Figma Personal Access Token

## Installation

### Option 1: Install from PyPI (when published)

```bash
pip install figma-files
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone <repository-url>
cd figma-files

# Install in development mode
pip install -e .

# Or install with all dependencies
pip install -e ".[dev,docs]"
```

### Option 3: Using Poetry (Recommended for Development)

```bash
# Clone the repository
git clone <repository-url>
cd figma-files

# Install Poetry if you haven't already
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Activate virtual environment
poetry shell
```

## Authentication Setup

### Step 1: Get Your Figma API Token

1. Log into your Figma account
2. Go to [Account Settings](https://www.figma.com/settings)
3. Scroll down to "Personal Access Tokens"
4. Click "Create new token"
5. Name your token (e.g., "Python SDK")
6. Copy the generated token (you won't see it again!)

### Step 2: Set Up Environment Variable

#### On macOS/Linux:
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export FIGMA_API_KEY="your-figma-token-here"

# Or set for current session only
export FIGMA_API_KEY="your-figma-token-here"
```

#### On Windows:
```cmd
# Command Prompt
set FIGMA_API_KEY=your-figma-token-here

# PowerShell
$env:FIGMA_API_KEY="your-figma-token-here"

# Or set permanently in System Properties > Environment Variables
```

### Step 3: Verify Authentication

```bash
# Using CLI
figma-files get-metadata your-file-key

# Should show file information if authentication is working
```

## Quick Start Guide

### 1. Basic SDK Usage

Create a file `test_sdk.py`:

```python
import asyncio
from figma_files import FigmaFileSDK

async def main():
    # Replace with your file key or URL
    file_key = "your-file-key-here"
    
    async with FigmaFileSDK(api_key="your-token") as sdk:
        # Get file information
        file_data = await sdk.get_file(file_key)
        print(f"File: {file_data.name}")
        print(f"Components: {len(file_data.components)}")
        
        # Get file metadata
        metadata = await sdk.get_file_metadata(file_key)
        print(f"Created by: {metadata.creator.handle}")

if __name__ == "__main__":
    asyncio.run(main())
```

Run it:
```bash
python test_sdk.py
```

### 2. Basic CLI Usage

```bash
# Get file information
figma-files get-file your-file-key

# Get metadata
figma-files get-metadata your-file-key

# Render images
figma-files render-images your-file-key "1:2,3:4" --format png
```

### 3. Finding Your File Key

You can extract the file key from any Figma URL:

```bash
# Use the extract-url-info command
figma-files extract-url-info "https://www.figma.com/file/abc123def456/My-Design"

# Output will show:
# File Key: abc123def456
# Node ID: Not found (if no node-id parameter)
```

Or find it manually:
- Figma URL: `https://www.figma.com/file/abc123def456/My-Design-File`
- File Key: `abc123def456` (the part after `/file/`)

## Development Setup

### 1. Clone and Setup

```bash
git clone <repository-url>
cd figma-files
poetry install --with dev,docs
poetry shell
```

### 2. Install Pre-commit Hooks

```bash
pre-commit install
```

### 3. Verify Setup

```bash
# Run tests
pytest

# Check code quality
ruff check .
mypy src/figma_files

# Format code
ruff format .
```

### 4. Environment Variables for Development

Create a `.env` file:
```bash
FIGMA_API_KEY=your-figma-token
TEST_FILE_KEY=your-test-file-key
TEST_NODE_IDS=1:2,3:4
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_files

# Run specific test file
pytest tests/test_client.py

# Run with verbose output
pytest -v

# Run async tests only
pytest -k "async"
```

### Test Categories

1. **Unit Tests**: Test individual components
   - `tests/test_client.py` - Client functionality
   - `tests/test_sdk.py` - SDK functionality
   - `tests/test_cli.py` - CLI functionality

2. **Integration Tests**: Test with real API (requires token)
   ```bash
   # Set up real test credentials
   export FIGMA_API_KEY="your-token"
   export TEST_FILE_KEY="public-test-file-key"
   
   # Run integration tests
   pytest tests/integration/
   ```

### Writing Tests

Example test structure:
```python
import pytest
from figma_files import FigmaFileSDK

class TestMyFeature:
    @pytest.mark.asyncio
    async def test_my_async_function(self, mock_client):
        # Your test code here
        pass
```

## CLI Usage

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `get-file` | Get file information | `figma-files get-file abc123` |
| `get-nodes` | Get specific nodes | `figma-files get-nodes abc123 "1:2,3:4"` |
| `get-node` | Get single node from URL | `figma-files get-node "https://figma.com/file/abc123/Design?node-id=1%3A2"` |
| `render-images` | Render node images | `figma-files render-images abc123 "1:2" --format png` |
| `render-node` | Render single node from URL | `figma-files render-node "https://figma.com/file/abc123/Design?node-id=1%3A2"` |
| `get-image-fills` | Get image fills | `figma-files get-image-fills abc123` |
| `get-metadata` | Get file metadata | `figma-files get-metadata abc123` |
| `get-versions` | Get version history | `figma-files get-versions abc123` |
| `search-nodes` | Search nodes by name | `figma-files search-nodes abc123 "Button"` |
| `list-components` | List all components | `figma-files list-components abc123` |
| `extract-url-info` | Extract info from URL | `figma-files extract-url-info "https://figma.com/file/abc123/Design"` |

### Common CLI Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--api-key` | `-k` | Figma API token | `--api-key your-token` |
| `--output` | `-o` | Output format (table/json) | `--output json` |
| `--version` | `-v` | Specific file version | `--version 123` |
| `--save` | `-s` | Save to file | `--save output.json` |
| `--format` | `-f` | Image format | `--format png` |
| `--scale` | `-s` | Image scale | `--scale 2.0` |
| `--depth` | `-d` | Tree depth | `--depth 2` |

### CLI Examples

```bash
# Basic usage
figma-files get-file abc123def456

# With options
figma-files get-file abc123def456 --output json --version 123 --save file.json

# Render images with download
figma-files render-images abc123def456 "1:2,3:4" --format png --scale 2.0 --output-dir ./images/

# Search and filter
figma-files search-nodes abc123def456 "Button" --limit 10 --case-sensitive

# Chain commands (Unix/Linux)
figma-files get-file abc123 --output json | jq '.components | keys'
```

## Common Use Cases

### 1. Design Asset Export

```python
async def export_design_assets():
    async with FigmaFileSDK() as sdk:
        # Get all components
        components = await sdk.get_components_in_file("your-file-key")
        
        # Extract component node IDs
        component_ids = [comp["document_id"] for comp in components]
        
        # Render as SVGs
        images = await sdk.render_images(
            "your-file-key",
            component_ids,
            format=ImageFormat.SVG,
            scale=1.0
        )
        
        # Download images (see EXAMPLES.md for full code)
```

### 2. Design System Documentation

```python
async def generate_design_system_docs():
    async with FigmaFileSDK() as sdk:
        file_data = await sdk.get_file("design-system-file-key")
        
        # Extract components and styles
        components = file_data.components
        styles = file_data.styles
        
        # Generate documentation
        doc = {
            "components": [
                {
                    "name": comp.name,
                    "description": comp.description,
                    "key": comp.key
                }
                for comp in components.values()
            ],
            "styles": [
                {
                    "name": style.name,
                    "type": style.style_type
                }
                for style in styles.values()
            ]
        }
        
        # Save as JSON
        import json
        with open("design-system.json", "w") as f:
            json.dump(doc, f, indent=2)
```

### 3. Design Review Automation

```bash
#!/bin/bash
# design-review.sh

FILE_KEY="your-file-key"
OUTPUT_DIR="./review-$(date +%Y%m%d)"

# Create review directory
mkdir -p "$OUTPUT_DIR"

# Get file metadata
figma-files get-metadata "$FILE_KEY" --output json > "$OUTPUT_DIR/metadata.json"

# Get version history
figma-files get-versions "$FILE_KEY" --output json > "$OUTPUT_DIR/versions.json"

# Find all frames
FRAME_IDS=$(figma-files search-nodes "$FILE_KEY" "Frame" --output json | jq -r '.[].id' | tr '\n' ',' | sed 's/,$//')

# Render all frames
if [ ! -z "$FRAME_IDS" ]; then
    figma-files render-images "$FILE_KEY" "$FRAME_IDS" --format png --scale 1.0 --output-dir "$OUTPUT_DIR/images/"
fi

echo "Design review exported to $OUTPUT_DIR"
```

### 4. Continuous Integration

```yaml
# .github/workflows/design-sync.yml
name: Design Sync

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM
  workflow_dispatch:

jobs:
  sync-design:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          pip install figma-files
          
      - name: Sync design assets
        env:
          FIGMA_API_KEY: ${{ secrets.FIGMA_API_KEY }}
        run: |
          # Export design tokens
          figma-files get-file ${{ vars.DESIGN_SYSTEM_FILE_KEY }} --output json > design-tokens.json
          
          # Export component screenshots
          figma-files list-components ${{ vars.DESIGN_SYSTEM_FILE_KEY }} --output json | \
            jq -r '.[].id' | \
            figma-files render-images ${{ vars.DESIGN_SYSTEM_FILE_KEY }} --format png --output-dir assets/
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git diff --staged --quiet || git commit -m "Update design assets"
          git push
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Problem**: `AuthenticationError: Invalid API token`

**Solutions**:
- Verify your token is correct
- Check token permissions in Figma
- Ensure token isn't expired
- Verify environment variable is set correctly

```bash
# Check if environment variable is set
echo $FIGMA_API_KEY

# Test with explicit token
figma-files get-metadata your-file-key --api-key your-token
```

#### 2. File Not Found

**Problem**: `ApiError: HTTP 404: File not found`

**Solutions**:
- Verify file key is correct
- Check file permissions (must be public or you must have access)
- Try with file URL instead of key

```bash
# Extract file key from URL
figma-files extract-url-info "your-figma-url"
```

#### 3. Rate Limiting

**Problem**: `RateLimitError: Rate limit exceeded`

**Solutions**:
- Reduce request frequency
- Use built-in rate limiting
- Implement exponential backoff

```python
# Use rate limiting
client = FigmaFileClient(
    api_key="your-token",
    rate_limit=5  # 5 requests per second
)
```

#### 4. Large File Timeouts

**Problem**: Requests timeout on large files

**Solutions**:
- Increase timeout
- Use depth limiting
- Process in smaller chunks

```python
# Increase timeout
client = FigmaFileClient(
    api_key="your-token",
    timeout=120.0  # 2 minutes
)

# Limit depth
file_data = await sdk.get_file("large-file", depth=2)
```

#### 5. Node Not Found

**Problem**: Specific nodes return `null`

**Solutions**:
- Verify node IDs are correct
- Check if nodes exist in current version
- Use search to find nodes

```bash
# Search for nodes by name
figma-files search-nodes your-file-key "node-name"
```

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now all HTTP requests will be logged
```

Or for CLI:
```bash
# Set log level
export PYTHONPATH="."
python -c "
import logging
logging.basicConfig(level=logging.DEBUG)
# Your CLI command here
"
```

### Getting Help

1. **Check the logs**: Enable debug logging to see what's happening
2. **Verify inputs**: Use `extract-url-info` to verify file keys and node IDs
3. **Test with simple cases**: Start with basic operations like `get-metadata`
4. **Check API status**: Visit [Figma Status](https://status.figma.com/)
5. **Review permissions**: Ensure your token has required scopes

## Advanced Configuration

### Custom Client Configuration

```python
from figma_files import FigmaFileClient, FigmaFileSDK

# Production configuration
production_client = FigmaFileClient(
    api_key="prod-token",
    timeout=60.0,
    max_retries=5,
    rate_limit=10  # Conservative rate limiting
)

# Development configuration  
dev_client = FigmaFileClient(
    api_key="dev-token",
    base_url="https://api.figma.com",  # Can be changed for testing
    timeout=30.0,
    max_retries=3,
    rate_limit=None  # No rate limiting in dev
)

# Use with SDK
sdk = FigmaFileSDK(client=production_client)
```

### Environment-Specific Settings

Create config files for different environments:

**config/production.py**:
```python
FIGMA_API_KEY = "prod-token"
RATE_LIMIT = 10
TIMEOUT = 60.0
MAX_RETRIES = 5
```

**config/development.py**:
```python
FIGMA_API_KEY = "dev-token"
RATE_LIMIT = None
TIMEOUT = 30.0
MAX_RETRIES = 3
```

**main.py**:
```python
import os
from figma_files import FigmaFileClient, FigmaFileSDK

# Load config based on environment
env = os.getenv("ENVIRONMENT", "development")
if env == "production":
    from config.production import *
else:
    from config.development import *

# Create client with environment config
client = FigmaFileClient(
    api_key=FIGMA_API_KEY,
    timeout=TIMEOUT,
    max_retries=MAX_RETRIES,
    rate_limit=RATE_LIMIT
)

sdk = FigmaFileSDK(client=client)
```

### Monitoring and Metrics

```python
import time
from typing import Dict, Any

class MetricsCollector:
    def __init__(self):
        self.metrics = {
            "requests": 0,
            "errors": 0,
            "total_time": 0.0
        }
    
    async def timed_request(self, func, *args, **kwargs):
        start_time = time.time()
        self.metrics["requests"] += 1
        
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            self.metrics["errors"] += 1
            raise
        finally:
            self.metrics["total_time"] += time.time() - start_time
    
    def get_stats(self) -> Dict[str, Any]:
        return {
            **self.metrics,
            "avg_request_time": self.metrics["total_time"] / max(self.metrics["requests"], 1),
            "error_rate": self.metrics["errors"] / max(self.metrics["requests"], 1)
        }

# Usage
metrics = MetricsCollector()

async with FigmaFileSDK() as sdk:
    file_data = await metrics.timed_request(sdk.get_file, "file-key")
    
print(f"Stats: {metrics.get_stats()}")
```

This completes the comprehensive setup and usage instructions for the Figma Files SDK. Follow these instructions to get started with the SDK and CLI tools.