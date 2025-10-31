"""Pytest configuration and fixtures for Figma Projects tests."""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime
from typing import Dict, Any

from figma_projects import FigmaProjectsSDK, FigmaProjectsClient
from figma_projects.models import Project, ProjectFile, TeamProjectsResponse, ProjectFilesResponse


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def api_token():
    """Mock API token for testing."""
    return "test-token-123456789abcdef0123456789abcdef01234567"


@pytest.fixture
def team_id():
    """Mock team ID for testing."""
    return "123456789"


@pytest.fixture
def project_id():
    """Mock project ID for testing."""
    return "987654321"


@pytest.fixture
def file_key():
    """Mock file key for testing."""
    return "ABC123DEF456"


@pytest.fixture
def mock_project():
    """Mock project data."""
    return Project(
        id="123",
        name="Test Project"
    )


@pytest.fixture
def mock_project_file():
    """Mock project file data."""
    return ProjectFile(
        key="ABC123",
        name="Test File.fig",
        thumbnail_url="https://example.com/thumb.png",
        last_modified=datetime(2024, 1, 15, 10, 30, 0)
    )


@pytest.fixture
def mock_team_projects_response(mock_project):
    """Mock team projects response."""
    return TeamProjectsResponse(
        name="Test Team",
        projects=[mock_project]
    )


@pytest.fixture
def mock_project_files_response(mock_project_file):
    """Mock project files response."""
    return ProjectFilesResponse(
        name="Test Project",
        files=[mock_project_file]
    )


@pytest.fixture
def mock_http_response():
    """Mock HTTP response."""
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"name": "Test", "projects": []}
    return response


@pytest.fixture
async def mock_client(api_token):
    """Mock Figma Projects client."""
    client = AsyncMock(spec=FigmaProjectsClient)
    client.get = AsyncMock()
    client.post = AsyncMock()
    client.put = AsyncMock()
    client.delete = AsyncMock()
    client.close = AsyncMock()
    return client


@pytest.fixture
async def mock_sdk(api_token, mock_client):
    """Mock Figma Projects SDK."""
    sdk = AsyncMock(spec=FigmaProjectsSDK)
    sdk.client = mock_client
    sdk.close = AsyncMock()
    return sdk


@pytest.fixture
def sample_team_response():
    """Sample team projects API response."""
    return {
        "name": "Test Team",
        "projects": [
            {"id": "123", "name": "Project 1"},
            {"id": "456", "name": "Project 2"},
        ]
    }


@pytest.fixture
def sample_files_response():
    """Sample project files API response."""
    return {
        "name": "Test Project",
        "files": [
            {
                "key": "ABC123",
                "name": "Design File 1",
                "thumbnail_url": "https://example.com/thumb1.png",
                "last_modified": "2024-01-15T10:30:00Z"
            },
            {
                "key": "DEF456", 
                "name": "Design File 2",
                "thumbnail_url": "https://example.com/thumb2.png",
                "last_modified": "2024-01-10T15:45:00Z"
            }
        ]
    }


@pytest.fixture
def http_error_responses():
    """Common HTTP error responses for testing."""
    return {
        401: {"error": True, "message": "Authentication failed"},
        403: {"error": True, "message": "Forbidden"},
        404: {"error": True, "message": "Not found"},
        429: {"error": True, "message": "Too many requests"},
        500: {"error": True, "message": "Internal server error"},
    }


@pytest.fixture
def rate_limit_headers():
    """Sample rate limit headers."""
    return {
        "X-RateLimit-Limit": "60",
        "X-RateLimit-Remaining": "45",
        "X-RateLimit-Reset": "1640995200",
        "Retry-After": "60"
    }


class MockAsyncContextManager:
    """Mock async context manager for testing."""
    
    def __init__(self, return_value):
        self.return_value = return_value
    
    async def __aenter__(self):
        return self.return_value
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


@pytest.fixture
def mock_async_context_manager():
    """Factory for creating mock async context managers."""
    return MockAsyncContextManager


@pytest.fixture
def mock_rate_limiter():
    """Mock rate limiter for testing."""
    rate_limiter = AsyncMock()
    rate_limiter.acquire = AsyncMock()
    rate_limiter.get_wait_time.return_value = 0.0
    rate_limiter.tokens = 50
    rate_limiter.requests_per_minute = 60
    return rate_limiter


@pytest.fixture
def client_stats():
    """Sample client statistics."""
    return {
        "requests_made": 10,
        "requests_failed": 1,
        "rate_limit_hits": 0,
        "total_wait_time": 0.5,
    }


@pytest.fixture
def figma_urls():
    """Sample Figma URLs for testing."""
    return {
        "team": "https://www.figma.com/team/123456789/TeamName",
        "project": "https://www.figma.com/project/987654321/ProjectName", 
        "file": "https://www.figma.com/file/ABC123DEF456/FileName",
        "invalid": "https://example.com/not-figma"
    }


@pytest.fixture
def search_results():
    """Sample search results."""
    return [
        {
            "file": {
                "key": "ABC123",
                "name": "Search Result 1",
                "last_modified": "2024-01-15T10:30:00Z"
            },
            "project_id": "123",
            "project_name": "Test Project",
            "match_score": 1.0
        },
        {
            "file": {
                "key": "DEF456", 
                "name": "Search Result 2",
                "last_modified": "2024-01-10T15:45:00Z"
            },
            "project_id": "123",
            "project_name": "Test Project", 
            "match_score": 0.8
        }
    ]


@pytest.fixture
def export_data():
    """Sample export data."""
    return {
        "json": '{"team_name": "Test Team", "projects": []}',
        "csv": "project_id,project_name,file_count\n123,Test Project,2\n"
    }