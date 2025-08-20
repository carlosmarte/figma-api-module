# Figma Projects Python Library - Setup Instructions

This guide will help you set up and use the Figma Projects Python library in your environment.

## Prerequisites

- Python 3.9 or higher
- A Figma account with API access
- A Figma Personal Access Token

## Installation

### Option 1: Using pip (Recommended)

```bash
pip install figma-projects
```

### Option 2: Using Poetry

```bash
poetry add figma-projects
```

### Option 3: From Source

```bash
git clone https://github.com/figma/projects-python.git
cd projects-python
pip install -e .
```

## Getting Your Figma API Token

1. Go to [Figma Account Settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Create new personal access token"
3. Give it a descriptive name (e.g., "Python Projects Library")
4. Copy the generated token (you won't be able to see it again)
5. Store it securely

## Configuration

### Method 1: Environment Variable (Recommended)

Set the environment variable in your shell:

```bash
# Linux/macOS
export FIGMA_TOKEN="your-figma-token-here"

# Windows (Command Prompt)
set FIGMA_TOKEN=your-figma-token-here

# Windows (PowerShell)
$env:FIGMA_TOKEN="your-figma-token-here"
```

To make it permanent, add it to your shell profile:

```bash
# Linux/macOS - add to ~/.bashrc, ~/.zshrc, or ~/.profile
echo 'export FIGMA_TOKEN="your-figma-token-here"' >> ~/.bashrc
source ~/.bashrc
```

### Method 2: Python Code

```python
from figma_projects import FigmaProjectsSDK

sdk = FigmaProjectsSDK(api_token="your-figma-token-here")
```

### Method 3: Configuration File

Create a `.env` file in your project directory:

```env
FIGMA_TOKEN=your-figma-token-here
```

Then load it in your Python code:

```python
import os
from dotenv import load_dotenv
from figma_projects import FigmaProjectsSDK

load_dotenv()
sdk = FigmaProjectsSDK(api_token=os.getenv("FIGMA_TOKEN"))
```

## Quick Start

### 1. Verify Installation

```bash
# Check if the CLI is installed
figma-projects --help

# Check API connectivity
figma-projects health
```

### 2. Basic CLI Usage

```bash
# List projects in a team (you'll need a team ID)
figma-projects list-projects YOUR_TEAM_ID

# List files in a project (you'll need a project ID)
figma-projects list-files YOUR_PROJECT_ID
```

### 3. Basic Python Usage

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def main():
    async with FigmaProjectsSDK() as sdk:  # Uses FIGMA_TOKEN env var
        # Get team projects
        projects = await sdk.get_team_projects("YOUR_TEAM_ID")
        print(f"Found {len(projects.projects)} projects")

asyncio.run(main())
```

## Finding Your Team and Project IDs

### Method 1: From Figma URLs

#### Team ID
From a team URL like `https://www.figma.com/team/123456789/TeamName`:
- Team ID: `123456789`

#### Project ID  
From a project URL like `https://www.figma.com/project/987654321/ProjectName`:
- Project ID: `987654321`

### Method 2: Using the Library

```python
import asyncio
from figma_projects import FigmaProjectsSDK
from figma_projects.utils import extract_team_id_from_url, extract_project_id_from_url

# Extract from URLs
team_url = "https://www.figma.com/team/123456789/TeamName"
team_id = extract_team_id_from_url(team_url)
print(f"Team ID: {team_id}")

project_url = "https://www.figma.com/project/987654321/ProjectName"
project_id = extract_project_id_from_url(project_url)
print(f"Project ID: {project_id}")
```

### Method 3: Browsing in Figma

1. Open Figma in your browser
2. Navigate to your team page
3. Look at the URL in the address bar
4. The team ID is the number after `/team/`

## Development Setup

If you want to contribute or modify the library:

### 1. Clone the Repository

```bash
git clone https://github.com/figma/projects-python.git
cd projects-python
```

### 2. Install Poetry (if not already installed)

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### 3. Install Dependencies

```bash
poetry install
```

### 4. Run Tests

```bash
poetry run pytest
```

### 5. Activate Virtual Environment

```bash
poetry shell
```

## Server Setup

### 1. Start the Server

```bash
# Using the CLI
figma-projects serve

# With custom settings
figma-projects serve --port 3000 --host 127.0.0.1

# With API key
figma-projects serve --api-key "your-token"
```

### 2. Access the API Documentation

Once the server is running:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

### 3. Test the API

```bash
# Health check (no authentication)
curl http://localhost:8000/health

# Get team projects (with authentication)
curl -H "X-Figma-Token: your-token" http://localhost:8000/v1/teams/123456789/projects
```

## Docker Setup (Optional)

### 1. Create Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["figma-projects", "serve", "--host", "0.0.0.0"]
```

### 2. Build and Run

```bash
# Build image
docker build -t figma-projects .

# Run container
docker run -p 8000:8000 -e FIGMA_TOKEN="your-token" figma-projects
```

## Troubleshooting

### Common Issues

#### 1. Authentication Error

```
Error: Authentication failed
```

**Solution:**
- Verify your API token is correct
- Check that the token is properly set in environment variables
- Ensure the token has the necessary scopes

#### 2. Team/Project Not Found

```
Error: Team with ID 'xxx' not found
```

**Solution:**
- Verify the team/project ID is correct
- Ensure you have access to the team/project
- Check that the ID format is valid (numbers only for projects)

#### 3. Rate Limit Exceeded

```
Error: Rate limit exceeded. Retry after 60 seconds
```

**Solution:**
- Wait for the specified time before retrying
- Implement proper rate limiting in your code
- Consider using batch operations for efficiency

#### 4. Import Error

```
ModuleNotFoundError: No module named 'figma_projects'
```

**Solution:**
- Ensure the package is installed: `pip install figma-projects`
- Check your Python environment
- Verify virtual environment activation

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

from figma_projects import FigmaProjectsSDK
# Your code here
```

### Getting Help

1. Check the [documentation](https://figma-projects.readthedocs.io)
2. Search [existing issues](https://github.com/figma/projects-python/issues)
3. Create a [new issue](https://github.com/figma/projects-python/issues/new) if needed
4. Join the [discussions](https://github.com/figma/projects-python/discussions)

## Best Practices

### 1. Token Security

- Never commit API tokens to version control
- Use environment variables or secure vaults
- Rotate tokens regularly
- Use least-privilege access

### 2. Rate Limiting

- Respect API rate limits (60 requests/minute by default)
- Implement exponential backoff for retries
- Use batch operations when possible
- Monitor your usage

### 3. Error Handling

```python
from figma_projects import FigmaProjectsSDK, FigmaProjectsError

async def robust_example():
    try:
        async with FigmaProjectsSDK() as sdk:
            projects = await sdk.get_team_projects("123456789")
    except FigmaProjectsError as e:
        # Handle specific library errors
        print(f"API Error: {e.message}")
        print(f"Context: {e.context}")
    except Exception as e:
        # Handle unexpected errors
        print(f"Unexpected error: {e}")
```

### 4. Async Best Practices

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def efficient_batch_processing():
    async with FigmaProjectsSDK() as sdk:
        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(5)
        
        async def process_project(project_id):
            async with semaphore:
                return await sdk.get_project_files(project_id)
        
        # Process multiple projects concurrently
        project_ids = ["123", "456", "789"]
        tasks = [process_project(pid) for pid in project_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
```

## Next Steps

1. Read the [full documentation](README.md)
2. Explore the [examples](EXAMPLES.md)
3. Try the [CLI commands](#basic-cli-usage)
4. Start the [API server](#server-setup)
5. Build your first integration!

## Support

- 📖 Documentation: [README.md](README.md)
- 🚀 Examples: [EXAMPLES.md](EXAMPLES.md)
- 🐛 Issues: [GitHub Issues](https://github.com/figma/projects-python/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/figma/projects-python/discussions)