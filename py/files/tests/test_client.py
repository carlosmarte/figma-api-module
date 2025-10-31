"""Tests for FigmaFileClient."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from figma_files.client import FigmaFileClient, RateLimiter
from figma_files.errors import ApiError, RateLimitError, AuthenticationError


class TestRateLimiter:
    """Test RateLimiter class."""

    @pytest.mark.asyncio
    async def test_rate_limiter_allows_requests_within_limit(self):
        """Test that rate limiter allows requests within limit."""
        limiter = RateLimiter(rate=5, per=1.0)
        
        # Should allow 5 requests immediately
        for _ in range(5):
            await limiter.acquire()
        
        # The 6th request should be delayed (we won't wait for it)
        assert limiter.tokens <= 0

    @pytest.mark.asyncio
    async def test_rate_limiter_replenishes_tokens(self):
        """Test that rate limiter replenishes tokens over time."""
        import asyncio
        
        limiter = RateLimiter(rate=2, per=0.1)  # 2 requests per 0.1 seconds
        
        # Use up tokens
        await limiter.acquire()
        await limiter.acquire()
        
        # Wait for replenishment
        await asyncio.sleep(0.1)
        
        # Should be able to acquire again
        await limiter.acquire()


class TestFigmaFileClient:
    """Test FigmaFileClient class."""

    def test_client_init_requires_api_key(self):
        """Test that client requires API key."""
        with pytest.raises(ValueError, match="API key is required"):
            FigmaFileClient("")

    def test_client_init_with_valid_key(self, api_key: str):
        """Test client initialization with valid key."""
        client = FigmaFileClient(api_key)
        assert client.api_key == api_key
        assert client.base_url == "https://api.figma.com"
        assert client.timeout == 30.0
        assert client.max_retries == 3

    def test_client_init_with_custom_params(self, api_key: str):
        """Test client initialization with custom parameters."""
        client = FigmaFileClient(
            api_key=api_key,
            base_url="https://custom.api.com",
            timeout=60.0,
            max_retries=5,
            rate_limit=10,
        )
        assert client.base_url == "https://custom.api.com"
        assert client.timeout == 60.0
        assert client.max_retries == 5
        assert client._rate_limiter is not None

    @pytest.mark.asyncio
    async def test_client_context_manager(self, api_key: str):
        """Test client async context manager."""
        async with FigmaFileClient(api_key) as client:
            assert client._client is not None
        # Client should be closed after context exit
        assert client._client is None

    @pytest.mark.asyncio
    async def test_client_request_success(self, api_key: str, mock_httpx_response):
        """Test successful request."""
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_client_instance = AsyncMock()
            mock_async_client.return_value = mock_client_instance
            mock_client_instance.request.return_value = mock_httpx_response
            
            client = FigmaFileClient(api_key)
            async with client:
                response = await client._request("GET", "/test")
                assert response == mock_httpx_response

    @pytest.mark.asyncio
    async def test_client_request_authentication_error(self, api_key: str):
        """Test authentication error handling."""
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_client_instance = AsyncMock()
            mock_async_client.return_value = mock_client_instance
            
            mock_response = MagicMock()
            mock_response.status_code = 401
            mock_client_instance.request.return_value = mock_response
            
            client = FigmaFileClient(api_key)
            async with client:
                with pytest.raises(AuthenticationError):
                    await client._request("GET", "/test")

    @pytest.mark.asyncio
    async def test_client_request_rate_limit_error(self, api_key: str):
        """Test rate limit error handling."""
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_client_instance = AsyncMock()
            mock_async_client.return_value = mock_client_instance
            
            mock_response = MagicMock()
            mock_response.status_code = 429
            mock_response.headers = {"Retry-After": "60"}
            mock_client_instance.request.return_value = mock_response
            
            client = FigmaFileClient(api_key, max_retries=1)
            async with client:
                with pytest.raises(RateLimitError) as exc_info:
                    await client._request("GET", "/test")
                assert exc_info.value.retry_after == 60

    @pytest.mark.asyncio
    async def test_client_request_server_error_with_retry(self, api_key: str):
        """Test server error with retry logic."""
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_client_instance = AsyncMock()
            mock_async_client.return_value = mock_client_instance
            
            # First request fails with 500, second succeeds
            error_response = MagicMock()
            error_response.status_code = 500
            error_response.text = "Internal Server Error"
            
            success_response = MagicMock()
            success_response.status_code = 200
            success_response.raise_for_status.return_value = None
            
            mock_client_instance.request.side_effect = [
                httpx.HTTPStatusError("Server Error", request=MagicMock(), response=error_response),
                success_response,
            ]
            
            client = FigmaFileClient(api_key, max_retries=2)
            async with client:
                with patch("asyncio.sleep"):  # Skip actual sleep
                    response = await client._request("GET", "/test")
                    assert response == success_response

    @pytest.mark.asyncio
    async def test_get_file(self, api_key: str, file_key: str):
        """Test get_file method."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"name": "Test File"}
            
            client = FigmaFileClient(api_key)
            result = await client.get_file(file_key)
            
            mock_get.assert_called_once_with(f"/v1/files/{file_key}", params={})
            assert result == {"name": "Test File"}

    @pytest.mark.asyncio
    async def test_get_file_with_params(self, api_key: str, file_key: str, node_ids: list[str]):
        """Test get_file method with parameters."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"name": "Test File"}
            
            client = FigmaFileClient(api_key)
            result = await client.get_file(
                file_key,
                version="123",
                ids=node_ids,
                depth=2,
                geometry="paths",
                plugin_data=["plugin1"],
                branch_data=True,
            )
            
            expected_params = {
                "version": "123",
                "ids": "1:2,3:4,5:6",
                "depth": "2",
                "geometry": "paths",
                "plugin_data": "plugin1",
                "branch_data": "true",
            }
            mock_get.assert_called_once_with(f"/v1/files/{file_key}", params=expected_params)

    @pytest.mark.asyncio
    async def test_get_file_nodes(self, api_key: str, file_key: str, node_ids: list[str]):
        """Test get_file_nodes method."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"nodes": {}}
            
            client = FigmaFileClient(api_key)
            result = await client.get_file_nodes(file_key, node_ids)
            
            expected_params = {"ids": "1:2,3:4,5:6"}
            mock_get.assert_called_once_with(f"/v1/files/{file_key}/nodes", params=expected_params)

    @pytest.mark.asyncio
    async def test_render_images(self, api_key: str, file_key: str, node_ids: list[str]):
        """Test render_images method."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"images": {}}
            
            client = FigmaFileClient(api_key)
            result = await client.render_images(
                file_key,
                node_ids,
                scale=2.0,
                format="svg",
                svg_outline_text=False,
            )
            
            expected_params = {
                "ids": "1:2,3:4,5:6",
                "scale": "2.0",
                "format": "svg",
                "svg_outline_text": "false",
                "svg_include_id": "false",
                "svg_include_node_id": "false",
                "svg_simplify_stroke": "true",
                "contents_only": "true",
                "use_absolute_bounds": "false",
            }
            mock_get.assert_called_once_with(f"/v1/images/{file_key}", params=expected_params)

    @pytest.mark.asyncio
    async def test_get_image_fills(self, api_key: str, file_key: str):
        """Test get_image_fills method."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"meta": {"images": {}}}
            
            client = FigmaFileClient(api_key)
            result = await client.get_image_fills(file_key)
            
            mock_get.assert_called_once_with(f"/v1/files/{file_key}/images")

    @pytest.mark.asyncio
    async def test_get_file_meta(self, api_key: str, file_key: str):
        """Test get_file_meta method."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"name": "Test File"}
            
            client = FigmaFileClient(api_key)
            result = await client.get_file_meta(file_key)
            
            mock_get.assert_called_once_with(f"/v1/files/{file_key}/meta")

    @pytest.mark.asyncio
    async def test_get_file_versions(self, api_key: str, file_key: str):
        """Test get_file_versions method."""
        with patch.object(FigmaFileClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"versions": []}
            
            client = FigmaFileClient(api_key)
            result = await client.get_file_versions(
                file_key,
                page_size=20,
                before=100,
                after=50,
            )
            
            expected_params = {
                "page_size": "20",
                "before": "100",
                "after": "50",
            }
            mock_get.assert_called_once_with(f"/v1/files/{file_key}/versions", params=expected_params)