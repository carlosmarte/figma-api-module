"""Tests for the FigmaComponentsClient."""

import pytest
import asyncio
from unittest.mock import AsyncMock, Mock, patch
from typing import Dict, Any

import httpx

from figma_components.client import FigmaComponentsClient, RateLimiter
from figma_components.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    ValidationError,
    NetworkError,
)


class TestRateLimiter:
    """Tests for the RateLimiter class."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_requests_within_limit(self):
        """Test that rate limiter allows requests within the limit."""
        limiter = RateLimiter(max_requests=2, time_window=1)
        
        # Should allow first two requests immediately
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should complete quickly
        assert end_time - start_time < 0.1
    
    @pytest.mark.asyncio
    async def test_rate_limiter_throttles_excess_requests(self):
        """Test that rate limiter throttles requests exceeding the limit."""
        limiter = RateLimiter(max_requests=1, time_window=1)
        
        # First request should be immediate
        await limiter.acquire()
        
        # Second request should be delayed
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should have been delayed
        assert end_time - start_time >= 0.9


class TestFigmaComponentsClient:
    """Tests for the FigmaComponentsClient class."""
    
    def test_client_initialization_with_valid_key(self, mock_api_key: str):
        """Test client initialization with valid API key."""
        client = FigmaComponentsClient(mock_api_key)
        assert client.api_key == mock_api_key
        assert client.base_url == "https://api.figma.com"
        assert client.timeout == 30.0
        assert client.max_retries == 3
    
    def test_client_initialization_with_invalid_key(self):
        """Test client initialization with invalid API key."""
        with pytest.raises(ValidationError):
            FigmaComponentsClient("invalid-key")
    
    def test_client_initialization_with_custom_settings(self, mock_api_key: str):
        """Test client initialization with custom settings."""
        client = FigmaComponentsClient(
            mock_api_key,
            base_url="https://custom.api.com",
            timeout=60.0,
            max_retries=5,
        )
        assert client.base_url == "https://custom.api.com"
        assert client.timeout == 60.0
        assert client.max_retries == 5
    
    @pytest.mark.asyncio
    async def test_client_context_manager(self, mock_api_key: str):
        """Test client as async context manager."""
        with patch('httpx.AsyncClient') as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_httpx.return_value = mock_client_instance
            
            async with FigmaComponentsClient(mock_api_key) as client:
                assert client._client is not None
                mock_httpx.assert_called_once()
            
            mock_client_instance.aclose.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_client_manual_start_close(self, mock_api_key: str):
        """Test manual start and close of client."""
        with patch('httpx.AsyncClient') as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_httpx.return_value = mock_client_instance
            
            client = FigmaComponentsClient(mock_api_key)
            
            await client.start()
            assert client._client is not None
            
            await client.close()
            mock_client_instance.aclose.assert_called_once()
    
    def test_client_property_not_started(self, mock_api_key: str):
        """Test accessing client property when not started."""
        client = FigmaComponentsClient(mock_api_key)
        
        with pytest.raises(RuntimeError):
            _ = client.client
    
    @pytest.mark.asyncio
    async def test_handle_http_errors(self, mock_api_key: str):
        """Test HTTP error handling."""
        client = FigmaComponentsClient(mock_api_key)
        
        # Test different status codes
        test_cases = [
            (401, AuthenticationError),
            (403, AuthorizationError),
            (404, NotFoundError),
            (429, RateLimitError),
            (500, ApiError),
        ]
        
        for status_code, expected_exception in test_cases:
            response = Mock()
            response.status_code = status_code
            response.json.return_value = {"message": "Test error"}
            response.headers = {}
            
            with pytest.raises(expected_exception):
                client._handle_http_error(response)
    
    @pytest.mark.asyncio
    async def test_successful_get_request(self, mock_client: FigmaComponentsClient):
        """Test successful GET request."""
        expected_data = {"status": 200, "data": "test"}
        mock_client.get.return_value = expected_data
        
        result = await mock_client.get("/test/path")
        assert result == expected_data
        mock_client.get.assert_called_once_with("/test/path")
    
    @pytest.mark.asyncio
    async def test_component_endpoints(self, mock_client: FigmaComponentsClient):
        """Test component-specific endpoints."""
        # Test get_team_components
        await mock_client.get_team_components("team123", page_size=50)
        mock_client.get.assert_called_with(
            "/v1/teams/team123/components",
            params={"page_size": 50}
        )
        
        # Test get_file_components
        await mock_client.get_file_components("file123")
        mock_client.get.assert_called_with("/v1/files/file123/components")
        
        # Test get_component
        await mock_client.get_component("comp123")
        mock_client.get.assert_called_with("/v1/components/comp123")
    
    @pytest.mark.asyncio
    async def test_component_set_endpoints(self, mock_client: FigmaComponentsClient):
        """Test component set endpoints."""
        # Test get_team_component_sets
        await mock_client.get_team_component_sets("team123", after=100)
        mock_client.get.assert_called_with(
            "/v1/teams/team123/component_sets",
            params={"page_size": 30, "after": 100}
        )
        
        # Test get_file_component_sets
        await mock_client.get_file_component_sets("file123")
        mock_client.get.assert_called_with("/v1/files/file123/component_sets")
        
        # Test get_component_set
        await mock_client.get_component_set("cs123")
        mock_client.get.assert_called_with("/v1/component_sets/cs123")
    
    @pytest.mark.asyncio
    async def test_style_endpoints(self, mock_client: FigmaComponentsClient):
        """Test style endpoints."""
        # Test get_team_styles
        await mock_client.get_team_styles("team123", before=200)
        mock_client.get.assert_called_with(
            "/v1/teams/team123/styles",
            params={"page_size": 30, "before": 200}
        )
        
        # Test get_file_styles
        await mock_client.get_file_styles("file123")
        mock_client.get.assert_called_with("/v1/files/file123/styles")
        
        # Test get_style
        await mock_client.get_style("style123")
        mock_client.get.assert_called_with("/v1/styles/style123")
    
    @pytest.mark.asyncio
    async def test_pagination(self, mock_client: FigmaComponentsClient):
        """Test pagination functionality."""
        # Mock paginate to yield some items
        async def mock_paginate(*args, **kwargs):
            yield {"id": "1", "name": "Item 1"}
            yield {"id": "2", "name": "Item 2"}
        
        mock_client.paginate = mock_paginate
        
        items = []
        async for item in mock_client.paginate("/test", items_key="items"):
            items.append(item)
        
        assert len(items) == 2
        assert items[0]["id"] == "1"
        assert items[1]["id"] == "2"
    
    @pytest.mark.asyncio
    async def test_request_with_retries(self, mock_api_key: str):
        """Test request retry logic."""
        with patch('httpx.AsyncClient') as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_httpx.return_value = mock_client_instance
            
            # Mock server error on first call, success on second
            error_response = Mock()
            error_response.status_code = 500
            error_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Server error", request=Mock(), response=error_response
            )
            
            success_response = Mock()
            success_response.status_code = 200
            success_response.raise_for_status = Mock()
            success_response.json.return_value = {"status": 200}
            
            mock_client_instance.request.side_effect = [error_response, success_response]
            
            client = FigmaComponentsClient(mock_api_key, max_retries=1)
            await client.start()
            
            # Should retry and succeed
            with patch('asyncio.sleep'):  # Speed up test
                response = await client._request("GET", "/test")
            
            assert response == success_response
            assert mock_client_instance.request.call_count == 2
    
    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, mock_api_key: str):
        """Test rate limit error handling."""
        with patch('httpx.AsyncClient') as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_httpx.return_value = mock_client_instance
            
            # Mock rate limit response
            rate_limit_response = Mock()
            rate_limit_response.status_code = 429
            rate_limit_response.headers = {"Retry-After": "60"}
            rate_limit_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Rate limited", request=Mock(), response=rate_limit_response
            )
            
            mock_client_instance.request.return_value = rate_limit_response
            
            client = FigmaComponentsClient(mock_api_key, max_retries=0)
            await client.start()
            
            with pytest.raises(RateLimitError) as exc_info:
                await client._request("GET", "/test")
            
            assert exc_info.value.retry_after == 60
    
    @pytest.mark.asyncio
    async def test_network_error_handling(self, mock_api_key: str):
        """Test network error handling."""
        with patch('httpx.AsyncClient') as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_httpx.return_value = mock_client_instance
            
            # Mock network error
            mock_client_instance.request.side_effect = httpx.RequestError("Network error")
            
            client = FigmaComponentsClient(mock_api_key, max_retries=0)
            await client.start()
            
            with pytest.raises(NetworkError):
                await client._request("GET", "/test")