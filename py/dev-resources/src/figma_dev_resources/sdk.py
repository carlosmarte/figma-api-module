"""High-level SDK for Figma Dev Resources API."""

from typing import List, Optional

from .client import FigmaDevResourcesClient
from .models import (
    CreateDevResourcesRequest,
    CreateDevResourcesResponse,
    DeleteDevResourceResponse,
    DevResource,
    DevResourceCreate,
    DevResourceUpdate,
    GetDevResourcesResponse,
    UpdateDevResourcesRequest,
    UpdateDevResourcesResponse,
)
from .utils import format_node_ids, chunk_list


class FigmaDevResourcesSDK:
    """High-level SDK for Figma Dev Resources API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        max_retries: int = 3,
        timeout: float = 30.0,
        rate_limit_requests: int = 100,
        rate_limit_window: int = 60,
    ):
        """Initialize the SDK.
        
        Args:
            api_key: Figma API key with dev_resources scope
            base_url: Base URL for the API
            max_retries: Maximum number of retries for failed requests
            timeout: Request timeout in seconds
            rate_limit_requests: Maximum requests per time window
            rate_limit_window: Rate limit time window in seconds
        """
        self._client = FigmaDevResourcesClient(
            api_key=api_key,
            base_url=base_url,
            max_retries=max_retries,
            timeout=timeout,
            rate_limit_requests=rate_limit_requests,
            rate_limit_window=rate_limit_window,
        )

    async def __aenter__(self):
        """Async context manager entry."""
        await self._client.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self._client.__aexit__(exc_type, exc_val, exc_tb)

    async def close(self) -> None:
        """Close the underlying client."""
        await self._client.close()

    async def get_dev_resources(
        self,
        file_key: str,
        node_ids: Optional[List[str]] = None
    ) -> List[DevResource]:
        """Get dev resources in a file.
        
        Args:
            file_key: The file to get dev resources from
            node_ids: Optional list of node IDs to filter by
            
        Returns:
            List of dev resources
            
        Example:
            >>> resources = await sdk.get_dev_resources("abc123")
            >>> filtered = await sdk.get_dev_resources("abc123", ["1:2", "1:3"])
        """
        params = {}
        if node_ids:
            params["node_ids"] = format_node_ids(node_ids)

        response_data = await self._client.get(
            f"/v1/files/{file_key}/dev_resources",
            params=params
        )
        
        response = GetDevResourcesResponse(**response_data)
        return response.dev_resources

    async def create_dev_resources(
        self,
        dev_resources: List[DevResourceCreate]
    ) -> CreateDevResourcesResponse:
        """Create dev resources across multiple files.
        
        Args:
            dev_resources: List of dev resources to create
            
        Returns:
            Response with created resources and any errors
            
        Example:
            >>> resource = DevResourceCreate(
            ...     name="Component Library",
            ...     url="https://storybook.company.com",
            ...     file_key="abc123",
            ...     node_id="1:2"
            ... )
            >>> result = await sdk.create_dev_resources([resource])
        """
        request = CreateDevResourcesRequest(dev_resources=dev_resources)
        
        response_data = await self._client.post(
            "/v1/dev_resources",
            json=request.model_dump()
        )
        
        return CreateDevResourcesResponse(**response_data)

    async def update_dev_resources(
        self,
        dev_resources: List[DevResourceUpdate]
    ) -> UpdateDevResourcesResponse:
        """Update existing dev resources.
        
        Args:
            dev_resources: List of dev resource updates
            
        Returns:
            Response with updated resources and any errors
            
        Example:
            >>> update = DevResourceUpdate(
            ...     id="resource123",
            ...     name="Updated Component Library",
            ...     url="https://new-storybook.company.com"
            ... )
            >>> result = await sdk.update_dev_resources([update])
        """
        request = UpdateDevResourcesRequest(dev_resources=dev_resources)
        
        response_data = await self._client.put(
            "/v1/dev_resources",
            json=request.model_dump()
        )
        
        return UpdateDevResourcesResponse(**response_data)

    async def delete_dev_resource(
        self,
        file_key: str,
        dev_resource_id: str
    ) -> DeleteDevResourceResponse:
        """Delete a dev resource from a file.
        
        Args:
            file_key: The file to delete the dev resource from
            dev_resource_id: The ID of the dev resource to delete
            
        Returns:
            Delete response
            
        Example:
            >>> result = await sdk.delete_dev_resource("abc123", "resource123")
        """
        response_data = await self._client.delete(
            f"/v1/files/{file_key}/dev_resources/{dev_resource_id}"
        )
        
        # Handle cases where DELETE might not return JSON
        if "status" in response_data and "error" not in response_data:
            response_data["error"] = False
            
        return DeleteDevResourceResponse(**response_data)

    async def batch_create_dev_resources(
        self,
        dev_resources: List[DevResourceCreate],
        batch_size: int = 100
    ) -> List[CreateDevResourcesResponse]:
        """Create dev resources in batches to handle large datasets.
        
        Args:
            dev_resources: List of dev resources to create
            batch_size: Maximum number of resources per batch
            
        Returns:
            List of responses for each batch
            
        Example:
            >>> resources = [DevResourceCreate(...) for _ in range(500)]
            >>> results = await sdk.batch_create_dev_resources(resources)
        """
        batches = chunk_list(dev_resources, batch_size)
        results = []
        
        for batch in batches:
            result = await self.create_dev_resources(batch)
            results.append(result)
            
        return results

    async def batch_update_dev_resources(
        self,
        dev_resources: List[DevResourceUpdate],
        batch_size: int = 100
    ) -> List[UpdateDevResourcesResponse]:
        """Update dev resources in batches to handle large datasets.
        
        Args:
            dev_resources: List of dev resource updates
            batch_size: Maximum number of resources per batch
            
        Returns:
            List of responses for each batch
            
        Example:
            >>> updates = [DevResourceUpdate(...) for _ in range(200)]
            >>> results = await sdk.batch_update_dev_resources(updates)
        """
        batches = chunk_list(dev_resources, batch_size)
        results = []
        
        for batch in batches:
            result = await self.update_dev_resources(batch)
            results.append(result)
            
        return results

    async def search_dev_resources(
        self,
        file_key: str,
        search_term: str,
        node_ids: Optional[List[str]] = None
    ) -> List[DevResource]:
        """Search dev resources by name or URL.
        
        Args:
            file_key: The file to search in
            search_term: Term to search for in names and URLs
            node_ids: Optional list of node IDs to filter by
            
        Returns:
            List of matching dev resources
            
        Example:
            >>> results = await sdk.search_dev_resources("abc123", "storybook")
        """
        all_resources = await self.get_dev_resources(file_key, node_ids)
        
        search_lower = search_term.lower()
        matching_resources = []
        
        for resource in all_resources:
            if (search_lower in resource.name.lower() or 
                search_lower in resource.url.lower()):
                matching_resources.append(resource)
                
        return matching_resources

    async def get_dev_resources_by_node(
        self,
        file_key: str,
        node_id: str
    ) -> List[DevResource]:
        """Get all dev resources attached to a specific node.
        
        Args:
            file_key: The file key
            node_id: The specific node ID
            
        Returns:
            List of dev resources for the node
            
        Example:
            >>> resources = await sdk.get_dev_resources_by_node("abc123", "1:2")
        """
        return await self.get_dev_resources(file_key, [node_id])

    async def bulk_delete_dev_resources(
        self,
        deletions: List[tuple[str, str]]
    ) -> List[DeleteDevResourceResponse]:
        """Delete multiple dev resources.
        
        Args:
            deletions: List of (file_key, dev_resource_id) tuples
            
        Returns:
            List of delete responses
            
        Example:
            >>> deletions = [("file1", "res1"), ("file2", "res2")]
            >>> results = await sdk.bulk_delete_dev_resources(deletions)
        """
        results = []
        
        for file_key, dev_resource_id in deletions:
            result = await self.delete_dev_resource(file_key, dev_resource_id)
            results.append(result)
            
        return results