# Figma Projects Python Library

A comprehensive Python library for integrating with the Figma Projects API, providing SDK, CLI, and server interfaces with production-ready features.

[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

## Features

- **🚀 High-level SDK** with async/await support
- **⚡ Low-level HTTP client** with rate limiting and retries
- **🖥️ CLI interface** with rich output formatting
- **🌐 FastAPI server** with OpenAPI documentation
- **🔐 Token validation** from multiple sources
- **📊 Rate limiting** with token bucket algorithm
- **🔄 Automatic retries** with exponential backoff
- **📈 Request statistics** and monitoring
- **🏗️ Batch operations** for efficiency
- **🔍 Search functionality** across projects and files
- **📤 Export capabilities** (JSON, CSV formats)
- **🧪 Comprehensive test suite** with 90%+ coverage

## Installation

### Using pip

```bash
pip install figma-projects
```

### Using Poetry

```bash
poetry add figma-projects
```

### From source

```bash
git clone https://github.com/figma/projects-python.git
cd projects-python
pip install -e .
```

## Quick Start

### SDK Usage

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def main():
    async with FigmaProjectsSDK("your-figma-token") as sdk:
        # Get all projects in a team
        team_projects = await sdk.get_team_projects("123456789")
        print(f"Found {len(team_projects.projects)} projects")
        
        # Get files in a project
        project_files = await sdk.get_project_files("987654321")
        print(f"Found {len(project_files.files)} files")
        
        # Search projects
        results = await sdk.search_projects("123456789", "Design System")
        print(f"Found {len(results)} matching projects")

if __name__ == "__main__":
    asyncio.run(main())
```

### CLI Usage

Set your API token:

```bash
export FIGMA_TOKEN="your-figma-token"
```

Basic commands:

```bash
# List projects in a team
figma-projects list-projects 123456789

# List files in a project  
figma-projects list-files 987654321

# Get project tree structure
figma-projects get-tree 123456789 --output tree.json

# Search projects
figma-projects search 123456789 "Design System"

# Get project statistics
figma-projects stats 987654321

# Export project structure
figma-projects export 123456789 --format csv --output projects.csv

# Health check
figma-projects health
```

### API Server

Start the server:

```bash
# Start with default settings
figma-projects serve

# Custom port and API key
figma-projects serve --port 3000 --api-key "your-token"

# With auto-reload for development
figma-projects serve --reload
```

The server provides a RESTful API with automatic OpenAPI documentation.

## API Server

### Starting the Server

```bash
# Start with default settings
figma-projects serve

# Custom port and API key  
figma-projects serve --port 3000 --api-key "your-token"

# With auto-reload for development
figma-projects serve --reload --port 8080
```

### Token Validation

The server validates tokens in priority order:

1. **X-Figma-Token header** (recommended)
2. **token query parameter**
3. **FIGMA_TOKEN environment variable**

### Example API Requests

```bash
# Using header (recommended)
curl -H "X-Figma-Token: your-token" http://localhost:8000/v1/teams/123/projects

# Using query parameter
curl "http://localhost:8000/v1/teams/123/projects?token=your-token"

# Health check (no auth required)
curl http://localhost:8000/health
```

### API Documentation

When the server is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc  
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### Available Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | ❌ |
| GET | `/v1/teams/{team_id}/projects` | Get team projects | ✅ |
| GET | `/v1/projects/{project_id}/files` | Get project files | ✅ |
| GET | `/v1/teams/{team_id}/projects/tree` | Get project tree | ✅ |
| GET | `/v1/teams/{team_id}/projects/search` | Search projects | ✅ |
| GET | `/v1/projects/{project_id}/files/recent` | Get recent files | ✅ |
| GET | `/v1/projects/{project_id}/statistics` | Get project stats | ✅ |
| GET | `/v1/teams/{team_id}/export` | Export structure | ✅ |
| POST | `/v1/projects/batch` | Batch operations | ✅ |

## Advanced Usage

### Custom Configuration

```python
from figma_projects import FigmaProjectsSDK

sdk = FigmaProjectsSDK(
    api_token="your-token",
    base_url="https://api.figma.com",
    requests_per_minute=120,  # Custom rate limit
    timeout=60.0,             # Request timeout
    max_retries=5,            # Retry attempts
)
```

### Batch Operations

```python
# Get multiple projects at once
project_ids = ["123", "456", "789"]
results = await sdk.batch_get_projects(project_ids)

for result in results:
    if result.success:
        print(f"Project {result.project_id}: {result.project.name}")
    else:
        print(f"Failed to get project {result.project_id}: {result.error}")
```

### Search and Filtering

```python
# Search projects by name
projects = await sdk.search_projects("123456789", "Design")

# Search files in a project  
file_results = await sdk.search_files_in_project("987654321", "component")

# Get recent files
recent_files = await sdk.get_recent_files("987654321", limit=10, days=7)
```

### Export and Statistics

```python
# Export project structure as JSON
json_data = await sdk.export_project_structure("123456789", format="json")

# Export as CSV
csv_data = await sdk.export_project_structure("123456789", format="csv")

# Get project statistics
stats = await sdk.get_project_statistics("987654321")
print(f"Total files: {stats.total_files}")
print(f"Recent files: {stats.recent_files}")
```

### Rate Limiting and Monitoring

```python
# Check rate limit status
rate_limit = sdk.get_rate_limit_info()
print(f"Remaining requests: {rate_limit.remaining}/{rate_limit.limit}")

# Get client statistics
stats = sdk.get_client_stats()
print(f"Requests made: {stats['requests_made']}")
print(f"Requests failed: {stats['requests_failed']}")
```

## CLI Reference

### Global Options

- `--help`: Show help message
- `--version`: Show version information

### Commands

#### `list-projects`

List all projects in a team.

```bash
figma-projects list-projects TEAM_ID [OPTIONS]
```

**Options:**
- `--format, -f`: Output format (`table`, `json`)
- `--output, -o`: Output file path

#### `list-files`

List all files in a project.

```bash
figma-projects list-files PROJECT_ID [OPTIONS]
```

**Options:**
- `--format, -f`: Output format (`table`, `json`)
- `--output, -o`: Output file path
- `--branch-data`: Include branch metadata

#### `get-tree`

Get hierarchical project and file structure.

```bash
figma-projects get-tree TEAM_ID [OPTIONS]
```

**Options:**
- `--format, -f`: Output format (`json`)
- `--output, -o`: Output file path

#### `search`

Search projects by name.

```bash
figma-projects search TEAM_ID QUERY [OPTIONS]
```

**Options:**
- `--format, -f`: Output format (`table`, `json`)

#### `stats`

Get project statistics.

```bash
figma-projects stats PROJECT_ID [OPTIONS]
```

**Options:**
- `--format, -f`: Output format (`table`, `json`)

#### `export`

Export project structure.

```bash
figma-projects export TEAM_ID [OPTIONS]
```

**Options:**
- `--format, -f`: Export format (`json`, `csv`)
- `--output, -o`: Output file path
- `--include-files/--no-files`: Include file data

#### `recent`

Get recently modified files.

```bash
figma-projects recent PROJECT_ID [OPTIONS]
```

**Options:**
- `--limit, -l`: Maximum number of files (default: 10)
- `--days, -d`: Days to consider recent (default: 30)
- `--format, -f`: Output format (`table`, `json`)

#### `serve`

Start the FastAPI server.

```bash
figma-projects serve [OPTIONS]
```

**Options:**
- `--port, -p`: Port to serve on (default: 8000)
- `--host, -h`: Host to serve on (default: 0.0.0.0)
- `--reload, -r`: Enable auto-reload for development
- `--api-key, -k`: Figma API key (sets FIGMA_TOKEN env var)

#### `health`

Check API connectivity and rate limits.

```bash
figma-projects health
```

## Authentication

### API Token

Get your Figma API token from [Figma Account Settings](https://www.figma.com/developers/api#access-tokens).

### Environment Variable

```bash
export FIGMA_TOKEN="your-figma-token-here"
```

### Programmatic Usage

```python
from figma_projects import FigmaProjectsSDK

sdk = FigmaProjectsSDK(api_token="your-token")
```

## Error Handling

The library provides comprehensive error handling:

```python
from figma_projects import (
    FigmaProjectsSDK,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError
)

try:
    async with FigmaProjectsSDK("invalid-token") as sdk:
        projects = await sdk.get_team_projects("123")
except AuthenticationError:
    print("Invalid API token")
except NotFoundError as e:
    print(f"Resource not found: {e.message}")
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry after {e.retry_after} seconds")
except ValidationError as e:
    print(f"Validation error: {e.message}")
```

## Development

### Setup

```bash
git clone https://github.com/figma/projects-python.git
cd projects-python
poetry install
```

### Testing

```bash
# Run tests
poetry run pytest

# Run tests with coverage
poetry run pytest --cov=figma_projects

# Run specific test file
poetry run pytest tests/test_sdk.py
```

### Code Quality

```bash
# Format code
poetry run black src tests

# Lint code
poetry run ruff check src tests

# Type checking
poetry run mypy src
```

### Building

```bash
# Build package
poetry build

# Install local build
pip install dist/*.whl
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure tests pass (`poetry run pytest`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 **Documentation**: [Full API Documentation](https://figma-projects.readthedocs.io)
- 🐛 **Issues**: [GitHub Issues](https://github.com/figma/projects-python/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/figma/projects-python/discussions)
- 📧 **Email**: support@figmaprojects.dev

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.