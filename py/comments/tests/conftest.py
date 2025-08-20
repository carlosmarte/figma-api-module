"""Pytest configuration and fixtures for Figma Comments tests."""

import asyncio
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, Mock
from typing import Dict, Any, List

from figma_comments.core.client import FigmaCommentsClient
from figma_comments.core.service import FigmaCommentsService
from figma_comments.interfaces.sdk import FigmaCommentsSDK
from figma_comments.core.models import (
    Comment,
    User,
    Vector,
    CommentReaction,
    Emoji,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_api_token():
    """Mock API token for testing."""
    return "figd_test_token_12345"


@pytest.fixture
def sample_user():
    """Sample user data for testing."""
    return User(
        id="user123",
        handle="testuser",
        img_url="https://example.com/avatar.jpg",
        email="test@example.com",
    )


@pytest.fixture
def sample_comment(sample_user):
    """Sample comment data for testing."""
    return Comment(
        id="comment123",
        message="This is a test comment",
        user=sample_user,
        created_at=datetime(2024, 1, 15, 10, 30, 0),
        updated_at=None,
        resolved_at=None,
        file_key="test_file_key",
        parent_id=None,
        order_id="order123",
        client_meta=Vector(x=100.0, y=200.0),
        reactions=[
            CommentReaction(
                emoji=Emoji.THUMBS_UP,
                user=sample_user,
                created_at=datetime(2024, 1, 15, 11, 0, 0),
            )
        ],
    )


@pytest.fixture
def sample_reply_comment(sample_user):
    """Sample reply comment for testing."""
    return Comment(
        id="reply123",
        message="This is a reply",
        user=sample_user,
        created_at=datetime(2024, 1, 15, 11, 30, 0),
        updated_at=None,
        resolved_at=None,
        file_key="test_file_key",
        parent_id="comment123",
        order_id="order124",
        client_meta=None,
        reactions=[],
    )


@pytest.fixture
def sample_comments_response():
    """Sample API response for getting comments."""
    return {
        "comments": [
            {
                "id": "comment123",
                "message": "This is a test comment",
                "user": {
                    "id": "user123",
                    "handle": "testuser",
                    "img_url": "https://example.com/avatar.jpg",
                    "email": "test@example.com",
                },
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": None,
                "resolved_at": None,
                "parent_id": None,
                "order_id": "order123",
                "client_meta": {
                    "x": 100.0,
                    "y": 200.0,
                },
                "reactions": [
                    {
                        "emoji": "👍",
                        "user": {
                            "id": "user123",
                            "handle": "testuser",
                            "img_url": "https://example.com/avatar.jpg",
                            "email": "test@example.com",
                        },
                        "created_at": "2024-01-15T11:00:00Z",
                    }
                ],
            }
        ]
    }


@pytest.fixture
def sample_create_comment_response():
    """Sample API response for creating a comment."""
    return {
        "id": "new_comment123",
        "message": "New test comment",
        "user": {
            "id": "user123",
            "handle": "testuser",
            "img_url": "https://example.com/avatar.jpg",
            "email": "test@example.com",
        },
        "created_at": "2024-01-15T12:00:00Z",
        "file_key": "test_file_key",
        "parent_id": None,
        "client_meta": {
            "x": 150.0,
            "y": 250.0,
        },
    }


@pytest.fixture
def mock_http_client():
    """Mock HTTP client for testing."""
    client = AsyncMock(spec=FigmaCommentsClient)
    client.stats = {"request_count": 0, "error_count": 0, "error_rate": 0.0}
    return client


@pytest.fixture
def mock_service(mock_http_client):
    """Mock service for testing."""
    service = Mock(spec=FigmaCommentsService)
    service.client = mock_http_client
    return service


@pytest.fixture
async def figma_client(mock_api_token):
    """Create a test Figma client."""
    client = FigmaCommentsClient(mock_api_token)
    yield client
    await client.close()


@pytest.fixture
def figma_service(figma_client):
    """Create a test Figma service."""
    return FigmaCommentsService(figma_client)


@pytest.fixture
async def figma_sdk(mock_api_token):
    """Create a test Figma SDK."""
    sdk = FigmaCommentsSDK(mock_api_token)
    yield sdk
    await sdk.close()


# Mock response helpers

def create_mock_response(status_code: int = 200, json_data: Dict[str, Any] = None):
    """Create a mock HTTP response."""
    response = Mock()
    response.status_code = status_code
    response.is_success = 200 <= status_code < 300
    response.json.return_value = json_data or {}
    response.text = ""
    response.headers = {}
    return response


def create_error_response(status_code: int, message: str = "Error"):
    """Create a mock error response."""
    response = Mock()
    response.status_code = status_code
    response.is_success = False
    response.json.return_value = {"message": message, "err": message}
    response.text = message
    response.headers = {}
    return response


# Pytest configuration

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test (requires API token)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to skip integration tests without API token."""
    import os
    
    if not os.getenv("FIGMA_TOKEN"):
        skip_integration = pytest.mark.skip(reason="FIGMA_TOKEN not set")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)