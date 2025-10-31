# Figma Components Python Library

A comprehensive Python library for interacting with Figma's Components, Component Sets, and Styles APIs. This library provides both a high-level SDK and a low-level client, along with a CLI tool and FastAPI server.

## Features

- **Complete API Coverage**: Supports all Figma Components, Component Sets, and Styles endpoints
- **Async/Await Support**: Built with modern async Python patterns
- **Rate Limiting**: Built-in token bucket rate limiter with exponential backoff
- **Type Safety**: Full type hints with Pydantic v2 models
- **CLI Tool**: Rich command-line interface with table and JSON output
- **FastAPI Server**: REST API server with OpenAPI documentation
- **Comprehensive Testing**: 80%+ test coverage with pytest
- **Production Ready**: Error handling, retries, and proper logging

## Installation

```bash
pip install figma-components
```

### Development Installation

```bash
git clone https://github.com/yourusername/figma-components.git
cd figma-components
pip install -e ".[dev]"
```

## Quick Start

### SDK Usage

```python
import asyncio
from figma_components import FigmaComponentsSDK

async def main():
    async with FigmaComponentsSDK("your-figma-token") as sdk:
        # Get a specific component
        component = await sdk.get_component("component-key")
        print(f"Component: {component.name}")
        
        # List team components
        components = await sdk.list_team_components("team-id")
        print(f"Found {len(components)} components")
        
        # Search components
        results = await sdk.search_team_components("team-id", "button")
        print(f"Found {len(results)} button components")

asyncio.run(main())
```

### CLI Usage

```bash
# Set your API token
export FIGMA_TOKEN="your-figma-token"

# List components from a team
figma-components components --team-id 123456

# List components from a file
figma-components components --file-key abc123def456

# Search components
figma-components components --team-id 123456 --search "button" --limit 10

# Get a specific component
figma-components component abc123def456

# List component sets
figma-components component-sets --team-id 123456

# List styles with filtering
figma-components styles --team-id 123456 --type FILL

# Get all assets from a team
figma-components all 123456 --output assets.json

# Output formats
figma-components components --team-id 123456 --format table
figma-components components --team-id 123456 --format json --output components.json
```

## API Server

### Starting the Server

```bash
# Start with default settings
figma-components serve

# Custom port and API key
figma-components serve --port 3000 --api-key "your-token"

# With auto-reload for development
figma-components serve --reload
```

### Server Endpoints

Once the server is running, you can access these endpoints:

- **Components**:
  - `GET /v1/components/{key}` - Get a component
  - `GET /v1/teams/{team_id}/components` - List team components
  - `GET /v1/files/{file_key}/components` - List file components
  - `GET /v1/teams/{team_id}/components/search?q=query` - Search components

- **Component Sets**:
  - `GET /v1/component_sets/{key}` - Get a component set
  - `GET /v1/teams/{team_id}/component_sets` - List team component sets
  - `GET /v1/files/{file_key}/component_sets` - List file component sets

- **Styles**:
  - `GET /v1/styles/{key}` - Get a style
  - `GET /v1/teams/{team_id}/styles` - List team styles
  - `GET /v1/files/{file_key}/styles` - List file styles

- **Batch Operations**:
  - `POST /v1/components/batch` - Get multiple components

- **Utilities**:
  - `GET /v1/teams/{team_id}/assets` - Get all team assets
  - `GET /v1/utils/extract-ids?url=figma-url` - Extract IDs from URL

### Token Validation

The server validates tokens in priority order:

1. `X-Figma-Token` header (recommended)
2. `token` query parameter
3. `FIGMA_TOKEN` environment variable

Example requests:

```bash
# Using header (recommended)
curl -H "X-Figma-Token: your-token" http://localhost:8000/v1/components/key

# Using query parameter
curl "http://localhost:8000/v1/components/key?token=your-token"

# Using environment variable
export FIGMA_TOKEN="your-token"
curl http://localhost:8000/v1/components/key
```

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI**: http://localhost:8000/openapi.json

## Advanced Usage

### Low-Level Client

```python
import asyncio
from figma_components import FigmaComponentsClient

async def main():
    async with FigmaComponentsClient("your-figma-token") as client:
        # Direct API calls
        response = await client.get_team_components("team-id", page_size=50)
        print(response)
        
        # Pagination
        async for component in client.paginate("/v1/teams/team-id/components"):
            print(component["name"])

asyncio.run(main())
```

### Custom Configuration

```python
from figma_components import FigmaComponentsSDK

# Custom client settings
sdk = FigmaComponentsSDK(
    "your-figma-token",
    timeout=60.0,
    max_retries=5,
    rate_limit_requests=200,  # Requests per minute
    rate_limit_window=60,     # Time window in seconds
)
```

### Error Handling

```python
from figma_components import (
    FigmaComponentsSDK,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
)

async def main():
    try:
        async with FigmaComponentsSDK("your-token") as sdk:
            component = await sdk.get_component("nonexistent-key")
    except AuthenticationError:
        print("Invalid API token")
    except NotFoundError:
        print("Component not found")
    except RateLimitError as e:
        print(f"Rate limited. Retry after {e.retry_after} seconds")
```

## API Reference

### SDK Methods

#### Components
- `get_component(key)` - Get a component by key
- `list_team_components(team_id, **kwargs)` - List team components
- `list_file_components(file_key)` - List file components
- `search_team_components(team_id, query, limit=None)` - Search components
- `batch_get_components(keys)` - Get multiple components

#### Component Sets
- `get_component_set(key)` - Get a component set by key
- `list_team_component_sets(team_id, **kwargs)` - List team component sets
- `list_file_component_sets(file_key)` - List file component sets

#### Styles
- `get_style(key)` - Get a style by key
- `list_team_styles(team_id, **kwargs)` - List team styles
- `list_file_styles(file_key, **kwargs)` - List file styles

#### Convenience Methods
- `get_components_from_url(figma_url)` - Extract and get components from URL
- `get_all_team_assets(team_id)` - Get all assets from a team

### Models

All API responses are parsed into Pydantic models:

- `PublishedComponent` - Component data
- `PublishedComponentSet` - Component set data
- `PublishedStyle` - Style data
- `User` - User information
- `FrameInfo` - Frame information
- `StyleType` - Enum for style types (FILL, TEXT, EFFECT, GRID)

## Development

### Setup

```bash
git clone https://github.com/yourusername/figma-components.git
cd figma-components
pip install -e ".[dev]"
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_components --cov-report=html

# Run specific test file
pytest tests/test_sdk.py
```

### Code Quality

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type checking
mypy src/figma_components
```

## Authentication

Get your Figma API token from:
1. Go to Figma → Settings → Account → Personal Access Tokens
2. Generate a new token
3. Set it as an environment variable: `export FIGMA_TOKEN="your-token"`

## Required Scopes

Different endpoints require different OAuth scopes:

- **Team endpoints**: `team_library_content:read`, `files:read`
- **File endpoints**: `library_content:read`, `files:read`  
- **Individual assets**: `library_assets:read`, `files:read`

## Rate Limiting

The library includes built-in rate limiting that respects Figma's API limits:

- Default: 100 requests per minute
- Automatic retry with exponential backoff
- Rate limit headers are respected

## Error Handling

The library provides specific exception types:

- `AuthenticationError` (401) - Invalid API token
- `AuthorizationError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `RateLimitError` (429) - Rate limit exceeded
- `ApiError` - General API errors
- `NetworkError` - Network connectivity issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### 0.1.0
- Initial release
- Complete API coverage for Components, Component Sets, and Styles
- CLI tool with rich output
- FastAPI server with OpenAPI documentation
- Comprehensive test suite
- Rate limiting and error handling