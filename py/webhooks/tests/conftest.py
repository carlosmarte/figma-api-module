"""
Pytest configuration and fixtures for Figma Webhooks tests.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from httpx import Response

from figma_webhooks.client import FigmaWebhooksClient
from figma_webhooks.sdk import FigmaWebhooksSDK
from figma_webhooks.models import (
    Webhook,
    WebhookEvent,
    WebhookStatus,
    WebhookContext,
    CreateWebhookData,
)


@pytest.fixture
def mock_api_key():
    """Mock API key for testing."""
    return "test-api-key-12345"


@pytest.fixture
def sample_webhook_data():
    """Sample webhook data for testing."""
    return {
        "id": "webhook-123",
        "event_type": "FILE_UPDATE",
        "team_id": "team-456",
        "context": "FILE",
        "context_id": "file-789",
        "plan_api_id": "plan-101",
        "status": "ACTIVE",
        "client_id": None,
        "passcode": "",  # Empty for security in GET responses
        "endpoint": "https://example.com/webhook",
        "description": "Test webhook",
    }


@pytest.fixture
def sample_webhook(sample_webhook_data):
    """Sample webhook model for testing."""
    return Webhook(**sample_webhook_data)


@pytest.fixture
def sample_webhook_requests_data():
    """Sample webhook requests data for testing."""
    return {
        "requests": [
            {
                "webhook_id": "webhook-123",
                "request_info": {
                    "id": "webhook-123",
                    "endpoint": "https://example.com/webhook",
                    "payload": {"event_type": "PING"},
                    "sent_at": "2023-01-01T00:00:00Z",
                },
                "response_info": {
                    "status": "200",
                    "received_at": "2023-01-01T00:00:01Z",
                },
                "error_msg": None,
            }
        ]
    }


@pytest.fixture
def sample_create_webhook_data():
    """Sample create webhook data for testing."""
    return CreateWebhookData(
        event_type=WebhookEvent.FILE_UPDATE,
        context=WebhookContext.FILE,
        context_id="file-789",
        endpoint="https://example.com/webhook",
        passcode="secret-passcode",
        description="Test webhook",
        status=WebhookStatus.ACTIVE,
    )


@pytest.fixture
def mock_httpx_client():
    """Mock httpx client for testing."""
    mock = AsyncMock()
    mock.aclose = AsyncMock()
    return mock


@pytest.fixture
def mock_response():
    """Mock HTTP response for testing."""
    def _mock_response(status_code=200, json_data=None):
        response = MagicMock(spec=Response)
        response.status_code = status_code
        response.is_success = 200 <= status_code < 300
        response.json.return_value = json_data or {}
        response.headers = {}
        response.text = ""
        return response
    return _mock_response


@pytest_asyncio.fixture
async def client(mock_api_key):
    """Figma webhooks client for testing."""
    client = FigmaWebhooksClient(api_key=mock_api_key)
    yield client
    await client.close()


@pytest_asyncio.fixture
async def sdk(mock_api_key):
    """Figma webhooks SDK for testing."""
    sdk = FigmaWebhooksSDK(api_key=mock_api_key)
    yield sdk
    await sdk.close()


@pytest.fixture
def mock_successful_webhooks_response(sample_webhook_data):
    """Mock successful webhooks list response."""
    return {
        "webhooks": [sample_webhook_data],
        "next_page": None,
        "prev_page": None,
    }


@pytest.fixture
def mock_successful_webhook_response(sample_webhook_data):
    """Mock successful single webhook response."""
    return {"webhook": sample_webhook_data}


@pytest.fixture
def mock_error_response():
    """Mock error response for testing."""
    def _mock_error_response(status_code=400, message="Bad request"):
        return {
            "err": message,
            "status": status_code,
        }
    return _mock_error_response