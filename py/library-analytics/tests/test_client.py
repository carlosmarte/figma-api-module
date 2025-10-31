"""
Tests for FigmaAnalyticsClient.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from figma_library_analytics.client import FigmaAnalyticsClient, RateLimiter
from figma_library_analytics.errors import (
    ApiError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
)


class TestRateLimiter:
    """Test RateLimiter class."""
    
    def test_init(self):
        """Test rate limiter initialization."""
        limiter = RateLimiter(requests_per_minute=60)
        assert limiter.requests_per_minute == 60
        assert limiter.bucket_size == 60
        assert limiter.tokens == 60
    
    @pytest.mark.asyncio
    async def test_acquire_with_tokens(self):
        """Test acquiring tokens when available."""
        limiter = RateLimiter(requests_per_minute=60)
        
        # Should acquire immediately
        await limiter.acquire()
        assert limiter.tokens == 59
    
    @pytest.mark.asyncio
    async def test_acquire_without_tokens(self):
        """Test acquiring tokens when bucket is empty."""
        limiter = RateLimiter(requests_per_minute=60)
        limiter.tokens = 0
        
        # Should wait and then acquire
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should have waited some time
        assert end_time > start_time


class TestFigmaAnalyticsClient:
    """Test FigmaAnalyticsClient class."""
    
    def test_init(self, api_key):
        """Test client initialization."""
        client = FigmaAnalyticsClient(api_key)
        assert client.api_key == api_key
        assert client.base_url == "https://api.figma.com"
        assert client.max_retries == 3
        assert client.timeout == 30.0
    
    def test_init_with_custom_params(self, api_key):
        """Test client initialization with custom parameters."""
        client = FigmaAnalyticsClient(
            api_key,
            base_url="https://custom.api.com",
            requests_per_minute=100,
            max_retries=5,
            timeout=60.0,
        )
        assert client.base_url == "https://custom.api.com"
        assert client.max_retries == 5
        assert client.timeout == 60.0
    
    @pytest.mark.asyncio
    async def test_context_manager(self, api_key):
        """Test async context manager."""
        async with FigmaAnalyticsClient(api_key) as client:
            assert client.api_key == api_key
        # Client should be closed after exiting context
    
    def test_handle_error_401(self, api_key):
        """Test handling 401 authentication error."""
        client = FigmaAnalyticsClient(api_key)
        response = MagicMock()
        response.status_code = 401
        response.json.return_value = {"err": "Invalid token"}
        
        with pytest.raises(AuthenticationError) as exc_info:
            client._handle_error(response)
        
        assert "Authentication failed" in str(exc_info.value)
        assert exc_info.value.status_code == 401
    
    def test_handle_error_403(self, api_key):
        """Test handling 403 authorization error."""
        client = FigmaAnalyticsClient(api_key)
        response = MagicMock()
        response.status_code = 403
        response.json.return_value = {"err": "Insufficient permissions"}
        
        with pytest.raises(AuthorizationError) as exc_info:
            client._handle_error(response)
        
        assert "Access forbidden" in str(exc_info.value)
        assert exc_info.value.status_code == 403
    
    def test_handle_error_404(self, api_key):
        """Test handling 404 not found error."""
        client = FigmaAnalyticsClient(api_key)
        response = MagicMock()
        response.status_code = 404
        response.json.return_value = {"err": "File not found"}
        
        with pytest.raises(NotFoundError) as exc_info:
            client._handle_error(response)
        
        assert "Resource not found" in str(exc_info.value)
        assert exc_info.value.status_code == 404
    
    def test_handle_error_429(self, api_key):
        """Test handling 429 rate limit error."""
        client = FigmaAnalyticsClient(api_key)
        response = MagicMock()
        response.status_code = 429
        response.headers = {"Retry-After": "120"}
        response.json.return_value = {"err": "Rate limit exceeded"}
        
        with pytest.raises(RateLimitError) as exc_info:
            client._handle_error(response)
        
        assert "Rate limit exceeded" in str(exc_info.value)
        assert exc_info.value.status_code == 429
        assert exc_info.value.retry_after == 120
    
    def test_handle_error_500(self, api_key):
        """Test handling 500 server error."""
        client = FigmaAnalyticsClient(api_key)
        response = MagicMock()
        response.status_code = 500
        response.json.return_value = {"err": "Internal server error"}
        
        with pytest.raises(ApiError) as exc_info:
            client._handle_error(response)
        
        assert "API error" in str(exc_info.value)
        assert exc_info.value.status_code == 500
    
    def test_handle_error_json_decode_error(self, api_key):
        """Test handling error when response JSON is invalid."""
        client = FigmaAnalyticsClient(api_key)
        response = MagicMock()
        response.status_code = 400
        response.json.side_effect = ValueError("Invalid JSON")
        
        with pytest.raises(ApiError) as exc_info:
            client._handle_error(response)
        
        assert "HTTP 400 error" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_request_with_retries_success(self, api_key):
        """Test successful request without retries."""
        client = FigmaAnalyticsClient(api_key)
        
        with patch.object(client, '_client') as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.raise_for_status.return_value = None
            mock_client.request = AsyncMock(return_value=mock_response)
            
            result = await client._request_with_retries("GET", "/test")
            assert result == mock_response
            mock_client.request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_request_with_retries_server_error(self, api_key):
        """Test request with server error and retries."""
        client = FigmaAnalyticsClient(api_key, max_retries=2)
        
        with patch.object(client, '_client') as mock_client:
            # First attempt: 500 error
            # Second attempt: 500 error  
            # Third attempt: success
            mock_responses = [
                MagicMock(status_code=500),
                MagicMock(status_code=500),
                MagicMock(status_code=200),
            ]
            for response in mock_responses[:2]:
                response.raise_for_status.return_value = None
            mock_responses[2].raise_for_status.return_value = None
            
            mock_client.request = AsyncMock(side_effect=mock_responses)
            
            result = await client._request_with_retries("GET", "/test")
            assert result == mock_responses[2]
            assert mock_client.request.call_count == 3
    
    @pytest.mark.asyncio
    async def test_request_with_retries_client_error(self, api_key):
        """Test request with client error (no retries)."""
        client = FigmaAnalyticsClient(api_key)
        
        with patch.object(client, '_client') as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 404
            mock_response.json.return_value = {"err": "Not found"}
            mock_client.request = AsyncMock(return_value=mock_response)
            
            with pytest.raises(NotFoundError):
                await client._request_with_retries("GET", "/test")
            
            mock_client.request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_success(self, api_key):
        """Test successful GET request."""
        client = FigmaAnalyticsClient(api_key)
        
        with patch.object(client, '_request_with_retries') as mock_request:
            mock_response = MagicMock()
            mock_response.json.return_value = {"data": "test"}
            mock_request.return_value = mock_response
            
            result = await client.get("/test", param1="value1")
            
            assert result == {"data": "test"}
            mock_request.assert_called_once_with("GET", "/test", params={"param1": "value1"})
    
    @pytest.mark.asyncio
    async def test_paginate(self, api_key):
        """Test pagination through all results."""
        client = FigmaAnalyticsClient(api_key)
        
        # Mock responses for pagination
        responses = [
            {
                "rows": [{"id": 1}, {"id": 2}],
                "next_page": True,
                "cursor": "page2",
            },
            {
                "rows": [{"id": 3}, {"id": 4}],
                "next_page": False,
                "cursor": None,
            },
        ]
        
        with patch.object(client, 'get') as mock_get:
            mock_get.side_effect = responses
            
            results = []
            async for item in client.paginate("/test", param="value"):
                results.append(item)
            
            assert results == [{"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]
            assert mock_get.call_count == 2
            
            # Check that cursor was passed correctly
            calls = mock_get.call_args_list
            assert calls[0][1] == {"param": "value"}
            assert calls[1][1] == {"param": "value", "cursor": "page2"}
    
    @pytest.mark.asyncio
    async def test_paginate_single_page(self, api_key):
        """Test pagination with single page."""
        client = FigmaAnalyticsClient(api_key)
        
        response = {
            "rows": [{"id": 1}, {"id": 2}],
            "next_page": False,
        }
        
        with patch.object(client, 'get') as mock_get:
            mock_get.return_value = response
            
            results = []
            async for item in client.paginate("/test"):
                results.append(item)
            
            assert results == [{"id": 1}, {"id": 2}]
            mock_get.assert_called_once_with("/test")
    
    @pytest.mark.asyncio
    async def test_paginate_empty_response(self, api_key):
        """Test pagination with empty response."""
        client = FigmaAnalyticsClient(api_key)
        
        response = {
            "rows": [],
            "next_page": False,
        }
        
        with patch.object(client, 'get') as mock_get:
            mock_get.return_value = response
            
            results = []
            async for item in client.paginate("/test"):
                results.append(item)
            
            assert results == []
            mock_get.assert_called_once_with("/test")