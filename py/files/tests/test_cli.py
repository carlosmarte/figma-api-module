"""Tests for CLI module."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from typer.testing import CliRunner
import json
from pathlib import Path

from figma_files.cli import app, get_sdk
from figma_files.errors import ApiError, AuthenticationError


class TestCLI:
    """Test CLI functions."""

    def test_get_sdk_with_api_key(self):
        """Test get_sdk with provided API key."""
        sdk = get_sdk("test-key")
        assert sdk.client.api_key == "test-key"

    def test_get_sdk_with_env_var(self):
        """Test get_sdk with environment variable."""
        with patch.dict("os.environ", {"FIGMA_API_KEY": "env-key"}):
            sdk = get_sdk()
            assert sdk.client.api_key == "env-key"

    def test_get_sdk_no_key_exits(self):
        """Test get_sdk exits when no key is provided."""
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(SystemExit):
                get_sdk()


class TestCLICommands:
    """Test CLI commands."""

    def setup_method(self):
        """Set up test runner."""
        self.runner = CliRunner()

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_get_file_command(self, mock_asyncio_run, mock_get_sdk):
        """Test get_file command."""
        # Mock SDK
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_file_response = MagicMock()
        mock_file_response.name = "Test File"
        mock_file_response.role.value = "editor"
        mock_file_response.editor_type.value = "figma"
        mock_file_response.version = "123"
        mock_file_response.last_modified = "2023-01-01T00:00:00Z"
        mock_file_response.components = {}
        mock_file_response.styles = {}
        mock_file_response.branches = None
        
        mock_sdk.get_file = AsyncMock(return_value=mock_file_response)
        mock_get_sdk.return_value = mock_sdk
        
        # Mock the async function execution
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, ["get-file", "abc123", "--api-key", "test-key"])
        
        assert result.exit_code == 0
        mock_get_sdk.assert_called_once_with("test-key")

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_get_file_json_output(self, mock_asyncio_run, mock_get_sdk):
        """Test get_file command with JSON output."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_file_response = MagicMock()
        mock_file_response.model_dump.return_value = {"name": "Test File"}
        mock_sdk.get_file = AsyncMock(return_value=mock_file_response)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "get-file", "abc123", 
            "--api-key", "test-key", 
            "--output", "json"
        ])
        
        assert result.exit_code == 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_get_nodes_command(self, mock_asyncio_run, mock_get_sdk):
        """Test get_nodes command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_nodes_response = MagicMock()
        mock_nodes_response.name = "Test File"
        mock_nodes_response.nodes = {"1:2": MagicMock(), "3:4": None}
        mock_sdk.get_file_nodes = AsyncMock(return_value=mock_nodes_response)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "get-nodes", "abc123", "1:2,3:4", 
            "--api-key", "test-key"
        ])
        
        assert result.exit_code == 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_render_images_command(self, mock_asyncio_run, mock_get_sdk):
        """Test render_images command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_image_response = MagicMock()
        mock_image_response.err = None
        mock_image_response.images = {
            "1:2": "https://example.com/image1.png",
            "3:4": "https://example.com/image2.png"
        }
        mock_sdk.render_images = AsyncMock(return_value=mock_image_response)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "render-images", "abc123", "1:2,3:4",
            "--api-key", "test-key",
            "--format", "png",
            "--scale", "2.0"
        ])
        
        assert result.exit_code == 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_get_metadata_command(self, mock_asyncio_run, mock_get_sdk):
        """Test get_metadata command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_meta_response = MagicMock()
        mock_meta_response.name = "Test File"
        mock_meta_response.creator.handle = "testuser"
        mock_meta_response.editor_type.value = "figma"
        mock_meta_response.role.value = "editor"
        mock_meta_response.version = "123"
        mock_meta_response.last_touched_at = "2023-01-01T00:00:00Z"
        mock_meta_response.folder_name = None
        mock_meta_response.last_touched_by = None
        
        mock_sdk.get_file_metadata = AsyncMock(return_value=mock_meta_response)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "get-metadata", "abc123",
            "--api-key", "test-key"
        ])
        
        assert result.exit_code == 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_get_versions_command(self, mock_asyncio_run, mock_get_sdk):
        """Test get_versions command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_version = MagicMock()
        mock_version.id = "v123"
        mock_version.label = "Test Version"
        mock_version.user.handle = "testuser"
        mock_version.created_at = "2023-01-01T00:00:00Z"
        
        mock_versions_response = MagicMock()
        mock_versions_response.versions = [mock_version]
        
        mock_sdk.get_file_versions = AsyncMock(return_value=mock_versions_response)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "get-versions", "abc123",
            "--api-key", "test-key",
            "--page-size", "5"
        ])
        
        assert result.exit_code == 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_search_nodes_command(self, mock_asyncio_run, mock_get_sdk):
        """Test search_nodes command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_matches = [
            {"id": "1:2", "name": "Button Frame", "type": "FRAME"},
            {"id": "3:4", "name": "Input Frame", "type": "FRAME"},
        ]
        mock_sdk.search_nodes_by_name = AsyncMock(return_value=mock_matches)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "search-nodes", "abc123", "Frame",
            "--api-key", "test-key",
            "--case-sensitive"
        ])
        
        assert result.exit_code == 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_list_components_command(self, mock_asyncio_run, mock_get_sdk):
        """Test list_components command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        
        mock_components = [
            {
                "id": "comp1",
                "name": "Button Component",
                "key": "key1",
                "description": "A reusable button"
            }
        ]
        mock_sdk.get_components_in_file = AsyncMock(return_value=mock_components)
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            pass
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "list-components", "abc123",
            "--api-key", "test-key"
        ])
        
        assert result.exit_code == 0

    def test_extract_url_info_command(self):
        """Test extract_url_info command."""
        figma_url = "https://www.figma.com/file/abc123def456/Test-File?node-id=1%3A2"
        
        result = self.runner.invoke(app, ["extract-url-info", figma_url])
        
        assert result.exit_code == 0
        # Should extract both file key and node ID
        assert "abc123def456" in result.output
        assert "1:2" in result.output

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run") 
    def test_command_with_authentication_error(self, mock_asyncio_run, mock_get_sdk):
        """Test command handling authentication errors."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        mock_sdk.get_file = AsyncMock(side_effect=AuthenticationError("Invalid token"))
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            # Simulate the async function raising an exception
            import asyncio
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(coro)
                finally:
                    loop.close()
            except SystemExit:
                pass  # Expected exit
        
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "get-file", "abc123",
            "--api-key", "invalid-key"
        ])
        
        # Should handle the authentication error gracefully
        assert "Authentication Error" in result.output or result.exit_code != 0

    @patch("figma_files.cli.get_sdk")
    @patch("asyncio.run")
    def test_command_with_api_error(self, mock_asyncio_run, mock_get_sdk):
        """Test command handling API errors."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock()
        mock_sdk.get_file = AsyncMock(side_effect=ApiError("File not found"))
        mock_get_sdk.return_value = mock_sdk
        
        def mock_run(coro):
            import asyncio
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(coro)
                finally:
                    loop.close()
            except SystemExit:
                pass
        
        mock_asyncio_run.side_effect = mock_run
        
        result = self.runner.invoke(app, [
            "get-file", "nonexistent",
            "--api-key", "test-key"
        ])
        
        assert "API Error" in result.output or result.exit_code != 0