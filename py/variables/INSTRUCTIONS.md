# Figma Variables Python Library - Setup Instructions

This guide provides step-by-step instructions for setting up and using the Figma Variables Python library.

## Prerequisites

### System Requirements

- **Python 3.9+** (3.9, 3.10, or 3.11)
- **pip** or **poetry** for package management
- **Git** (for development installation)

### Figma Requirements

⚠️ **Important**: This library requires Enterprise features:

1. **Figma Enterprise Organization**: You must be a member of a Figma Enterprise organization
2. **API Token with Scopes**:
   - `file_variables:read` - Required for reading variables
   - `file_variables:write` - Required for creating/modifying variables (also needs Editor seat)
3. **File Access**: You need access to the Figma file you want to work with

## Installation

### Option 1: Install from PyPI (Recommended)

```bash
# Basic installation
pip install figma-variables

# With server dependencies (FastAPI + Uvicorn)
pip install "figma-variables[server]"

# Complete installation with all optional dependencies
pip install "figma-variables[all]"
```

### Option 2: Development Installation

```bash
# Clone the repository
git clone https://github.com/figma/figma-variables-python
cd figma-variables-python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install in development mode
pip install -e ".[dev]"

# Install pre-commit hooks (for contributors)
pre-commit install
```

### Option 3: Using Poetry

```bash
# Clone and install with Poetry
git clone https://github.com/figma/figma-variables-python
cd figma-variables-python
poetry install

# Install with optional dependencies
poetry install --extras "server"
poetry install --extras "all"

# Activate shell
poetry shell
```

## Configuration

### 1. Get Your Figma API Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Navigate to "Personal access tokens" section
3. Click "Create new token"
4. **Important**: Ensure your organization has the Variables API enabled
5. Select the required scopes:
   - `file_variables:read` - For reading variables
   - `file_variables:write` - For creating/modifying variables (requires Editor seat)
6. Copy the generated token

### 2. Set Environment Variable

#### Option A: Environment Variable (Recommended)

```bash
# On Windows (Command Prompt)
set FIGMA_TOKEN=your_figma_token_here

# On Windows (PowerShell)
$env:FIGMA_TOKEN="your_figma_token_here"

# On macOS/Linux
export FIGMA_TOKEN="your_figma_token_here"

# Add to your shell profile for persistence
echo 'export FIGMA_TOKEN="your_figma_token_here"' >> ~/.bashrc
# or
echo 'export FIGMA_TOKEN="your_figma_token_here"' >> ~/.zshrc
```

#### Option B: .env File

Create a `.env` file in your project root:

```env
FIGMA_TOKEN=your_figma_token_here
```

Load it in your Python code:

```python
import os
from dotenv import load_dotenv

load_dotenv()
api_token = os.getenv("FIGMA_TOKEN")
```

### 3. Get Your File Key

Extract the file key from your Figma file URL:

```
https://www.figma.com/file/ABC123DEF456/Your-File-Name
                           ^^^^^^^^^^^^
                           This is your file key
```

Or use the library to extract it automatically:

```python
from figma_variables.utils import extract_file_key_from_url

file_key = extract_file_key_from_url("https://www.figma.com/file/ABC123DEF456/Your-File-Name")
print(file_key)  # Output: ABC123DEF456
```

## Quick Start

### 1. Test Your Setup

Create a test script to verify everything works:

```python
# test_setup.py
import asyncio
import os
from figma_variables import FigmaVariablesSDK

async def test_connection():
    # Get token from environment
    api_token = os.getenv("FIGMA_TOKEN")
    if not api_token:
        print("❌ FIGMA_TOKEN environment variable not set")
        return
    
    # Replace with your file key
    file_key = "YOUR_FILE_KEY_HERE"
    
    try:
        async with FigmaVariablesSDK(api_token=api_token) as sdk:
            # Try to get variables (read operation)
            response = await sdk.get_local_variables(file_key)
            print(f"✅ Connection successful!")
            print(f"   Variables: {len(response.variables)}")
            print(f"   Collections: {len(response.variable_collections)}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        
        # Check common issues
        if "401" in str(e):
            print("   Check your API token")
        elif "403" in str(e):
            print("   Check your Enterprise organization and scopes")
        elif "404" in str(e):
            print("   Check your file key and file access")

if __name__ == "__main__":
    asyncio.run(test_connection())
```

Run the test:

```bash
python test_setup.py
```

### 2. Basic Usage Example

```python
# basic_example.py
import asyncio
import os
from figma_variables import FigmaVariablesSDK

async def main():
    async with FigmaVariablesSDK(api_token=os.getenv("FIGMA_TOKEN")) as sdk:
        file_key = "YOUR_FILE_KEY_HERE"
        
        # List all variables
        variables = await sdk.list_variables(file_key)
        print(f"Found {len(variables)} variables")
        
        # List collections
        collections = await sdk.list_variable_collections(file_key)
        print(f"Found {len(collections)} collections")
        
        # Search for variables
        color_vars = await sdk.search_variables(file_key, "color")
        print(f"Found {len(color_vars)} color-related variables")

if __name__ == "__main__":
    asyncio.run(main())
```

## Usage Options

### 1. SDK (Recommended)

High-level Python interface with automatic model conversion:

```python
from figma_variables import FigmaVariablesSDK

async with FigmaVariablesSDK(api_token="your_token") as sdk:
    variables = await sdk.list_variables("file_key")
    for var in variables:
        print(f"{var.name}: {var.resolvedType}")
```

### 2. Direct Client

Low-level HTTP client for more control:

```python
from figma_variables import FigmaVariablesClient

async with FigmaVariablesClient(api_token="your_token") as client:
    response = await client.get_local_variables("file_key")
    print(response)  # Raw JSON response
```

### 3. CLI Tool

Command-line interface for quick operations:

```bash
# List variables
figma-variables list-variables YOUR_FILE_KEY

# Create collection
figma-variables create-collection YOUR_FILE_KEY "New Collection"

# Start API server
figma-variables serve --port 8000
```

### 4. API Server

FastAPI server for HTTP API access:

```python
# Start server programmatically
import uvicorn
from figma_variables.server import app

uvicorn.run(app, host="0.0.0.0", port=8000)
```

Or use the CLI:

```bash
figma-variables serve --port 8000
```

## Development Setup

### 1. Development Environment

```bash
# Clone repository
git clone https://github.com/figma/figma-variables-python
cd figma-variables-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install
```

### 2. Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_variables --cov-report=html

# Run specific test file
pytest tests/test_sdk.py

# Run tests with verbose output
pytest -v

# Run async tests
pytest tests/test_client.py -v
```

### 3. Code Quality

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type checking
mypy src/figma_variables

# Run all quality checks
pre-commit run --all-files
```

### 4. Building Documentation

```bash
# Install docs dependencies
pip install ".[docs]"

# Serve documentation locally
mkdocs serve

# Build documentation
mkdocs build
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors (401)

```
AuthenticationError: Authentication failed. Check your API token.
```

**Solutions:**
- Verify your API token is correct
- Check that `FIGMA_TOKEN` environment variable is set
- Ensure token hasn't expired

#### 2. Authorization Errors (403)

```
AuthorizationError: Insufficient permissions. Enterprise organization and file_variables scope required.
```

**Solutions:**
- Confirm you're in a Figma Enterprise organization
- Check your token has `file_variables:read` and/or `file_variables:write` scopes
- Verify you have Editor seat for write operations

#### 3. File Not Found (404)

```
NotFoundError: Resource not found.
```

**Solutions:**
- Verify the file key is correct
- Check you have access to the file
- Ensure the file exists and isn't deleted

#### 4. Rate Limiting (429)

```
RateLimitError: Rate limit exceeded.
```

**Solutions:**
- The library automatically handles retries
- Reduce request frequency if needed
- Check rate limiter configuration

#### 5. Import Errors

```
ImportError: No module named 'figma_variables'
```

**Solutions:**
- Ensure the package is installed: `pip install figma-variables`
- Check virtual environment is activated
- Verify Python path is correct

### Environment Issues

#### Python Version

Check your Python version:

```bash
python --version  # Should be 3.9+
```

If you need to install a compatible Python version:

```bash
# Using pyenv (macOS/Linux)
pyenv install 3.11.0
pyenv local 3.11.0

# Using conda
conda create -n figma-vars python=3.11
conda activate figma-vars
```

#### Virtual Environment

Always use a virtual environment:

```bash
# Create virtual environment
python -m venv figma-env

# Activate (Windows)
figma-env\Scripts\activate

# Activate (macOS/Linux)
source figma-env/bin/activate

# Deactivate
deactivate
```

### Network Issues

#### Proxy Configuration

If behind a corporate proxy:

```python
from figma_variables import FigmaVariablesClient

async with FigmaVariablesClient(
    api_token="your_token",
    # Add proxy configuration
) as client:
    # Custom httpx client configuration might be needed
    pass
```

#### SSL Issues

For SSL certificate problems:

```python
import ssl
import httpx
from figma_variables import FigmaVariablesClient

# Custom SSL context if needed
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Use with custom httpx client
```

## Best Practices

### 1. Error Handling

Always handle exceptions properly:

```python
from figma_variables.errors import FigmaVariablesError, AuthenticationError

try:
    async with FigmaVariablesSDK(api_token="token") as sdk:
        variables = await sdk.list_variables("file_key")
except AuthenticationError:
    print("Check your API token")
except FigmaVariablesError as e:
    print(f"API error: {e.message}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### 2. Resource Management

Use async context managers:

```python
# Good ✅
async with FigmaVariablesSDK(api_token="token") as sdk:
    # SDK automatically closes connections
    pass

# Avoid ❌
sdk = FigmaVariablesSDK(api_token="token")
# Manual cleanup required
await sdk.close()
```

### 3. Rate Limiting

The library handles rate limiting automatically, but you can configure it:

```python
from figma_variables import FigmaVariablesClient

async with FigmaVariablesClient(
    api_token="token",
    rate_limit_tokens=30,    # Max requests per refill period
    rate_limit_refill=1.0,   # Tokens per second
    max_retries=5            # Max retry attempts
) as client:
    pass
```

### 4. Batch Operations

Use batch operations for efficiency:

```python
# Efficient ✅
variable_ids = ["id1", "id2", "id3"]
variables = await sdk.batch_get_variables(file_key, variable_ids)

# Inefficient ❌
variables = []
for var_id in variable_ids:
    var = await sdk.get_variable(file_key, var_id)
    variables.append(var)
```

## Next Steps

1. **Explore Examples**: Check [EXAMPLES.md](EXAMPLES.md) for comprehensive usage examples
2. **Read Documentation**: Visit the full documentation for detailed API reference
3. **Join Community**: Contribute to the project on GitHub
4. **Report Issues**: Use GitHub Issues for bug reports and feature requests

## Support

- **Documentation**: [https://figma-variables-python.readthedocs.io](https://figma-variables-python.readthedocs.io)
- **GitHub Issues**: [https://github.com/figma/figma-variables-python/issues](https://github.com/figma/figma-variables-python/issues)
- **Figma API Docs**: [https://www.figma.com/developers/api#variables](https://www.figma.com/developers/api#variables)
- **Figma Community**: [https://forum.figma.com](https://forum.figma.com)