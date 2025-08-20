"""Tests for the CLI interface."""

import pytest
import json
import os
from unittest.mock import patch, AsyncMock, MagicMock
from typer.testing import CliRunner

from figma_dev_resources.cli import app
from figma_dev_resources.models import DevResource


class TestCLI:
    """Test the CLI interface."""

    @pytest.fixture
    def runner(self):
        """CLI test runner."""
        return CliRunner()

    @pytest.fixture
    def mock_env(self, api_key):
        """Mock environment with API key."""
        with patch.dict(os.environ, {"FIGMA_TOKEN": api_key}):
            yield

    def test_get_command_no_token(self, runner):
        """Test get command without API token."""
        with patch.dict(os.environ, {}, clear=True):
            result = runner.invoke(app, ["get", "test_file_key"])
            assert result.exit_code == 1
            assert "FIGMA_TOKEN environment variable not set" in result.stdout

    def test_get_command_success(self, runner, mock_env, dev_resource):
        """Test successful get command."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, ["get", "test_file_key"])
            
            assert result.exit_code == 0
            assert "Test Component Library" in result.stdout

    def test_get_command_json_output(self, runner, mock_env, dev_resource):
        """Test get command with JSON output."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, [
                "get", "test_file_key", 
                "--format", "json"
            ])
            
            assert result.exit_code == 0
            # Should contain valid JSON
            output_data = json.loads(result.stdout)
            assert "dev_resources" in output_data
            assert len(output_data["dev_resources"]) == 1

    def test_get_command_with_node_ids(self, runner, mock_env, dev_resource):
        """Test get command with node IDs filter."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, [
                "get", "test_file_key",
                "--node-ids", "1:2,1:3"
            ])
            
            assert result.exit_code == 0
            mock_instance.get_dev_resources.assert_called_with(
                "test_file_key", ["1:2", "1:3"]
            )

    def test_create_command_success(self, runner, mock_env, dev_resource):
        """Test successful create command."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            mock_response = MagicMock()
            mock_response.links_created = [dev_resource]
            mock_response.errors = []
            mock_instance.create_dev_resources.return_value = mock_response
            
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, [
                "create",
                "test_file_key",
                "1:2",
                "Test Resource",
                "https://example.com"
            ])
            
            assert result.exit_code == 0
            assert "Successfully created" in result.stdout

    def test_update_command_success(self, runner, mock_env, dev_resource):
        """Test successful update command."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            mock_response = MagicMock()
            mock_response.links_updated = [dev_resource]
            mock_response.errors = []
            mock_instance.update_dev_resources.return_value = mock_response
            
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, [
                "update",
                "resource_123",
                "--name", "Updated Resource"
            ])
            
            assert result.exit_code == 0
            assert "Successfully updated" in result.stdout

    def test_update_command_no_changes(self, runner, mock_env):
        """Test update command without any changes."""
        result = runner.invoke(app, ["update", "resource_123"])
        
        assert result.exit_code == 1
        assert "Must specify at least one of --name or --url" in result.stdout

    def test_delete_command_with_confirmation(self, runner, mock_env):
        """Test delete command with confirmation."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            mock_response = MagicMock()
            mock_response.error = False
            mock_instance.delete_dev_resource.return_value = mock_response
            
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, [
                "delete",
                "test_file_key",
                "resource_123",
                "--confirm"
            ])
            
            assert result.exit_code == 0
            assert "Successfully deleted" in result.stdout

    def test_search_command_success(self, runner, mock_env, dev_resource):
        """Test successful search command."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.search_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, [
                "search",
                "test_file_key",
                "storybook"
            ])
            
            assert result.exit_code == 0
            assert "Search Results" in result.stdout

    def test_serve_command_no_token(self, runner):
        """Test serve command without API token."""
        with patch.dict(os.environ, {}, clear=True):
            result = runner.invoke(app, ["serve"])
            assert result.exit_code == 1
            assert "No API key provided" in result.stdout

    def test_serve_command_with_token_option(self, runner):
        """Test serve command with API key option."""
        with patch('figma_dev_resources.cli.uvicorn.run') as mock_uvicorn:
            result = runner.invoke(app, [
                "serve",
                "--api-key", "test_token",
                "--port", "3000"
            ])
            
            # Command should start server (we can't easily test uvicorn.run)
            mock_uvicorn.assert_called_once()

    def test_serve_command_with_env_token(self, runner, mock_env):
        """Test serve command with environment token."""
        with patch('figma_dev_resources.cli.uvicorn.run') as mock_uvicorn:
            result = runner.invoke(app, ["serve"])
            
            mock_uvicorn.assert_called_once_with(
                "figma_dev_resources.server:app",
                host="0.0.0.0",
                port=8000,
                reload=False
            )

    def test_error_handling(self, runner, mock_env):
        """Test CLI error handling."""
        with patch('figma_dev_resources.cli.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            # Simulate an API error
            from figma_dev_resources.errors import AuthenticationError
            mock_instance.get_dev_resources.side_effect = AuthenticationError("Invalid token")
            
            mock_sdk.return_value = mock_instance
            
            result = runner.invoke(app, ["get", "test_file_key"])
            
            assert result.exit_code == 1
            assert "Error: Invalid token" in result.stdout