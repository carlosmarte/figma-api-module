"""High-level SDK for figma_files."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .client import FigmaFileClient
from .models import (
    FileResponse,
    FileNodesResponse,
    ImageRenderResponse,
    ImageFillsResponse,
    FileMetaResponse,
    FileVersionsResponse,
    ImageFormat,
)
from .utils import extract_file_key_from_url, extract_node_id_from_url, format_node_ids

logger = logging.getLogger(__name__)


class FigmaFileSDK:
    """High-level SDK for Figma Files API.

    This SDK provides a convenient, Pythonic interface to the Figma Files API
    with automatic serialization and deserialization of models.

    Examples:
        >>> async with FigmaFileSDK(api_key="...") as sdk:
        ...     file_data = await sdk.get_file("abc123")
        ...     print(file_data.name)
    """

    def __init__(self, client: Optional[FigmaFileClient] = None, **kwargs: Any) -> None:
        """Initialize SDK.

        Args:
            client: Optional pre-configured client
            **kwargs: Arguments to pass to client constructor
        """
        self.client = client or FigmaFileClient(**kwargs)

    async def __aenter__(self) -> FigmaFileSDK:
        """Async context manager entry."""
        await self.client.__aenter__()
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Async context manager exit."""
        await self.client.__aexit__(*args)

    # File Operations

    async def get_file(
        self,
        file_key_or_url: str,
        *,
        version: Optional[str] = None,
        node_ids: Optional[List[str]] = None,
        depth: Optional[int] = None,
        include_geometry: bool = False,
        plugin_data: Optional[List[str]] = None,
        include_branch_data: bool = False,
    ) -> FileResponse:
        """Get a file by key or URL.

        Args:
            file_key_or_url: File key or Figma URL
            version: Specific version ID to get
            node_ids: List of node IDs to include
            depth: Tree traversal depth
            include_geometry: Include vector geometry data
            plugin_data: List of plugin IDs to include data for
            include_branch_data: Include branch metadata

        Returns:
            File response object

        Raises:
            ValueError: If file key cannot be extracted from URL
        """
        file_key = self._extract_file_key(file_key_or_url)

        data = await self.client.get_file(
            file_key,
            version=version,
            ids=node_ids,
            depth=depth,
            geometry="paths" if include_geometry else None,
            plugin_data=plugin_data,
            branch_data=include_branch_data,
        )
        return FileResponse(**data)

    async def get_file_nodes(
        self,
        file_key_or_url: str,
        node_ids: List[str],
        *,
        version: Optional[str] = None,
        depth: Optional[int] = None,
        include_geometry: bool = False,
        plugin_data: Optional[List[str]] = None,
    ) -> FileNodesResponse:
        """Get specific nodes from a file.

        Args:
            file_key_or_url: File key or Figma URL
            node_ids: List of node IDs to retrieve
            version: Specific version ID to get
            depth: Tree traversal depth from nodes
            include_geometry: Include vector geometry data
            plugin_data: List of plugin IDs to include data for

        Returns:
            File nodes response object

        Raises:
            ValueError: If no node IDs provided
        """
        if not node_ids:
            raise ValueError("At least one node ID is required")

        file_key = self._extract_file_key(file_key_or_url)

        data = await self.client.get_file_nodes(
            file_key,
            node_ids,
            version=version,
            depth=depth,
            geometry="paths" if include_geometry else None,
            plugin_data=plugin_data,
        )
        return FileNodesResponse(**data)

    async def get_node_from_url(
        self,
        figma_url: str,
        *,
        version: Optional[str] = None,
        depth: Optional[int] = None,
        include_geometry: bool = False,
        plugin_data: Optional[List[str]] = None,
    ) -> FileNodesResponse:
        """Get a specific node from a Figma URL.

        Args:
            figma_url: Full Figma URL with node ID
            version: Specific version ID to get
            depth: Tree traversal depth from node
            include_geometry: Include vector geometry data
            plugin_data: List of plugin IDs to include data for

        Returns:
            File nodes response object

        Raises:
            ValueError: If node ID cannot be extracted from URL
        """
        file_key = self._extract_file_key(figma_url)
        node_id = extract_node_id_from_url(figma_url)
        
        if not node_id:
            raise ValueError("Could not extract node ID from URL")

        return await self.get_file_nodes(
            file_key,
            [node_id],
            version=version,
            depth=depth,
            include_geometry=include_geometry,
            plugin_data=plugin_data,
        )

    async def render_images(
        self,
        file_key_or_url: str,
        node_ids: List[str],
        *,
        version: Optional[str] = None,
        scale: float = 1.0,
        format: ImageFormat = ImageFormat.PNG,
        svg_options: Optional[Dict[str, bool]] = None,
        contents_only: bool = True,
        use_absolute_bounds: bool = False,
    ) -> ImageRenderResponse:
        """Render images of file nodes.

        Args:
            file_key_or_url: File key or Figma URL
            node_ids: List of node IDs to render
            version: Specific version ID to get
            scale: Image scaling factor (0.01-4)
            format: Image format
            svg_options: SVG-specific options
            contents_only: Exclude overlapping content
            use_absolute_bounds: Use full node dimensions

        Returns:
            Image render response object

        Raises:
            ValueError: If no node IDs provided or invalid scale
        """
        if not node_ids:
            raise ValueError("At least one node ID is required")
        
        if not 0.01 <= scale <= 4:
            raise ValueError("Scale must be between 0.01 and 4")

        file_key = self._extract_file_key(file_key_or_url)

        # Default SVG options
        svg_opts = {
            "svg_outline_text": True,
            "svg_include_id": False,
            "svg_include_node_id": False,
            "svg_simplify_stroke": True,
        }
        if svg_options:
            svg_opts.update(svg_options)

        data = await self.client.render_images(
            file_key,
            node_ids,
            version=version,
            scale=scale,
            format=format.value,
            contents_only=contents_only,
            use_absolute_bounds=use_absolute_bounds,
            **svg_opts,
        )
        return ImageRenderResponse(**data)

    async def render_node_from_url(
        self,
        figma_url: str,
        *,
        version: Optional[str] = None,
        scale: float = 1.0,
        format: ImageFormat = ImageFormat.PNG,
        **kwargs: Any,
    ) -> ImageRenderResponse:
        """Render an image of a node from a Figma URL.

        Args:
            figma_url: Full Figma URL with node ID
            version: Specific version ID to get
            scale: Image scaling factor (0.01-4)
            format: Image format
            **kwargs: Additional rendering options

        Returns:
            Image render response object

        Raises:
            ValueError: If node ID cannot be extracted from URL
        """
        file_key = self._extract_file_key(figma_url)
        node_id = extract_node_id_from_url(figma_url)
        
        if not node_id:
            raise ValueError("Could not extract node ID from URL")

        return await self.render_images(
            file_key,
            [node_id],
            version=version,
            scale=scale,
            format=format,
            **kwargs,
        )

    async def get_image_fills(self, file_key_or_url: str) -> ImageFillsResponse:
        """Get image fills from a file.

        Args:
            file_key_or_url: File key or Figma URL

        Returns:
            Image fills response object
        """
        file_key = self._extract_file_key(file_key_or_url)
        data = await self.client.get_image_fills(file_key)
        return ImageFillsResponse(**data)

    async def get_file_metadata(self, file_key_or_url: str) -> FileMetaResponse:
        """Get file metadata.

        Args:
            file_key_or_url: File key or Figma URL

        Returns:
            File metadata response object
        """
        file_key = self._extract_file_key(file_key_or_url)
        data = await self.client.get_file_meta(file_key)
        return FileMetaResponse(**data)

    async def get_file_versions(
        self,
        file_key_or_url: str,
        *,
        page_size: int = 30,
        before: Optional[int] = None,
        after: Optional[int] = None,
    ) -> FileVersionsResponse:
        """Get file version history.

        Args:
            file_key_or_url: File key or Figma URL
            page_size: Number of versions per page (max 50)
            before: Get versions before this ID
            after: Get versions after this ID

        Returns:
            File versions response object

        Raises:
            ValueError: If page_size is invalid
        """
        if not 1 <= page_size <= 50:
            raise ValueError("Page size must be between 1 and 50")

        file_key = self._extract_file_key(file_key_or_url)
        data = await self.client.get_file_versions(
            file_key,
            page_size=page_size,
            before=before,
            after=after,
        )
        return FileVersionsResponse(**data)

    # Batch Operations

    async def batch_render_images(
        self,
        requests: List[Dict[str, Any]],
    ) -> List[ImageRenderResponse]:
        """Render multiple sets of images in parallel.

        Args:
            requests: List of render request dictionaries

        Returns:
            List of image render responses
        """
        import asyncio

        tasks = []
        for request in requests:
            file_key = request["file_key_or_url"]
            node_ids = request["node_ids"]
            options = {k: v for k, v in request.items() 
                      if k not in ["file_key_or_url", "node_ids"]}
            
            task = self.render_images(file_key, node_ids, **options)
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        responses = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Failed to render images: {result}")
                # Create error response
                responses.append(ImageRenderResponse(
                    err=str(result),
                    images={}
                ))
            else:
                responses.append(result)

        return responses

    # Helper Methods

    def _extract_file_key(self, file_key_or_url: str) -> str:
        """Extract file key from file key or URL.

        Args:
            file_key_or_url: File key or Figma URL

        Returns:
            File key

        Raises:
            ValueError: If file key cannot be extracted
        """
        # If it looks like a URL, extract the file key
        if file_key_or_url.startswith("http"):
            file_key = extract_file_key_from_url(file_key_or_url)
            if not file_key:
                raise ValueError("Could not extract file key from URL")
            return file_key
        
        # Otherwise, assume it's already a file key
        return file_key_or_url

    # Search and Discovery Methods

    async def search_nodes_by_name(
        self,
        file_key_or_url: str,
        name_pattern: str,
        *,
        case_sensitive: bool = False,
    ) -> List[Dict[str, Any]]:
        """Search for nodes by name pattern in a file.

        Args:
            file_key_or_url: File key or Figma URL
            name_pattern: Name pattern to search for
            case_sensitive: Whether search is case sensitive

        Returns:
            List of matching nodes
        """
        import re
        
        file_data = await self.get_file(file_key_or_url)
        
        # Recursive function to search nodes
        def search_node(node: Dict[str, Any]) -> List[Dict[str, Any]]:
            matches = []
            
            node_name = node.get("name", "")
            if case_sensitive:
                pattern_match = name_pattern in node_name
            else:
                pattern_match = name_pattern.lower() in node_name.lower()
            
            if pattern_match:
                matches.append({
                    "id": node.get("id"),
                    "name": node_name,
                    "type": node.get("type"),
                })
            
            # Search children recursively
            children = node.get("children", [])
            for child in children:
                matches.extend(search_node(child))
            
            return matches

        # Start search from document root
        document = file_data.document.model_dump()
        return search_node(document)

    async def get_components_in_file(
        self,
        file_key_or_url: str,
    ) -> List[Dict[str, Any]]:
        """Get all components in a file.

        Args:
            file_key_or_url: File key or Figma URL

        Returns:
            List of components with metadata
        """
        file_data = await self.get_file(file_key_or_url)
        
        components = []
        for component_id, component in file_data.components.items():
            components.append({
                "id": component_id,
                "key": component.key,
                "name": component.name,
                "description": component.description,
                "document_id": component.document_id,
            })
        
        return components