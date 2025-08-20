"""Unit tests for FigmaCommentsClient."""

import asyncio
import pytest
from unittest.mock import AsyncMock, Mock, patch
import httpx

from figma_comments.core.client import FigmaCommentsClient, TokenBucketRateLimiter
from figma_comments.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError,
    NetworkError,
    TimeoutError,
)


class TestTokenBucketRateLimiter:
    """Test the token bucket rate limiter."""
    
    def test_init(self):
        """Test rate limiter initialization."""
        limiter = TokenBucketRateLimiter(capacity=60, refill_rate=1.0)
        assert limiter.capacity == 60
        assert limiter.refill_rate == 1.0
        assert limiter.tokens == 60.0
    
    @pytest.mark.asyncio
    async def test_acquire_with_available_tokens(self):
        """Test acquiring tokens when available."""
        limiter = TokenBucketRateLimiter(capacity=10, refill_rate=1.0)
        
        # Should be able to acquire immediately
        await limiter.acquire()
        assert limiter.tokens == 9.0
    
    @pytest.mark.asyncio
    async def test_acquire_with_no_tokens(self):
        """Test acquiring tokens when none available."""
        limiter = TokenBucketRateLimiter(capacity=1, refill_rate=2.0)  # Fast refill for testing
        
        # Use up the token
        await limiter.acquire()
        assert limiter.tokens == 0.0
        
        # This should wait for refill
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should have waited some time
        assert end_time - start_time > 0.1  # At least 100ms


class TestFigmaCommentsClient:
    """Test the Figma Comments API client."""
    
    def test_init(self, mock_api_token):
        """Test client initialization."""
        client = FigmaCommentsClient(mock_api_token)
        
        assert client.api_token == mock_api_token
        assert client.timeout == 30.0
        assert client.max_retries == 3
        assert client._client.base_url == "https://api.figma.com"
        assert client._client.headers["X-Figma-Token"] == mock_api_token
    
    def test_init_with_custom_params(self, mock_api_token):
        """Test client initialization with custom parameters."""
        client = FigmaCommentsClient(
            mock_api_token,
            timeout=60.0,
            max_retries=5,
            rate_limit_capacity=120,
            user_agent="custom-agent/1.0",
        )
        
        assert client.timeout == 60.0
        assert client.max_retries == 5
        assert client._client.headers["User-Agent"] == "custom-agent/1.0"
    
    @pytest.mark.asyncio
    async def test_context_manager(self, mock_api_token):
        """Test async context manager."""
        async with FigmaCommentsClient(mock_api_token) as client:
            assert isinstance(client, FigmaCommentsClient)
    
    def test_stats_property(self, mock_api_token):
        """Test stats property."""
        client = FigmaCommentsClient(mock_api_token)
        stats = client.stats
        
        assert "request_count" in stats
        assert "error_count" in stats
        assert "error_rate" in stats
        assert stats["request_count"] == 0
        assert stats["error_count"] == 0
    
    def test_handle_error_401(self, mock_api_token):
        """Test handling 401 Unauthorized error."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 401
        response.json.return_value = {"message": "Invalid token"}
        
        with pytest.raises(AuthenticationError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 401
        assert "Invalid token" in str(exc_info.value)
    
    def test_handle_error_403(self, mock_api_token):
        """Test handling 403 Forbidden error."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 403
        response.json.return_value = {"message": "Insufficient permissions"}
        
        with pytest.raises(AuthorizationError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 403
    
    def test_handle_error_404(self, mock_api_token):
        """Test handling 404 Not Found error."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 404
        response.json.return_value = {"message": "File not found"}
        
        with pytest.raises(NotFoundError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 404
    
    def test_handle_error_400(self, mock_api_token):
        """Test handling 400 Bad Request error."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 400
        response.json.return_value = {"message": "Invalid request"}
        
        with pytest.raises(ValidationError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 400
    
    def test_handle_error_429(self, mock_api_token):
        """Test handling 429 Rate Limit error."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 429
        response.headers = {"Retry-After": "60"}
        response.json.return_value = {"message": "Rate limit exceeded"}
        
        with pytest.raises(RateLimitError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 429
        assert exc_info.value.retry_after == 60
    
    def test_handle_error_500(self, mock_api_token):
        """Test handling 500 Internal Server Error."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 500
        response.json.return_value = {"message": "Internal server error"}
        
        with pytest.raises(ApiError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 500
    
    def test_handle_error_invalid_json(self, mock_api_token):
        """Test handling error with invalid JSON response."""
        client = FigmaCommentsClient(mock_api_token)
        response = Mock()
        response.status_code = 500
        response.json.side_effect = ValueError("Invalid JSON")
        response.text = "Internal Server Error"
        
        with pytest.raises(ApiError) as exc_info:
            client._handle_error(response)
        
        assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_request_success(self, mock_api_token):
        """Test successful request."""
        client = FigmaCommentsClient(mock_api_token)
        
        # Mock the HTTP client
        mock_response = Mock()
        mock_response.is_success = True
        mock_response.json.return_value = {"data": "test"}
        
        with patch.object(client._client, "request", return_value=mock_response) as mock_request:
            response = await client._request("GET", "/test")
            
            assert response == mock_response
            mock_request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_request_http_error(self, mock_api_token):
        """Test request with HTTP error."""
        client = FigmaCommentsClient(mock_api_token)
        
        # Mock the HTTP client to return error response
        mock_response = Mock()
        mock_response.is_success = False
        mock_response.status_code = 404
        mock_response.json.return_value = {"message": "Not found"}
        
        with patch.object(client._client, "request", return_value=mock_response):
            with pytest.raises(NotFoundError):
                await client._request("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_request_timeout(self, mock_api_token):
        """Test request timeout handling."""
        client = FigmaCommentsClient(mock_api_token)
        
        with patch.object(client._client, "request", side_effect=httpx.TimeoutException("Timeout")):
            with pytest.raises(TimeoutError) as exc_info:
                await client._request("GET", "/test")
            
            assert exc_info.value.timeout_seconds == 30.0
    
    @pytest.mark.asyncio
    async def test_request_network_error(self, mock_api_token):
        """Test network error handling."""
        client = FigmaCommentsClient(mock_api_token)
        
        with patch.object(client._client, "request", side_effect=httpx.NetworkError("Network error")):
            with pytest.raises(NetworkError):
                await client._request("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_get_method(self, mock_api_token):
        """Test GET method."""
        client = FigmaCommentsClient(mock_api_token)
        
        mock_response = Mock()
        mock_response.json.return_value = {"data": "test"}
        
        with patch.object(client, "_request", return_value=mock_response) as mock_request:
            result = await client.get("/test", params={"key": "value"})
            
            assert result == {"data": "test"}
            mock_request.assert_called_once_with("GET", "/test", params={"key": "value"})
    
    @pytest.mark.asyncio
    async def test_post_method(self, mock_api_token):
        """Test POST method."""
        client = FigmaCommentsClient(mock_api_token)
        
        mock_response = Mock()
        mock_response.json.return_value = {"id": "123"}
        
        with patch.object(client, "_request", return_value=mock_response) as mock_request:
            result = await client.post("/test", json_data={"message": "test"})
            
            assert result == {"id": "123"}
            mock_request.assert_called_once_with("POST", "/test", json_data={"message": "test"})
    
    @pytest.mark.asyncio
    async def test_delete_method(self, mock_api_token):
        """Test DELETE method."""
        client = FigmaCommentsClient(mock_api_token)
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'{"success": true}'
        mock_response.json.return_value = {"success": True}
        
        with patch.object(client, "_request", return_value=mock_response) as mock_request:
            result = await client.delete("/test/123")
            
            assert result == {"success": True}
            mock_request.assert_called_once_with("DELETE", "/test/123", params=None)
    
    @pytest.mark.asyncio
    async def test_delete_method_empty_response(self, mock_api_token):
        """Test DELETE method with empty response."""
        client = FigmaCommentsClient(mock_api_token)
        
        mock_response = Mock()
        mock_response.status_code = 204
        mock_response.content = b""
        
        with patch.object(client, "_request", return_value=mock_response) as mock_request:
            result = await client.delete("/test/123")
            
            assert result == {}
            mock_request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_comments(self, mock_api_token):
        """Test get_comments method."""
        client = FigmaCommentsClient(mock_api_token)
        
        expected_response = {"comments": []}
        
        with patch.object(client, "get", return_value=expected_response) as mock_get:
            result = await client.get_comments("test_file_key")
            
            assert result == expected_response
            mock_get.assert_called_once_with("/v1/files/test_file_key/comments", params={})
    
    @pytest.mark.asyncio
    async def test_get_comments_with_markdown(self, mock_api_token):
        """Test get_comments method with markdown option."""
        client = FigmaCommentsClient(mock_api_token)
        
        expected_response = {"comments": []}
        
        with patch.object(client, "get", return_value=expected_response) as mock_get:
            result = await client.get_comments("test_file_key", as_md=True)
            
            assert result == expected_response
            mock_get.assert_called_once_with("/v1/files/test_file_key/comments", params={"as_md": "true"})
    
    @pytest.mark.asyncio
    async def test_create_comment(self, mock_api_token):
        """Test create_comment method."""
        client = FigmaCommentsClient(mock_api_token)
        
        expected_response = {"id": "comment123"}
        
        with patch.object(client, "post", return_value=expected_response) as mock_post:
            result = await client.create_comment(
                "test_file_key",
                message="Test message",
                comment_id="parent123",
                client_meta={"x": 100, "y": 200}
            )
            
            assert result == expected_response
            mock_post.assert_called_once_with(
                "/v1/files/test_file_key/comments",
                json_data={
                    "message": "Test message",
                    "comment_id": "parent123",
                    "client_meta": {"x": 100, "y": 200},
                }
            )
    
    @pytest.mark.asyncio
    async def test_delete_comment(self, mock_api_token):
        """Test delete_comment method."""
        client = FigmaCommentsClient(mock_api_token)
        
        expected_response = {"success": True}
        
        with patch.object(client, "delete", return_value=expected_response) as mock_delete:
            result = await client.delete_comment("test_file_key", "comment123")
            
            assert result == expected_response
            mock_delete.assert_called_once_with("/v1/files/test_file_key/comments/comment123")
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, mock_api_token):
        """Test that rate limiting is applied."""
        client = FigmaCommentsClient(mock_api_token, rate_limit_capacity=1)
        
        mock_response = Mock()
        mock_response.is_success = True
        mock_response.json.return_value = {"data": "test"}
        
        with patch.object(client._client, "request", return_value=mock_response):
            # First request should be immediate
            start_time = asyncio.get_event_loop().time()
            await client._request("GET", "/test1")
            mid_time = asyncio.get_event_loop().time()
            
            # Second request should be delayed due to rate limiting
            await client._request("GET", "/test2")
            end_time = asyncio.get_event_loop().time()
            
            # First request should be fast
            assert mid_time - start_time < 0.1
            
            # Second request should be slower due to rate limiting
            assert end_time - mid_time > 0.1
    
    @pytest.mark.asyncio
    async def test_close(self, mock_api_token):
        """Test client cleanup."""
        client = FigmaCommentsClient(mock_api_token)
        
        with patch.object(client._client, "aclose") as mock_close:
            await client.close()
            mock_close.assert_called_once()