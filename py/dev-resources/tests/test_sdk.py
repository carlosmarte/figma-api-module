"""Tests for the FigmaDevResourcesSDK."""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock

from figma_dev_resources.sdk import FigmaDevResourcesSDK
from figma_dev_resources.models import (
    DevResource,
    DevResourceCreate,
    DevResourceUpdate,
    CreateDevResourcesResponse,
    UpdateDevResourcesResponse,
    DeleteDevResourceResponse,
)


class TestFigmaDevResourcesSDK:
    """Test the high-level SDK."""

    async def test_get_dev_resources(self, sdk, file_key, dev_resource):
        """Test getting dev resources."""
        # Mock client response
        sdk._client.get.return_value = {
            "dev_resources": [dev_resource.model_dump()]
        }
        
        result = await sdk.get_dev_resources(file_key)
        
        assert len(result) == 1
        assert isinstance(result[0], DevResource)
        assert result[0].id == dev_resource.id
        
        sdk._client.get.assert_called_once_with(
            f"/v1/files/{file_key}/dev_resources",
            params={}
        )

    async def test_get_dev_resources_with_node_ids(self, sdk, file_key, dev_resource):
        """Test getting dev resources with node ID filter."""
        node_ids = ["1:2", "1:3"]
        
        sdk._client.get.return_value = {
            "dev_resources": [dev_resource.model_dump()]
        }
        
        result = await sdk.get_dev_resources(file_key, node_ids)
        
        assert len(result) == 1
        sdk._client.get.assert_called_once_with(
            f"/v1/files/{file_key}/dev_resources",
            params={"node_ids": "1:2,1:3"}
        )

    async def test_create_dev_resources(self, sdk, dev_resource_create, dev_resource):
        """Test creating dev resources."""
        sdk._client.post.return_value = {
            "links_created": [dev_resource.model_dump()],
            "errors": []
        }
        
        result = await sdk.create_dev_resources([dev_resource_create])
        
        assert isinstance(result, CreateDevResourcesResponse)
        assert len(result.links_created) == 1
        assert len(result.errors) == 0
        
        sdk._client.post.assert_called_once()

    async def test_update_dev_resources(self, sdk, dev_resource_update, dev_resource):
        """Test updating dev resources."""
        sdk._client.put.return_value = {
            "links_updated": [dev_resource.model_dump()],
            "errors": []
        }
        
        result = await sdk.update_dev_resources([dev_resource_update])
        
        assert isinstance(result, UpdateDevResourcesResponse)
        assert len(result.links_updated) == 1
        assert len(result.errors) == 0
        
        sdk._client.put.assert_called_once()

    async def test_delete_dev_resource(self, sdk, file_key):
        """Test deleting a dev resource."""
        resource_id = "resource_123"
        
        sdk._client.delete.return_value = {
            "status": 200,
            "error": False
        }
        
        result = await sdk.delete_dev_resource(file_key, resource_id)
        
        assert isinstance(result, DeleteDevResourceResponse)
        assert result.status == 200
        assert result.error is False
        
        sdk._client.delete.assert_called_once_with(
            f"/v1/files/{file_key}/dev_resources/{resource_id}"
        )

    async def test_search_dev_resources(self, sdk, file_key, dev_resource):
        """Test searching dev resources."""
        # Create resources with different names/URLs
        resource1 = dev_resource.model_copy()
        resource1.name = "Storybook Components"
        resource1.url = "https://storybook.company.com"
        
        resource2 = dev_resource.model_copy()
        resource2.name = "API Documentation"
        resource2.url = "https://docs.company.com"
        
        sdk._client.get.return_value = {
            "dev_resources": [resource1.model_dump(), resource2.model_dump()]
        }
        
        # Search for "storybook"
        result = await sdk.search_dev_resources(file_key, "storybook")
        
        assert len(result) == 1
        assert result[0].name == "Storybook Components"

    async def test_get_dev_resources_by_node(self, sdk, file_key, node_id, dev_resource):
        """Test getting dev resources by specific node."""
        sdk._client.get.return_value = {
            "dev_resources": [dev_resource.model_dump()]
        }
        
        result = await sdk.get_dev_resources_by_node(file_key, node_id)
        
        assert len(result) == 1
        sdk._client.get.assert_called_once_with(
            f"/v1/files/{file_key}/dev_resources",
            params={"node_ids": node_id}
        )

    async def test_batch_create_dev_resources(self, sdk, dev_resource_create, dev_resource):
        """Test batch creating dev resources."""
        # Create a list of 250 resources (will be split into 3 batches of 100)
        resources = [dev_resource_create.model_copy() for _ in range(250)]
        
        sdk._client.post.return_value = {
            "links_created": [dev_resource.model_dump()],
            "errors": []
        }
        
        results = await sdk.batch_create_dev_resources(resources, batch_size=100)
        
        assert len(results) == 3  # 3 batches
        assert sdk._client.post.call_count == 3

    async def test_batch_update_dev_resources(self, sdk, dev_resource_update, dev_resource):
        """Test batch updating dev resources."""
        updates = [dev_resource_update.model_copy() for _ in range(150)]
        
        sdk._client.put.return_value = {
            "links_updated": [dev_resource.model_dump()],
            "errors": []
        }
        
        results = await sdk.batch_update_dev_resources(updates, batch_size=100)
        
        assert len(results) == 2  # 2 batches
        assert sdk._client.put.call_count == 2

    async def test_bulk_delete_dev_resources(self, sdk):
        """Test bulk deleting dev resources."""
        deletions = [
            ("file1", "resource1"),
            ("file2", "resource2"),
            ("file3", "resource3")
        ]
        
        sdk._client.delete.return_value = {
            "status": 200,
            "error": False
        }
        
        results = await sdk.bulk_delete_dev_resources(deletions)
        
        assert len(results) == 3
        assert sdk._client.delete.call_count == 3

    async def test_context_manager(self, api_key, mock_client):
        """Test SDK as async context manager."""
        sdk = FigmaDevResourcesSDK(api_key)
        sdk._client = mock_client
        
        async with sdk as context_sdk:
            assert context_sdk is sdk
            mock_client.__aenter__.assert_called_once()
        
        mock_client.__aexit__.assert_called_once()

    async def test_close(self, sdk):
        """Test closing the SDK."""
        await sdk.close()
        sdk._client.close.assert_called_once()