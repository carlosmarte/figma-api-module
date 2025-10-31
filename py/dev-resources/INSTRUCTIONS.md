# Figma Dev Resources SDK - Setup and Installation Guide

This guide will help you install, configure, and get started with the Figma Dev Resources SDK.

## Prerequisites

- **Python 3.9 or higher**
- **Figma API Token** with dev resources permissions
- **pip** or **poetry** for package management

## Installation

### Option 1: Install from PyPI (Recommended)

```bash
pip install figma-dev-resources
```

### Option 2: Development Installation

```bash
# Clone the repository
git clone https://github.com/figma/dev-resources-sdk.git
cd dev-resources-sdk

# Install in development mode
pip install -e ".[dev]"
```

### Option 3: Using Poetry

```bash
# Add to your project
poetry add figma-dev-resources

# Or for development
poetry add --group dev figma-dev-resources
```

## Getting Your Figma API Token

1. **Go to Figma Account Settings**
   - Visit [https://www.figma.com/developers/api#access-tokens](https://www.figma.com/developers/api#access-tokens)
   - Sign in to your Figma account

2. **Generate a Personal Access Token**
   - Click "Create new token"
   - Give it a descriptive name (e.g., "Dev Resources SDK")
   - Copy the token immediately (you won't see it again)

3. **Verify Token Permissions**
   - Your token automatically has access to files you can access
   - For dev resources, you need access to files with Dev Mode enabled
   - Required scopes: `file_dev_resources:read`, `file_dev_resources:write`

## Configuration

### Environment Variables

Set your Figma token as an environment variable:

```bash
# Linux/macOS
export FIGMA_TOKEN="your_figma_token_here"

# Windows (Command Prompt)
set FIGMA_TOKEN=your_figma_token_here

# Windows (PowerShell)
$env:FIGMA_TOKEN="your_figma_token_here"
```

### Persistent Configuration

Add to your shell profile for persistence:

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
echo 'export FIGMA_TOKEN="your_figma_token_here"' >> ~/.bashrc
source ~/.bashrc
```

## Quick Start Verification

### 1. Test SDK Installation

```python
# test_installation.py
import asyncio
from figma_dev_resources import FigmaDevResourcesSDK

async def test_sdk():
    try:
        async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
            print("✅ SDK imported and initialized successfully")
            return True
    except Exception as e:
        print(f"❌ SDK initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_sdk())
    if success:
        print("SDK is ready to use!")
```

### 2. Test CLI Installation

```bash
# Test CLI is available
figma-dev-resources --help

# Test with your token
export FIGMA_TOKEN="your_token"
figma-dev-resources get --help
```

### 3. Test API Server

```bash
# Start the server
figma-dev-resources serve --port 8000

# In another terminal, test the health endpoint
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "service": "figma-dev-resources-api"}
```

## Finding Your File Key

You need Figma file keys to use the SDK. Here's how to get them:

### From Figma URL

File key is in the URL: `https://www.figma.com/file/{FILE_KEY}/title`

Example:
- URL: `https://www.figma.com/file/abc123xyz789/My-Design-System`
- File Key: `abc123xyz789`

### Using SDK Utility

```python
from figma_dev_resources.utils import extract_file_key_from_url

url = "https://www.figma.com/file/abc123xyz789/My-Design-System"
file_key = extract_file_key_from_url(url)
print(file_key)  # Output: abc123xyz789
```

## First API Call

### Test with a Real File

```python
# first_api_call.py
import asyncio
from figma_dev_resources import FigmaDevResourcesSDK

async def first_call():
    # Replace with your actual file key
    file_key = "abc123xyz789"  
    
    async with FigmaDevResourcesSDK(api_key="your_token") as sdk:
        try:
            resources = await sdk.get_dev_resources(file_key)
            print(f"✅ Found {len(resources)} dev resources")
            
            for resource in resources:
                print(f"  - {resource.name}: {resource.url}")
                
        except Exception as e:
            print(f"❌ API call failed: {e}")

asyncio.run(first_call())
```

### Test with CLI

```bash
# Replace abc123xyz789 with your file key
figma-dev-resources get abc123xyz789
```

## Development Setup

### Setting Up Development Environment

```bash
# Clone repository
git clone https://github.com/figma/dev-resources-sdk.git
cd dev-resources-sdk

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install development dependencies
pip install -e ".[dev]"

# Verify installation
pytest --version
mypy --version
ruff --version
```

### Pre-commit Hooks (Optional)

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Test hooks
pre-commit run --all-files
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=figma_dev_resources

# Run specific test
pytest tests/test_sdk.py::TestFigmaDevResourcesSDK::test_get_dev_resources
```

## Common Setup Issues

### Issue: "Module not found" Error

**Problem**: `ModuleNotFoundError: No module named 'figma_dev_resources'`

**Solution**:
```bash
# Verify installation
pip list | grep figma-dev-resources

# Reinstall if missing
pip install figma-dev-resources

# For development
pip install -e .
```

### Issue: "Invalid API Token" Error

**Problem**: `AuthenticationError: Invalid API token`

**Solutions**:
1. **Check token format**: Should be a long string starting with `figd_`
2. **Verify environment variable**:
   ```bash
   echo $FIGMA_TOKEN
   ```
3. **Generate new token** if old one expired
4. **Check token permissions** in Figma settings

### Issue: "File not found" Error

**Problem**: `NotFoundError: Resource not found`

**Solutions**:
1. **Verify file key**: Check URL format
2. **Check file access**: Ensure you have permission to view the file
3. **Use main file key**: Not a branch key
4. **Enable Dev Mode**: File must have Dev Mode enabled for dev resources

### Issue: Rate Limiting

**Problem**: `RateLimitError: Rate limit exceeded`

**Solutions**:
1. **Reduce request frequency**
2. **Use batch operations** for multiple resources
3. **Configure custom rate limits**:
   ```python
   sdk = FigmaDevResourcesSDK(
       api_key="token",
       rate_limit_requests=50,  # Lower limit
       rate_limit_window=60,    # Per minute
   )
   ```

### Issue: SSL/Network Errors

**Problem**: Network or SSL certificate errors

**Solutions**:
1. **Check internet connection**
2. **Corporate firewall**: May need proxy configuration
3. **Custom base URL** if using proxy:
   ```python
   sdk = FigmaDevResourcesSDK(
       api_key="token",
       base_url="https://your-proxy.com/figma-api"
   )
   ```

## IDE Setup

### VS Code Configuration

Create `.vscode/settings.json`:
```json
{
    "python.defaultInterpreterPath": "./venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.mypyEnabled": true,
    "python.linting.ruffEnabled": true,
    "python.formatting.provider": "black",
    "python.formatting.blackArgs": ["--line-length=100"],
    "python.sortImports.args": ["--profile", "black"]
}
```

### PyCharm Configuration

1. **Set Python interpreter**: File → Settings → Project → Python Interpreter
2. **Enable type checking**: Settings → Editor → Inspections → Python → Type checker
3. **Configure formatting**: Settings → Tools → External Tools (add Black, Ruff)

## Docker Setup (Optional)

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN pip install -e .

ENV FIGMA_TOKEN=""
EXPOSE 8000

CMD ["figma-dev-resources", "serve", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  figma-dev-resources:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FIGMA_TOKEN=${FIGMA_TOKEN}
    volumes:
      - ./data:/app/data
```

### Running with Docker

```bash
# Build image
docker build -t figma-dev-resources .

# Run container
docker run -e FIGMA_TOKEN="your_token" -p 8000:8000 figma-dev-resources

# Using docker-compose
docker-compose up
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -e ".[dev]"
        
    - name: Run tests
      run: |
        pytest --cov=figma_dev_resources
        
    - name: Type checking
      run: |
        mypy src
        
    - name: Linting
      run: |
        ruff check src tests
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

test:
  image: python:3.11
  stage: test
  script:
    - pip install -e ".[dev]"
    - pytest --cov=figma_dev_resources
    - mypy src
    - ruff check src tests
```

## Production Deployment

### Environment Configuration

```bash
# Production environment variables
export FIGMA_TOKEN="prod_token_here"
export API_HOST="0.0.0.0"
export API_PORT="8000"
export API_WORKERS="4"
```

### Systemd Service

```ini
# /etc/systemd/system/figma-dev-resources.service
[Unit]
Description=Figma Dev Resources API
After=network.target

[Service]
Type=exec
User=www-data
WorkingDirectory=/opt/figma-dev-resources
Environment=FIGMA_TOKEN=your_token_here
ExecStart=/opt/figma-dev-resources/venv/bin/figma-dev-resources serve --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/figma-dev-resources
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Next Steps

1. **Read the API documentation**: Check `README.md` for comprehensive API reference
2. **Explore examples**: See `EXAMPLES.md` for usage patterns
3. **Join the community**: GitHub discussions and issues
4. **Contribute**: See contributing guidelines in the repository

## Getting Help

- **Documentation**: Full API reference in README.md
- **Examples**: Comprehensive examples in EXAMPLES.md  
- **Issues**: GitHub issues for bugs and feature requests
- **Community**: Figma Developer Community
- **Support**: Email support@figma.com for urgent issues

## Security Notes

- **Never commit tokens**: Use environment variables or secure vaults
- **Rotate tokens regularly**: Generate new tokens periodically
- **Limit token scope**: Use tokens with minimal required permissions
- **Monitor usage**: Keep track of API usage and rate limits

You're now ready to start using the Figma Dev Resources SDK! 🚀