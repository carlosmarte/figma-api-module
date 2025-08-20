"""
Tests for the CLI interface.
"""

import pytest
import os
import json
import tempfile
from unittest.mock import AsyncMock, patch, MagicMock
from pathlib import Path
from typer.testing import CliRunner

from figma_variables.cli import app
from figma_variables.models import LocalVariable, PublishedVariable


@pytest.fixture
def runner():
    """Create CLI test runner."""
    return CliRunner()


@pytest.fixture
def temp_output_file():
    """Create temporary output file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        yield f.name
    os.unlink(f.name)


class TestCLIBasics:
    """Test basic CLI functionality."""
    
    def test_cli_help(self, runner):
        """Test CLI help output."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "Figma Variables API CLI" in result.output
    
    def test_serve_command_help(self, runner):
        """Test serve command help."""
        result = runner.invoke(app, ["serve", "--help"])
        assert result.exit_code == 0
        assert "Start the FastAPI server" in result.output


class TestServeCommand:
    """Test serve command."""
    
    @patch('figma_variables.cli.uvicorn.run')
    def test_serve_default_options(self, mock_uvicorn, runner):
        """Test serve command with default options."""
        result = runner.invoke(app, ["serve"])
        
        # Should not exit with error
        assert result.exit_code == 0
        
        # Should call uvicorn with default settings
        mock_uvicorn.assert_called_once_with(
            "figma_variables.server:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
    
    @patch('figma_variables.cli.uvicorn.run')
    def test_serve_custom_options(self, mock_uvicorn, runner):
        """Test serve command with custom options."""
        result = runner.invoke(app, [
            "serve",
            "--port", "3000",
            "--host", "127.0.0.1",
            "--reload",
            "--api-key", "test_token"
        ])
        
        assert result.exit_code == 0
        assert os.environ.get("FIGMA_TOKEN") == "test_token"
        
        mock_uvicorn.assert_called_once_with(
            "figma_variables.server:app",
            host="127.0.0.1",
            port=3000,
            reload=True,
            log_level="info"
        )
    
    @patch('figma_variables.cli.uvicorn.run')
    def test_serve_import_error(self, mock_uvicorn, runner):
        """Test serve command when FastAPI is not available."""
        mock_uvicorn.side_effect = ImportError("FastAPI not installed")
        
        result = runner.invoke(app, ["serve"])
        
        assert result.exit_code == 1
        assert "FastAPI server dependencies not installed" in result.output


class TestListVariablesCommand:
    """Test list variables command."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_list_variables_table_format(self, mock_sdk_class, runner, sample_variable_data):
        """Test list variables with table output."""
        # Setup mock
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        mock_variable = MagicMock()
        mock_variable.id = "variable_123"
        mock_variable.name = "Primary Color"
        mock_variable.resolvedType = "COLOR"
        mock_variable.variableCollectionId = "collection_456"
        mock_variable.description = "Primary brand color"
        
        mock_sdk.list_variables = AsyncMock(return_value=[mock_variable])
        mock_sdk_class.return_value = mock_sdk
        
        # Set environment token
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "list-variables",
            "ABC123DEF456",
            "--format", "table"
        ])
        
        assert result.exit_code == 0
        assert "Primary Color" in result.output
        assert "variable_123" in result.output
        assert "COLOR" in result.output
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_list_variables_json_format(self, mock_sdk_class, runner):
        """Test list variables with JSON output."""
        # Setup mock
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        mock_variable = MagicMock()
        mock_variable.id = "variable_123"
        mock_variable.name = "Primary Color"
        mock_variable.resolvedType = "COLOR"
        mock_variable.variableCollectionId = "collection_456"
        mock_variable.description = "Primary brand color"
        
        mock_sdk.list_variables = AsyncMock(return_value=[mock_variable])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "list-variables",
            "ABC123DEF456",
            "--format", "json"
        ])
        
        assert result.exit_code == 0
        # Should contain JSON output
        assert '"id": "variable_123"' in result.output
        assert '"name": "Primary Color"' in result.output
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_list_variables_with_collection_filter(self, mock_sdk_class, runner):
        """Test list variables with collection filter."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.list_variables = AsyncMock(return_value=[])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "list-variables",
            "ABC123DEF456",
            "--collection", "collection_456"
        ])
        
        assert result.exit_code == 0
        mock_sdk.list_variables.assert_called_once_with(
            "ABC123DEF456",
            collection_id="collection_456",
            published=False
        )
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_list_variables_published(self, mock_sdk_class, runner):
        """Test list published variables."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.list_variables = AsyncMock(return_value=[])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "list-variables",
            "ABC123DEF456",
            "--published"
        ])
        
        assert result.exit_code == 0
        mock_sdk.list_variables.assert_called_once_with(
            "ABC123DEF456",
            collection_id=None,
            published=True
        )
    
    def test_list_variables_missing_token(self, runner):
        """Test list variables without token."""
        if "FIGMA_TOKEN" in os.environ:
            del os.environ["FIGMA_TOKEN"]
        
        # Mock the prompt to return a token
        with patch('figma_variables.cli.typer.prompt', return_value="prompted_token"):
            with patch('figma_variables.cli.FigmaVariablesSDK') as mock_sdk_class:
                mock_sdk = MagicMock()
                mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
                mock_sdk.__aexit__ = AsyncMock(return_value=None)
                mock_sdk.list_variables = AsyncMock(return_value=[])
                mock_sdk_class.return_value = mock_sdk
                
                result = runner.invoke(app, [
                    "list-variables",
                    "ABC123DEF456"
                ])
                
                assert result.exit_code == 0
                # Should have prompted for token
                mock_sdk_class.assert_called_once_with("prompted_token")


class TestListCollectionsCommand:
    """Test list collections command."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_list_collections_success(self, mock_sdk_class, runner):
        """Test list collections command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        mock_collection = MagicMock()
        mock_collection.id = "collection_456"
        mock_collection.name = "Brand Colors"
        mock_collection.key = "brand-colors"
        mock_collection.modes = [{"modeId": "mode1", "name": "Light"}]
        mock_collection.variableIds = ["var1", "var2"]
        
        mock_sdk.list_variable_collections = AsyncMock(return_value=[mock_collection])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "list-collections",
            "ABC123DEF456"
        ])
        
        assert result.exit_code == 0
        assert "Brand Colors" in result.output
        assert "collection_456" in result.output


class TestGetVariableCommand:
    """Test get variable command."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_get_variable_success(self, mock_sdk_class, runner):
        """Test get variable command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        mock_variable = MagicMock()
        mock_variable.id = "variable_123"
        mock_variable.name = "Primary Color"
        mock_variable.key = "primary-color"
        mock_variable.resolvedType = "COLOR"
        mock_variable.variableCollectionId = "collection_456"
        mock_variable.description = "Primary brand color"
        mock_variable.scopes = ["ALL_FILLS"]
        mock_variable.valuesByMode = {"mode1": {"r": 0.2, "g": 0.4, "b": 0.8, "a": 1.0}}
        
        mock_sdk.get_variable = AsyncMock(return_value=mock_variable)
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "get-variable",
            "ABC123DEF456",
            "variable_123"
        ])
        
        assert result.exit_code == 0
        assert "Primary Color" in result.output
        assert "variable_123" in result.output
        assert "COLOR" in result.output
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_get_variable_not_found(self, mock_sdk_class, runner):
        """Test get variable when not found."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.get_variable = AsyncMock(side_effect=ValueError("Variable not found"))
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "get-variable",
            "ABC123DEF456",
            "nonexistent"
        ])
        
        assert result.exit_code == 1
        assert "Variable not found" in result.output


class TestSearchCommand:
    """Test search command."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_search_variables_found(self, mock_sdk_class, runner):
        """Test search variables with results."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        mock_variable = MagicMock()
        mock_variable.id = "variable_123"
        mock_variable.name = "Primary Color"
        mock_variable.resolvedType = "COLOR"
        mock_variable.variableCollectionId = "collection_456"
        
        mock_sdk.search_variables = AsyncMock(return_value=[mock_variable])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "search",
            "ABC123DEF456",
            "primary"
        ])
        
        assert result.exit_code == 0
        assert "Primary Color" in result.output
        assert "Found 1 matching variables" in result.output
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_search_variables_none_found(self, mock_sdk_class, runner):
        """Test search variables with no results."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.search_variables = AsyncMock(return_value=[])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "search",
            "ABC123DEF456",
            "nonexistent"
        ])
        
        assert result.exit_code == 0
        assert "No variables found matching" in result.output


class TestCreateCommands:
    """Test create commands."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_create_collection_success(self, mock_sdk_class, runner):
        """Test create collection command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.create_variable_collection = AsyncMock(return_value="collection_123")
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "create-collection",
            "ABC123DEF456",
            "New Collection",
            "--hidden",
            "--mode-name", "Light Mode"
        ])
        
        assert result.exit_code == 0
        assert "Created collection 'New Collection'" in result.output
        assert "collection_123" in result.output
        
        mock_sdk.create_variable_collection.assert_called_once_with(
            "ABC123DEF456",
            "New Collection",
            hidden_from_publishing=True,
            initial_mode_name="Light Mode"
        )
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_create_variable_success(self, mock_sdk_class, runner):
        """Test create variable command."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.create_variable = AsyncMock(return_value="variable_123")
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "create-variable",
            "ABC123DEF456",
            "New Variable",
            "collection_456",
            "COLOR",
            "--description", "Test variable",
            "--hidden"
        ])
        
        assert result.exit_code == 0
        assert "Created variable 'New Variable'" in result.output
        assert "variable_123" in result.output
        
        mock_sdk.create_variable.assert_called_once_with(
            "ABC123DEF456",
            "New Variable",
            "collection_456",
            "COLOR",
            description="Test variable",
            hidden_from_publishing=True
        )


class TestExportCommand:
    """Test export command."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_export_local_variables(self, mock_sdk_class, runner, temp_output_file):
        """Test export local variables."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        # Mock response
        mock_response = MagicMock()
        mock_response.variables = {
            "var1": MagicMock(dict=lambda: {"id": "var1", "name": "Variable 1"})
        }
        mock_response.variable_collections = {
            "coll1": MagicMock(dict=lambda: {"id": "coll1", "name": "Collection 1"})
        }
        
        mock_sdk.get_local_variables = AsyncMock(return_value=mock_response)
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "export",
            "ABC123DEF456",
            temp_output_file
        ])
        
        assert result.exit_code == 0
        assert f"Exported variables to {temp_output_file}" in result.output
        
        # Verify file contents
        with open(temp_output_file, 'r') as f:
            data = json.load(f)
            assert data["file_key"] == "ABC123DEF456"
            assert data["published"] is False
            assert "variables" in data
            assert "variable_collections" in data
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_export_published_variables(self, mock_sdk_class, runner, temp_output_file):
        """Test export published variables."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        
        mock_response = MagicMock()
        mock_response.variables = {}
        mock_response.variable_collections = {}
        
        mock_sdk.get_published_variables = AsyncMock(return_value=mock_response)
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        result = runner.invoke(app, [
            "export",
            "ABC123DEF456",
            temp_output_file,
            "--published"
        ])
        
        assert result.exit_code == 0
        
        # Verify published was used
        mock_sdk.get_published_variables.assert_called_once()
        mock_sdk.get_local_variables.assert_not_called()


class TestFileKeyHandling:
    """Test file key extraction from URLs."""
    
    @patch('figma_variables.cli.FigmaVariablesSDK')
    def test_url_file_key_extraction(self, mock_sdk_class, runner):
        """Test that file keys are extracted from URLs."""
        mock_sdk = MagicMock()
        mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
        mock_sdk.__aexit__ = AsyncMock(return_value=None)
        mock_sdk.list_variables = AsyncMock(return_value=[])
        mock_sdk_class.return_value = mock_sdk
        
        os.environ["FIGMA_TOKEN"] = "test_token"
        
        figma_url = "https://www.figma.com/file/ABC123DEF456/My-Design-File"
        
        result = runner.invoke(app, [
            "list-variables",
            figma_url
        ])
        
        assert result.exit_code == 0
        # SDK should be called with extracted file key
        mock_sdk.list_variables.assert_called_once_with(
            "ABC123DEF456",
            collection_id=None,
            published=False
        )