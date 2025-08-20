"""Tests for the HTTP client module."""

import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from figma_projects.client import FigmaProjectsClient, RateLimiter
from figma_projects.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    NetworkError,
    TimeoutError,
)


class TestRateLimiter:
    """Test rate limiter functionality."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_initialization(self):
        """Test rate limiter initialization."""
        limiter = RateLimiter(requests_per_minute=60)
        assert limiter.requests_per_minute == 60
        assert limiter.tokens == 60
    
    @pytest.mark.asyncio
    async def test_rate_limiter_acquire_token(self):
        """Test acquiring tokens from rate limiter."""
        limiter = RateLimiter(requests_per_minute=60)
        initial_tokens = limiter.tokens
        
        await limiter.acquire()
        
        assert limiter.tokens == initial_tokens - 1
    
    @pytest.mark.asyncio
    async def test_rate_limiter_refill(self):
        """Test token refill over time."""
        limiter = RateLimiter(requests_per_minute=60)
        limiter.tokens = 0
        
        # Simulate time passing
        with patch('time.time') as mock_time:
            mock_time.side_effect = [0, 60]  # 60 seconds passed
            await limiter.acquire()
            
        assert limiter.tokens >= 59  # Should have refilled
    
    def test_get_wait_time(self):
        """Test getting wait time for next token."""
        limiter = RateLimiter(requests_per_minute=60)
        limiter.tokens = 0.5
        
        wait_time = limiter.get_wait_time()
        assert wait_time > 0


class TestFigmaProjectsClient:
    """Test HTTP client functionality."""
    
    def test_client_initialization(self, api_token):
        """Test client initialization."""
        client = FigmaProjectsClient(api_token)
        
        assert client.api_token == api_token
        assert client.base_url == "https://api.figma.com"
        assert client.timeout == 30.0
        assert client.max_retries == 3
    
    def test_client_custom_settings(self, api_token):
        """Test client with custom settings."""
        client = FigmaProjectsClient(
            api_token=api_token,
            base_url="https://custom.api.com",
            requests_per_minute=120,
            timeout=60.0,
            max_retries=5,
        )
        
        assert client.base_url == "https://custom.api.com"
        assert client.timeout == 60.0
        assert client.max_retries == 5
        assert client.rate_limiter.requests_per_minute == 120
    
    @pytest.mark.asyncio
    async def test_client_context_manager(self, api_token):
        """Test client as async context manager."""
        async with FigmaProjectsClient(api_token) as client:
            assert client._client is not None
        
        assert client._client is None
    
    @pytest.mark.asyncio
    async def test_handle_authentication_error(self, api_token):
        """Test handling 401 authentication errors."""
        client = FigmaProjectsClient(api_token)
        
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        with pytest.raises(AuthenticationError):
            client._handle_response_errors(mock_response)
    
    @pytest.mark.asyncio
    async def test_handle_authorization_error(self, api_token):
        """Test handling 403 authorization errors."""
        client = FigmaProjectsClient(api_token)
        
        mock_response = MagicMock()
        mock_response.status_code = 403
        
        with pytest.raises(AuthorizationError):
            client._handle_response_errors(mock_response)
    
    @pytest.mark.asyncio
    async def test_handle_not_found_error(self, api_token):
        """Test handling 404 not found errors."""
        client = FigmaProjectsClient(api_token)
        
        mock_response = MagicMock()
        mock_response.status_code = 404
        
        with pytest.raises(NotFoundError):
            client._handle_response_errors(mock_response)
    
    @pytest.mark.asyncio
    async def test_handle_rate_limit_error(self, api_token):
        """Test handling 429 rate limit errors."""
        client = FigmaProjectsClient(api_token)
        
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {"Retry-After": "60"}
        
        with pytest.raises(RateLimitError) as exc_info:
            client._handle_response_errors(mock_response)
        
        assert exc_info.value.retry_after == 60
    
    @pytest.mark.asyncio
    async def test_handle_api_error(self, api_token):
        """Test handling general API errors."""
        client = FigmaProjectsClient(api_token)
        
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.json.return_value = {"message": "Server error"}
        
        with pytest.raises(ApiError) as exc_info:
            client._handle_response_errors(mock_response)
        
        assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_successful_get_request(self, api_token, sample_team_response):
        """Test successful GET request."""
        client = FigmaProjectsClient(api_token)
        
        with patch.object(client, '_request') as mock_request:
            mock_response = MagicMock()
            mock_response.json.return_value = sample_team_response
            mock_request.return_value = mock_response
            
            result = await client.get("/v1/teams/123/projects")
            
            assert result == sample_team_response
            mock_request.assert_called_once_with("GET", "/v1/teams/123/projects", params=None)
    
    @pytest.mark.asyncio
    async def test_successful_post_request(self, api_token):
        """Test successful POST request."""
        client = FigmaProjectsClient(api_token)
        
        with patch.object(client, '_request') as mock_request:
            mock_response = MagicMock()
            mock_response.json.return_value = {"success": True}
            mock_request.return_value = mock_response
            
            result = await client.post("/v1/test", json_data={"key": "value"})
            
            assert result == {"success": True}
            mock_request.assert_called_once_with(
                "POST", "/v1/test", params=None, json_data={"key": "value"}
            )
    
    @pytest.mark.asyncio
    async def test_network_error_handling(self, api_token):
        """Test network error handling."""
        client = FigmaProjectsClient(api_token)
        
        with patch.object(client, '_ensure_client'), \
             patch.object(client.rate_limiter, 'acquire'), \
             patch.object(client, '_client') as mock_client:
            
            mock_client.request.side_effect = httpx.NetworkError("Connection failed")
            
            with pytest.raises(NetworkError):
                await client._request("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_timeout_error_handling(self, api_token):
        """Test timeout error handling."""
        client = FigmaProjectsClient(api_token)
        
        with patch.object(client, '_ensure_client'), \
             patch.object(client.rate_limiter, 'acquire'), \
             patch.object(client, '_client') as mock_client:
            
            mock_client.request.side_effect = httpx.TimeoutException("Request timed out")
            
            with pytest.raises(TimeoutError):
                await client._request("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_pagination(self, api_token):
        """Test pagination functionality."""
        client = FigmaProjectsClient(api_token)
        
        responses = [
            [{"id": "1"}, {"id": "2"}],  # First page
            [{"id": "3"}],               # Second page
            []                           # Empty page (end)
        ]
        
        with patch.object(client, 'get') as mock_get:
            mock_get.side_effect = responses
            
            items = []
            async for item in client.paginate("/v1/test", page_size=2, max_pages=3):
                items.append(item)
            
            assert len(items) == 3
            assert items[0]["id"] == "1"
            assert items[1]["id"] == "2"
            assert items[2]["id"] == "3"
    
    def test_get_rate_limit_info(self, api_token):
        """Test getting rate limit information."""
        client = FigmaProjectsClient(api_token)
        
        with patch.object(client.rate_limiter, 'get_wait_time', return_value=0.0):
            rate_limit_info = client.get_rate_limit_info()
            
            assert rate_limit_info.limit == 60
            assert rate_limit_info.remaining == 60
            assert rate_limit_info.retry_after is None
    
    def test_get_stats(self, api_token):
        """Test getting client statistics."""
        client = FigmaProjectsClient(api_token)
        client._stats["requests_made"] = 5
        
        stats = client.get_stats()
        
        assert stats["requests_made"] == 5
        assert "requests_failed" in stats
        assert "rate_limit_hits" in stats
        assert "total_wait_time" in stats
    
    def test_reset_stats(self, api_token):
        """Test resetting client statistics."""
        client = FigmaProjectsClient(api_token)
        client._stats["requests_made"] = 5
        
        client.reset_stats()
        
        assert client._stats["requests_made"] == 0
        assert client._stats["requests_failed"] == 0