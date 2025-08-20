# Figma Components Library - Setup Instructions

This guide will help you get started with the Figma Components Python library.

## Prerequisites

- Python 3.9 or higher
- A Figma account with API access
- Figma Personal Access Token

## Installation

### Option 1: Install from PyPI (when published)

```bash
pip install figma-components
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/figma-components.git
cd figma-components

# Install in development mode
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"
```

### Option 3: Using Poetry

```bash
# Clone the repository
git clone https://github.com/yourusername/figma-components.git
cd figma-components

# Install with Poetry
poetry install

# Activate the virtual environment
poetry shell
```

## Getting Your Figma API Token

1. **Log in to Figma** at https://www.figma.com
2. **Go to Settings**: Click your profile picture → Settings
3. **Navigate to Tokens**: Account tab → Personal Access Tokens
4. **Generate Token**: Click "Create a new personal access token"
5. **Name Your Token**: Give it a descriptive name (e.g., "Components Library")
6. **Copy Token**: Save the token securely - you won't see it again!

## Environment Setup

### Set Environment Variable

The recommended way to provide your API token:

**Linux/macOS:**
```bash
export FIGMA_TOKEN="your-personal-access-token-here"
```

**Windows (Command Prompt):**
```cmd
set FIGMA_TOKEN=your-personal-access-token-here
```

**Windows (PowerShell):**
```powershell
$env:FIGMA_TOKEN="your-personal-access-token-here"
```

### Persistent Environment Variable

**Linux/macOS (.bashrc/.zshrc):**
```bash
echo 'export FIGMA_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc
```

**Windows (System Environment Variables):**
1. Search "Environment Variables" in Start Menu
2. Click "Environment Variables"
3. Under "User Variables", click "New"
4. Variable name: `FIGMA_TOKEN`
5. Variable value: `your-token-here`

## Verification

Test your installation and token:

```bash
# Quick test
figma-components --help

# Test with your token
figma-components components --team-id YOUR_TEAM_ID --limit 1
```

## Finding Your Team ID and File Keys

### Team ID
1. Go to your team in Figma
2. Look at the URL: `https://www.figma.com/team/123456789/Team-Name`
3. The team ID is `123456789`

### File Key
1. Open any Figma file
2. Look at the URL: `https://www.figma.com/file/abc123def456/File-Name`
3. The file key is `abc123def456`

## Quick Start Guide

### 1. CLI Quick Start

```bash
# List components from a team
figma-components components --team-id YOUR_TEAM_ID

# List components from a file
figma-components components --file-key YOUR_FILE_KEY

# Search for components
figma-components components --team-id YOUR_TEAM_ID --search "button"

# Get all assets and save to file
figma-components all YOUR_TEAM_ID --output assets.json
```

### 2. SDK Quick Start

Create a file `test_sdk.py`:

```python
import asyncio
from figma_components import FigmaComponentsSDK

async def main():
    # Replace with your team ID
    team_id = "YOUR_TEAM_ID"
    
    async with FigmaComponentsSDK() as sdk:  # Uses FIGMA_TOKEN env var
        # Get components
        components = await sdk.list_team_components(team_id)
        print(f"Found {len(components)} components")
        
        # Get component sets
        component_sets = await sdk.list_team_component_sets(team_id)
        print(f"Found {len(component_sets)} component sets")
        
        # Get styles
        styles = await sdk.list_team_styles(team_id)
        print(f"Found {len(styles)} styles")

if __name__ == "__main__":
    asyncio.run(main())
```

Run it:
```bash
python test_sdk.py
```

### 3. Server Quick Start

```bash
# Start the API server
figma-components serve

# Server will be available at:
# - http://localhost:8000/docs (API documentation)
# - http://localhost:8000/health (health check)
```

Test the server:
```bash
# Health check (no auth required)
curl http://localhost:8000/health

# Get components (requires auth)
curl -H "X-Figma-Token: your-token" \
     http://localhost:8000/v1/teams/YOUR_TEAM_ID/components
```

## Common Issues and Solutions

### 1. "Invalid API key format"
**Problem:** Token validation failed
**Solution:** 
- Ensure your token is properly formatted (should be 40+ characters with hyphens)
- Copy the token exactly as shown in Figma (no extra spaces)

### 2. "401 Unauthorized"
**Problem:** Authentication failed
**Solutions:**
- Check that your token is valid
- Ensure the token has required scopes
- Try regenerating your token in Figma

### 3. "403 Forbidden"
**Problem:** Insufficient permissions
**Solutions:**
- Check that you have access to the team/file
- Ensure you have the required library scopes
- Contact your team admin if you need access

### 4. "404 Not Found"
**Problem:** Team/file/component not found
**Solutions:**
- Verify the team ID or file key is correct
- Check that the resource exists and is published
- Ensure you have access to the resource

### 5. ModuleNotFoundError
**Problem:** Package not installed properly
**Solutions:**
```bash
# Reinstall the package
pip uninstall figma-components
pip install figma-components

# Or install from source
pip install -e .
```

### 6. "Rate limit exceeded"
**Problem:** Too many API requests
**Solution:** The library handles this automatically with retries, but you can:
- Reduce the frequency of requests
- Use pagination with smaller page sizes
- Wait for the rate limit to reset

## Required Scopes

Your Figma token needs these scopes for different operations:

- **Team endpoints**: `team_library_content:read`, `files:read`
- **File endpoints**: `library_content:read`, `files:read`
- **Individual assets**: `library_assets:read`, `files:read`

When creating your Personal Access Token, ensure it has file read access.

## Development Setup

If you want to contribute or modify the library:

```bash
# Clone and install for development
git clone https://github.com/yourusername/figma-components.git
cd figma-components

# Install with development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Check code quality
ruff check .
mypy src/figma_components

# Format code
ruff format .
```

## Configuration Options

### Client Configuration

```python
from figma_components import FigmaComponentsSDK

# Custom configuration
sdk = FigmaComponentsSDK(
    api_key="your-token",
    timeout=60.0,           # Request timeout in seconds
    max_retries=5,          # Maximum retry attempts
    rate_limit_requests=200, # Requests per time window
    rate_limit_window=60,   # Time window in seconds
)
```

### Server Configuration

```bash
# Custom server settings
figma-components serve \
    --port 3000 \
    --host 127.0.0.1 \
    --reload \
    --api-key "your-token"
```

## Next Steps

1. **Read the Examples**: Check `EXAMPLES.md` for comprehensive usage examples
2. **API Documentation**: When running the server, visit `/docs` for interactive API docs
3. **Error Handling**: Review error handling patterns in the examples
4. **Integration**: Look at integration examples for design system workflows

## Getting Help

1. **Check the Examples**: Most common use cases are covered in `EXAMPLES.md`
2. **Review Error Messages**: The library provides detailed error messages
3. **API Documentation**: Visit the server's `/docs` endpoint for interactive API docs
4. **GitHub Issues**: Report bugs or request features

## Security Notes

- **Never commit your API token** to version control
- **Use environment variables** for tokens in production
- **Rotate tokens regularly** as a security best practice
- **Limit token scope** to only what you need

## Performance Tips

1. **Use async/await**: All operations are async for better performance
2. **Batch operations**: Use `batch_get_components()` for multiple components
3. **Pagination**: Use pagination for large datasets
4. **Rate limiting**: The library handles this automatically
5. **Connection pooling**: Reuse SDK/client instances when possible

You're now ready to start using the Figma Components library! 🎉