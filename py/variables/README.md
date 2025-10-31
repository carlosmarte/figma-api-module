# Figma Variables Python Library

A comprehensive Python library for interacting with Figma's Variables API. This library provides Enterprise-only functionality for creating, reading, and modifying design variables programmatically.

## Features

- **Complete Variables API Coverage**: All three Variables API endpoints
- **Enterprise Authentication**: Full token validation and scope handling
- **High-level SDK**: Easy-to-use Python interface with proper typing
- **Low-level Client**: Direct HTTP client with rate limiting and retries
- **CLI Interface**: Rich command-line tool for Variables management
- **FastAPI Server**: Ready-to-deploy API server with token validation
- **Comprehensive Testing**: Full test suite with mocking and fixtures

## Enterprise Requirements

⚠️ **Enterprise Only**: This library requires:
- Figma Enterprise organization membership
- `file_variables:read` scope for reading variables
- `file_variables:write` scope for modifying variables
- Editor seat for write operations

## Installation

### Basic Installation

```bash
pip install figma-variables
```

### With Server Dependencies

```bash
pip install "figma-variables[server]"
```

### Development Installation

```bash
git clone https://github.com/figma/figma-variables-python
cd figma-variables-python
pip install -e ".[dev]"
```

## Quick Start

### SDK Usage

```python
import asyncio
from figma_variables import FigmaVariablesSDK

async def main():
    async with FigmaVariablesSDK(api_token="your_token") as sdk:
        # Get local variables
        response = await sdk.get_local_variables("your_file_key")
        
        # List all variables
        variables = await sdk.list_variables("your_file_key")
        
        # Search variables
        results = await sdk.search_variables("your_file_key", "primary")
        
        # Create a variable collection
        collection_id = await sdk.create_variable_collection(
            "your_file_key",
            "Brand Colors",
            hidden_from_publishing=False
        )
        
        # Create a variable
        variable_id = await sdk.create_variable(
            "your_file_key",
            "Primary Color",
            collection_id,
            "COLOR",
            description="Main brand color"
        )

asyncio.run(main())
```

### CLI Usage

```bash
# Set your API token
export FIGMA_TOKEN="your_token_here"

# List variables in a file
figma-variables list-variables "your_file_key"

# List published variables with JSON output
figma-variables list-variables "your_file_key" --published --format json

# Get specific variable details
figma-variables get-variable "your_file_key" "variable_id"

# Search for variables
figma-variables search "your_file_key" "primary"

# Create a new collection
figma-variables create-collection "your_file_key" "New Collection"

# Create a variable
figma-variables create-variable "your_file_key" "New Variable" "collection_id" COLOR

# Export variables to JSON
figma-variables export "your_file_key" variables.json --published

# Start API server
figma-variables serve --port 8000
```

## API Server

### Starting the Server

```bash
# Start with default settings
figma-variables serve

# Custom port and API key
figma-variables serve --port 3000 --api-key "your-token"

# With auto-reload for development
figma-variables serve --reload
```

### Token Validation

The server validates tokens in priority order:

1. **X-Figma-Token header** (recommended)
2. **token query parameter**
3. **FIGMA_TOKEN environment variable**

### Example API Requests

```bash
# Using header (recommended)
curl -H "X-Figma-Token: your_token" \
  http://localhost:8000/v1/files/FILE_KEY/variables/local

# Using query parameter
curl "http://localhost:8000/v1/files/FILE_KEY/variables/local?token=your_token"

# Get published variables
curl -H "X-Figma-Token: your_token" \
  http://localhost:8000/v1/files/FILE_KEY/variables/published

# Create variables
curl -X POST \
  -H "X-Figma-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{"variables": [{"action": "CREATE", "name": "New Variable", "variableCollectionId": "collection_id", "resolvedType": "COLOR"}]}' \
  http://localhost:8000/v1/files/FILE_KEY/variables
```

### API Documentation

When the server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Supported Endpoints

### 1. Get Local Variables
- **Endpoint**: `GET /v1/files/{file_key}/variables/local`
- **Scope**: `file_variables:read`
- **Returns**: Local variables and collections with full mode data

### 2. Get Published Variables  
- **Endpoint**: `GET /v1/files/{file_key}/variables/published`
- **Scope**: `file_variables:read`
- **Returns**: Published variables and collections (main file only)

### 3. Create/Modify/Delete Variables
- **Endpoint**: `POST /v1/files/{file_key}/variables`
- **Scope**: `file_variables:write`
- **Requires**: Editor seat
- **Supports**: Bulk operations on collections, modes, variables, and values

## Advanced Usage

### Custom Client Configuration

```python
from figma_variables import FigmaVariablesClient

async with FigmaVariablesClient(
    api_token="your_token",
    base_url="https://api.figma.com",
    timeout=60.0,
    max_retries=5,
    rate_limit_tokens=30,
    rate_limit_refill=1.0
) as client:
    response = await client.get_local_variables("file_key")
```

### Batch Operations

```python
# Batch create variables
variables_data = [
    {
        "name": "Primary Color",
        "variableCollectionId": "collection_id", 
        "resolvedType": "COLOR",
        "description": "Main brand color"
    },
    {
        "name": "Secondary Color",
        "variableCollectionId": "collection_id",
        "resolvedType": "COLOR", 
        "description": "Secondary brand color"
    }
]

temp_id_mapping = await sdk.batch_create_variables("file_key", variables_data)
```

### Variable Value Management

```python
# Set variable value for a mode
await sdk.set_variable_value(
    "file_key",
    "variable_id", 
    "mode_id",
    {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}  # RGBA color
)
```

### Error Handling

```python
from figma_variables.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError
)

try:
    variables = await sdk.list_variables("file_key")
except AuthenticationError:
    print("Invalid API token")
except AuthorizationError:
    print("Enterprise organization required") 
except NotFoundError:
    print("File not found")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except ApiError as e:
    print(f"API error: {e.message}")
```

## Development

### Setup

```bash
git clone https://github.com/figma/figma-variables-python
cd figma-variables-python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e ".[dev]"
pre-commit install
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_variables --cov-report=html

# Run specific test file
pytest tests/test_sdk.py

# Run with verbose output
pytest -v
```

### Code Quality

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type checking
mypy src/figma_variables
```

### Building Documentation

```bash
mkdocs serve  # Development server
mkdocs build  # Build static docs
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`pytest`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [https://figma-variables-python.readthedocs.io](https://figma-variables-python.readthedocs.io)
- **Issues**: [https://github.com/figma/figma-variables-python/issues](https://github.com/figma/figma-variables-python/issues)
- **Figma API Docs**: [https://www.figma.com/developers/api#variables](https://www.figma.com/developers/api#variables)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.