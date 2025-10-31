"""
Tests for the Figma Webhooks SDK.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from figma_webhooks.sdk import FigmaWebhooksSDK
from figma_webhooks.models import (
    Webhook,
    WebhookEvent,
    WebhookStatus,
    WebhookContext,
    CreateWebhookData,
    UpdateWebhookData,
    WebhooksResponse,
    WebhookRequestsResponse,
)


class TestFigmaWebhooksSDK:
    """Test Figma Webhooks SDK functionality."""
    
    @pytest_asyncio.async def test_context_manager(self, mock_api_key):
        """Test SDK as async context manager."""
        async with FigmaWebhooksSDK(mock_api_key) as sdk:
            assert sdk.client is not None
    
    @pytest_asyncio.async def test_list_webhooks(self, sdk, mock_successful_webhooks_response):
        """Test listing webhooks."""
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_successful_webhooks_response
            
            response = await sdk.list_webhooks(
                context=WebhookContext.FILE,
                context_id="file-123"
            )
            
            assert isinstance(response, WebhooksResponse)
            assert len(response.webhooks) == 1
            assert response.webhooks[0].id == "webhook-123"
            
            mock_get.assert_called_once_with(
                "/v2/webhooks",
                context="FILE",
                context_id="file-123"
            )
    
    @pytest_asyncio.async def test_list_webhooks_with_plan_api_id(self, sdk, mock_successful_webhooks_response):
        """Test listing webhooks with plan API ID."""
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_successful_webhooks_response
            
            response = await sdk.list_webhooks(plan_api_id="plan-123")
            
            mock_get.assert_called_once_with(
                "/v2/webhooks",
                plan_api_id="plan-123"
            )
    
    @pytest_asyncio.async def test_get_webhook(self, sdk, mock_successful_webhook_response):
        """Test getting a single webhook."""
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_successful_webhook_response
            
            webhook = await sdk.get_webhook("webhook-123")
            
            assert isinstance(webhook, Webhook)
            assert webhook.id == "webhook-123"
            
            mock_get.assert_called_once_with("/v2/webhooks/webhook-123")
    
    @pytest_asyncio.async def test_create_webhook(self, sdk, sample_create_webhook_data, mock_successful_webhook_response):
        """Test creating a webhook."""
        with patch.object(sdk.client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_successful_webhook_response
            
            webhook = await sdk.create_webhook(sample_create_webhook_data)
            
            assert isinstance(webhook, Webhook)
            assert webhook.id == "webhook-123"
            
            # Check that the request was made with correct data
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            assert call_args[0][0] == "/v2/webhooks"
            assert "json_data" in call_args[1]
    
    @pytest_asyncio.async def test_create_webhook_validation_error(self, sdk):
        """Test webhook creation with invalid data."""
        # Invalid endpoint URL
        invalid_data = CreateWebhookData(
            event_type=WebhookEvent.FILE_UPDATE,
            context=WebhookContext.FILE,
            context_id="file-123",
            endpoint="invalid-url",  # Invalid URL
            passcode="secret",
        )
        
        with pytest.raises(ValueError, match="Invalid webhook endpoint URL"):
            await sdk.create_webhook(invalid_data)
    
    @pytest_asyncio.async def test_update_webhook(self, sdk, mock_successful_webhook_response):
        """Test updating a webhook."""
        with patch.object(sdk.client, 'put', new_callable=AsyncMock) as mock_put:
            mock_put.return_value = mock_successful_webhook_response
            
            update_data = UpdateWebhookData(status=WebhookStatus.PAUSED)
            webhook = await sdk.update_webhook("webhook-123", update_data)
            
            assert isinstance(webhook, Webhook)
            assert webhook.id == "webhook-123"
            
            mock_put.assert_called_once_with("/v2/webhooks/webhook-123", json_data={"status": "PAUSED"})
    
    @pytest_asyncio.async def test_delete_webhook(self, sdk):
        """Test deleting a webhook."""
        with patch.object(sdk.client, 'delete', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = {"success": True}
            
            result = await sdk.delete_webhook("webhook-123")
            
            assert result is True
            mock_delete.assert_called_once_with("/v2/webhooks/webhook-123")
    
    @pytest_asyncio.async def test_get_webhook_requests(self, sdk, sample_webhook_requests_data):
        """Test getting webhook requests."""
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_webhook_requests_data
            
            response = await sdk.get_webhook_requests("webhook-123")
            
            assert isinstance(response, WebhookRequestsResponse)
            assert len(response.requests) == 1
            
            mock_get.assert_called_once_with("/v2/webhooks/webhook-123/requests")
    
    @pytest_asyncio.async def test_create_file_webhook(self, sdk, mock_successful_webhook_response):
        """Test creating a file webhook convenience method."""
        with patch.object(sdk.client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_successful_webhook_response
            
            webhook = await sdk.create_file_webhook(
                file_id="file-123",
                endpoint="https://example.com/webhook",
                passcode="secret",
                event_type=WebhookEvent.FILE_UPDATE,
                description="Test webhook",
            )
            
            assert isinstance(webhook, Webhook)
            mock_post.assert_called_once()
    
    @pytest_asyncio.async def test_create_team_webhook(self, sdk, mock_successful_webhook_response):
        """Test creating a team webhook convenience method."""
        with patch.object(sdk.client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_successful_webhook_response
            
            webhook = await sdk.create_team_webhook(
                team_id="team-123",
                endpoint="https://example.com/webhook",
                passcode="secret",
            )
            
            assert isinstance(webhook, Webhook)
            mock_post.assert_called_once()
    
    @pytest_asyncio.async def test_create_project_webhook(self, sdk, mock_successful_webhook_response):
        """Test creating a project webhook convenience method."""
        with patch.object(sdk.client, 'post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_successful_webhook_response
            
            webhook = await sdk.create_project_webhook(
                project_id="project-123",
                endpoint="https://example.com/webhook",
                passcode="secret",
            )
            
            assert isinstance(webhook, Webhook)
            mock_post.assert_called_once()
    
    @pytest_asyncio.async def test_pause_webhook(self, sdk, mock_successful_webhook_response):
        """Test pausing a webhook."""
        with patch.object(sdk.client, 'put', new_callable=AsyncMock) as mock_put:
            mock_put.return_value = mock_successful_webhook_response
            
            webhook = await sdk.pause_webhook("webhook-123")
            
            assert isinstance(webhook, Webhook)
            mock_put.assert_called_once_with("/v2/webhooks/webhook-123", json_data={"status": "PAUSED"})
    
    @pytest_asyncio.async def test_activate_webhook(self, sdk, mock_successful_webhook_response):
        """Test activating a webhook."""
        with patch.object(sdk.client, 'put', new_callable=AsyncMock) as mock_put:
            mock_put.return_value = mock_successful_webhook_response
            
            webhook = await sdk.activate_webhook("webhook-123")
            
            assert isinstance(webhook, Webhook)
            mock_put.assert_called_once_with("/v2/webhooks/webhook-123", json_data={"status": "ACTIVE"})
    
    @pytest_asyncio.async def test_search_webhooks_with_plan(self, sdk):
        """Test searching webhooks with plan API ID."""
        mock_webhook_data = {
            "id": "webhook-123",
            "event_type": "FILE_UPDATE",
            "context": "FILE",
            "context_id": "file-123",
            "plan_api_id": "plan-123",
            "status": "ACTIVE",
            "passcode": "",
            "endpoint": "https://example.com/webhook",
            "description": "Test webhook",
        }
        
        with patch.object(sdk.client, 'paginate', new_callable=AsyncMock) as mock_paginate:
            # Mock async generator
            async def mock_paginate_generator():
                yield mock_webhook_data
            
            mock_paginate.return_value = mock_paginate_generator()
            
            webhooks = await sdk.search_webhooks(
                event_type=WebhookEvent.FILE_UPDATE,
                plan_api_id="plan-123"
            )
            
            assert len(webhooks) == 1
            assert webhooks[0].id == "webhook-123"
    
    @pytest_asyncio.async def test_search_webhooks_without_plan(self, sdk, mock_successful_webhooks_response):
        """Test searching webhooks without plan API ID requires context."""
        with pytest.raises(ValueError, match="Either plan_api_id or context must be provided"):
            await sdk.search_webhooks(event_type=WebhookEvent.FILE_UPDATE)
    
    @pytest_asyncio.async def test_batch_get_webhooks(self, sdk, mock_successful_webhook_response):
        """Test batch getting webhooks."""
        with patch.object(sdk, 'get_webhook', new_callable=AsyncMock) as mock_get:
            # First webhook exists, second doesn't
            mock_get.side_effect = [
                Webhook(**mock_successful_webhook_response["webhook"]),
                Exception("Not found"),
            ]
            
            webhooks = await sdk.batch_get_webhooks(["webhook-1", "webhook-2"])
            
            assert len(webhooks) == 2
            assert webhooks[0] is not None
            assert webhooks[1] is None