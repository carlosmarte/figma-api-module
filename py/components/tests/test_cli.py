"""Tests for the CLI module."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from typer.testing import CliRunner
from click.testing import Result

from figma_components.cli import app
from figma_components.models import PublishedComponent, PublishedComponentSet, PublishedStyle, StyleType


class TestCLI:
    """Tests for the CLI commands."""
    
    def setup_method(self):
        """Set up test environment."""
        self.runner = CliRunner()
    
    def test_cli_no_args_shows_help(self):
        """Test that CLI with no args shows help."""
        result = self.runner.invoke(app, [])
        assert result.exit_code != 0
        assert "Figma Components CLI" in result.stdout
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_components_command_with_team_id(self, mock_asyncio_run: Mock):
        """Test components command with team ID."""
        result = self.runner.invoke(app, [
            "components",
            "--team-id", "123456",
            "--format", "json"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_components_command_with_file_key(self, mock_asyncio_run: Mock):
        """Test components command with file key."""
        result = self.runner.invoke(app, [
            "components",
            "--file-key", "abc123def456",
            "--format", "table"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_components_command_with_url(self, mock_asyncio_run: Mock):
        """Test components command with Figma URL."""
        result = self.runner.invoke(app, [
            "components",
            "--url", "https://www.figma.com/file/abc123def456/My-Design",
            "--limit", "50"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_components_command_with_search(self, mock_asyncio_run: Mock):
        """Test components command with search query."""
        result = self.runner.invoke(app, [
            "components",
            "--team-id", "123456",
            "--search", "button",
            "--limit", "20"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    def test_components_command_missing_required_params(self):
        """Test components command with missing required parameters."""
        # This should trigger the error path in the async function
        with patch('figma_components.cli.asyncio.run') as mock_asyncio:
            # Mock the async function to simulate the error
            def run_side_effect(coro):
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(coro)
                finally:
                    loop.close()
            
            mock_asyncio.side_effect = run_side_effect
            
            result = self.runner.invoke(app, ["components"])
            # The command should execute but the async function should handle the error
            assert mock_asyncio.call_count == 1
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_component_command(self, mock_asyncio_run: Mock):
        """Test single component command."""
        result = self.runner.invoke(app, [
            "component",
            "abc123def456",
            "--format", "json"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_component_sets_command(self, mock_asyncio_run: Mock):
        """Test component sets command."""
        result = self.runner.invoke(app, [
            "component-sets",
            "--team-id", "123456",
            "--format", "table"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_styles_command(self, mock_asyncio_run: Mock):
        """Test styles command."""
        result = self.runner.invoke(app, [
            "styles",
            "--team-id", "123456",
            "--type", "FILL",
            "--format", "json"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'})
    @patch('figma_components.cli.asyncio.run')
    def test_all_assets_command(self, mock_asyncio_run: Mock):
        """Test all assets command."""
        result = self.runner.invoke(app, [
            "all",
            "123456",
            "--format", "json"
        ])
        
        assert result.exit_code == 0
        mock_asyncio_run.assert_called_once()
    
    @patch('figma_components.cli.uvicorn.run')
    def test_serve_command(self, mock_uvicorn_run: Mock):
        """Test serve command."""
        result = self.runner.invoke(app, [
            "serve",
            "--port", "3000",
            "--host", "127.0.0.1",
            "--api-key", "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"
        ])
        
        assert result.exit_code == 0
        mock_uvicorn_run.assert_called_once()
        
        # Check that uvicorn was called with correct parameters
        call_kwargs = mock_uvicorn_run.call_args[1]
        assert call_kwargs["host"] == "127.0.0.1"
        assert call_kwargs["port"] == 3000
        assert call_kwargs["reload"] is False
    
    @patch('figma_components.cli.uvicorn.run')
    def test_serve_command_with_reload(self, mock_uvicorn_run: Mock):
        """Test serve command with reload option."""
        result = self.runner.invoke(app, [
            "serve",
            "--reload"
        ])
        
        assert result.exit_code == 0
        call_kwargs = mock_uvicorn_run.call_args[1]
        assert call_kwargs["reload"] is True
    
    def test_api_key_from_environment(self):
        """Test API key retrieval from environment."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'env-token'}):
            from figma_components.cli import get_api_key
            api_key = get_api_key()
            assert api_key == 'env-token'
    
    @patch('figma_components.cli.Prompt.ask')
    def test_api_key_from_prompt(self, mock_prompt: Mock):
        """Test API key retrieval from prompt."""
        mock_prompt.return_value = 'prompted-token'
        
        with patch.dict('os.environ', {}, clear=True):
            from figma_components.cli import get_api_key
            api_key = get_api_key()
            assert api_key == 'prompted-token'
            mock_prompt.assert_called_once()
    
    def test_create_sdk_with_api_key(self):
        """Test SDK creation with API key."""
        from figma_components.cli import create_sdk
        
        sdk = create_sdk('test-token-1234567890-abcdefghijklmnopqrstuvwxyz')
        assert sdk.client.api_key == 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'
    
    def test_format_datetime(self):
        """Test datetime formatting."""
        from datetime import datetime
        from figma_components.cli import format_datetime
        
        dt = datetime(2024, 1, 1, 12, 0, 0)
        formatted = format_datetime(dt)
        assert "2024-01-01 12:00:00 UTC" == formatted
    
    def test_format_datetime_with_string(self):
        """Test datetime formatting with string input."""
        from figma_components.cli import format_datetime
        
        result = format_datetime("2024-01-01")
        assert result == "2024-01-01"
    
    def test_output_json_to_stdout(self, capsys):
        """Test JSON output to stdout."""
        from figma_components.cli import output_json
        
        data = {"test": "data"}
        output_json(data)
        
        captured = capsys.readouterr()
        assert '"test": "data"' in captured.out
    
    @patch('pathlib.Path.write_text')
    def test_output_json_to_file(self, mock_write: Mock):
        """Test JSON output to file."""
        from figma_components.cli import output_json
        
        data = {"test": "data"}
        output_json(data, "output.json")
        
        mock_write.assert_called_once()
    
    def test_create_components_table(self, sample_component):
        """Test creating components table."""
        from figma_components.cli import create_components_table
        from figma_components.models import PublishedComponent
        
        component = PublishedComponent(**sample_component)
        table = create_components_table([component])
        
        assert table.title == "Components"
        assert len(table.columns) == 5  # Name, Key, Description, Updated, User
    
    def test_create_styles_table(self, sample_style):
        """Test creating styles table."""
        from figma_components.cli import create_styles_table
        from figma_components.models import PublishedStyle
        
        style = PublishedStyle(**sample_style)
        table = create_styles_table([style])
        
        assert table.title == "Styles"
        assert len(table.columns) == 5  # Name, Type, Key, Description, Updated