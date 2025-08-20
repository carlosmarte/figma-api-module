"""
Tests for the Figma Variables client.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from figma_variables.client import FigmaVariablesClient, RateLimiter
from figma_variables.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)


class TestRateLimiter:
    """Test rate limiter functionality."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_basic(self):
        """Test basic rate limiter functionality."""
        limiter = RateLimiter(max_tokens=2, refill_rate=10.0)
        
        # Should allow immediate requests
        await limiter.acquire()
        await limiter.acquire()
        
        # Third request should be delayed
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should have waited for token refill
        assert end_time - start_time > 0.05  # Some delay expected
    
    @pytest.mark.asyncio
    async def test_rate_limiter_refill(self):
        """Test rate limiter token refill."""
        limiter = RateLimiter(max_tokens=1, refill_rate=5.0)
        
        # Use the token
        await limiter.acquire()
        
        # Wait for refill
        await asyncio.sleep(0.3)  # Should refill ~1.5 tokens
        
        # Should be able to acquire again without much delay
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        assert end_time - start_time < 0.1


class TestFigmaVariablesClient:
    """Test Figma Variables client."""
    
    @pytest.fixture
    def client(self, mock_api_token):
        """Create test client."""
        return FigmaVariablesClient(api_token=mock_api_token)
    
    def test_client_initialization(self, mock_api_token):
        """Test client initialization."""
        client = FigmaVariablesClient(
            api_token=mock_api_token,
            base_url="https://test.api.figma.com",
            timeout=60.0,
            max_retries=5
        )
        
        assert client.api_token == mock_api_token
        assert client.base_url == "https://test.api.figma.com"
        assert client.timeout == 60.0
        assert client.max_retries == 5
        assert client._client is None
    
    def test_get_headers(self, client, mock_api_token):
        """Test header generation."""
        headers = client._get_headers()
        
        assert headers["Authorization"] == f"Bearer {mock_api_token}"
        assert headers["Content-Type"] == "application/json"
        assert "User-Agent" in headers
    
    @pytest.mark.asyncio
    async def test_context_manager(self, client):
        """Test async context manager."""
        async with client as c:
            assert c is client
            assert client._client is not None
        
        # Client should be closed after context
        assert client._client is None
    
    @pytest.mark.asyncio
    async def test_close(self, client):
        """Test client close."""
        await client._ensure_client()
        assert client._client is not None
        
        await client.close()
        assert client._client is None
    
    @pytest.mark.parametrize("status_code,expected_error", [
        (401, AuthenticationError),
        (403, AuthorizationError),
        (404, NotFoundError),
        (429, RateLimitError),
        (500, ApiError),
    ])
    def test_handle_error_response(self, client, status_code, expected_error):
        """Test error response handling."""
        response = MagicMock()
        response.status_code = status_code
        response.json.return_value = {"message": "Test error"}
        response.text = "Test error text"
        response.headers = {}
        
        with pytest.raises(expected_error):
            client._handle_error_response(response)
    
    def test_handle_rate_limit_with_retry_after(self, client):
        """Test rate limit error with retry-after header."""
        response = MagicMock()
        response.status_code = 429
        response.json.return_value = {"message": "Rate limited"}
        response.headers = {"retry-after": "60"}
        
        with pytest.raises(RateLimitError) as exc_info:
            client._handle_error_response(response)
        
        assert exc_info.value.retry_after == 60
    
    @pytest.mark.asyncio
    async def test_request_success(self, client):
        """Test successful request."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"data": "test"}
        
        with patch.object(client, '_ensure_client'), \
             patch.object(client, 'rate_limiter') as mock_limiter, \
             patch.object(client, '_client') as mock_http_client:
            
            mock_limiter.acquire = AsyncMock()
            mock_http_client.request = AsyncMock(return_value=mock_response)
            
            response = await client._request("GET", "/test")
            
            assert response is mock_response
            mock_limiter.acquire.assert_called_once()
            mock_http_client.request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_request_retry_on_rate_limit(self, client):
        """Test request retry on rate limit."""
        # First response: rate limited, second: success
        rate_limit_response = MagicMock()
        rate_limit_response.is_success = False
        rate_limit_response.status_code = 429
        rate_limit_response.headers = {"retry-after": "1"}
        
        success_response = MagicMock()
        success_response.is_success = True
        
        with patch.object(client, '_ensure_client'), \
             patch.object(client, 'rate_limiter') as mock_limiter, \
             patch.object(client, '_client') as mock_http_client, \
             patch('asyncio.sleep') as mock_sleep:
            
            mock_limiter.acquire = AsyncMock()
            mock_http_client.request = AsyncMock(
                side_effect=[rate_limit_response, success_response]
            )
            
            response = await client._request("GET", "/test")
            
            assert response is success_response
            assert mock_http_client.request.call_count == 2
            mock_sleep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_request_retry_on_server_error(self, client):
        """Test request retry on server error."""
        # First response: server error, second: success
        server_error_response = MagicMock()
        server_error_response.is_success = False
        server_error_response.status_code = 500
        
        success_response = MagicMock()
        success_response.is_success = True
        
        with patch.object(client, '_ensure_client'), \
             patch.object(client, 'rate_limiter') as mock_limiter, \
             patch.object(client, '_client') as mock_http_client, \
             patch('asyncio.sleep') as mock_sleep:
            
            mock_limiter.acquire = AsyncMock()
            mock_http_client.request = AsyncMock(
                side_effect=[server_error_response, success_response]
            )
            
            response = await client._request("GET", "/test")
            
            assert response is success_response
            assert mock_http_client.request.call_count == 2
            mock_sleep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_request_max_retries_exceeded(self, client):
        """Test max retries exceeded."""
        error_response = MagicMock()
        error_response.is_success = False
        error_response.status_code = 500
        error_response.json.return_value = {"message": "Server error"}
        error_response.text = "Server error"
        error_response.headers = {}
        
        with patch.object(client, '_ensure_client'), \
             patch.object(client, 'rate_limiter') as mock_limiter, \
             patch.object(client, '_client') as mock_http_client, \
             patch('asyncio.sleep'):
            
            mock_limiter.acquire = AsyncMock()
            mock_http_client.request = AsyncMock(return_value=error_response)
            
            with pytest.raises(ApiError):
                await client._request("GET", "/test")
            
            # Should retry max_retries + 1 times
            assert mock_http_client.request.call_count == client.max_retries + 1
    
    @pytest.mark.asyncio
    async def test_get_method(self, client):
        """Test GET method."""
        expected_data = {"test": "data"}
        
        with patch.object(client, '_request') as mock_request:
            mock_response = MagicMock()
            mock_response.json.return_value = expected_data
            mock_request.return_value = mock_response
            
            result = await client.get("/test", params={"key": "value"})
            
            assert result == expected_data
            mock_request.assert_called_once_with("GET", "/test", params={"key": "value"})
    
    @pytest.mark.asyncio
    async def test_post_method(self, client):
        """Test POST method."""
        expected_data = {"created": "item"}
        request_data = {"name": "test"}
        
        with patch.object(client, '_request') as mock_request:
            mock_response = MagicMock()
            mock_response.json.return_value = expected_data
            mock_request.return_value = mock_response
            
            result = await client.post("/test", json=request_data)
            
            assert result == expected_data
            mock_request.assert_called_once_with("POST", "/test", json=request_data)
    
    @pytest.mark.asyncio
    async def test_get_local_variables(self, client, sample_file_key):
        """Test get local variables method."""
        expected_response = {"variables": {}, "variableCollections": {}}
        
        with patch.object(client, 'get') as mock_get:
            mock_get.return_value = expected_response
            
            result = await client.get_local_variables(sample_file_key)
            
            assert result == expected_response
            mock_get.assert_called_once_with(f"/v1/files/{sample_file_key}/variables/local")
    
    @pytest.mark.asyncio
    async def test_get_published_variables(self, client, sample_file_key):
        """Test get published variables method."""
        expected_response = {"variables": {}, "variableCollections": {}}
        
        with patch.object(client, 'get') as mock_get:
            mock_get.return_value = expected_response
            
            result = await client.get_published_variables(sample_file_key)
            
            assert result == expected_response
            mock_get.assert_called_once_with(f"/v1/files/{sample_file_key}/variables/published")
    
    @pytest.mark.asyncio
    async def test_modify_variables(self, client, sample_file_key, test_variables_request):
        """Test modify variables method."""
        expected_response = {"tempIdToRealId": {}}
        
        with patch.object(client, 'post') as mock_post:
            mock_post.return_value = expected_response
            
            result = await client.modify_variables(sample_file_key, test_variables_request)
            
            assert result == expected_response
            mock_post.assert_called_once_with(
                f"/v1/files/{sample_file_key}/variables",
                json=test_variables_request
            )
    
    @pytest.mark.asyncio
    async def test_paginate(self, client):
        """Test pagination method."""
        page1_response = {
            "meta": {"variables": {"var1": {"name": "Variable 1"}}},
            "pagination": {"next_page": True, "next_cursor": "cursor2"}
        }
        page2_response = {
            "meta": {"variables": {"var2": {"name": "Variable 2"}}},
            "pagination": {"next_page": False}
        }
        
        with patch.object(client, 'get') as mock_get:
            mock_get.side_effect = [page1_response, page2_response]
            
            items = []
            async for item in client.paginate("/test"):
                items.append(item)
            
            assert len(items) == 2
            assert items[0]["name"] == "Variable 1"
            assert items[1]["name"] == "Variable 2"
            assert mock_get.call_count == 2