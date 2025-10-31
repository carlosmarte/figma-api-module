"""
Pytest configuration and fixtures for Figma Variables tests.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any

from figma_variables.client import FigmaVariablesClient
from figma_variables.sdk import FigmaVariablesSDK


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_api_token():
    """Mock API token for testing."""
    return "figd_test_token_12345"


@pytest.fixture
def sample_file_key():
    """Sample file key for testing."""
    return "ABC123DEF456"


@pytest.fixture
def sample_variable_data():
    """Sample variable data for testing."""
    return {
        "id": "variable_123",
        "name": "Primary Color",
        "key": "primary-color",
        "variableCollectionId": "collection_456",
        "resolvedType": "COLOR",
        "valuesByMode": {
            "mode_789": {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}
        },
        "remote": False,
        "description": "Primary brand color",
        "hiddenFromPublishing": False,
        "scopes": ["ALL_FILLS"],
        "codeSyntax": {},
        "deletedButReferenced": False
    }


@pytest.fixture
def sample_collection_data():
    """Sample variable collection data for testing."""
    return {
        "id": "collection_456",
        "name": "Brand Colors",
        "key": "brand-colors",
        "modes": [
            {"modeId": "mode_789", "name": "Light"},
            {"modeId": "mode_101", "name": "Dark"}
        ],
        "defaultModeId": "mode_789",
        "remote": False,
        "hiddenFromPublishing": False,
        "variableIds": ["variable_123", "variable_124"]
    }


@pytest.fixture
def sample_local_variables_response(sample_variable_data, sample_collection_data):
    """Sample local variables API response."""
    return {
        "status": 200,
        "error": False,
        "meta": {
            "variables": {
                "variable_123": sample_variable_data
            },
            "variableCollections": {
                "collection_456": sample_collection_data
            }
        }
    }


@pytest.fixture
def sample_published_variable_data():
    """Sample published variable data for testing."""
    return {
        "id": "variable_123",
        "subscribed_id": "sub_variable_123_v2",
        "name": "Primary Color",
        "key": "primary-color",
        "variableCollectionId": "collection_456",
        "resolvedDataType": "COLOR",
        "updatedAt": "2023-12-01T10:00:00Z"
    }


@pytest.fixture
def sample_published_collection_data():
    """Sample published variable collection data for testing."""
    return {
        "id": "collection_456",
        "subscribed_id": "sub_collection_456_v3",
        "name": "Brand Colors",
        "key": "brand-colors",
        "updatedAt": "2023-12-01T10:00:00Z"
    }


@pytest.fixture
def sample_published_variables_response(sample_published_variable_data, sample_published_collection_data):
    """Sample published variables API response."""
    return {
        "status": 200,
        "error": False,
        "meta": {
            "variables": {
                "variable_123": sample_published_variable_data
            },
            "variableCollections": {
                "collection_456": sample_published_collection_data
            }
        }
    }


@pytest.fixture
def sample_modify_response():
    """Sample variables modification response."""
    return {
        "status": 200,
        "error": False,
        "meta": {
            "tempIdToRealId": {
                "temp_var_1": "real_var_123",
                "temp_coll_1": "real_coll_456"
            }
        }
    }


@pytest.fixture
def mock_client(mock_api_token):
    """Mock Figma Variables client."""
    client = MagicMock(spec=FigmaVariablesClient)
    client.api_token = mock_api_token
    
    # Mock async context manager
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.close = AsyncMock()
    
    # Mock API methods
    client.get_local_variables = AsyncMock()
    client.get_published_variables = AsyncMock()
    client.modify_variables = AsyncMock()
    
    return client


@pytest.fixture
def mock_sdk(mock_api_token, mock_client):
    """Mock Figma Variables SDK."""
    sdk = MagicMock(spec=FigmaVariablesSDK)
    sdk.client = mock_client
    
    # Mock async context manager
    sdk.__aenter__ = AsyncMock(return_value=sdk)
    sdk.__aexit__ = AsyncMock(return_value=None)
    sdk.close = AsyncMock()
    
    # Mock SDK methods
    sdk.get_local_variables = AsyncMock()
    sdk.get_published_variables = AsyncMock()
    sdk.modify_variables = AsyncMock()
    sdk.get_variable = AsyncMock()
    sdk.get_variable_collection = AsyncMock()
    sdk.list_variables = AsyncMock()
    sdk.list_variable_collections = AsyncMock()
    sdk.search_variables = AsyncMock()
    sdk.create_variable_collection = AsyncMock()
    sdk.create_variable = AsyncMock()
    sdk.update_variable = AsyncMock()
    sdk.delete_variable = AsyncMock()
    sdk.set_variable_value = AsyncMock()
    sdk.batch_get_variables = AsyncMock()
    sdk.batch_create_variables = AsyncMock()
    
    return sdk


@pytest.fixture
def http_responses():
    """Common HTTP response data for testing."""
    return {
        "success": {"status_code": 200, "json": {"status": 200, "error": False}},
        "unauthorized": {"status_code": 401, "json": {"error": True, "message": "Unauthorized"}},
        "forbidden": {"status_code": 403, "json": {"error": True, "message": "Forbidden"}},
        "not_found": {"status_code": 404, "json": {"error": True, "message": "Not found"}},
        "rate_limited": {"status_code": 429, "json": {"error": True, "message": "Rate limited"}},
        "server_error": {"status_code": 500, "json": {"error": True, "message": "Server error"}},
    }


@pytest.fixture
def test_variables_request():
    """Sample variables request for testing."""
    return {
        "variableCollections": [
            {
                "action": "CREATE",
                "id": "temp_collection_1",
                "name": "Test Collection",
                "hiddenFromPublishing": False
            }
        ],
        "variables": [
            {
                "action": "CREATE",
                "id": "temp_variable_1",
                "name": "Test Variable",
                "variableCollectionId": "temp_collection_1",
                "resolvedType": "COLOR",
                "description": "Test color variable"
            }
        ],
        "variableModeValues": [
            {
                "variableId": "temp_variable_1",
                "modeId": "mode_123",
                "value": {"r": 1.0, "g": 0.0, "b": 0.0, "a": 1.0}
            }
        ]
    }