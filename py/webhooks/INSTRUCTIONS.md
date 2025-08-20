# Installation and Setup Instructions

This guide provides detailed instructions for installing and setting up the Figma Webhooks Python library.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Verification](#verification)
- [Development Setup](#development-setup)
- [Docker Setup](#docker-setup)
- [Troubleshooting](#troubleshooting)

## Requirements

### System Requirements

- **Python**: 3.9 or higher (3.9, 3.10, 3.11 supported)
- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 512MB RAM
- **Network**: Internet connection for API calls

### Dependencies

The library automatically installs the following dependencies:

- `httpx` (≥0.27.0) - HTTP client for API requests
- `pydantic` (≥2.7.0) - Data validation and serialization
- `typer` (≥0.12.0) - CLI framework
- `rich` (≥13.7.0) - Rich text and beautiful formatting
- `fastapi` (≥0.110.0) - Web framework for server
- `uvicorn` (≥0.29.0) - ASGI server

## Installation

### Option 1: Install from PyPI (Recommended)

```bash
# Install the latest stable version
pip install figma-webhooks

# Or with specific version
pip install figma-webhooks==0.1.0
```

### Option 2: Install with Poetry

```bash
# Add to your project
poetry add figma-webhooks

# Or with development dependencies
poetry add figma-webhooks --group dev
```

### Option 3: Install from Source

```bash
# Clone the repository
git clone https://github.com/figma/webhooks-python.git
cd webhooks-python

# Install in development mode
pip install -e .

# Or with Poetry
poetry install
```

### Option 4: Install Specific Extras

```bash
# Install with all optional dependencies
pip install "figma-webhooks[all]"

# Install only server dependencies
pip install "figma-webhooks[server]"

# Install only CLI dependencies
pip install "figma-webhooks[cli]"
```

## Configuration

### 1. Get Your Figma API Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll down to "Personal access tokens"
3. Click "Create a new personal access token"
4. Give it a descriptive name (e.g., "Webhooks Python Library")
5. Copy the generated token

### 2. Set Up Authentication

#### Option A: Environment Variable (Recommended)

```bash
# Linux/macOS
export FIGMA_TOKEN="your-figma-token-here"

# Windows Command Prompt
set FIGMA_TOKEN=your-figma-token-here

# Windows PowerShell
$env:FIGMA_TOKEN="your-figma-token-here"
```

#### Option B: Configuration File

Create a `.env` file in your project directory:

```bash
# .env
FIGMA_TOKEN=your-figma-token-here
FIGMA_BASE_URL=https://api.figma.com  # Optional, defaults to this
```

#### Option C: Direct in Code

```python
from figma_webhooks import FigmaWebhooksSDK

# Pass token directly (not recommended for production)
sdk = FigmaWebhooksSDK(api_key="your-figma-token-here")
```

### 3. Verify Installation

```bash
# Check if the CLI is available
figma-webhooks --help

# Test with your token
figma-webhooks list --help
```

## Verification

### 1. Quick CLI Test

```bash
# Set your token
export FIGMA_TOKEN="your-token"

# Test the connection (this will list webhooks)
figma-webhooks list --plan-api-id "your-plan-id"
```

### 2. Quick SDK Test

```python
import asyncio
from figma_webhooks import FigmaWebhooksSDK

async def test_connection():
    async with FigmaWebhooksSDK("your-token") as sdk:
        # This will test the connection
        webhooks = await sdk.list_webhooks(plan_api_id="your-plan-id")
        print(f"Connected! Found {len(webhooks.webhooks)} webhooks")

asyncio.run(test_connection())
```

### 3. Quick Server Test

```bash
# Start the server
figma-webhooks serve --port 8000

# In another terminal, test the health endpoint
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "service": "figma-webhooks"}
```

## Development Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/figma/webhooks-python.git
cd webhooks-python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install with development dependencies
pip install -e ".[dev]"
# Or with Poetry:
poetry install
```

### 2. Install Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run hooks on all files (optional)
pre-commit run --all-files
```

### 3. Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_webhooks --cov-report=html

# Run specific test file
pytest tests/test_sdk.py

# Run with verbose output
pytest -v
```

### 4. Code Quality

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type checking
mypy src/

# Run all checks
pre-commit run --all-files
```

### 5. Build Documentation

```bash
# Install documentation dependencies
pip install -e ".[docs]"

# Build documentation (if available)
mkdocs build

# Serve documentation locally
mkdocs serve
```

## Docker Setup

### 1. Using Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . .
RUN pip install -e .

# Set environment variables
ENV FIGMA_TOKEN=""

# Expose port
EXPOSE 8000

# Run server
CMD ["figma-webhooks", "serve", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build image
docker build -t figma-webhooks .

# Run container
docker run -p 8000:8000 -e FIGMA_TOKEN="your-token" figma-webhooks
```

### 2. Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  figma-webhooks:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FIGMA_TOKEN=${FIGMA_TOKEN}
    restart: unless-stopped
```

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f figma-webhooks
```

## IDE Setup

### Visual Studio Code

Install recommended extensions:

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.mypy-type-checker",
    "charliermarsh.ruff",
    "ms-python.black-formatter"
  ]
}
```

Settings for `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.formatting.provider": "ruff",
  "python.linting.enabled": true,
  "python.linting.mypyEnabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests/"]
}
```

### PyCharm

1. Open the project directory
2. Configure Python interpreter: Settings → Project → Python Interpreter
3. Set up run configurations for tests and server
4. Enable type checking: Settings → Editor → Inspections → Python → Type checker

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FIGMA_TOKEN` | Your Figma personal access token | Yes | - |
| `FIGMA_BASE_URL` | Figma API base URL | No | `https://api.figma.com` |
| `FIGMA_TIMEOUT` | Request timeout in seconds | No | `30.0` |
| `FIGMA_MAX_RETRIES` | Maximum number of retries | No | `3` |
| `FIGMA_RATE_LIMIT_TOKENS` | Rate limit token bucket size | No | `100` |
| `FIGMA_RATE_LIMIT_REFILL` | Rate limit refill rate (tokens/sec) | No | `1.0` |

## Common Configuration Patterns

### 1. Production Configuration

```python
# config.py
import os
from figma_webhooks import FigmaWebhooksSDK

def get_sdk():
    return FigmaWebhooksSDK(
        api_key=os.environ["FIGMA_TOKEN"],
        timeout=60.0,  # Longer timeout for production
        max_retries=5,  # More retries for reliability
    )
```

### 2. Development Configuration

```python
# config.py
import os
from figma_webhooks import FigmaWebhooksSDK

def get_sdk():
    return FigmaWebhooksSDK(
        api_key=os.environ.get("FIGMA_TOKEN", "dev-token"),
        base_url=os.environ.get("FIGMA_BASE_URL", "https://api.figma.com"),
        timeout=30.0,
        max_retries=3,
    )
```

### 3. Testing Configuration

```python
# conftest.py
import pytest
from figma_webhooks import FigmaWebhooksSDK

@pytest.fixture
def sdk():
    return FigmaWebhooksSDK(
        api_key="test-token",
        base_url="https://test-api.figma.com",
        timeout=10.0,
        max_retries=1,
    )
```

## Troubleshooting

### Common Issues

#### 1. ImportError: No module named 'figma_webhooks'

**Solution:**
```bash
# Make sure you installed the package
pip install figma-webhooks

# Or if developing from source
pip install -e .
```

#### 2. AuthenticationError: Invalid token

**Solutions:**
- Check that your token is correct
- Ensure the token has the required permissions (`webhooks:read`, `webhooks:write`)
- Verify the token hasn't expired

```bash
# Test your token with curl
curl -H "X-Figma-Token: your-token" https://api.figma.com/v1/me
```

#### 3. Command 'figma-webhooks' not found

**Solutions:**
```bash
# Reinstall with scripts
pip install --force-reinstall figma-webhooks

# Or run directly
python -m figma_webhooks.cli --help

# Check if it's in PATH
which figma-webhooks
```

#### 4. SSL/TLS Errors

**Solutions:**
```bash
# Update certificates
pip install --upgrade certifi

# Or set environment variable
export SSL_CERT_FILE=$(python -m certifi)
```

#### 5. Rate Limiting Issues

**Solutions:**
- Increase rate limit settings in your configuration
- Add delays between requests
- Use the built-in rate limiter

```python
# Custom rate limiting
from figma_webhooks import FigmaWebhooksClient

client = FigmaWebhooksClient(
    api_key="your-token",
    rate_limit_tokens=50,  # Reduce from default 100
    rate_limit_refill=0.5,  # Slower refill
)
```

### Getting Help

1. **Check the logs**: Enable debug logging to see what's happening
2. **Read error messages**: They usually contain helpful information
3. **Check network connectivity**: Ensure you can reach `api.figma.com`
4. **Verify permissions**: Make sure your token has the right scopes
5. **Test with minimal example**: Use the verification steps above

### Debug Logging

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Or for specific module
logging.getLogger('figma_webhooks').setLevel(logging.DEBUG)
```

### Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/figma/webhooks-python/issues)
- **Documentation**: [Read the full documentation](https://figma-webhooks.readthedocs.io)
- **Figma API Docs**: [Official Figma API documentation](https://www.figma.com/developers/api)

## Next Steps

After successful installation:

1. **Read the examples**: Check out [EXAMPLES.md](EXAMPLES.md) for usage patterns
2. **Explore the CLI**: Run `figma-webhooks --help` to see all commands
3. **Try the server**: Start with `figma-webhooks serve` and visit the docs
4. **Build your integration**: Use the SDK to create your webhook management solution

Happy webhook managing! 🚀