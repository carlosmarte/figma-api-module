"""
Pytest configuration and fixtures for Figma Library Analytics tests.
"""

import asyncio
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from figma_library_analytics import FigmaAnalyticsClient, FigmaAnalyticsSDK
from figma_library_analytics.models import (
    AnalyticsResponse,
    GroupBy,
    LibraryAnalyticsComponentActionsByAsset,
    LibraryAnalyticsComponentActionsByTeam,
)
from figma_library_analytics.server import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def api_key():
    """Test API key."""
    return "test_api_key_12345"


@pytest.fixture
def file_key():
    """Test file key."""
    return "ABC123XYZ456"


@pytest.fixture
def figma_url():
    """Test Figma URL."""
    return "https://www.figma.com/file/ABC123XYZ456/Test-Library"


@pytest.fixture
def sample_component_action_asset():
    """Sample component action data grouped by asset."""
    return {
        "week": "2023-12-13",
        "component_key": "comp_123",
        "component_name": "Button",
        "component_set_key": "set_456",
        "component_set_name": "Button Set",
        "detachments": 5,
        "insertions": 10,
    }


@pytest.fixture
def sample_component_action_team():
    """Sample component action data grouped by team."""
    return {
        "week": "2023-12-13",
        "team_name": "Design Team",
        "workspace_name": "Company Workspace",
        "detachments": 3,
        "insertions": 8,
    }


@pytest.fixture
def sample_analytics_response():
    """Sample analytics response."""
    return {
        "rows": [
            {
                "week": "2023-12-13",
                "component_key": "comp_123",
                "component_name": "Button",
                "component_set_key": "set_456",
                "component_set_name": "Button Set",
                "detachments": 5,
                "insertions": 10,
            }
        ],
        "next_page": False,
        "cursor": None,
    }


@pytest.fixture
def mock_httpx_response():
    """Mock httpx response."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "rows": [
            {
                "week": "2023-12-13",
                "component_key": "comp_123",
                "component_name": "Button",
                "detachments": 5,
                "insertions": 10,
            }
        ],
        "next_page": False,
    }
    mock_response.raise_for_status.return_value = None
    return mock_response


@pytest.fixture
def mock_client(api_key):
    """Mock Figma Analytics client."""
    client = AsyncMock(spec=FigmaAnalyticsClient)
    client.api_key = api_key
    client.base_url = "https://api.figma.com"
    return client


@pytest.fixture
def mock_sdk(api_key, mock_client):
    """Mock Figma Analytics SDK."""
    sdk = AsyncMock(spec=FigmaAnalyticsSDK)
    sdk.client = mock_client
    return sdk


@pytest.fixture
def test_client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers(api_key):
    """Authentication headers for API requests."""
    return {"X-Figma-Token": api_key}


# Date fixtures
@pytest.fixture
def start_date():
    """Test start date."""
    return date(2023, 12, 1)


@pytest.fixture
def end_date():
    """Test end date."""
    return date(2023, 12, 31)


# Async test helpers
@pytest.fixture
async def async_client(api_key):
    """Real async client for integration tests."""
    async with FigmaAnalyticsClient(api_key) as client:
        yield client


@pytest.fixture
async def async_sdk(api_key):
    """Real async SDK for integration tests."""
    async with FigmaAnalyticsSDK(api_key) as sdk:
        yield sdk