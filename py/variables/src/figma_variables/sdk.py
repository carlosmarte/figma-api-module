"""
High-level SDK for Figma Variables API.
"""

from typing import Dict, List, Optional, Any, Union
import asyncio

from .client import FigmaVariablesClient
from .models import (
    LocalVariable,
    LocalVariableCollection,
    PublishedVariable,
    PublishedVariableCollection,
    VariablesRequest,
    VariableCollectionChange,
    VariableModeChange,
    VariableChange,
    VariableModeValue,
    LocalVariablesResponse,
    PublishedVariablesResponse,
    VariablesModifyResponse,
    VariableResolvedDataType,
    VariableScope,
)
from .utils import extract_file_key_from_url, validate_file_key, generate_temp_id


class FigmaVariablesSDK:
    """High-level SDK for Figma Variables API."""
    
    def __init__(
        self,
        api_token: str,
        base_url: str = "https://api.figma.com",
        **client_kwargs
    ):
        """
        Initialize the Figma Variables SDK.
        
        Args:
            api_token: Figma personal access token with file_variables scope
            base_url: Base URL for Figma API
            **client_kwargs: Additional client configuration
        """
        self.client = FigmaVariablesClient(
            api_token=api_token,
            base_url=base_url,
            **client_kwargs
        )
        self._is_closed = False
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.client.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def close(self) -> None:
        """Close the SDK and underlying client."""
        if not self._is_closed:
            await self.client.close()
            self._is_closed = True
    
    def _normalize_file_key(self, file_key: str) -> str:
        """
        Normalize file key, extracting from URL if necessary.
        
        Args:
            file_key: File key or Figma URL
            
        Returns:
            Normalized file key
            
        Raises:
            ValueError: If file key is invalid
        """
        # Try to extract from URL first
        if "figma.com" in file_key:
            extracted = extract_file_key_from_url(file_key)
            if extracted:
                file_key = extracted
        
        if not validate_file_key(file_key):
            raise ValueError(f"Invalid file key: {file_key}")
        
        return file_key
    
    # Read Operations
    
    async def get_local_variables(
        self,
        file_key: str
    ) -> LocalVariablesResponse:
        """
        Get local variables from a file.
        
        Args:
            file_key: Figma file key or URL
            
        Returns:
            Local variables response with parsed models
            
        Raises:
            AuthorizationError: If not Enterprise organization
            NotFoundError: If file not found
        """
        file_key = self._normalize_file_key(file_key)
        response_data = await self.client.get_local_variables(file_key)
        return LocalVariablesResponse(**response_data)
    
    async def get_published_variables(
        self,
        file_key: str
    ) -> PublishedVariablesResponse:
        """
        Get published variables from a file.
        
        Args:
            file_key: Figma file key or URL (must be main file, not branch)
            
        Returns:
            Published variables response with parsed models
            
        Raises:
            AuthorizationError: If not Enterprise organization
            NotFoundError: If file not found
        """
        file_key = self._normalize_file_key(file_key)
        response_data = await self.client.get_published_variables(file_key)
        return PublishedVariablesResponse(**response_data)
    
    async def get_variable(
        self,
        file_key: str,
        variable_id: str,
        published: bool = False
    ) -> Union[LocalVariable, PublishedVariable]:
        """
        Get a specific variable by ID.
        
        Args:
            file_key: Figma file key or URL
            variable_id: Variable ID to retrieve
            published: Whether to get published version
            
        Returns:
            Variable model
            
        Raises:
            NotFoundError: If variable not found
        """
        if published:
            response = await self.get_published_variables(file_key)
            variables = response.variables
        else:
            response = await self.get_local_variables(file_key)
            variables = response.variables
        
        if variable_id not in variables:
            raise ValueError(f"Variable {variable_id} not found")
        
        return variables[variable_id]
    
    async def get_variable_collection(
        self,
        file_key: str,
        collection_id: str,
        published: bool = False
    ) -> Union[LocalVariableCollection, PublishedVariableCollection]:
        """
        Get a specific variable collection by ID.
        
        Args:
            file_key: Figma file key or URL
            collection_id: Collection ID to retrieve
            published: Whether to get published version
            
        Returns:
            Variable collection model
            
        Raises:
            NotFoundError: If collection not found
        """
        if published:
            response = await self.get_published_variables(file_key)
            collections = response.variable_collections
        else:
            response = await self.get_local_variables(file_key)
            collections = response.variable_collections
        
        if collection_id not in collections:
            raise ValueError(f"Variable collection {collection_id} not found")
        
        return collections[collection_id]
    
    async def list_variables(
        self,
        file_key: str,
        collection_id: Optional[str] = None,
        published: bool = False
    ) -> List[Union[LocalVariable, PublishedVariable]]:
        """
        List all variables in a file or collection.
        
        Args:
            file_key: Figma file key or URL
            collection_id: Optional collection ID to filter by
            published: Whether to get published versions
            
        Returns:
            List of variable models
        """
        if published:
            response = await self.get_published_variables(file_key)
            variables = response.variables
        else:
            response = await self.get_local_variables(file_key)
            variables = response.variables
        
        result = list(variables.values())
        
        if collection_id:
            result = [
                var for var in result
                if var.variableCollectionId == collection_id
            ]
        
        return result
    
    async def list_variable_collections(
        self,
        file_key: str,
        published: bool = False
    ) -> List[Union[LocalVariableCollection, PublishedVariableCollection]]:
        """
        List all variable collections in a file.
        
        Args:
            file_key: Figma file key or URL
            published: Whether to get published versions
            
        Returns:
            List of variable collection models
        """
        if published:
            response = await self.get_published_variables(file_key)
            collections = response.variable_collections
        else:
            response = await self.get_local_variables(file_key)
            collections = response.variable_collections
        
        return list(collections.values())
    
    async def search_variables(
        self,
        file_key: str,
        query: str,
        published: bool = False
    ) -> List[Union[LocalVariable, PublishedVariable]]:
        """
        Search for variables by name.
        
        Args:
            file_key: Figma file key or URL
            query: Search query (matches variable names)
            published: Whether to search published versions
            
        Returns:
            List of matching variable models
        """
        variables = await self.list_variables(file_key, published=published)
        query_lower = query.lower()
        
        return [
            var for var in variables
            if query_lower in var.name.lower()
        ]
    
    # Write Operations
    
    async def modify_variables(
        self,
        file_key: str,
        request: VariablesRequest
    ) -> VariablesModifyResponse:
        """
        Create, modify, or delete variables and collections.
        
        Args:
            file_key: Figma file key or URL
            request: Variables modification request
            
        Returns:
            Variables modification response
            
        Raises:
            AuthorizationError: If insufficient permissions
        """
        file_key = self._normalize_file_key(file_key)
        
        # Convert request to dict, filtering None values
        request_data = request.dict(exclude_none=True)
        
        response_data = await self.client.modify_variables(file_key, request_data)
        return VariablesModifyResponse(**response_data)
    
    async def create_variable_collection(
        self,
        file_key: str,
        name: str,
        hidden_from_publishing: bool = False,
        initial_mode_name: str = "Mode 1"
    ) -> str:
        """
        Create a new variable collection.
        
        Args:
            file_key: Figma file key or URL
            name: Collection name
            hidden_from_publishing: Whether to hide from publishing
            initial_mode_name: Name for the initial mode
            
        Returns:
            Real ID of the created collection
        """
        temp_collection_id = generate_temp_id("collection")
        temp_mode_id = generate_temp_id("mode")
        
        request = VariablesRequest(
            variableCollections=[{
                "action": "CREATE",
                "id": temp_collection_id,
                "name": name,
                "hiddenFromPublishing": hidden_from_publishing,
                "initialModeId": temp_mode_id
            }],
            variableModes=[{
                "action": "CREATE",
                "id": temp_mode_id,
                "name": initial_mode_name,
                "variableCollectionId": temp_collection_id
            }]
        )
        
        response = await self.modify_variables(file_key, request)
        return response.temp_id_to_real_id.get(temp_collection_id, temp_collection_id)
    
    async def create_variable(
        self,
        file_key: str,
        name: str,
        collection_id: str,
        variable_type: VariableResolvedDataType,
        description: str = "",
        scopes: Optional[List[VariableScope]] = None,
        hidden_from_publishing: bool = False
    ) -> str:
        """
        Create a new variable.
        
        Args:
            file_key: Figma file key or URL
            name: Variable name
            collection_id: Collection ID to add variable to
            variable_type: Variable data type
            description: Variable description
            scopes: Variable scopes
            hidden_from_publishing: Whether to hide from publishing
            
        Returns:
            Real ID of the created variable
        """
        temp_variable_id = generate_temp_id("variable")
        
        request = VariablesRequest(
            variables=[{
                "action": "CREATE",
                "id": temp_variable_id,
                "name": name,
                "variableCollectionId": collection_id,
                "resolvedType": variable_type,
                "description": description,
                "scopes": scopes or [],
                "hiddenFromPublishing": hidden_from_publishing
            }]
        )
        
        response = await self.modify_variables(file_key, request)
        return response.temp_id_to_real_id.get(temp_variable_id, temp_variable_id)
    
    async def update_variable(
        self,
        file_key: str,
        variable_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        scopes: Optional[List[VariableScope]] = None,
        hidden_from_publishing: Optional[bool] = None
    ) -> None:
        """
        Update an existing variable.
        
        Args:
            file_key: Figma file key or URL
            variable_id: Variable ID to update
            name: New variable name
            description: New variable description
            scopes: New variable scopes
            hidden_from_publishing: Whether to hide from publishing
        """
        update_data = {"action": "UPDATE", "id": variable_id}
        
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if scopes is not None:
            update_data["scopes"] = scopes
        if hidden_from_publishing is not None:
            update_data["hiddenFromPublishing"] = hidden_from_publishing
        
        request = VariablesRequest(variables=[update_data])
        await self.modify_variables(file_key, request)
    
    async def delete_variable(self, file_key: str, variable_id: str) -> None:
        """
        Delete a variable.
        
        Args:
            file_key: Figma file key or URL
            variable_id: Variable ID to delete
        """
        request = VariablesRequest(
            variables=[{
                "action": "DELETE",
                "id": variable_id
            }]
        )
        
        await self.modify_variables(file_key, request)
    
    async def set_variable_value(
        self,
        file_key: str,
        variable_id: str,
        mode_id: str,
        value: Any
    ) -> None:
        """
        Set a variable value for a specific mode.
        
        Args:
            file_key: Figma file key or URL
            variable_id: Variable ID
            mode_id: Mode ID
            value: Variable value (must match variable type)
        """
        request = VariablesRequest(
            variableModeValues=[{
                "variableId": variable_id,
                "modeId": mode_id,
                "value": value
            }]
        )
        
        await self.modify_variables(file_key, request)
    
    # Batch Operations
    
    async def batch_get_variables(
        self,
        file_key: str,
        variable_ids: List[str],
        published: bool = False
    ) -> List[Union[LocalVariable, PublishedVariable]]:
        """
        Get multiple variables by ID in a single request.
        
        Args:
            file_key: Figma file key or URL
            variable_ids: List of variable IDs
            published: Whether to get published versions
            
        Returns:
            List of variable models
        """
        if published:
            response = await self.get_published_variables(file_key)
            variables = response.variables
        else:
            response = await self.get_local_variables(file_key)
            variables = response.variables
        
        return [
            variables[var_id] for var_id in variable_ids
            if var_id in variables
        ]
    
    async def batch_create_variables(
        self,
        file_key: str,
        variables_data: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Create multiple variables in a single request.
        
        Args:
            file_key: Figma file key or URL
            variables_data: List of variable creation data
            
        Returns:
            Mapping of temporary IDs to real IDs
        """
        variables = []
        temp_id_mapping = {}
        
        for var_data in variables_data:
            temp_id = generate_temp_id("variable")
            temp_id_mapping[temp_id] = var_data.get("name", "Unknown")
            
            variables.append({
                "action": "CREATE",
                "id": temp_id,
                **var_data
            })
        
        request = VariablesRequest(variables=variables)
        response = await self.modify_variables(file_key, request)
        
        return response.temp_id_to_real_id