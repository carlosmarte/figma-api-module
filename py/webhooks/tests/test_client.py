"""
Tests for the Figma Webhooks client.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from figma_webhooks.client import FigmaWebhooksClient, RateLimiter
from figma_webhooks.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError,
    NetworkError,
    TimeoutError,
)


class TestRateLimiter:
    """Test rate limiter functionality."""
    
    @pytest_asyncio.fixture
    async def rate_limiter(self):
        """Rate limiter for testing."""
        return RateLimiter(max_tokens=5, refill_rate=1.0)
    
    @pytest_asyncio.async def test_acquire_tokens(self, rate_limiter):
        """Test acquiring tokens from rate limiter."""
        # Should be able to acquire tokens initially
        await rate_limiter.acquire(2)
        assert rate_limiter.tokens == 3
        
        # Should be able to acquire more tokens
        await rate_limiter.acquire(1)
        assert rate_limiter.tokens == 2
    
    @pytest_asyncio.async def test_acquire_too_many_tokens(self, rate_limiter):
        """Test acquiring more tokens than available."""
        # This should wait and refill tokens
        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            await rate_limiter.acquire(6)  # More than max_tokens
            mock_sleep.assert_called()


class TestFigmaWebhooksClient:
    """Test Figma Webhooks client functionality."""
    
    @pytest_asyncio.async def test_context_manager(self, mock_api_key):
        """Test client as async context manager."""
        async with FigmaWebhooksClient(mock_api_key) as client:
            assert client._client is not None
        
        # Client should be closed after context
        assert client._client is None
    
    @pytest_asyncio.async def test_get_error_from_response(self, client, mock_response):
        """Test error handling from HTTP responses."""
        # Test 401 error
        response = mock_response(401, {"err": "Unauthorized"})
        error = client._get_error_from_response(response)
        assert isinstance(error, AuthenticationError)
        assert error.status_code == 401
        
        # Test 403 error
        response = mock_response(403, {"err": "Forbidden"})
        error = client._get_error_from_response(response)
        assert isinstance(error, AuthorizationError)
        
        # Test 404 error
        response = mock_response(404, {"err": "Not found"})
        error = client._get_error_from_response(response)
        assert isinstance(error, NotFoundError)
        
        # Test 429 error
        response = mock_response(429, {"err": "Rate limited"})
        response.headers = {"Retry-After": "60"}
        error = client._get_error_from_response(response)
        assert isinstance(error, RateLimitError)
        assert error.retry_after == 60
        
        # Test 400 error
        response = mock_response(400, {"err": "Bad request"})
        error = client._get_error_from_response(response)
        assert isinstance(error, ValidationError)
        
        # Test 500 error
        response = mock_response(500, {"err": "Server error"})
        error = client._get_error_from_response(response)
        assert isinstance(error, ApiError)
        assert error.status_code == 500
    
    @pytest_asyncio.async def test_request_success(self, client, mock_response):
        """Test successful HTTP request."""
        with patch.object(client, '_ensure_client', new_callable=AsyncMock), \
             patch.object(client.rate_limiter, 'acquire', new_callable=AsyncMock), \
             patch.object(client, '_client') as mock_client:
            
            response_data = {"webhook": {"id": "123"}}
            mock_client.request = AsyncMock(return_value=mock_response(200, response_data))
            
            response = await client._request("GET", "/v2/webhooks")
            assert response.status_code == 200
            assert response.json() == response_data
    
    @pytest_asyncio.async def test_request_with_retries(self, client, mock_response):
        """Test request retries on 5xx errors."""
        with patch.object(client, '_ensure_client', new_callable=AsyncMock), \
             patch.object(client.rate_limiter, 'acquire', new_callable=AsyncMock), \
             patch.object(client, '_client') as mock_client, \
             patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            
            # First call returns 500, second call succeeds
            mock_client.request = AsyncMock(side_effect=[
                mock_response(500, {"err": "Server error"}),
                mock_response(200, {"webhook": {"id": "123"}}),
            ])
            
            response = await client._request("GET", "/v2/webhooks")
            assert response.status_code == 200
            assert mock_client.request.call_count == 2
            mock_sleep.assert_called_once()
    
    @pytest_asyncio.async def test_request_timeout_with_retries(self, client):
        """Test request timeout with retries."""
        with patch.object(client, '_ensure_client', new_callable=AsyncMock), \
             patch.object(client.rate_limiter, 'acquire', new_callable=AsyncMock), \
             patch.object(client, '_client') as mock_client, \
             patch('asyncio.sleep', new_callable=AsyncMock):
            
            mock_client.request = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
            
            with pytest.raises(TimeoutError):
                await client._request("GET", "/v2/webhooks")
            
            assert mock_client.request.call_count == 4  # Initial + 3 retries
    
    @pytest_asyncio.async def test_request_network_error(self, client):
        """Test network error handling."""
        with patch.object(client, '_ensure_client', new_callable=AsyncMock), \
             patch.object(client.rate_limiter, 'acquire', new_callable=AsyncMock), \
             patch.object(client, '_client') as mock_client, \
             patch('asyncio.sleep', new_callable=AsyncMock):
            
            mock_client.request = AsyncMock(side_effect=httpx.NetworkError("Network error"))
            
            with pytest.raises(NetworkError):
                await client._request("GET", "/v2/webhooks")
    
    @pytest_asyncio.async def test_get_request(self, client):
        """Test GET request method."""
        with patch.object(client, '_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json.return_value = {"data": "test"}
            
            result = await client.get("/v2/webhooks", param1="value1")
            
            mock_request.assert_called_once_with("GET", "/v2/webhooks", params={"param1": "value1"})
            assert result == {"data": "test"}
    
    @pytest_asyncio.async def test_post_request(self, client):
        """Test POST request method."""
        with patch.object(client, '_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json.return_value = {"webhook": {"id": "123"}}
            
            json_data = {"event_type": "FILE_UPDATE"}
            result = await client.post("/v2/webhooks", json_data=json_data)
            
            mock_request.assert_called_once_with("POST", "/v2/webhooks", params={}, json_data=json_data)
            assert result == {"webhook": {"id": "123"}}
    
    @pytest_asyncio.async def test_put_request(self, client):
        """Test PUT request method."""
        with patch.object(client, '_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json.return_value = {"webhook": {"id": "123"}}
            
            json_data = {"status": "PAUSED"}
            result = await client.put("/v2/webhooks/123", json_data=json_data)
            
            mock_request.assert_called_once_with("PUT", "/v2/webhooks/123", params={}, json_data=json_data)
            assert result == {"webhook": {"id": "123"}}
    
    @pytest_asyncio.async def test_delete_request(self, client):
        """Test DELETE request method."""
        with patch.object(client, '_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json.return_value = {"success": True}
            
            result = await client.delete("/v2/webhooks/123")
            
            mock_request.assert_called_once_with("DELETE", "/v2/webhooks/123", params={})
            assert result == {"success": True}
    
    @pytest_asyncio.async def test_paginate(self, client):
        """Test pagination functionality."""
        with patch.object(client, 'get', new_callable=AsyncMock) as mock_get:
            # Mock paginated responses
            mock_get.side_effect = [
                {
                    "webhooks": [{"id": "1"}, {"id": "2"}],
                    "next_page": "cursor-2",
                },
                {
                    "webhooks": [{"id": "3"}],
                    "next_page": None,
                },
            ]
            
            items = []
            async for item in client.paginate("/v2/webhooks"):
                items.append(item)
            
            assert len(items) == 3
            assert items[0]["id"] == "1"
            assert items[1]["id"] == "2"
            assert items[2]["id"] == "3"
            
            # Check calls were made correctly
            assert mock_get.call_count == 2
    
    @pytest_asyncio.async def test_ensure_client_initialization(self, client):
        """Test client initialization."""
        assert client._client is None
        
        await client._ensure_client()
        
        assert client._client is not None
        assert isinstance(client._client, httpx.AsyncClient)
        
        # Should have correct headers
        assert "X-Figma-Token" in client._client.headers
        assert client._client.headers["X-Figma-Token"] == client.api_key