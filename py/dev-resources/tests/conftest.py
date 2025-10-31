"""Pytest fixtures for Figma Dev Resources SDK tests."""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock

from figma_dev_resources import FigmaDevResourcesSDK, FigmaDevResourcesClient
from figma_dev_resources.models import DevResource, DevResourceCreate, DevResourceUpdate


@pytest.fixture
def api_key():
    """Test API key."""
    return "test_api_key_123"


@pytest.fixture
def file_key():
    """Test file key."""
    return "test_file_key_123"


@pytest.fixture
def node_id():
    """Test node ID."""
    return "1:2"


@pytest.fixture
def dev_resource_data():
    """Sample dev resource data."""
    return {
        "id": "resource_123",
        "name": "Test Component Library",
        "url": "https://storybook.company.com",
        "file_key": "test_file_key_123",
        "node_id": "1:2"
    }


@pytest.fixture
def dev_resource(dev_resource_data):
    """Sample DevResource instance."""
    return DevResource(**dev_resource_data)


@pytest.fixture
def dev_resource_create():
    """Sample DevResourceCreate instance."""
    return DevResourceCreate(
        name="Test Component Library",
        url="https://storybook.company.com",
        file_key="test_file_key_123",
        node_id="1:2"
    )


@pytest.fixture
def dev_resource_update():
    """Sample DevResourceUpdate instance."""
    return DevResourceUpdate(
        id="resource_123",
        name="Updated Component Library",
        url="https://new-storybook.company.com"
    )


@pytest_asyncio.fixture
async def mock_client():
    """Mock HTTP client."""
    client = AsyncMock(spec=FigmaDevResourcesClient)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.close = AsyncMock()
    return client


@pytest_asyncio.fixture
async def sdk(api_key, mock_client):
    """SDK instance with mocked client."""
    sdk = FigmaDevResourcesSDK(api_key)
    sdk._client = mock_client
    return sdk


@pytest.fixture
def mock_httpx_response():
    """Mock httpx response."""
    response = MagicMock()
    response.is_success = True
    response.status_code = 200
    response.json.return_value = {"dev_resources": []}
    response.headers = {}
    return response