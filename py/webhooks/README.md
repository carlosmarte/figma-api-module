# Figma Webhooks Python Library

A comprehensive Python library for managing Figma webhooks with SDK, CLI, and server interfaces.

## Features

- **Complete Webhook Management**: Create, read, update, and delete Figma webhooks
- **Multiple Interfaces**: SDK for programmatic use, CLI for command-line operations, FastAPI server for web APIs
- **Async Support**: Full async/await support with efficient HTTP connection pooling
- **Rate Limiting**: Built-in token bucket rate limiter to respect API limits
- **Retry Logic**: Exponential backoff retry mechanism for robust error handling
- **Type Safety**: Comprehensive type hints with Pydantic models
- **Authentication**: Flexible token validation from headers, query parameters, or environment
- **Rich CLI**: Beautiful command-line interface with progress indicators and colored output

## Installation

### Using pip

```bash
pip install figma-webhooks
```

### Using Poetry

```bash
poetry add figma-webhooks
```

### From Source

```bash
git clone https://github.com/figma/webhooks-python.git
cd webhooks-python
pip install -e .
```

## Quick Start

### SDK Usage

```python
import asyncio
from figma_webhooks import FigmaWebhooksSDK, WebhookEvent, WebhookContext

async def main():
    async with FigmaWebhooksSDK("your-figma-token") as sdk:
        # List all webhooks for a file
        webhooks = await sdk.list_webhooks(
            context=WebhookContext.FILE,
            context_id="your-file-id"
        )
        
        # Create a new webhook
        webhook = await sdk.create_file_webhook(
            file_id="your-file-id",
            endpoint="https://your-server.com/webhook",
            passcode="your-secret-passcode",
            event_type=WebhookEvent.FILE_UPDATE,
            description="My webhook"
        )
        
        # Get webhook requests for debugging
        requests = await sdk.get_webhook_requests(webhook.id)
        
        # Pause a webhook
        await sdk.pause_webhook(webhook.id)
        
        # Delete a webhook
        await sdk.delete_webhook(webhook.id)

asyncio.run(main())
```

### CLI Usage

```bash
# Set your API key
export FIGMA_TOKEN="your-figma-token"

# List webhooks for a file
figma-webhooks list --context file --context-id your-file-id

# Create a webhook
figma-webhooks create \
  --event-type FILE_UPDATE \
  --context file \
  --context-id your-file-id \
  --endpoint https://your-server.com/webhook \
  --passcode your-secret \
  --description "My webhook"

# Get webhook details
figma-webhooks get webhook-id

# Update a webhook
figma-webhooks update webhook-id --status PAUSED

# Get webhook requests for debugging
figma-webhooks requests webhook-id

# Delete a webhook
figma-webhooks delete webhook-id --yes
```

## API Server

The library includes a FastAPI server for exposing webhook management as a REST API.

### Starting the Server

```bash
# Start with default settings
figma-webhooks serve

# Custom port and API key
figma-webhooks serve --port 3000 --api-key "your-token"

# Development mode with auto-reload
figma-webhooks serve --reload
```

### Token Validation

The server validates tokens in priority order:

1. `X-Figma-Token` header (recommended)
2. `token` query parameter
3. `FIGMA_TOKEN` environment variable

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth required) |
| GET | `/v1/webhooks` | List webhooks |
| POST | `/v1/webhooks` | Create webhook |
| GET | `/v1/webhooks/{id}` | Get webhook |
| PUT | `/v1/webhooks/{id}` | Update webhook |
| DELETE | `/v1/webhooks/{id}` | Delete webhook |
| GET | `/v1/webhooks/{id}/requests` | Get webhook requests |
| POST | `/v1/webhooks/file` | Create file webhook |
| POST | `/v1/webhooks/team` | Create team webhook |
| POST | `/v1/webhooks/project` | Create project webhook |
| PATCH | `/v1/webhooks/{id}/pause` | Pause webhook |
| PATCH | `/v1/webhooks/{id}/activate` | Activate webhook |
| GET | `/v1/webhooks/search` | Search webhooks |

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI**: http://localhost:8000/openapi.json

### Example API Requests

```bash
# List webhooks with authentication header
curl -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/webhooks?context=file&context_id=your-file-id"

# Create a webhook
curl -X POST \
  -H "X-Figma-Token: your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "FILE_UPDATE",
    "context": "FILE",
    "context_id": "your-file-id",
    "endpoint": "https://your-server.com/webhook",
    "passcode": "your-secret",
    "description": "My webhook"
  }' \
  "http://localhost:8000/v1/webhooks"

# Get webhook with query parameter authentication
curl "http://localhost:8000/v1/webhooks/webhook-id?token=your-token"
```

## Webhook Events

The library supports all Figma webhook events:

- `PING` - Test webhook (sent automatically when webhook is created)
- `FILE_UPDATE` - File content changes
- `FILE_VERSION_UPDATE` - Named version created
- `FILE_DELETE` - File deleted
- `LIBRARY_PUBLISH` - Library published
- `FILE_COMMENT` - Comment added to file
- `DEV_MODE_STATUS_UPDATE` - Dev mode status changed

## Error Handling

The library provides comprehensive error handling:

```python
from figma_webhooks import (
    FigmaWebhooksSDK,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError
)

async def example_error_handling():
    try:
        async with FigmaWebhooksSDK("invalid-token") as sdk:
            await sdk.list_webhooks()
    except AuthenticationError:
        print("Invalid API token")
    except AuthorizationError:
        print("Access forbidden")
    except NotFoundError:
        print("Resource not found")
    except RateLimitError as e:
        print(f"Rate limited. Retry after {e.retry_after} seconds")
    except ValidationError as e:
        print(f"Validation error: {e.message}")
    except ApiError as e:
        print(f"API error {e.status_code}: {e.message}")
```

## Advanced Usage

### Rate Limiting

The client includes built-in rate limiting:

```python
from figma_webhooks import FigmaWebhooksClient

# Custom rate limiting
client = FigmaWebhooksClient(
    api_key="your-token",
    rate_limit_tokens=50,  # Max 50 tokens
    rate_limit_refill=2.0,  # Refill 2 tokens per second
)
```

### Custom Timeouts and Retries

```python
from figma_webhooks import FigmaWebhooksSDK

sdk = FigmaWebhooksSDK(
    api_key="your-token",
    timeout=60.0,  # 60 second timeout
    max_retries=5,  # Retry up to 5 times
)
```

### Pagination

```python
# Manual pagination
async with FigmaWebhooksSDK("your-token") as sdk:
    cursor = None
    while True:
        response = await sdk.list_webhooks(
            plan_api_id="your-plan-id",
            cursor=cursor
        )
        
        for webhook in response.webhooks:
            print(f"Webhook: {webhook.id}")
        
        if not response.next_page:
            break
        cursor = response.next_page

# Automatic pagination with client
async with FigmaWebhooksClient("your-token") as client:
    async for webhook in client.paginate("/v2/webhooks", plan_api_id="your-plan-id"):
        print(f"Webhook: {webhook['id']}")
```

### Batch Operations

```python
# Get multiple webhooks at once
webhook_ids = ["webhook-1", "webhook-2", "webhook-3"]
webhooks = await sdk.batch_get_webhooks(webhook_ids)

# Search with filters
webhooks = await sdk.search_webhooks(
    event_type=WebhookEvent.FILE_UPDATE,
    status=WebhookStatus.ACTIVE,
    plan_api_id="your-plan-id"
)
```

## Development

### Setup

```bash
git clone https://github.com/figma/webhooks-python.git
cd webhooks-python
poetry install
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=figma_webhooks

# Run only unit tests
poetry run pytest tests/test_*.py

# Run specific test
poetry run pytest tests/test_sdk.py::TestFigmaWebhooksSDK::test_create_webhook
```

### Code Quality

```bash
# Format code
poetry run ruff format .

# Lint code
poetry run ruff check .

# Type checking
poetry run mypy src/

# Run all checks
poetry run pre-commit run --all-files
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [Documentation](https://figma-webhooks.readthedocs.io)
- [GitHub Issues](https://github.com/figma/webhooks-python/issues)
- [Figma API Documentation](https://www.figma.com/developers/api#webhooks_v2)

## Changelog

### 0.1.0 (2024-01-01)

- Initial release
- Complete webhook management API
- CLI interface with rich output
- FastAPI server with token validation
- Comprehensive test suite
- Full async/await support
- Rate limiting and retry logic