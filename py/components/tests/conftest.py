"""Pytest configuration and fixtures."""

import pytest
import asyncio
from typing import AsyncGenerator, Dict, Any
from unittest.mock import AsyncMock, Mock

from figma_components import FigmaComponentsClient, FigmaComponentsSDK
from figma_components.models import PublishedComponent, PublishedComponentSet, PublishedStyle, User, StyleType


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_api_key() -> str:
    """Mock API key for testing."""
    return "figd_test-token-1234567890-abcdefghijklmnopqrstuvwxyz"


@pytest.fixture
def sample_user() -> Dict[str, Any]:
    """Sample user data."""
    return {
        "id": "123456789",
        "handle": "test_user",
        "img_url": "https://example.com/avatar.jpg"
    }


@pytest.fixture
def sample_component(sample_user: Dict[str, Any]) -> Dict[str, Any]:
    """Sample component data."""
    return {
        "key": "abc123def456",
        "file_key": "file123",
        "node_id": "1:2",
        "thumbnail_url": "https://example.com/thumbnail.jpg",
        "name": "Button Component",
        "description": "A reusable button component",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
        "user": sample_user,
        "containing_frame": {
            "node_id": "1:1",
            "name": "Components Frame",
            "background_color": "#FFFFFF",
            "page_id": "0:1",
            "page_name": "Page 1",
            "containing_component_set": None
        }
    }


@pytest.fixture
def sample_component_set(sample_user: Dict[str, Any]) -> Dict[str, Any]:
    """Sample component set data."""
    return {
        "key": "xyz789uvw012",
        "file_key": "file123",
        "node_id": "1:3",
        "thumbnail_url": "https://example.com/thumbnail2.jpg",
        "name": "Button Variants",
        "description": "Button component with variants",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
        "user": sample_user,
        "containing_frame": {
            "node_id": "1:1",
            "name": "Components Frame",
            "background_color": "#FFFFFF",
            "page_id": "0:1",
            "page_name": "Page 1",
            "containing_component_set": None
        }
    }


@pytest.fixture
def sample_style(sample_user: Dict[str, Any]) -> Dict[str, Any]:
    """Sample style data."""
    return {
        "key": "style123abc",
        "file_key": "file123",
        "node_id": "1:4",
        "style_type": "FILL",
        "thumbnail_url": "https://example.com/style.jpg",
        "name": "Primary Color",
        "description": "Primary brand color",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
        "user": sample_user,
        "sort_position": "1"
    }


@pytest.fixture
def mock_components_response(sample_component: Dict[str, Any]) -> Dict[str, Any]:
    """Mock API response for components."""
    return {
        "status": 200,
        "error": False,
        "meta": {
            "components": [sample_component],
            "cursor": {
                "before": None,
                "after": None
            }
        }
    }


@pytest.fixture
def mock_component_sets_response(sample_component_set: Dict[str, Any]) -> Dict[str, Any]:
    """Mock API response for component sets."""
    return {
        "status": 200,
        "error": False,
        "meta": {
            "component_sets": [sample_component_set],
            "cursor": {
                "before": None,
                "after": None
            }
        }
    }


@pytest.fixture
def mock_styles_response(sample_style: Dict[str, Any]) -> Dict[str, Any]:
    """Mock API response for styles."""
    return {
        "status": 200,
        "error": False,
        "meta": {
            "styles": [sample_style],
            "cursor": {
                "before": None,
                "after": None
            }
        }
    }


@pytest.fixture
def mock_single_component_response(sample_component: Dict[str, Any]) -> Dict[str, Any]:
    """Mock API response for single component."""
    return {
        "status": 200,
        "error": False,
        "meta": sample_component
    }


@pytest.fixture
async def mock_client(mock_api_key: str) -> AsyncGenerator[FigmaComponentsClient, None]:
    """Mock client with mocked HTTP methods."""
    client = FigmaComponentsClient(mock_api_key)
    
    # Mock the HTTP methods
    client.get = AsyncMock()
    client.post = AsyncMock()
    client.put = AsyncMock()
    client.delete = AsyncMock()
    client.paginate = AsyncMock()
    
    # Mock start/close
    client.start = AsyncMock()
    client.close = AsyncMock()
    client._started = True
    
    yield client


@pytest.fixture
async def mock_sdk(mock_api_key: str) -> AsyncGenerator[FigmaComponentsSDK, None]:
    """Mock SDK with mocked client."""
    sdk = FigmaComponentsSDK(mock_api_key)
    
    # Mock the underlying client
    sdk.client = Mock()
    sdk.client.get = AsyncMock()
    sdk.client.post = AsyncMock()
    sdk.client.put = AsyncMock()
    sdk.client.delete = AsyncMock()
    sdk.client.paginate = AsyncMock()
    sdk.client.start = AsyncMock()
    sdk.client.close = AsyncMock()
    
    # Mock SDK methods
    sdk._started = True
    
    yield sdk


@pytest.fixture
def mock_httpx_response():
    """Mock httpx response."""
    response = Mock()
    response.status_code = 200
    response.headers = {}
    response.json.return_value = {"status": 200, "error": False}
    response.text = ""
    response.raise_for_status = Mock()
    return response


# Test client for FastAPI
@pytest.fixture
def test_client():
    """Test client for FastAPI server."""
    from fastapi.testclient import TestClient
    from figma_components.server import app
    
    return TestClient(app)