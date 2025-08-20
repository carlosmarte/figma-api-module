# Figma Dev Resources SDK

A comprehensive Python SDK for the Figma Dev Resources API, enabling developers to manage development resources attached to Figma design files.

## Features

- 🚀 **Complete API Coverage**: All four dev resources endpoints
- 🔐 **Robust Authentication**: Token validation with multiple sources
- ⚡ **Rate Limiting**: Built-in token bucket rate limiter
- 🔄 **Retry Logic**: Exponential backoff for failed requests
- 📡 **Async Support**: Full async/await support throughout
- 🖥️ **CLI Interface**: Rich command-line interface with progress indicators
- 🌐 **API Server**: FastAPI server with OpenAPI documentation
- 🧪 **Well Tested**: Comprehensive test suite with high coverage
- 📚 **Type Safe**: Full type hints with Pydantic models

## Installation

```bash
pip install figma-dev-resources
```

### Development Installation

```bash
git clone https://github.com/figma/dev-resources-sdk.git
cd dev-resources-sdk
pip install -e ".[dev]"
```

## Quick Start

### SDK Usage

```python
import asyncio
from figma_dev_resources import FigmaDevResourcesSDK, DevResourceCreate

async def main():
    # Initialize SDK with your Figma token
    async with FigmaDevResourcesSDK(api_key="your_figma_token") as sdk:
        
        # Get dev resources from a file
        resources = await sdk.get_dev_resources("file_key")
        print(f"Found {len(resources)} dev resources")
        
        # Create a new dev resource
        new_resource = DevResourceCreate(
            name="Component Library",
            url="https://storybook.company.com",
            file_key="file_key",
            node_id="1:2"
        )
        
        result = await sdk.create_dev_resources([new_resource])
        print(f"Created {len(result.links_created)} resources")
        
        # Search dev resources
        storybook_resources = await sdk.search_dev_resources(
            "file_key", "storybook"
        )

asyncio.run(main())
```

### CLI Usage

```bash
# Set your Figma token
export FIGMA_TOKEN="your_figma_token"

# Get dev resources from a file
figma-dev-resources get file_key

# Get resources with node filtering
figma-dev-resources get file_key --node-ids "1:2,1:3"

# Create a new dev resource
figma-dev-resources create file_key "1:2" "Component Library" "https://storybook.company.com"

# Update an existing resource
figma-dev-resources update resource_id --name "Updated Library" --url "https://new-url.com"

# Delete a resource
figma-dev-resources delete file_key resource_id

# Search resources
figma-dev-resources search file_key "storybook"

# Get JSON output
figma-dev-resources get file_key --format json

# Save output to file
figma-dev-resources get file_key --output resources.json
```

## API Server

Start the FastAPI server to provide RESTful access to dev resources:

```bash
# Start server with default settings
figma-dev-resources serve

# Custom port and API key
figma-dev-resources serve --port 3000 --api-key "your-token"

# With auto-reload for development
figma-dev-resources serve --reload
```

### Server Configuration

The server validates tokens in priority order:

1. **X-Figma-Token header** (recommended)
2. **token query parameter** 
3. **FIGMA_TOKEN environment variable**

### API Documentation

Once the server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc  
- **OpenAPI Schema**: http://localhost:8000/openapi.json

### Example API Requests

```bash
# Get dev resources (using header)
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/file_key/dev_resources"

# Get dev resources (using query parameter)
curl "http://localhost:8000/v1/files/file_key/dev_resources?token=your_token"

# Create dev resources
curl -X POST \
  -H "X-Figma-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "dev_resources": [{
      "name": "Component Library",
      "url": "https://storybook.company.com",
      "file_key": "file_key",
      "node_id": "1:2"
    }]
  }' \
  "http://localhost:8000/v1/dev_resources"

# Search dev resources
curl -H "X-Figma-Token: your_token" \
  "http://localhost:8000/v1/files/file_key/dev_resources/search?q=storybook"
```

## Authentication & Scopes

The SDK requires a Figma API token with appropriate dev resources scopes:

- **file_dev_resources:read** - For getting dev resources
- **file_dev_resources:write** - For creating, updating, and deleting dev resources

Get your token from [Figma Account Settings](https://www.figma.com/developers/api#access-tokens).

## API Reference

### Core Methods

#### `get_dev_resources(file_key, node_ids=None)`
Get dev resources from a file, optionally filtered by node IDs.

#### `create_dev_resources(dev_resources)`
Create multiple dev resources across files.

#### `update_dev_resources(dev_resources)`
Update existing dev resources.

#### `delete_dev_resource(file_key, dev_resource_id)`
Delete a specific dev resource.

#### `search_dev_resources(file_key, search_term, node_ids=None)`
Search dev resources by name or URL.

### Batch Operations

#### `batch_create_dev_resources(dev_resources, batch_size=100)`
Create dev resources in batches for large datasets.

#### `batch_update_dev_resources(dev_resources, batch_size=100)` 
Update dev resources in batches.

#### `bulk_delete_dev_resources(deletions)`
Delete multiple dev resources.

### Utility Methods

#### `get_dev_resources_by_node(file_key, node_id)`
Get all dev resources for a specific node.

## Error Handling

The SDK provides specific exceptions for different error conditions:

```python
from figma_dev_resources import (
    AuthenticationError,    # 401 - Invalid token
    AuthorizationError,     # 403 - Insufficient permissions  
    NotFoundError,          # 404 - Resource not found
    RateLimitError,         # 429 - Rate limit exceeded
    ValidationError,        # 400 - Invalid request
    ApiError,              # Other API errors
)

try:
    resources = await sdk.get_dev_resources("invalid_file_key")
except NotFoundError:
    print("File not found")
except AuthenticationError:
    print("Invalid API token")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
```

## Rate Limiting

The SDK includes built-in rate limiting with:

- **Token bucket algorithm** 
- **Configurable limits** (default: 100 requests/minute)
- **Automatic retry** with exponential backoff
- **Rate limit headers** support

```python
# Configure rate limiting
sdk = FigmaDevResourcesSDK(
    api_key="token",
    rate_limit_requests=50,  # 50 requests per window
    rate_limit_window=60,    # 60 second window
    max_retries=5            # Maximum retry attempts
)
```

## Configuration

### Environment Variables

- `FIGMA_TOKEN` - Your Figma API token

### SDK Configuration

```python
sdk = FigmaDevResourcesSDK(
    api_key="your_token",
    base_url="https://api.figma.com",  # Custom base URL
    max_retries=3,                     # Retry attempts
    timeout=30.0,                      # Request timeout (seconds)
    rate_limit_requests=100,           # Requests per window
    rate_limit_window=60,              # Rate limit window (seconds)
)
```

## Development

### Setting Up Development Environment

```bash
# Clone repository
git clone https://github.com/figma/dev-resources-sdk.git
cd dev-resources-sdk

# Install with development dependencies
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_dev_resources

# Run specific test file
pytest tests/test_sdk.py

# Run async tests only
pytest -k "async"
```

### Code Quality

```bash
# Format code
black src tests
isort src tests

# Lint code
ruff check src tests

# Type checking
mypy src
```

### Testing the CLI

```bash
# Test CLI commands
export FIGMA_TOKEN="test_token"
python -m figma_dev_resources.cli get --help

# Test server
python -m figma_dev_resources.cli serve --port 8001
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest`)
5. Commit your changes (`git commit -am 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [API Documentation](https://www.figma.com/developers/api#dev-resources)
- 🐛 [Issue Tracker](https://github.com/figma/dev-resources-sdk/issues)
- 💬 [Figma Community](https://www.figma.com/community)

## Changelog

### 0.1.0 (2024-XX-XX)

- Initial release
- Complete dev resources API coverage
- CLI interface with rich output
- FastAPI server with token validation
- Comprehensive test suite
- Rate limiting and retry logic
- Full async support