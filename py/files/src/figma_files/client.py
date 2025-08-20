"""Core API client for figma_files."""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional, TypeVar
from urllib.parse import urljoin

import httpx
from pydantic import BaseModel

from .errors import ApiError, RateLimitError, AuthenticationError
from .utils import build_query_params

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, rate: int = 10, per: float = 1.0) -> None:
        """Initialize rate limiter.

        Args:
            rate: Number of requests allowed
            per: Time period in seconds
        """
        self.rate = rate
        self.per = per
        self.tokens = rate
        self.updated_at = asyncio.get_event_loop().time()

    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        while self.tokens <= 0:
            now = asyncio.get_event_loop().time()
            elapsed = now - self.updated_at
            self.tokens += elapsed * (self.rate / self.per)
            self.tokens = min(self.tokens, self.rate)
            self.updated_at = now

            if self.tokens <= 0:
                sleep_time = (1 - self.tokens) * (self.per / self.rate)
                await asyncio.sleep(sleep_time)

        self.tokens -= 1


class FigmaFileClient:
    """Low-level API client for Figma Files.

    This client provides direct access to the Figma Files API with automatic
    rate limiting, retries, and error handling.

    Examples:
        >>> async with FigmaFileClient(api_key="...") as client:
        ...     file_data = await client.get_file("abc123")
        ...     print(file_data["name"])
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit: Optional[int] = None,
    ) -> None:
        """Initialize the Figma API client.

        Args:
            api_key: Figma API token (Personal Access Token)
            base_url: Base URL for the Figma API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            rate_limit: Optional rate limit (requests per second)

        Raises:
            ValueError: If api_key is empty
        """
        if not api_key:
            raise ValueError("API key is required")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

        self._client: Optional[httpx.AsyncClient] = None
        self._rate_limiter = RateLimiter(rate=rate_limit) if rate_limit else None
        self._session_headers = {
            "X-Figma-Token": api_key,
            "User-Agent": "figma-files-python-sdk/1.0.0",
        }

    async def __aenter__(self) -> FigmaFileClient:
        """Async context manager entry."""
        await self._ensure_client()
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Async context manager exit."""
        await self.close()

    async def _ensure_client(self) -> None:
        """Ensure HTTP client is initialized."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers=self._session_headers,
                follow_redirects=True,
            )

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Execute HTTP request with retries and rate limiting.

        Args:
            method: HTTP method
            path: API endpoint path
            params: Query parameters
            json: JSON body
            headers: Additional headers

        Returns:
            HTTP response

        Raises:
            ApiError: For API errors
            RateLimitError: When rate limited
            AuthenticationError: For auth failures
        """
        await self._ensure_client()

        if self._rate_limiter:
            await self._rate_limiter.acquire()

        url = urljoin(self.base_url, path)

        for attempt in range(self.max_retries):
            try:
                response = await self._client.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    headers=headers,
                )

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "60"))
                    if attempt < self.max_retries - 1:
                        logger.warning(f"Rate limited, retrying after {retry_after}s")
                        await asyncio.sleep(retry_after)
                        continue
                    raise RateLimitError(retry_after=retry_after)

                if response.status_code == 401:
                    raise AuthenticationError("Invalid API token")

                if response.status_code == 403:
                    raise AuthenticationError("Access forbidden - check scopes")

                response.raise_for_status()
                return response

            except httpx.HTTPStatusError as e:
                if attempt < self.max_retries - 1 and 500 <= e.response.status_code < 600:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Server error, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue

                try:
                    error_data = e.response.json()
                    error_message = error_data.get("err", error_data.get("message", str(e)))
                except Exception:
                    error_message = f"HTTP {e.response.status_code}: {e.response.text}"

                raise ApiError(
                    error_message,
                    status_code=e.response.status_code,
                )

            except httpx.RequestError as e:
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Request error, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                    continue
                raise ApiError(f"Request failed: {e}")

        raise ApiError(f"Max retries ({self.max_retries}) exceeded")

    async def get(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Execute GET request."""
        response = await self._request("GET", path, **kwargs)
        return response.json()

    # File Operations

    async def get_file(
        self,
        file_key: str,
        *,
        version: Optional[str] = None,
        ids: Optional[List[str]] = None,
        depth: Optional[int] = None,
        geometry: Optional[str] = None,
        plugin_data: Optional[List[str]] = None,
        branch_data: bool = False,
    ) -> Dict[str, Any]:
        """Get file JSON.

        Args:
            file_key: File key to get
            version: Specific version ID
            ids: List of node IDs to include
            depth: Tree traversal depth
            geometry: Set to "paths" for vector data
            plugin_data: List of plugin IDs
            branch_data: Include branch metadata

        Returns:
            File data
        """
        params = build_query_params(
            version=version,
            ids=",".join(ids) if ids else None,
            depth=depth,
            geometry=geometry,
            plugin_data=",".join(plugin_data) if plugin_data else None,
            branch_data=branch_data,
        )

        return await self.get(f"/v1/files/{file_key}", params=params)

    async def get_file_nodes(
        self,
        file_key: str,
        node_ids: List[str],
        *,
        version: Optional[str] = None,
        depth: Optional[int] = None,
        geometry: Optional[str] = None,
        plugin_data: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Get file JSON for specific nodes.

        Args:
            file_key: File key
            node_ids: List of node IDs to retrieve
            version: Specific version ID
            depth: Tree traversal depth from nodes
            geometry: Set to "paths" for vector data
            plugin_data: List of plugin IDs

        Returns:
            Node data
        """
        params = build_query_params(
            ids=",".join(node_ids),
            version=version,
            depth=depth,
            geometry=geometry,
            plugin_data=",".join(plugin_data) if plugin_data else None,
        )

        return await self.get(f"/v1/files/{file_key}/nodes", params=params)

    async def render_images(
        self,
        file_key: str,
        node_ids: List[str],
        *,
        version: Optional[str] = None,
        scale: Optional[float] = None,
        format: str = "png",
        svg_outline_text: bool = True,
        svg_include_id: bool = False,
        svg_include_node_id: bool = False,
        svg_simplify_stroke: bool = True,
        contents_only: bool = True,
        use_absolute_bounds: bool = False,
    ) -> Dict[str, Any]:
        """Render images of file nodes.

        Args:
            file_key: File key
            node_ids: List of node IDs to render
            version: Specific version ID
            scale: Image scaling factor (0.01-4)
            format: Image format (jpg, png, svg, pdf)
            svg_outline_text: Render text as outlines in SVG
            svg_include_id: Include layer names as IDs in SVG
            svg_include_node_id: Include node IDs in SVG
            svg_simplify_stroke: Simplify strokes in SVG
            contents_only: Exclude overlapping content
            use_absolute_bounds: Use full node dimensions

        Returns:
            Image URLs by node ID
        """
        params = build_query_params(
            ids=",".join(node_ids),
            version=version,
            scale=scale,
            format=format,
            svg_outline_text=svg_outline_text,
            svg_include_id=svg_include_id,
            svg_include_node_id=svg_include_node_id,
            svg_simplify_stroke=svg_simplify_stroke,
            contents_only=contents_only,
            use_absolute_bounds=use_absolute_bounds,
        )

        return await self.get(f"/v1/images/{file_key}", params=params)

    async def get_image_fills(self, file_key: str) -> Dict[str, Any]:
        """Get image fills from a file.

        Args:
            file_key: File key

        Returns:
            Image fill URLs by reference
        """
        return await self.get(f"/v1/files/{file_key}/images")

    async def get_file_meta(self, file_key: str) -> Dict[str, Any]:
        """Get file metadata.

        Args:
            file_key: File key

        Returns:
            File metadata
        """
        return await self.get(f"/v1/files/{file_key}/meta")

    async def get_file_versions(
        self,
        file_key: str,
        *,
        page_size: Optional[int] = None,
        before: Optional[int] = None,
        after: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get file version history.

        Args:
            file_key: File key
            page_size: Number of versions per page (max 50)
            before: Get versions before this ID
            after: Get versions after this ID

        Returns:
            File versions and pagination info
        """
        params = build_query_params(
            page_size=page_size,
            before=before,
            after=after,
        )

        return await self.get(f"/v1/files/{file_key}/versions", params=params)