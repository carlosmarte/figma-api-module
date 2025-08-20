# Figma Files SDK

A comprehensive Python SDK for the Figma Files API with full async support, type hints, and a powerful CLI interface.

## Features

- **Full API Coverage**: All 6 Figma Files API endpoints
- **Async/Await Support**: Built with `httpx` for modern async Python
- **Type Safety**: Complete type hints with Pydantic models
- **Rate Limiting**: Built-in rate limiting and retry logic
- **Error Handling**: Comprehensive error handling with custom exceptions
- **CLI Interface**: Rich command-line interface with `typer` and `rich`
- **OAuth2 Scopes**: Proper authentication handling
- **URL Parsing**: Extract file keys and node IDs from Figma URLs
- **Batch Operations**: Efficient batch processing for multiple requests

## Installation

```bash
pip install figma-files
```

Or install from source:

```bash
git clone <repository-url>
cd figma-files
pip install -e .
```

## Quick Start

### SDK Usage

```python
import asyncio
from figma_files import FigmaFileSDK

async def main():
    # Initialize the SDK
    async with FigmaFileSDK(api_key="your-figma-token") as sdk:
        # Get file information
        file_data = await sdk.get_file("your-file-key")
        print(f"File: {file_data.name}")
        
        # Render node images
        images = await sdk.render_images(
            "your-file-key",
            ["1:2", "3:4"],
            format=ImageFormat.PNG,
            scale=2.0
        )
        
        # Search for nodes
        nodes = await sdk.search_nodes_by_name(
            "your-file-key",
            "Button"
        )

asyncio.run(main())
```

### CLI Usage

Set your Figma API token:

```bash
export FIGMA_API_KEY="your-figma-token"
```

Get file information:

```bash
figma-files get-file abc123def456
figma-files get-file "https://www.figma.com/file/abc123def456/My-Design"
```

Render node images:

```bash
figma-files render-images abc123def456 "1:2,3:4" --format png --scale 2.0
figma-files render-node "https://www.figma.com/file/abc123/Design?node-id=1%3A2"
```

Search for nodes:

```bash
figma-files search-nodes abc123def456 "Button" --limit 10
```

Get file metadata:

```bash
figma-files get-metadata abc123def456 --output json
```

## API Server

The SDK includes a FastAPI server with built-in Figma token validation middleware that enforces authentication on all API routes:

### Starting the Server

```bash
# Start with default settings (port 8000)
figma-files serve

# Custom port and API key
figma-files serve --port 3000 --api-key "your-figma-token"

# Enable auto-reload for development
figma-files serve --reload
```

### Token Validation

The server validates Figma tokens in the following priority order:
1. **X-Figma-Token header** (recommended)
2. **token query parameter**
3. **FIGMA_TOKEN environment variable**

Example requests:
```bash
# Using header authentication
curl -H "X-Figma-Token: your-token" http://localhost:8000/v1/files/YOUR_FILE_KEY

# Using query parameter
curl http://localhost:8000/v1/files/YOUR_FILE_KEY?token=your-token
```

### API Documentation

When the server is running, interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

## API Endpoints

The SDK supports all Figma Files API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/files/{file_key}` | `get_file()` | Get file JSON |
| `/v1/files/{file_key}/nodes` | `get_file_nodes()` | Get specific nodes |
| `/v1/images/{file_key}` | `render_images()` | Render node images |
| `/v1/files/{file_key}/images` | `get_image_fills()` | Get image fills |
| `/v1/files/{file_key}/meta` | `get_file_metadata()` | Get file metadata |
| `/v1/files/{file_key}/versions` | `get_file_versions()` | Get version history |

## Authentication

The SDK supports Figma Personal Access Tokens. You can get your token from:
https://www.figma.com/developers/api#access-tokens

Required OAuth2 scopes:
- `file_content:read` - Read file content
- `files:read` - Read file metadata
- `file_versions:read` - Read version history
- `file_metadata:read` - Read file metadata

## Advanced Usage

### Error Handling

```python
from figma_files import FigmaFileSDK, ApiError, RateLimitError

async with FigmaFileSDK(api_key="token") as sdk:
    try:
        file_data = await sdk.get_file("file-key")
    except RateLimitError as e:
        print(f"Rate limited. Retry after {e.retry_after} seconds")
    except ApiError as e:
        print(f"API error: {e.message} (status: {e.status_code})")
```

### Batch Operations

```python
# Render multiple image sets in parallel
requests = [
    {"file_key_or_url": "file1", "node_ids": ["1:1", "1:2"]},
    {"file_key_or_url": "file2", "node_ids": ["2:1"], "scale": 2.0},
]

results = await sdk.batch_render_images(requests)
```

### Custom Client Configuration

```python
from figma_files import FigmaFileClient, FigmaFileSDK

# Custom client with rate limiting
client = FigmaFileClient(
    api_key="token",
    timeout=60.0,
    max_retries=5,
    rate_limit=10  # 10 requests per second
)

sdk = FigmaFileSDK(client=client)
```

### URL Utilities

```python
from figma_files.utils import extract_file_key_from_url, extract_node_id_from_url

url = "https://www.figma.com/file/abc123/Design?node-id=1%3A2"
file_key = extract_file_key_from_url(url)  # "abc123"
node_id = extract_node_id_from_url(url)    # "1:2"
```

## CLI Commands

### File Operations

```bash
# Get file information
figma-files get-file FILE_KEY [OPTIONS]

# Get specific nodes
figma-files get-nodes FILE_KEY NODE_IDS [OPTIONS]

# Get single node from URL
figma-files get-node FIGMA_URL [OPTIONS]
```

### Image Rendering

```bash
# Render multiple nodes
figma-files render-images FILE_KEY NODE_IDS [OPTIONS]

# Render single node from URL
figma-files render-node FIGMA_URL [OPTIONS]

# Get image fills
figma-files get-image-fills FILE_KEY [OPTIONS]
```

### Metadata and Search

```bash
# Get file metadata
figma-files get-metadata FILE_KEY [OPTIONS]

# Get version history
figma-files get-versions FILE_KEY [OPTIONS]

# Search nodes by name
figma-files search-nodes FILE_KEY PATTERN [OPTIONS]

# List all components
figma-files list-components FILE_KEY [OPTIONS]
```

### Utilities

```bash
# Extract file key and node ID from URL
figma-files extract-url-info FIGMA_URL
```

## Common Options

- `--api-key, -k`: Figma API token (or set `FIGMA_API_KEY` env var)
- `--output, -o`: Output format (`table` or `json`)
- `--version, -v`: Specific file version
- `--save, -s`: Save output to file

## Models

The SDK includes comprehensive Pydantic models for all API responses:

- `FileResponse` - Complete file data
- `FileNodesResponse` - Specific nodes data
- `ImageRenderResponse` - Rendered image URLs
- `ImageFillsResponse` - Image fill URLs
- `FileMetaResponse` - File metadata
- `FileVersionsResponse` - Version history
- `Node`, `Component`, `Style`, `User`, etc.

## Development

### Setup

```bash
git clone <repository-url>
cd figma-files
pip install -e ".[dev]"
```

### Running Tests

```bash
pytest
pytest --cov=figma_files
```

### Code Quality

```bash
ruff check .
ruff format .
mypy src/figma_files
```

### Building Documentation

```bash
mkdocs serve
mkdocs build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Related Projects

- [Figma API Documentation](https://www.figma.com/developers/api)
- [Figma OpenAPI Specification](https://github.com/figma/rest-api-spec)

## Support

- GitHub Issues: [Report bugs and request features](https://github.com/thinkeloquent/figma-files-sdk/issues)
- Documentation: [Read the full documentation](https://figma-files-sdk.readthedocs.io/)