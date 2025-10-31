"""HTTP client for Figma Comments API with rate limiting and retries."""

import asyncio
import logging
import time
from typing import Any, Dict, Optional, AsyncIterator, Union, List
from urllib.parse import urljoin

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from .exceptions import (
    FigmaCommentsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError,
    NetworkError,
    TimeoutError,
)


logger = logging.getLogger(__name__)


class TokenBucketRateLimiter:
    """Token bucket rate limiter for API requests."""
    
    def __init__(self, capacity: int = 60, refill_rate: float = 1.0) -> None:
        """
        Initialize rate limiter.
        
        Args:
            capacity: Maximum number of tokens (requests per minute)
            refill_rate: Rate at which tokens are refilled (tokens per second)
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_refill
            
            # Refill tokens based on elapsed time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            
            if self.tokens >= 1.0:
                self.tokens -= 1.0
            else:
                # Calculate wait time for next token
                wait_time = (1.0 - self.tokens) / self.refill_rate
                logger.debug(f"Rate limit reached, waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)
                self.tokens = 0.0


class FigmaCommentsClient:
    """
    Low-level HTTP client for Figma Comments API.
    
    Provides rate limiting, retries, and comprehensive error handling.
    """
    
    BASE_URL = "https://api.figma.com"
    
    def __init__(
        self,
        api_token: str,
        *,
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit_capacity: int = 60,
        rate_limit_refill_rate: float = 1.0,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Initialize the Figma Comments API client.
        
        Args:
            api_token: Figma API token
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            rate_limit_capacity: Rate limit capacity (requests per minute)
            rate_limit_refill_rate: Rate limit refill rate (tokens per second)
            user_agent: Custom User-Agent header
        """
        self.api_token = api_token
        self.timeout = timeout
        self.max_retries = max_retries
        
        # Rate limiter
        self._rate_limiter = TokenBucketRateLimiter(
            capacity=rate_limit_capacity,
            refill_rate=rate_limit_refill_rate
        )
        
        # HTTP client
        headers = {
            "X-Figma-Token": api_token,
            "Content-Type": "application/json",
            "User-Agent": user_agent or "figma-comments-python/0.1.0",
        }
        
        self._client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers=headers,
            timeout=timeout,
        )
        
        # Request tracking
        self._request_count = 0
        self._error_count = 0
    
    async def __aenter__(self) -> "FigmaCommentsClient":
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()
    
    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
    
    @property
    def stats(self) -> Dict[str, int]:
        """Get client statistics."""
        return {
            "request_count": self._request_count,
            "error_count": self._error_count,
            "error_rate": self._error_count / max(self._request_count, 1),
        }
    
    def _handle_error(self, response: httpx.Response) -> None:
        """Handle HTTP error responses."""
        status_code = response.status_code
        
        try:
            error_data = response.json()
        except Exception:
            error_data = {"message": response.text or "Unknown error"}
        
        message = error_data.get("message", error_data.get("err", "API error"))
        
        if status_code == 401:
            raise AuthenticationError(message, error_data)
        elif status_code == 403:
            raise AuthorizationError(message, error_data)
        elif status_code == 404:
            raise NotFoundError(message, error_data)
        elif status_code == 400:
            raise ValidationError(message, response_data=error_data)
        elif status_code == 429:
            retry_after = None
            retry_header = response.headers.get("Retry-After")
            if retry_header:
                try:
                    retry_after = int(retry_header)
                except ValueError:
                    pass
            raise RateLimitError(message, retry_after, error_data)
        else:
            raise ApiError(message, status_code, error_data)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((RateLimitError, NetworkError, TimeoutError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> httpx.Response:
        """
        Make an HTTP request with rate limiting and error handling.
        
        Args:
            method: HTTP method
            path: API path
            params: Query parameters
            json_data: JSON body data
            **kwargs: Additional request arguments
            
        Returns:
            HTTP response
            
        Raises:
            Various FigmaCommentsError subclasses based on response
        """
        # Apply rate limiting
        await self._rate_limiter.acquire()
        
        url = urljoin("/", path)
        self._request_count += 1
        
        try:
            response = await self._client.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                **kwargs,
            )
            
            if not response.is_success:
                self._error_count += 1
                self._handle_error(response)
            
            return response
            
        except httpx.TimeoutException as e:
            self._error_count += 1
            raise TimeoutError(f"Request timeout after {self.timeout}s", self.timeout) from e
        except httpx.NetworkError as e:
            self._error_count += 1
            raise NetworkError(f"Network error: {e}", e) from e
        except Exception as e:
            self._error_count += 1
            if isinstance(e, FigmaCommentsError):
                raise
            raise NetworkError(f"Unexpected error: {e}", e) from e
    
    async def get(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Make a GET request.
        
        Args:
            path: API path
            params: Query parameters
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("GET", path, params=params, **kwargs)
        return response.json()
    
    async def post(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Make a POST request.
        
        Args:
            path: API path
            json_data: JSON body data
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("POST", path, json_data=json_data, **kwargs)
        return response.json()
    
    async def delete(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Make a DELETE request.
        
        Args:
            path: API path
            params: Query parameters
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("DELETE", path, params=params, **kwargs)
        
        # Handle empty responses
        if response.status_code == 204 or not response.content:
            return {}
        
        return response.json()
    
    async def paginate(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        cursor_key: str = "cursor",
        items_key: str = "comments",
        **kwargs: Any,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Paginate through API responses.
        
        Args:
            path: API path
            params: Query parameters
            cursor_key: Key for pagination cursor
            items_key: Key for items in response
            **kwargs: Additional request arguments
            
        Yields:
            Individual items from paginated responses
        """
        current_params = params.copy() if params else {}
        cursor = None
        
        while True:
            if cursor:
                current_params[cursor_key] = cursor
            
            response = await self.get(path, params=current_params, **kwargs)
            items = response.get(items_key, [])
            
            for item in items:
                yield item
            
            # Check for next page
            cursor = response.get("pagination", {}).get("next_page")
            if not cursor:
                break
    
    # Comment-specific methods
    
    async def get_comments(
        self,
        file_key: str,
        *,
        as_md: bool = False,
    ) -> Dict[str, Any]:
        """Get all comments in a file."""
        params = {}
        if as_md:
            params["as_md"] = "true"
        
        return await self.get(f"/v1/files/{file_key}/comments", params=params)
    
    async def create_comment(
        self,
        file_key: str,
        *,
        message: str,
        comment_id: Optional[str] = None,
        client_meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new comment."""
        json_data = {"message": message}
        
        if comment_id:
            json_data["comment_id"] = comment_id
        
        if client_meta:
            json_data["client_meta"] = client_meta
        
        return await self.post(f"/v1/files/{file_key}/comments", json_data=json_data)
    
    async def delete_comment(
        self,
        file_key: str,
        comment_id: str,
    ) -> Dict[str, Any]:
        """Delete a comment."""
        return await self.delete(f"/v1/files/{file_key}/comments/{comment_id}")
    
    async def get_comment_reactions(
        self,
        file_key: str,
        comment_id: str,
        *,
        cursor: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get reactions for a comment."""
        params = {}
        if cursor:
            params["cursor"] = cursor
        
        return await self.get(f"/v1/files/{file_key}/comments/{comment_id}/reactions", params=params)
    
    async def create_comment_reaction(
        self,
        file_key: str,
        comment_id: str,
        *,
        emoji: str,
    ) -> Dict[str, Any]:
        """Add a reaction to a comment."""
        json_data = {"emoji": emoji}
        return await self.post(f"/v1/files/{file_key}/comments/{comment_id}/reactions", json_data=json_data)
    
    async def delete_comment_reaction(
        self,
        file_key: str,
        comment_id: str,
        *,
        emoji: str,
    ) -> Dict[str, Any]:
        """Delete a reaction from a comment."""
        params = {"emoji": emoji}
        return await self.delete(f"/v1/files/{file_key}/comments/{comment_id}/reactions", params=params)