"""
Tests for CLI commands.
"""

import json
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from typer.testing import CliRunner

from figma_library_analytics.cli import app
from figma_library_analytics.models import LibraryAnalyticsComponentActionsByAsset


class TestCLI:
    """Test CLI commands."""
    
    def setup_method(self):
        """Setup test environment."""
        self.runner = CliRunner()
    
    def test_component_actions_help(self):
        """Test component actions command help."""
        result = self.runner.invoke(app, ["component-actions", "--help"])
        assert result.exit_code == 0
        assert "Get component action analytics data" in result.stdout
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_component_actions_table_output(self, mock_sdk_class):
        """Test component actions with table output."""
        # Mock SDK and data
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_data = [
            LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_123",
                component_name="Button",
                detachments=5,
                insertions=10
            )
        ]
        mock_sdk.get_all_component_actions.return_value = mock_data
        
        result = self.runner.invoke(app, [
            "component-actions",
            "ABC123",
            "--group-by", "component",
            "--format", "table"
        ])
        
        assert result.exit_code == 0
        assert "Button" in result.stdout
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_component_actions_json_output(self, mock_sdk_class):
        """Test component actions with JSON output."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_data = [
            LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_123",
                component_name="Button",
                detachments=5,
                insertions=10
            )
        ]
        mock_sdk.get_all_component_actions.return_value = mock_data
        
        result = self.runner.invoke(app, [
            "component-actions",
            "ABC123",
            "--group-by", "component",
            "--format", "json"
        ])
        
        assert result.exit_code == 0
        
        # Parse JSON output
        json_data = json.loads(result.stdout)
        assert len(json_data) == 1
        assert json_data[0]["component_name"] == "Button"
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_component_actions_with_dates(self, mock_sdk_class):
        """Test component actions with date range."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        mock_sdk.get_all_component_actions.return_value = []
        
        result = self.runner.invoke(app, [
            "component-actions",
            "ABC123",
            "--group-by", "component",
            "--start-date", "2023-01-01",
            "--end-date", "2023-12-31"
        ])
        
        assert result.exit_code == 0
        
        # Verify SDK was called with correct dates
        mock_sdk.get_all_component_actions.assert_called_once_with(
            "ABC123",
            "component",
            date(2023, 1, 1),
            date(2023, 12, 31)
        )
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_component_actions_file_output(self, mock_sdk_class, tmp_path):
        """Test component actions with file output."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_data = [
            LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_123",
                component_name="Button",
                detachments=5,
                insertions=10
            )
        ]
        mock_sdk.get_all_component_actions.return_value = mock_data
        
        output_file = tmp_path / "output.json"
        
        result = self.runner.invoke(app, [
            "component-actions",
            "ABC123",
            "--group-by", "component",
            "--format", "json",
            "--output", str(output_file)
        ])
        
        assert result.exit_code == 0
        assert output_file.exists()
        
        # Verify file content
        json_data = json.loads(output_file.read_text())
        assert len(json_data) == 1
        assert json_data[0]["component_name"] == "Button"
    
    def test_component_actions_with_figma_url(self):
        """Test component actions with Figma URL instead of file key."""
        with patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'}):
            with patch('figma_library_analytics.cli.FigmaAnalyticsSDK') as mock_sdk_class:
                mock_sdk = AsyncMock()
                mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
                mock_sdk.get_all_component_actions.return_value = []
                
                result = self.runner.invoke(app, [
                    "component-actions",
                    "https://www.figma.com/file/ABC123/Test-Library",
                    "--group-by", "component"
                ])
                
                assert result.exit_code == 0
                
                # Verify SDK was called with extracted file key
                mock_sdk.get_all_component_actions.assert_called_once()
                call_args = mock_sdk.get_all_component_actions.call_args[0]
                assert call_args[0] == "ABC123"
    
    def test_component_actions_invalid_date_format(self):
        """Test component actions with invalid date format."""
        result = self.runner.invoke(app, [
            "component-actions",
            "ABC123",
            "--group-by", "component",
            "--start-date", "invalid-date"
        ])
        
        assert result.exit_code != 0
        assert "Date must be in YYYY-MM-DD format" in result.stdout
    
    def test_component_actions_invalid_url(self):
        """Test component actions with invalid Figma URL."""
        result = self.runner.invoke(app, [
            "component-actions",
            "https://invalid-url.com/file/ABC123",
            "--group-by", "component"
        ])
        
        assert result.exit_code != 0
        assert "Invalid Figma URL format" in result.stdout
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_component_usages(self, mock_sdk_class):
        """Test component usages command."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_response = type('MockResponse', (), {
            'rows': []
        })()
        mock_sdk.get_component_usages.return_value = mock_response
        
        result = self.runner.invoke(app, [
            "component-usages",
            "ABC123",
            "--group-by", "component"
        ])
        
        assert result.exit_code == 0
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_style_actions(self, mock_sdk_class):
        """Test style actions command."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_response = type('MockResponse', (), {
            'rows': []
        })()
        mock_sdk.get_style_actions.return_value = mock_response
        
        result = self.runner.invoke(app, [
            "style-actions",
            "ABC123",
            "--group-by", "style"
        ])
        
        assert result.exit_code == 0
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_style_usages(self, mock_sdk_class):
        """Test style usages command."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_response = type('MockResponse', (), {
            'rows': []
        })()
        mock_sdk.get_style_usages.return_value = mock_response
        
        result = self.runner.invoke(app, [
            "style-usages",
            "ABC123",
            "--group-by", "style"
        ])
        
        assert result.exit_code == 0
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_variable_actions(self, mock_sdk_class):
        """Test variable actions command."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_response = type('MockResponse', (), {
            'rows': []
        })()
        mock_sdk.get_variable_actions.return_value = mock_response
        
        result = self.runner.invoke(app, [
            "variable-actions",
            "ABC123",
            "--group-by", "variable"
        ])
        
        assert result.exit_code == 0
    
    @patch.dict('os.environ', {'FIGMA_TOKEN': 'test_token'})
    @patch('figma_library_analytics.cli.FigmaAnalyticsSDK')
    def test_variable_usages(self, mock_sdk_class):
        """Test variable usages command."""
        mock_sdk = AsyncMock()
        mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
        
        mock_response = type('MockResponse', (), {
            'rows': []
        })()
        mock_sdk.get_variable_usages.return_value = mock_response
        
        result = self.runner.invoke(app, [
            "variable-usages",
            "ABC123",
            "--group-by", "variable"
        ])
        
        assert result.exit_code == 0
    
    def test_serve_command_help(self):
        """Test serve command help."""
        result = self.runner.invoke(app, ["serve", "--help"])
        assert result.exit_code == 0
        assert "Start the FastAPI server" in result.stdout
    
    @patch('figma_library_analytics.cli.uvicorn.run')
    def test_serve_command(self, mock_uvicorn_run):
        """Test serve command."""
        result = self.runner.invoke(app, [
            "serve",
            "--port", "3000",
            "--host", "127.0.0.1",
            "--api-key", "test_token"
        ])
        
        assert result.exit_code == 0
        
        # Verify uvicorn was called with correct parameters
        mock_uvicorn_run.assert_called_once_with(
            "figma_library_analytics.server:app",
            host="127.0.0.1",
            port=3000,
            reload=False,
        )
    
    def test_missing_api_key_prompt(self):
        """Test that missing API key prompts user."""
        # Remove any existing FIGMA_TOKEN
        with patch.dict('os.environ', {}, clear=True):
            with patch('figma_library_analytics.cli.typer.prompt') as mock_prompt:
                mock_prompt.return_value = "prompted_token"
                
                with patch('figma_library_analytics.cli.FigmaAnalyticsSDK') as mock_sdk_class:
                    mock_sdk = AsyncMock()
                    mock_sdk_class.return_value.__aenter__.return_value = mock_sdk
                    mock_sdk.get_all_component_actions.return_value = []
                    
                    result = self.runner.invoke(app, [
                        "component-actions",
                        "ABC123",
                        "--group-by", "component"
                    ])
                    
                    # Should prompt for API key
                    mock_prompt.assert_called_once_with("Enter your Figma API token", hide_input=True)