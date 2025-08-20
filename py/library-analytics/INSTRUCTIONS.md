# Figma Library Analytics - Setup Instructions

This guide will help you set up and start using the Figma Library Analytics Python SDK and API server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Authentication Setup](#authentication-setup)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Python 3.9 or higher** - Check with `python --version`
- **pip or Poetry** - For package management
- **Figma API token** - With `library_analytics:read` scope
- **Access to a Figma library** - You need owner/editor access to the library

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 512MB RAM
- **Disk Space**: ~50MB for installation
- **Network**: Internet connection for API calls

## Installation

### Option 1: Install from PyPI (Recommended)

```bash
pip install figma-library-analytics
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/yourorg/figma-library-analytics.git
cd figma-library-analytics

# Install in development mode
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"
```

### Option 3: Using Poetry

```bash
# Clone and install with Poetry
git clone https://github.com/yourorg/figma-library-analytics.git
cd figma-library-analytics
poetry install
```

### Verify Installation

```bash
# Check that the CLI is available
figma-analytics --help

# Check Python import
python -c "import figma_library_analytics; print('✅ Installation successful')"
```

## Authentication Setup

### Step 1: Get Your Figma API Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll down to "Personal access tokens"
3. Click "Create a new personal access token"
4. Name your token (e.g., "Library Analytics")
5. **Important**: Ensure you have the `library_analytics:read` scope
6. Copy the token (you won't be able to see it again)

### Step 2: Configure Your Token

Choose one of these methods:

#### Method 1: Environment Variable (Recommended)

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export FIGMA_TOKEN="your-api-token-here"

# Or set for current session
export FIGMA_TOKEN="your-api-token-here"
```

#### Method 2: CLI Argument

```bash
figma-analytics component-actions ABC123 --api-key "your-api-token-here"
```

#### Method 3: Interactive Prompt

```bash
# If no token is found, you'll be prompted
figma-analytics component-actions ABC123
# → Enter your Figma API token: ****
```

### Step 3: Verify Authentication

```bash
# Test with a simple command
figma-analytics component-usages YOUR_FILE_KEY --group-by component

# If successful, you should see data or "No data found"
# If authentication fails, you'll see an error message
```

## Quick Start

### 1. Find Your Library File Key

Your file key is in the Figma URL:
```
https://www.figma.com/file/ABC123XYZ456/My-Design-System
                         ^^^^^^^^^^^^
                         This is your file key
```

### 2. Try Basic Commands

```bash
# Set your token (if not already set)
export FIGMA_TOKEN="your-api-token"

# Get component usage data
figma-analytics component-usages ABC123XYZ456 --group-by component

# Get style actions for the last 30 days
figma-analytics style-actions ABC123XYZ456 --group-by style --start-date 2023-11-01 --end-date 2023-11-30

# Export data to JSON
figma-analytics variable-usages ABC123XYZ456 --group-by variable --format json --output variables.json
```

### 3. Start the API Server

```bash
# Start server on default port (8000)
figma-analytics serve

# Or with custom settings
figma-analytics serve --port 3000 --host 127.0.0.1
```

### 4. Test the API

```bash
# Test with curl (replace YOUR_TOKEN and YOUR_FILE_KEY)
curl -H "X-Figma-Token: YOUR_TOKEN" \
  "http://localhost:8000/v1/analytics/libraries/YOUR_FILE_KEY/component/actions?group_by=component"
```

### 5. Use the SDK in Python

```python
import asyncio
from figma_library_analytics import FigmaAnalyticsSDK, GroupBy

async def main():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        response = await sdk.get_component_usages("YOUR_FILE_KEY", GroupBy.COMPONENT)
        print(f"Found {len(response.rows)} components")
        
        for component in response.rows[:5]:  # Show first 5
            print(f"- {component.component_name}: {component.usages} usages")

asyncio.run(main())
```

## Development Setup

### 1. Clone and Setup

```bash
git clone https://github.com/yourorg/figma-library-analytics.git
cd figma-library-analytics

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -e ".[dev]"
```

### 2. Install Pre-commit Hooks

```bash
pre-commit install
```

### 3. Setup Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Example `.env` file:
```bash
FIGMA_TOKEN=your-api-token-here
DEFAULT_FILE_KEY=ABC123XYZ456
LOG_LEVEL=INFO
```

### 4. Verify Development Setup

```bash
# Run linting
ruff check src tests

# Run type checking
mypy src

# Run tests
pytest

# Run CLI in development mode
python -m figma_library_analytics.cli component-usages ABC123 --group-by component
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_library_analytics --cov-report=html

# Run specific test file
pytest tests/test_sdk.py

# Run with verbose output
pytest -v

# Run only unit tests (skip integration tests)
pytest -m "not integration"
```

### Test Configuration

The test suite includes:

- **Unit tests** - Test individual components in isolation
- **Integration tests** - Test against the real Figma API (require valid token)
- **API tests** - Test the FastAPI server endpoints
- **CLI tests** - Test command-line interface

### Setting Up Test Environment

```bash
# Set test API token (optional, for integration tests)
export FIGMA_TEST_TOKEN="your-test-token"
export FIGMA_TEST_FILE_KEY="test-file-key"

# Run tests with integration tests
pytest --run-integration
```

### Test Coverage

Aim for 80%+ test coverage:

```bash
# Generate coverage report
pytest --cov=figma_library_analytics --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html  # macOS
# or
start htmlcov/index.html  # Windows
```

## Deployment

### Option 1: Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ ./src/
RUN pip install -e .

EXPOSE 8000
CMD ["figma-analytics", "serve", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t figma-analytics .
docker run -p 8000:8000 -e FIGMA_TOKEN="your-token" figma-analytics
```

### Option 2: Cloud Deployment (Heroku)

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-figma-analytics-app

# Set environment variables
heroku config:set FIGMA_TOKEN="your-api-token"

# Deploy
git push heroku main

# Set dyno to run the server
heroku ps:scale web=1
```

Create a `Procfile`:
```
web: figma-analytics serve --host 0.0.0.0 --port $PORT
```

### Option 3: Cloud Functions/Lambda

For serverless deployment, you can wrap the FastAPI app:

```python
# lambda_handler.py
from mangum import Mangum
from figma_library_analytics.server import app

handler = Mangum(app)
```

### Option 4: Traditional Server

```bash
# Install on server
pip install figma-library-analytics

# Create systemd service
sudo nano /etc/systemd/system/figma-analytics.service
```

```ini
[Unit]
Description=Figma Analytics API
After=network.target

[Service]
Type=simple
User=your-user
Environment=FIGMA_TOKEN=your-token
ExecStart=/usr/local/bin/figma-analytics serve --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable figma-analytics
sudo systemctl start figma-analytics
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Error**: `401 Authentication failed`

**Solutions**:
- Verify your API token is correct
- Check that the token has `library_analytics:read` scope
- Ensure the token hasn't expired
- Try regenerating your token

```bash
# Test token directly
curl -H "X-Figma-Token: YOUR_TOKEN" "https://api.figma.com/v1/me"
```

#### 2. File Not Found Errors

**Error**: `404 Resource not found`

**Solutions**:
- Verify the file key is correct
- Check that the file is a published library
- Ensure you have access to the file
- Try with a different file key

#### 3. Rate Limiting

**Error**: `429 Rate limit exceeded`

**Solutions**:
- Wait before retrying (the SDK handles this automatically)
- Reduce request frequency
- Consider using pagination for large datasets

#### 4. Import Errors

**Error**: `ModuleNotFoundError: No module named 'figma_library_analytics'`

**Solutions**:
```bash
# Reinstall package
pip uninstall figma-library-analytics
pip install figma-library-analytics

# Or install in development mode
pip install -e .

# Check Python path
python -c "import sys; print(sys.path)"
```

#### 5. Server Won't Start

**Error**: `Port already in use`

**Solutions**:
```bash
# Use different port
figma-analytics serve --port 8001

# Find process using port
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process if needed
kill -9 PID  # Replace PID with actual process ID
```

### Debug Mode

Enable debug logging:

```bash
# Set log level
export LOG_LEVEL=DEBUG

# Run with verbose output
figma-analytics --verbose component-usages ABC123 --group-by component
```

In Python:
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Your code here
```

### Getting Help

1. **Check the logs** - Look for detailed error messages
2. **Review the documentation** - Check README.md and EXAMPLES.md
3. **Search existing issues** - Check GitHub issues
4. **Create an issue** - If you can't find a solution

### Performance Tips

1. **Use pagination** for large datasets
2. **Cache results** when possible
3. **Use date ranges** to limit data
4. **Monitor rate limits** in production

### Monitoring

Set up monitoring for production deployments:

```python
# Add to your application
import logging
from figma_library_analytics.errors import RateLimitError

logger = logging.getLogger(__name__)

try:
    # Your analytics code
    pass
except RateLimitError as e:
    logger.warning(f"Rate limited, retry after {e.retry_after} seconds")
except Exception as e:
    logger.error(f"Analytics error: {e}")
```

## Support

If you need help:

- 📖 Read the [README](README.md) and [Examples](EXAMPLES.md)
- 🐛 Check [GitHub Issues](https://github.com/yourorg/figma-library-analytics/issues)
- 💬 Join our [Discussions](https://github.com/yourorg/figma-library-analytics/discussions)
- 📧 Email: support@example.com

## Next Steps

Now that you're set up:

1. **Explore the examples** - Check out [EXAMPLES.md](EXAMPLES.md) for advanced usage
2. **Set up monitoring** - Track your library usage over time
3. **Automate reports** - Create scheduled analytics reports
4. **Integrate with tools** - Connect to Slack, dashboards, etc.
5. **Contribute** - Help improve the project on GitHub

Happy analyzing! 📊