"""
Tests for the Figma Webhooks CLI.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from typer.testing import CliRunner

from figma_webhooks.cli import app
from figma_webhooks.models import Webhook, WebhookEvent, WebhookStatus, WebhookContext


class TestFigmaWebhooksCLI:
    """Test Figma Webhooks CLI functionality."""
    
    @pytest.fixture
    def runner(self):
        """CLI test runner."""
        return CliRunner()
    
    @pytest.fixture
    def mock_sdk(self):
        """Mock SDK for testing."""
        return AsyncMock()
    
    def test_list_command_with_context(self, runner):
        """Test list command with context parameters."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = MagicMock()
            mock_response.webhooks = []
            mock_sdk.list_webhooks.return_value = mock_response
            
            result = runner.invoke(app, [
                'list',
                '--context', 'file',
                '--context-id', 'file-123'
            ])
            
            assert result.exit_code == 0
            assert "No webhooks found" in result.stdout
    
    def test_list_command_json_output(self, runner):
        """Test list command with JSON output."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = MagicMock()
            mock_response.webhooks = []
            mock_response.model_dump.return_value = {"webhooks": []}
            mock_sdk.list_webhooks.return_value = mock_response
            
            result = runner.invoke(app, [
                'list',
                '--output', 'json'
            ])
            
            assert result.exit_code == 0
            assert '"webhooks"' in result.stdout
    
    def test_get_command(self, runner):
        """Test get command."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = MagicMock()
            mock_webhook.id = "webhook-123"
            mock_webhook.event_type = "FILE_UPDATE"
            mock_webhook.context = "FILE"
            mock_webhook.context_id = "file-123"
            mock_webhook.status = "ACTIVE"
            mock_webhook.endpoint = "https://example.com/webhook"
            mock_webhook.description = "Test webhook"
            mock_sdk.get_webhook.return_value = mock_webhook
            
            result = runner.invoke(app, [
                'get',
                'webhook-123'
            ])
            
            assert result.exit_code == 0
    
    def test_create_command(self, runner):
        """Test create command."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = MagicMock()
            mock_webhook.id = "webhook-123"
            mock_webhook.event_type = "FILE_UPDATE"
            mock_webhook.context = "FILE"
            mock_webhook.context_id = "file-123"
            mock_webhook.status = "ACTIVE"
            mock_webhook.endpoint = "https://example.com/webhook"
            mock_webhook.description = "Test webhook"
            mock_sdk.create_webhook.return_value = mock_webhook
            
            result = runner.invoke(app, [
                'create',
                '--event-type', 'FILE_UPDATE',
                '--context', 'file',
                '--context-id', 'file-123',
                '--endpoint', 'https://example.com/webhook',
                '--passcode', 'secret',
                '--description', 'Test webhook'
            ])
            
            assert result.exit_code == 0
            assert "created successfully" in result.stdout
    
    def test_update_command(self, runner):
        """Test update command."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = MagicMock()
            mock_webhook.id = "webhook-123"
            mock_webhook.event_type = "FILE_UPDATE"
            mock_webhook.context = "FILE"
            mock_webhook.context_id = "file-123"
            mock_webhook.status = "PAUSED"
            mock_webhook.endpoint = "https://example.com/webhook"
            mock_webhook.description = "Updated webhook"
            mock_sdk.update_webhook.return_value = mock_webhook
            
            result = runner.invoke(app, [
                'update',
                'webhook-123',
                '--status', 'paused',
                '--description', 'Updated webhook'
            ])
            
            assert result.exit_code == 0
            assert "updated successfully" in result.stdout
    
    def test_delete_command_with_confirmation(self, runner):
        """Test delete command with confirmation."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            mock_sdk.delete_webhook.return_value = True
            
            result = runner.invoke(app, [
                'delete',
                'webhook-123',
                '--yes'  # Skip confirmation
            ])
            
            assert result.exit_code == 0
            assert "deleted successfully" in result.stdout
    
    def test_requests_command(self, runner):
        """Test requests command."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_response = MagicMock()
            mock_response.requests = []
            mock_sdk.get_webhook_requests.return_value = mock_response
            
            result = runner.invoke(app, [
                'requests',
                'webhook-123'
            ])
            
            assert result.exit_code == 0
            assert "No requests found" in result.stdout
    
    def test_pause_command(self, runner):
        """Test pause command."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = MagicMock()
            mock_webhook.status = "PAUSED"
            mock_sdk.pause_webhook.return_value = mock_webhook
            
            result = runner.invoke(app, [
                'pause',
                'webhook-123'
            ])
            
            assert result.exit_code == 0
            assert "paused successfully" in result.stdout
    
    def test_activate_command(self, runner):
        """Test activate command."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            
            mock_webhook = MagicMock()
            mock_webhook.status = "ACTIVE"
            mock_sdk.activate_webhook.return_value = mock_webhook
            
            result = runner.invoke(app, [
                'activate',
                'webhook-123'
            ])
            
            assert result.exit_code == 0
            assert "activated successfully" in result.stdout
    
    def test_serve_command(self, runner):
        """Test serve command."""
        with patch('figma_webhooks.cli.uvicorn.run') as mock_uvicorn, \
             patch.dict('os.environ', {}, clear=True):
            
            result = runner.invoke(app, [
                'serve',
                '--port', '3000',
                '--host', '127.0.0.1',
                '--api-key', 'test-token'
            ])
            
            assert result.exit_code == 0
            mock_uvicorn.assert_called_once_with(
                "figma_webhooks.server:app",
                host="127.0.0.1",
                port=3000,
                reload=False,
            )
    
    def test_missing_api_key(self, runner):
        """Test command with missing API key."""
        with patch.dict('os.environ', {}, clear=True):
            result = runner.invoke(app, ['list'])
            
            assert result.exit_code == 1
            assert "API key required" in result.stdout
    
    def test_api_error_handling(self, runner):
        """Test API error handling in CLI."""
        from figma_webhooks.errors import AuthenticationError
        
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token'}), \
             patch('figma_webhooks.cli.FigmaWebhooksSDK') as mock_sdk_class:
            
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
            mock_sdk.list_webhooks.side_effect = AuthenticationError("Invalid token")
            
            result = runner.invoke(app, ['list'])
            
            assert result.exit_code == 1
            assert "API Error: Invalid token" in result.stdout