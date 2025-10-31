"""Tests for the FigmaDevResourcesClient."""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from figma_dev_resources.client import FigmaDevResourcesClient, RateLimiter
from figma_dev_resources.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    ValidationError,
)


class TestRateLimiter:
    """Test rate limiter functionality."""

    @pytest_asyncio.fixture
    async def rate_limiter(self):
        """Rate limiter instance."""
        return RateLimiter(max_requests=2, time_window=1)

    async def test_acquire_tokens(self, rate_limiter):
        """Test acquiring tokens."""
        # Should be able to acquire 2 tokens quickly
        await rate_limiter.acquire()
        await rate_limiter.acquire()
        
        # Third acquisition should take some time
        import time
        start = time.time()
        await rate_limiter.acquire()
        elapsed = time.time() - start
        
        # Should have waited at least some time
        assert elapsed > 0

    async def test_token_refill(self, rate_limiter):
        """Test token refill over time."""
        # Exhaust tokens
        await rate_limiter.acquire()
        await rate_limiter.acquire()
        
        # Wait for refill
        import asyncio
        await asyncio.sleep(0.6)  # Wait for partial refill
        
        # Should be able to acquire again
        await rate_limiter.acquire()


class TestFigmaDevResourcesClient:
    """Test the HTTP client."""

    @pytest_asyncio.fixture
    async def client(self, api_key):
        """Client instance."""
        client = FigmaDevResourcesClient(api_key)
        yield client
        await client.close()

    async def test_client_initialization(self, api_key):
        """Test client initialization."""
        client = FigmaDevResourcesClient(api_key)
        
        assert client.api_key == api_key
        assert client.base_url == "https://api.figma.com"
        assert client.max_retries == 3
        assert client.timeout == 30.0

    async def test_custom_configuration(self, api_key):
        """Test client with custom configuration."""
        client = FigmaDevResourcesClient(
            api_key=api_key,
            base_url="https://custom.api.com",
            max_retries=5,
            timeout=60.0,
            rate_limit_requests=50,
            rate_limit_window=30,
        )
        
        assert client.base_url == "https://custom.api.com"
        assert client.max_retries == 5
        assert client.timeout == 60.0

    async def test_context_manager(self, api_key):
        """Test async context manager."""
        async with FigmaDevResourcesClient(api_key) as client:
            assert client._client is not None
        
        # Client should be closed after context exit
        assert client._client is None

    @patch('httpx.AsyncClient.request')
    async def test_successful_request(self, mock_request, client, mock_httpx_response):
        """Test successful API request."""
        mock_request.return_value = mock_httpx_response
        
        result = await client.get("/test/path")
        
        assert result == {"dev_resources": []}
        mock_request.assert_called_once()

    @patch('httpx.AsyncClient.request')
    async def test_authentication_error(self, mock_request, client):
        """Test 401 authentication error."""
        mock_response = AsyncMock()
        mock_response.status_code = 401
        mock_request.return_value = mock_response
        
        with pytest.raises(AuthenticationError):
            await client.get("/test/path")

    @patch('httpx.AsyncClient.request')
    async def test_authorization_error(self, mock_request, client):
        """Test 403 authorization error."""
        mock_response = AsyncMock()
        mock_response.status_code = 403
        mock_request.return_value = mock_response
        
        with pytest.raises(AuthorizationError):
            await client.get("/test/path")

    @patch('httpx.AsyncClient.request')
    async def test_not_found_error(self, mock_request, client):
        """Test 404 not found error."""
        mock_response = AsyncMock()
        mock_response.status_code = 404
        mock_request.return_value = mock_response
        
        with pytest.raises(NotFoundError):
            await client.get("/test/path")

    @patch('httpx.AsyncClient.request')
    async def test_rate_limit_error(self, mock_request, client):
        """Test 429 rate limit error."""
        mock_response = AsyncMock()
        mock_response.status_code = 429
        mock_response.headers = {"Retry-After": "60"}
        mock_request.return_value = mock_response
        
        with pytest.raises(RateLimitError) as exc_info:
            await client.get("/test/path")
        
        assert exc_info.value.retry_after == 60

    @patch('httpx.AsyncClient.request')
    async def test_validation_error(self, mock_request, client):
        """Test 400 validation error."""
        mock_response = AsyncMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"message": "Invalid request"}
        mock_request.return_value = mock_response
        
        with pytest.raises(ValidationError):
            await client.get("/test/path")

    @patch('httpx.AsyncClient.request')
    async def test_server_error(self, mock_request, client):
        """Test 500 server error."""
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_request.return_value = mock_response
        
        with pytest.raises(ApiError):
            await client.get("/test/path")

    @patch('httpx.AsyncClient.request')
    async def test_retry_logic(self, mock_request, client):
        """Test retry logic for server errors."""
        # First call fails, second succeeds
        mock_error_response = AsyncMock()
        mock_error_response.status_code = 500
        
        mock_success_response = AsyncMock()
        mock_success_response.status_code = 200
        mock_success_response.is_success = True
        mock_success_response.json.return_value = {"success": True}
        
        mock_request.side_effect = [mock_error_response, mock_success_response]
        
        result = await client.get("/test/path")
        
        assert result == {"success": True}
        assert mock_request.call_count == 2

    @patch('httpx.AsyncClient.request')
    async def test_timeout_retry(self, mock_request, client):
        """Test retry logic for timeouts."""
        import httpx
        
        # First call times out, second succeeds
        mock_success_response = AsyncMock()
        mock_success_response.status_code = 200
        mock_success_response.is_success = True
        mock_success_response.json.return_value = {"success": True}
        
        mock_request.side_effect = [
            httpx.TimeoutException("Request timeout"),
            mock_success_response
        ]
        
        result = await client.get("/test/path")
        
        assert result == {"success": True}
        assert mock_request.call_count == 2

    async def test_all_http_methods(self, client):
        """Test all HTTP methods."""
        with patch.object(client, '_request') as mock_request:
            mock_request.return_value.json.return_value = {"test": "data"}
            
            # Test GET
            await client.get("/test")
            mock_request.assert_called_with("GET", "/test")
            
            # Test POST
            await client.post("/test", json={"data": "test"})
            mock_request.assert_called_with("POST", "/test", json={"data": "test"})
            
            # Test PUT
            await client.put("/test", json={"data": "test"})
            mock_request.assert_called_with("PUT", "/test", json={"data": "test"})
            
            # Test DELETE
            mock_request.return_value.json.side_effect = Exception("No JSON")
            mock_request.return_value.status_code = 200
            
            result = await client.delete("/test")
            assert result == {"status": 200}