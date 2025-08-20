"""
Tests for the Figma Webhooks FastAPI server.
"""

import os
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from figma_webhooks.server import app
from figma_webhooks.models import (
    Webhook,
    WebhookEvent,
    WebhookStatus,
    WebhookContext,
    CreateWebhookData,
)


class TestFigmaWebhooksServer:
    """Test Figma Webhooks FastAPI server."""
    
    @pytest.fixture
    def client(self):
        """Test client for FastAPI app."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_webhook_data(self):
        """Mock webhook data for testing."""
        return {
            "id": "webhook-123",
            "event_type": "FILE_UPDATE",
            "context": "FILE",
            "context_id": "file-123",
            "plan_api_id": "plan-123",
            "status": "ACTIVE",
            "client_id": None,
            "passcode": "",
            "endpoint": "https://example.com/webhook",
            "description": "Test webhook",
        }
    
    def test_health_check_no_auth(self, client):
        """Test health check endpoint requires no authentication."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "service": "figma-webhooks"}
    
    def test_missing_token_returns_401(self, client):
        """Test that missing token returns 401."""
        response = client.get("/v1/webhooks")
        assert response.status_code == 401
        assert "X-Figma-Token header is required" in response.json()["detail"]
    
    def test_token_from_header(self, client):
        """Test token validation from X-Figma-Token header."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = {"webhooks": [], "next_page": None, "prev_page": None}
            mock_sdk.list_webhooks.return_value.model_dump.return_value = mock_response
            
            response = client.get(
                "/v1/webhooks",
                headers={"X-Figma-Token": "test-token"}
            )
            
            # Should not be 401 (token was provided)
            assert response.status_code != 401
    
    def test_token_from_query_parameter(self, client):
        """Test token validation from query parameter."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = {"webhooks": [], "next_page": None, "prev_page": None}
            mock_sdk.list_webhooks.return_value.model_dump.return_value = mock_response
            
            response = client.get("/v1/webhooks?token=test-token")
            
            # Should not be 401 (token was provided)
            assert response.status_code != 401
    
    def test_token_from_environment(self, client):
        """Test token validation from environment variable."""
        with patch.dict(os.environ, {"FIGMA_TOKEN": "test-token"}), \
             patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = {"webhooks": [], "next_page": None, "prev_page": None}
            mock_sdk.list_webhooks.return_value.model_dump.return_value = mock_response
            
            response = client.get("/v1/webhooks")
            
            # Should not be 401 (token from environment)
            assert response.status_code != 401
    
    def test_token_priority_order(self, client):
        """Test token priority: header > query > environment."""
        with patch.dict(os.environ, {"FIGMA_TOKEN": "env-token"}), \
             patch('figma_webhooks.server.get_sdk') as mock_get_sdk:
            
            # Mock SDK to capture the token used
            captured_token = None
            
            def capture_token(token):
                nonlocal captured_token
                captured_token = token
                mock_sdk = AsyncMock()
                mock_sdk.list_webhooks.return_value.model_dump.return_value = {
                    "webhooks": [], "next_page": None, "prev_page": None
                }
                return mock_sdk
            
            mock_get_sdk.side_effect = capture_token
            
            # Header should take priority
            response = client.get(
                "/v1/webhooks?token=query-token",
                headers={"X-Figma-Token": "header-token"}
            )
            
            assert captured_token == "header-token"
    
    def test_list_webhooks_endpoint(self, client, mock_webhook_data):
        """Test list webhooks endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = AsyncMock()
            mock_response.model_dump.return_value = {
                "webhooks": [mock_webhook_data],
                "next_page": None,
                "prev_page": None,
            }
            mock_sdk.list_webhooks.return_value = mock_response
            
            response = client.get(
                "/v1/webhooks?context=file&context_id=file-123",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "webhooks" in data
            assert len(data["webhooks"]) == 1
    
    def test_create_webhook_endpoint(self, client, mock_webhook_data):
        """Test create webhook endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = mock_webhook_data
            mock_sdk.create_webhook.return_value = mock_webhook
            
            webhook_data = {
                "event_type": "FILE_UPDATE",
                "context": "FILE",
                "context_id": "file-123",
                "endpoint": "https://example.com/webhook",
                "passcode": "secret",
                "description": "Test webhook"
            }
            
            response = client.post(
                "/v1/webhooks",
                json=webhook_data,
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["id"] == "webhook-123"
    
    def test_get_webhook_endpoint(self, client, mock_webhook_data):
        """Test get webhook endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = mock_webhook_data
            mock_sdk.get_webhook.return_value = mock_webhook
            
            response = client.get(
                "/v1/webhooks/webhook-123",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["id"] == "webhook-123"
    
    def test_update_webhook_endpoint(self, client, mock_webhook_data):
        """Test update webhook endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = {**mock_webhook_data, "status": "PAUSED"}
            mock_sdk.update_webhook.return_value = mock_webhook
            
            update_data = {"status": "PAUSED"}
            
            response = client.put(
                "/v1/webhooks/webhook-123",
                json=update_data,
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["status"] == "PAUSED"
    
    def test_delete_webhook_endpoint(self, client):
        """Test delete webhook endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            mock_sdk.delete_webhook.return_value = True
            
            response = client.delete(
                "/v1/webhooks/webhook-123",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["success"] is True
    
    def test_get_webhook_requests_endpoint(self, client):
        """Test get webhook requests endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = AsyncMock()
            mock_response.model_dump.return_value = {"requests": []}
            mock_sdk.get_webhook_requests.return_value = mock_response
            
            response = client.get(
                "/v1/webhooks/webhook-123/requests",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert "requests" in response.json()
    
    def test_create_file_webhook_convenience_endpoint(self, client, mock_webhook_data):
        """Test create file webhook convenience endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = mock_webhook_data
            mock_sdk.create_file_webhook.return_value = mock_webhook
            
            response = client.post(
                "/v1/webhooks/file?file_id=file-123&endpoint=https://example.com/webhook&passcode=secret",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["id"] == "webhook-123"
    
    def test_create_team_webhook_convenience_endpoint(self, client, mock_webhook_data):
        """Test create team webhook convenience endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = mock_webhook_data
            mock_sdk.create_team_webhook.return_value = mock_webhook
            
            response = client.post(
                "/v1/webhooks/team?team_id=team-123&endpoint=https://example.com/webhook&passcode=secret",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["id"] == "webhook-123"
    
    def test_pause_webhook_convenience_endpoint(self, client, mock_webhook_data):
        """Test pause webhook convenience endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = {**mock_webhook_data, "status": "PAUSED"}
            mock_sdk.pause_webhook.return_value = mock_webhook
            
            response = client.patch(
                "/v1/webhooks/webhook-123/pause",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["status"] == "PAUSED"
    
    def test_activate_webhook_convenience_endpoint(self, client, mock_webhook_data):
        """Test activate webhook convenience endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = AsyncMock()
            mock_webhook.model_dump.return_value = mock_webhook_data
            mock_sdk.activate_webhook.return_value = mock_webhook
            
            response = client.patch(
                "/v1/webhooks/webhook-123/activate",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert response.json()["status"] == "ACTIVE"
    
    def test_search_webhooks_endpoint(self, client, mock_webhook_data):
        """Test search webhooks endpoint."""
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            mock_sdk.search_webhooks.return_value = [mock_webhook_data]
            
            response = client.get(
                "/v1/webhooks/search?event_type=FILE_UPDATE&status=ACTIVE",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            assert len(response.json()) == 1
    
    def test_invalid_context_returns_400(self, client):
        """Test that invalid context returns 400."""
        response = client.get(
            "/v1/webhooks?context=invalid",
            headers={"X-Figma-Token": "test-token"}
        )
        
        assert response.status_code == 400
        assert "Invalid context: invalid" in response.json()["detail"]
    
    def test_figma_api_error_handling(self, client):
        """Test Figma API error handling."""
        from figma_webhooks.errors import AuthenticationError
        
        with patch('figma_webhooks.server.FigmaWebhooksSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            mock_sdk.list_webhooks.side_effect = AuthenticationError("Invalid token", status_code=401)
            
            response = client.get(
                "/v1/webhooks",
                headers={"X-Figma-Token": "invalid-token"}
            )
            
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid token"
            assert response.json()["error"] is True
    
    def test_openapi_schema_available(self, client):
        """Test that OpenAPI schema is available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        assert "openapi" in response.json()
    
    def test_docs_available(self, client):
        """Test that documentation is available."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]