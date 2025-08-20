"""
Tests for the Figma Variables SDK.
"""

import pytest
from unittest.mock import AsyncMock, patch

from figma_variables.sdk import FigmaVariablesSDK
from figma_variables.models import (
    LocalVariablesResponse,
    PublishedVariablesResponse,
    VariablesRequest,
    VariableResolvedDataType,
    VariableScope,
)
from figma_variables.errors import FigmaVariablesError


class TestFigmaVariablesSDK:
    """Test Figma Variables SDK."""
    
    @pytest.fixture
    def sdk(self, mock_api_token):
        """Create test SDK."""
        return FigmaVariablesSDK(api_token=mock_api_token)
    
    def test_sdk_initialization(self, mock_api_token):
        """Test SDK initialization."""
        sdk = FigmaVariablesSDK(
            api_token=mock_api_token,
            base_url="https://test.api.figma.com",
            timeout=60.0
        )
        
        assert sdk.client.api_token == mock_api_token
        assert sdk.client.base_url == "https://test.api.figma.com"
        assert sdk.client.timeout == 60.0
        assert not sdk._is_closed
    
    @pytest.mark.asyncio
    async def test_context_manager(self, sdk):
        """Test async context manager."""
        with patch.object(sdk.client, '__aenter__') as mock_aenter, \
             patch.object(sdk.client, '__aexit__') as mock_aexit:
            
            mock_aenter.return_value = sdk.client
            mock_aexit.return_value = None
            
            async with sdk as s:
                assert s is sdk
                mock_aenter.assert_called_once()
            
            mock_aexit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close(self, sdk):
        """Test SDK close."""
        with patch.object(sdk.client, 'close') as mock_close:
            mock_close.return_value = None
            
            await sdk.close()
            
            assert sdk._is_closed
            mock_close.assert_called_once()
    
    @pytest.mark.parametrize("file_input,expected", [
        ("ABC123DEF456", "ABC123DEF456"),
        ("https://www.figma.com/file/ABC123DEF456/My-File", "ABC123DEF456"),
        ("https://figma.com/file/XYZ789/Test", "XYZ789"),
    ])
    def test_normalize_file_key(self, sdk, file_input, expected):
        """Test file key normalization."""
        result = sdk._normalize_file_key(file_input)
        assert result == expected
    
    def test_normalize_file_key_invalid(self, sdk):
        """Test file key normalization with invalid input."""
        with pytest.raises(ValueError, match="Invalid file key"):
            sdk._normalize_file_key("invalid")
    
    @pytest.mark.asyncio
    async def test_get_local_variables(self, sdk, sample_file_key, sample_local_variables_response):
        """Test get local variables."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            result = await sdk.get_local_variables(sample_file_key)
            
            assert isinstance(result, LocalVariablesResponse)
            assert result.status == 200
            assert not result.error
            assert len(result.variables) == 1
            assert len(result.variable_collections) == 1
            
            mock_get.assert_called_once_with(sample_file_key)
    
    @pytest.mark.asyncio
    async def test_get_published_variables(self, sdk, sample_file_key, sample_published_variables_response):
        """Test get published variables."""
        with patch.object(sdk.client, 'get_published_variables') as mock_get:
            mock_get.return_value = sample_published_variables_response
            
            result = await sdk.get_published_variables(sample_file_key)
            
            assert isinstance(result, PublishedVariablesResponse)
            assert result.status == 200
            assert not result.error
            assert len(result.variables) == 1
            assert len(result.variable_collections) == 1
            
            mock_get.assert_called_once_with(sample_file_key)
    
    @pytest.mark.asyncio
    async def test_get_variable(self, sdk, sample_file_key, sample_local_variables_response):
        """Test get specific variable."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            variable = await sdk.get_variable(sample_file_key, "variable_123")
            
            assert variable.id == "variable_123"
            assert variable.name == "Primary Color"
            assert variable.resolvedType == "COLOR"
    
    @pytest.mark.asyncio
    async def test_get_variable_not_found(self, sdk, sample_file_key, sample_local_variables_response):
        """Test get variable that doesn't exist."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            with pytest.raises(ValueError, match="Variable nonexistent not found"):
                await sdk.get_variable(sample_file_key, "nonexistent")
    
    @pytest.mark.asyncio
    async def test_get_variable_collection(self, sdk, sample_file_key, sample_local_variables_response):
        """Test get specific variable collection."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            collection = await sdk.get_variable_collection(sample_file_key, "collection_456")
            
            assert collection.id == "collection_456"
            assert collection.name == "Brand Colors"
            assert len(collection.modes) == 2
    
    @pytest.mark.asyncio
    async def test_list_variables(self, sdk, sample_file_key, sample_local_variables_response):
        """Test list all variables."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            variables = await sdk.list_variables(sample_file_key)
            
            assert len(variables) == 1
            assert variables[0].id == "variable_123"
    
    @pytest.mark.asyncio
    async def test_list_variables_filtered_by_collection(self, sdk, sample_file_key, sample_local_variables_response):
        """Test list variables filtered by collection."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            variables = await sdk.list_variables(sample_file_key, collection_id="collection_456")
            
            assert len(variables) == 1
            assert variables[0].variableCollectionId == "collection_456"
    
    @pytest.mark.asyncio
    async def test_list_variable_collections(self, sdk, sample_file_key, sample_local_variables_response):
        """Test list variable collections."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            collections = await sdk.list_variable_collections(sample_file_key)
            
            assert len(collections) == 1
            assert collections[0].id == "collection_456"
    
    @pytest.mark.asyncio
    async def test_search_variables(self, sdk, sample_file_key, sample_local_variables_response):
        """Test search variables by name."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            # Should find the variable
            variables = await sdk.search_variables(sample_file_key, "Primary")
            assert len(variables) == 1
            assert variables[0].name == "Primary Color"
            
            # Should not find non-matching variable
            variables = await sdk.search_variables(sample_file_key, "Secondary")
            assert len(variables) == 0
    
    @pytest.mark.asyncio
    async def test_modify_variables(self, sdk, sample_file_key, sample_modify_response):
        """Test modify variables."""
        request = VariablesRequest(
            variables=[{
                "action": "CREATE",
                "name": "New Variable",
                "variableCollectionId": "collection_456",
                "resolvedType": "COLOR"
            }]
        )
        
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            result = await sdk.modify_variables(sample_file_key, request)
            
            assert result.status == 200
            assert not result.error
            assert "temp_var_1" in result.temp_id_to_real_id
            
            # Verify request was filtered for None values
            call_args = mock_modify.call_args[0]
            assert call_args[0] == sample_file_key
            assert isinstance(call_args[1], dict)
    
    @pytest.mark.asyncio
    async def test_create_variable_collection(self, sdk, sample_file_key, sample_modify_response):
        """Test create variable collection."""
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            collection_id = await sdk.create_variable_collection(
                sample_file_key,
                "New Collection",
                hidden_from_publishing=True,
                initial_mode_name="Light Mode"
            )
            
            assert collection_id == "real_coll_456"  # From temp_id_to_real_id mapping
            
            # Verify the request structure
            call_args = mock_modify.call_args[0]
            request_data = call_args[1]
            
            assert "variableCollections" in request_data
            assert "variableModes" in request_data
            assert request_data["variableCollections"][0]["name"] == "New Collection"
            assert request_data["variableCollections"][0]["hiddenFromPublishing"] is True
    
    @pytest.mark.asyncio
    async def test_create_variable(self, sdk, sample_file_key, sample_modify_response):
        """Test create variable."""
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            variable_id = await sdk.create_variable(
                sample_file_key,
                "New Variable",
                "collection_456",
                VariableResolvedDataType.COLOR,
                description="Test variable",
                scopes=[VariableScope.ALL_FILLS],
                hidden_from_publishing=False
            )
            
            assert variable_id == "real_var_123"  # From temp_id_to_real_id mapping
            
            # Verify the request structure
            call_args = mock_modify.call_args[0]
            request_data = call_args[1]
            
            assert "variables" in request_data
            variable_data = request_data["variables"][0]
            assert variable_data["name"] == "New Variable"
            assert variable_data["resolvedType"] == "COLOR"
            assert variable_data["description"] == "Test variable"
    
    @pytest.mark.asyncio
    async def test_update_variable(self, sdk, sample_file_key, sample_modify_response):
        """Test update variable."""
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            await sdk.update_variable(
                sample_file_key,
                "variable_123",
                name="Updated Variable",
                description="Updated description"
            )
            
            # Verify the request structure
            call_args = mock_modify.call_args[0]
            request_data = call_args[1]
            
            assert "variables" in request_data
            variable_data = request_data["variables"][0]
            assert variable_data["action"] == "UPDATE"
            assert variable_data["id"] == "variable_123"
            assert variable_data["name"] == "Updated Variable"
            assert variable_data["description"] == "Updated description"
    
    @pytest.mark.asyncio
    async def test_delete_variable(self, sdk, sample_file_key, sample_modify_response):
        """Test delete variable."""
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            await sdk.delete_variable(sample_file_key, "variable_123")
            
            # Verify the request structure
            call_args = mock_modify.call_args[0]
            request_data = call_args[1]
            
            assert "variables" in request_data
            variable_data = request_data["variables"][0]
            assert variable_data["action"] == "DELETE"
            assert variable_data["id"] == "variable_123"
    
    @pytest.mark.asyncio
    async def test_set_variable_value(self, sdk, sample_file_key, sample_modify_response):
        """Test set variable value."""
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            await sdk.set_variable_value(
                sample_file_key,
                "variable_123",
                "mode_789",
                {"r": 1.0, "g": 0.0, "b": 0.0, "a": 1.0}
            )
            
            # Verify the request structure
            call_args = mock_modify.call_args[0]
            request_data = call_args[1]
            
            assert "variableModeValues" in request_data
            mode_value = request_data["variableModeValues"][0]
            assert mode_value["variableId"] == "variable_123"
            assert mode_value["modeId"] == "mode_789"
            assert mode_value["value"]["r"] == 1.0
    
    @pytest.mark.asyncio
    async def test_batch_get_variables(self, sdk, sample_file_key, sample_local_variables_response):
        """Test batch get variables."""
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = sample_local_variables_response
            
            variables = await sdk.batch_get_variables(
                sample_file_key,
                ["variable_123", "nonexistent"],
                published=False
            )
            
            # Should only return the existing variable
            assert len(variables) == 1
            assert variables[0].id == "variable_123"
    
    @pytest.mark.asyncio
    async def test_batch_create_variables(self, sdk, sample_file_key, sample_modify_response):
        """Test batch create variables."""
        variables_data = [
            {
                "name": "Variable 1",
                "variableCollectionId": "collection_456",
                "resolvedType": "COLOR"
            },
            {
                "name": "Variable 2",
                "variableCollectionId": "collection_456",
                "resolvedType": "FLOAT"
            }
        ]
        
        with patch.object(sdk.client, 'modify_variables') as mock_modify:
            mock_modify.return_value = sample_modify_response
            
            temp_id_mapping = await sdk.batch_create_variables(sample_file_key, variables_data)
            
            assert isinstance(temp_id_mapping, dict)
            
            # Verify the request structure
            call_args = mock_modify.call_args[0]
            request_data = call_args[1]
            
            assert "variables" in request_data
            assert len(request_data["variables"]) == 2
            assert all(var["action"] == "CREATE" for var in request_data["variables"])
    
    @pytest.mark.asyncio
    async def test_published_variables_workflow(self, sdk, sample_file_key, sample_published_variables_response):
        """Test published variables workflow."""
        with patch.object(sdk.client, 'get_published_variables') as mock_get:
            mock_get.return_value = sample_published_variables_response
            
            # Test getting published variables
            variables = await sdk.list_variables(sample_file_key, published=True)
            assert len(variables) == 1
            assert hasattr(variables[0], 'subscribed_id')
            assert hasattr(variables[0], 'updatedAt')
            
            # Test getting published collections
            collections = await sdk.list_variable_collections(sample_file_key, published=True)
            assert len(collections) == 1
            assert hasattr(collections[0], 'subscribed_id')
            assert hasattr(collections[0], 'updatedAt')
    
    @pytest.mark.asyncio
    async def test_url_file_key_extraction(self, sdk):
        """Test file key extraction from Figma URLs."""
        figma_url = "https://www.figma.com/file/ABC123DEF456/My-Design-File"
        
        with patch.object(sdk.client, 'get_local_variables') as mock_get:
            mock_get.return_value = {"status": 200, "error": False, "meta": {"variables": {}, "variableCollections": {}}}
            
            await sdk.get_local_variables(figma_url)
            
            # Should extract file key from URL
            mock_get.assert_called_once_with("ABC123DEF456")