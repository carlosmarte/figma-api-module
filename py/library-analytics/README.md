# Figma Library Analytics Python SDK

A comprehensive Python SDK and API server for accessing Figma Library Analytics data. Track component, style, and variable usage across your organization with powerful analytics insights.

## Features

- 🚀 **Async/await support** - Built for high performance
- 🔐 **Robust authentication** - Multiple token validation methods
- 📊 **Complete analytics coverage** - Components, styles, and variables
- 🛡️ **Rate limiting & retries** - Production-ready with exponential backoff
- 🖥️ **Rich CLI interface** - Beautiful table output and JSON export
- 🌐 **FastAPI server** - RESTful API with automatic documentation
- 📝 **Comprehensive typing** - Full type hints with Pydantic models
- ✅ **Extensive testing** - 80%+ test coverage

## Installation

```bash
pip install figma-library-analytics
```

Or for development:

```bash
git clone <repository>
cd figma-library-analytics
pip install -e ".[dev]"
```

## Quick Start

### SDK Usage

```python
import asyncio
from datetime import date
from figma_library_analytics import FigmaAnalyticsSDK, GroupBy

async def main():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Get component actions data
        actions = await sdk.get_component_actions(
            file_key="your-file-key",
            group_by=GroupBy.COMPONENT,
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31)
        )
        
        for action in actions.rows:
            print(f"{action.component_name}: {action.insertions} insertions")

asyncio.run(main())
```

### CLI Usage

```bash
# Set your API token
export FIGMA_TOKEN="your-api-token"

# Get component actions data
figma-analytics component-actions ABC123 --group-by component --format table

# Get component usages with JSON output
figma-analytics component-usages ABC123 --group-by file --format json --output data.json

# Use Figma URL instead of file key
figma-analytics style-actions "https://www.figma.com/file/ABC123/My-Library" --group-by style

# Get data for specific date range
figma-analytics variable-actions ABC123 \
    --group-by variable \
    --start-date 2023-01-01 \
    --end-date 2023-12-31
```

## API Server

### Starting the Server

```bash
# Start with default settings
figma-analytics serve

# Custom port and API key
figma-analytics serve --port 3000 --api-key "your-token"

# With auto-reload for development
figma-analytics serve --reload
```

### Token Validation

The server validates tokens in priority order:

1. **X-Figma-Token header** (recommended)
2. **token query parameter**
3. **FIGMA_TOKEN environment variable**

### Example API Requests

```bash
# Using header (recommended)
curl -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/analytics/libraries/ABC123/component/actions?group_by=component"

# Using query parameter
curl "http://localhost:8000/v1/analytics/libraries/ABC123/component/actions?group_by=component&token=your-token"

# With date range and pagination
curl -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/analytics/libraries/ABC123/style/actions?group_by=style&start_date=2023-01-01&end_date=2023-12-31&cursor=next_page"
```

### API Documentation

When the server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **Health Check**: http://localhost:8000/health

## Available Endpoints

### Component Analytics

- `GET /v1/analytics/libraries/{file_key}/component/actions`
  - **group_by**: `component` | `team`
  - **Optional**: `start_date`, `end_date`, `cursor`

- `GET /v1/analytics/libraries/{file_key}/component/usages`
  - **group_by**: `component` | `file`
  - **Optional**: `cursor`

### Style Analytics

- `GET /v1/analytics/libraries/{file_key}/style/actions`
  - **group_by**: `style` | `team`
  - **Optional**: `start_date`, `end_date`, `cursor`

- `GET /v1/analytics/libraries/{file_key}/style/usages`
  - **group_by**: `style` | `file`
  - **Optional**: `cursor`

### Variable Analytics

- `GET /v1/analytics/libraries/{file_key}/variable/actions`
  - **group_by**: `variable` | `team`
  - **Optional**: `start_date`, `end_date`, `cursor`

- `GET /v1/analytics/libraries/{file_key}/variable/usages`
  - **group_by**: `variable` | `file`
  - **Optional**: `cursor`

## Authentication

You need a Figma API token with the `library_analytics:read` scope. Get one from:
https://www.figma.com/developers/api#access-tokens

### Setting Your Token

```bash
# Environment variable (recommended)
export FIGMA_TOKEN="your-api-token"

# CLI argument
figma-analytics component-actions ABC123 --api-key "your-token"

# Interactive prompt (if no token found)
figma-analytics component-actions ABC123
# → Enter your Figma API token: ****
```

## SDK Reference

### Client Classes

- **`FigmaAnalyticsClient`** - Low-level HTTP client with rate limiting
- **`FigmaAnalyticsSDK`** - High-level SDK with model serialization

### Models

All analytics data is returned as typed Pydantic models:

- `LibraryAnalyticsComponentActionsByAsset`
- `LibraryAnalyticsComponentActionsByTeam`
- `LibraryAnalyticsComponentUsagesByAsset`
- `LibraryAnalyticsComponentUsagesByFile`
- `LibraryAnalyticsStyleActionsByAsset`
- `LibraryAnalyticsStyleActionsByTeam`
- `LibraryAnalyticsStyleUsagesByAsset`
- `LibraryAnalyticsStyleUsagesByFile`
- `LibraryAnalyticsVariableActionsByAsset`
- `LibraryAnalyticsVariableActionsByTeam`
- `LibraryAnalyticsVariableUsagesByAsset`
- `LibraryAnalyticsVariableUsagesByFile`

### Error Handling

```python
from figma_library_analytics import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

try:
    async with FigmaAnalyticsSDK("invalid-token") as sdk:
        data = await sdk.get_component_actions("ABC123", GroupBy.COMPONENT)
except AuthenticationError:
    print("Invalid API token")
except AuthorizationError:
    print("Missing library_analytics:read scope")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except NotFoundError:
    print("Library not found")
```

### Batch Operations

```python
# Get all data across multiple pages
all_actions = await sdk.get_all_component_actions(
    file_key="ABC123",
    group_by=GroupBy.COMPONENT
)

# Stream data one record at a time
async for action in sdk.stream_component_actions("ABC123", GroupBy.COMPONENT):
    print(f"Processing: {action.component_name}")

# Search components by name
matching_components = await sdk.search_components_by_name(
    file_key="ABC123",
    component_name="button"
)
```

## Development

### Setup

```bash
git clone <repository>
cd figma-library-analytics
pip install -e ".[dev]"
pre-commit install
```

### Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=figma_library_analytics --cov-report=html

# Run specific test file
pytest tests/test_sdk.py

# Run async tests
pytest tests/test_client.py -v
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

### Running the Server Locally

```bash
# For development with auto-reload
figma-analytics serve --reload --port 8000

# Or run directly
uvicorn figma_library_analytics.server:app --reload
```

## Error Handling

The SDK provides specific exceptions for different error scenarios:

- **`AuthenticationError`** (401) - Invalid or missing API token
- **`AuthorizationError`** (403) - Missing required scopes
- **`NotFoundError`** (404) - Library or resource not found
- **`RateLimitError`** (429) - API rate limit exceeded
- **`ApiError`** - General API errors (400, 500, etc.)

All exceptions include the HTTP status code and detailed error message.

## Rate Limiting

The client includes built-in rate limiting to respect Figma's API limits:

- **300 requests per minute** by default
- **Token bucket algorithm** for smooth request distribution
- **Automatic retries** with exponential backoff
- **Configurable limits** for different use cases

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`pytest`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://figma-library-analytics.readthedocs.io)
- 🐛 [Bug Reports](https://github.com/yourorg/figma-library-analytics/issues)
- 💬 [Discussions](https://github.com/yourorg/figma-library-analytics/discussions)
- 📧 [Email Support](mailto:support@example.com)