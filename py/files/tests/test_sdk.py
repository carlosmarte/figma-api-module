"""Tests for FigmaFileSDK."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from figma_files.sdk import FigmaFileSDK
from figma_files.models import ImageFormat
from figma_files.errors import ApiError


class TestFigmaFileSDK:
    """Test FigmaFileSDK class."""

    @pytest.mark.asyncio
    async def test_sdk_context_manager(self, sdk_with_mock_client):
        """Test SDK async context manager."""
        async with sdk_with_mock_client as sdk:
            assert sdk.client is not None

    @pytest.mark.asyncio
    async def test_get_file_with_file_key(self, sdk_with_mock_client, file_key: str, test_file_response):
        """Test get_file with file key."""
        # Mock the client response
        sdk_with_mock_client.client.get_file.return_value = test_file_response.model_dump()
        
        result = await sdk_with_mock_client.get_file(file_key)
        
        sdk_with_mock_client.client.get_file.assert_called_once_with(
            file_key,
            version=None,
            ids=None,
            depth=None,
            geometry=None,
            plugin_data=None,
            branch_data=False,
        )
        assert result.name == test_file_response.name

    @pytest.mark.asyncio
    async def test_get_file_with_url(self, sdk_with_mock_client, figma_url: str, test_file_response):
        """Test get_file with Figma URL."""
        sdk_with_mock_client.client.get_file.return_value = test_file_response.model_dump()
        
        result = await sdk_with_mock_client.get_file(figma_url)
        
        # Should extract file key from URL
        expected_file_key = "abc123def456"
        sdk_with_mock_client.client.get_file.assert_called_once_with(
            expected_file_key,
            version=None,
            ids=None,
            depth=None,
            geometry=None,
            plugin_data=None,
            branch_data=False,
        )

    @pytest.mark.asyncio
    async def test_get_file_with_params(self, sdk_with_mock_client, file_key: str, test_file_response, node_ids: list[str]):
        """Test get_file with parameters."""
        sdk_with_mock_client.client.get_file.return_value = test_file_response.model_dump()
        
        result = await sdk_with_mock_client.get_file(
            file_key,
            version="123",
            node_ids=node_ids,
            depth=2,
            include_geometry=True,
            plugin_data=["plugin1"],
            include_branch_data=True,
        )
        
        sdk_with_mock_client.client.get_file.assert_called_once_with(
            file_key,
            version="123",
            ids=node_ids,
            depth=2,
            geometry="paths",
            plugin_data=["plugin1"],
            branch_data=True,
        )

    @pytest.mark.asyncio
    async def test_get_file_nodes(self, sdk_with_mock_client, file_key: str, node_ids: list[str], test_file_nodes_response):
        """Test get_file_nodes method."""
        sdk_with_mock_client.client.get_file_nodes.return_value = test_file_nodes_response.model_dump()
        
        result = await sdk_with_mock_client.get_file_nodes(file_key, node_ids)
        
        sdk_with_mock_client.client.get_file_nodes.assert_called_once_with(
            file_key,
            node_ids,
            version=None,
            depth=None,
            geometry=None,
            plugin_data=None,
        )
        assert result.name == test_file_nodes_response.name

    @pytest.mark.asyncio
    async def test_get_file_nodes_empty_list_raises_error(self, sdk_with_mock_client, file_key: str):
        """Test get_file_nodes raises error with empty node list."""
        with pytest.raises(ValueError, match="At least one node ID is required"):
            await sdk_with_mock_client.get_file_nodes(file_key, [])

    @pytest.mark.asyncio
    async def test_get_node_from_url(self, sdk_with_mock_client, figma_url: str, test_file_nodes_response):
        """Test get_node_from_url method."""
        sdk_with_mock_client.client.get_file_nodes.return_value = test_file_nodes_response.model_dump()
        
        result = await sdk_with_mock_client.get_node_from_url(figma_url)
        
        expected_file_key = "abc123def456"
        expected_node_id = "1:2"
        sdk_with_mock_client.client.get_file_nodes.assert_called_once_with(
            expected_file_key,
            [expected_node_id],
            version=None,
            depth=None,
            geometry=None,
            plugin_data=None,
        )

    @pytest.mark.asyncio
    async def test_get_node_from_url_no_node_id_raises_error(self, sdk_with_mock_client, figma_url_no_node: str):
        """Test get_node_from_url raises error when no node ID in URL."""
        with pytest.raises(ValueError, match="Could not extract node ID from URL"):
            await sdk_with_mock_client.get_node_from_url(figma_url_no_node)

    @pytest.mark.asyncio
    async def test_render_images(self, sdk_with_mock_client, file_key: str, node_ids: list[str], test_image_response):
        """Test render_images method."""
        sdk_with_mock_client.client.render_images.return_value = test_image_response.model_dump()
        
        result = await sdk_with_mock_client.render_images(
            file_key,
            node_ids,
            scale=2.0,
            format=ImageFormat.SVG,
            svg_options={"svg_outline_text": False},
            contents_only=False,
        )
        
        sdk_with_mock_client.client.render_images.assert_called_once_with(
            file_key,
            node_ids,
            version=None,
            scale=2.0,
            format="svg",
            contents_only=False,
            use_absolute_bounds=False,
            svg_outline_text=False,
            svg_include_id=False,
            svg_include_node_id=False,
            svg_simplify_stroke=True,
        )

    @pytest.mark.asyncio
    async def test_render_images_empty_list_raises_error(self, sdk_with_mock_client, file_key: str):
        """Test render_images raises error with empty node list."""
        with pytest.raises(ValueError, match="At least one node ID is required"):
            await sdk_with_mock_client.render_images(file_key, [])

    @pytest.mark.asyncio
    async def test_render_images_invalid_scale_raises_error(self, sdk_with_mock_client, file_key: str, node_ids: list[str]):
        """Test render_images raises error with invalid scale."""
        with pytest.raises(ValueError, match="Scale must be between 0.01 and 4"):
            await sdk_with_mock_client.render_images(file_key, node_ids, scale=5.0)

    @pytest.mark.asyncio
    async def test_render_node_from_url(self, sdk_with_mock_client, figma_url: str, test_image_response):
        """Test render_node_from_url method."""
        sdk_with_mock_client.client.render_images.return_value = test_image_response.model_dump()
        
        result = await sdk_with_mock_client.render_node_from_url(figma_url, scale=1.5)
        
        expected_file_key = "abc123def456"
        expected_node_id = "1:2"
        sdk_with_mock_client.client.render_images.assert_called_once_with(
            expected_file_key,
            [expected_node_id],
            version=None,
            scale=1.5,
            format="png",
            contents_only=True,
            use_absolute_bounds=False,
            svg_outline_text=True,
            svg_include_id=False,
            svg_include_node_id=False,
            svg_simplify_stroke=True,
        )

    @pytest.mark.asyncio
    async def test_get_image_fills(self, sdk_with_mock_client, file_key: str, test_image_fills_response):
        """Test get_image_fills method."""
        sdk_with_mock_client.client.get_image_fills.return_value = test_image_fills_response.model_dump()
        
        result = await sdk_with_mock_client.get_image_fills(file_key)
        
        sdk_with_mock_client.client.get_image_fills.assert_called_once_with(file_key)
        assert result.error == test_image_fills_response.error

    @pytest.mark.asyncio
    async def test_get_file_metadata(self, sdk_with_mock_client, file_key: str, test_file_meta_response):
        """Test get_file_metadata method."""
        sdk_with_mock_client.client.get_file_meta.return_value = test_file_meta_response.model_dump()
        
        result = await sdk_with_mock_client.get_file_metadata(file_key)
        
        sdk_with_mock_client.client.get_file_meta.assert_called_once_with(file_key)
        assert result.name == test_file_meta_response.name

    @pytest.mark.asyncio
    async def test_get_file_versions(self, sdk_with_mock_client, file_key: str, test_versions_response):
        """Test get_file_versions method."""
        sdk_with_mock_client.client.get_file_versions.return_value = test_versions_response.model_dump()
        
        result = await sdk_with_mock_client.get_file_versions(file_key, page_size=20)
        
        sdk_with_mock_client.client.get_file_versions.assert_called_once_with(
            file_key,
            page_size=20,
            before=None,
            after=None,
        )
        assert len(result.versions) == len(test_versions_response.versions)

    @pytest.mark.asyncio
    async def test_get_file_versions_invalid_page_size_raises_error(self, sdk_with_mock_client, file_key: str):
        """Test get_file_versions raises error with invalid page size."""
        with pytest.raises(ValueError, match="Page size must be between 1 and 50"):
            await sdk_with_mock_client.get_file_versions(file_key, page_size=100)

    @pytest.mark.asyncio
    async def test_batch_render_images(self, sdk_with_mock_client, test_image_response):
        """Test batch_render_images method."""
        # Mock the render_images method
        async def mock_render_images(*args, **kwargs):
            return test_image_response
        
        sdk_with_mock_client.render_images = AsyncMock(side_effect=mock_render_images)
        
        requests = [
            {"file_key_or_url": "file1", "node_ids": ["1:1"]},
            {"file_key_or_url": "file2", "node_ids": ["2:2"], "scale": 2.0},
        ]
        
        results = await sdk_with_mock_client.batch_render_images(requests)
        
        assert len(results) == 2
        assert all(isinstance(r, type(test_image_response)) for r in results)

    @pytest.mark.asyncio
    async def test_batch_render_images_with_errors(self, sdk_with_mock_client):
        """Test batch_render_images handles errors gracefully."""
        # Mock render_images to raise an error for the second request
        async def mock_render_images(file_key_or_url, *args, **kwargs):
            if file_key_or_url == "file2":
                raise ApiError("Test error")
            return test_image_response
        
        sdk_with_mock_client.render_images = AsyncMock(side_effect=mock_render_images)
        
        requests = [
            {"file_key_or_url": "file1", "node_ids": ["1:1"]},
            {"file_key_or_url": "file2", "node_ids": ["2:2"]},
        ]
        
        results = await sdk_with_mock_client.batch_render_images(requests)
        
        assert len(results) == 2
        assert results[1].err == "Test error"

    def test_extract_file_key_from_url(self, sdk_with_mock_client, figma_url: str):
        """Test _extract_file_key method with URL."""
        file_key = sdk_with_mock_client._extract_file_key(figma_url)
        assert file_key == "abc123def456"

    def test_extract_file_key_from_key(self, sdk_with_mock_client, file_key: str):
        """Test _extract_file_key method with file key."""
        result = sdk_with_mock_client._extract_file_key(file_key)
        assert result == file_key

    def test_extract_file_key_invalid_url_raises_error(self, sdk_with_mock_client):
        """Test _extract_file_key raises error with invalid URL."""
        with pytest.raises(ValueError, match="Could not extract file key from URL"):
            sdk_with_mock_client._extract_file_key("https://invalid-url.com")

    @pytest.mark.asyncio
    async def test_search_nodes_by_name(self, sdk_with_mock_client, file_key: str, test_file_response):
        """Test search_nodes_by_name method."""
        # Mock get_file to return a file with searchable nodes
        sdk_with_mock_client.get_file = AsyncMock(return_value=test_file_response)
        
        results = await sdk_with_mock_client.search_nodes_by_name(file_key, "Frame")
        
        # Should find nodes with "Frame" in the name
        assert len(results) > 0
        assert any("Frame" in result["name"] for result in results)

    @pytest.mark.asyncio
    async def test_search_nodes_by_name_case_sensitive(self, sdk_with_mock_client, file_key: str, test_file_response):
        """Test search_nodes_by_name with case sensitivity."""
        sdk_with_mock_client.get_file = AsyncMock(return_value=test_file_response)
        
        # Should not find lowercase "frame" when case sensitive
        results = await sdk_with_mock_client.search_nodes_by_name(file_key, "frame", case_sensitive=True)
        assert len(results) == 0
        
        # Should find uppercase "Frame" when case sensitive
        results = await sdk_with_mock_client.search_nodes_by_name(file_key, "Frame", case_sensitive=True)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_get_components_in_file(self, sdk_with_mock_client, file_key: str, test_file_response):
        """Test get_components_in_file method."""
        sdk_with_mock_client.get_file = AsyncMock(return_value=test_file_response)
        
        components = await sdk_with_mock_client.get_components_in_file(file_key)
        
        assert len(components) == len(test_file_response.components)
        if components:
            component = components[0]
            assert "id" in component
            assert "key" in component
            assert "name" in component
            assert "description" in component