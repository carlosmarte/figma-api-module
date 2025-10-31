"""
Low-level HTTP client for Figma Webhooks API with rate limiting and retries.
"""

import asyncio
import time
from typing import Any, AsyncIterator, Dict, List, Optional, Union
from urllib.parse import urljoin

import httpx

from .errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError,
    NetworkError,
    TimeoutError,
)


class RateLimiter:
    """Token bucket rate limiter for API requests."""
    
    def __init__(self, max_tokens: int = 100, refill_rate: float = 1.0):
        """
        Initialize rate limiter.
        
        Args:
            max_tokens: Maximum number of tokens in bucket
            refill_rate: Tokens added per second
        """
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self.tokens = max_tokens
        self.last_refill = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self, tokens: int = 1) -> None:
        """
        Acquire tokens from the bucket, waiting if necessary.
        
        Args:
            tokens: Number of tokens to acquire
        """
        async with self._lock:
            await self._refill()
            
            while self.tokens < tokens:
                wait_time = (tokens - self.tokens) / self.refill_rate
                await asyncio.sleep(wait_time)
                await self._refill()
            
            self.tokens -= tokens
    
    async def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.max_tokens, self.tokens + tokens_to_add)
        self.last_refill = now


class FigmaWebhooksClient:
    """Low-level HTTP client for Figma Webhooks API."""
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit_tokens: int = 100,
        rate_limit_refill: float = 1.0,
    ):
        """
        Initialize the Figma Webhooks client.
        
        Args:
            api_key: Figma API key
            base_url: Base URL for Figma API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
            rate_limit_tokens: Maximum tokens for rate limiting
            rate_limit_refill: Rate limit refill rate (tokens per second)
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.rate_limiter = RateLimiter(rate_limit_tokens, rate_limit_refill)
        
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_client()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_client(self) -> None:
        """Ensure HTTP client is initialized."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers={
                    "X-Figma-Token": self.api_key,
                    "User-Agent": "figma-webhooks-python/0.1.0",
                },
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
            )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    def _get_error_from_response(self, response: httpx.Response) -> Exception:
        """Convert HTTP response to appropriate exception."""
        status_code = response.status_code
        
        try:
            error_data = response.json()
            message = error_data.get("err", error_data.get("message", "Unknown error"))
        except Exception:
            message = f"HTTP {status_code}: {response.text[:200]}"
        
        if status_code == 401:
            return AuthenticationError(message, response_data=error_data if 'error_data' in locals() else None)
        elif status_code == 403:
            return AuthorizationError(message, response_data=error_data if 'error_data' in locals() else None)
        elif status_code == 404:
            return NotFoundError(message, response_data=error_data if 'error_data' in locals() else None)
        elif status_code == 429:
            retry_after = None
            if "Retry-After" in response.headers:
                try:
                    retry_after = int(response.headers["Retry-After"])
                except ValueError:
                    pass
            return RateLimitError(message, retry_after=retry_after, response_data=error_data if 'error_data' in locals() else None)
        elif 400 <= status_code < 500:
            return ValidationError(message, response_data=error_data if 'error_data' in locals() else None)
        else:
            return ApiError(message, status_code=status_code, response_data=error_data if 'error_data' in locals() else None)
    
    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0,
    ) -> httpx.Response:
        """
        Make an HTTP request with retries and rate limiting.
        
        Args:
            method: HTTP method
            path: API path
            params: Query parameters
            json_data: JSON request body
            retry_count: Current retry count
            
        Returns:
            HTTP response
            
        Raises:
            Various API exceptions based on response status
        """
        await self._ensure_client()
        await self.rate_limiter.acquire()
        
        url = urljoin(self.base_url, path)
        
        try:
            response = await self._client.request(
                method,
                url,
                params=params,
                json=json_data,
            )
            
            if response.is_success:
                return response
            
            # Handle rate limiting with exponential backoff
            if response.status_code == 429 and retry_count < self.max_retries:
                retry_after = 1
                if "Retry-After" in response.headers:
                    try:
                        retry_after = int(response.headers["Retry-After"])
                    except ValueError:
                        pass
                
                wait_time = min(retry_after, 2 ** retry_count)
                await asyncio.sleep(wait_time)
                return await self._request(method, path, params=params, json_data=json_data, retry_count=retry_count + 1)
            
            # Handle server errors with exponential backoff
            if 500 <= response.status_code < 600 and retry_count < self.max_retries:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await self._request(method, path, params=params, json_data=json_data, retry_count=retry_count + 1)
            
            raise self._get_error_from_response(response)
            
        except httpx.TimeoutException as e:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await self._request(method, path, params=params, json_data=json_data, retry_count=retry_count + 1)
            raise TimeoutError(f"Request timed out after {self.timeout} seconds") from e
        
        except httpx.NetworkError as e:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await self._request(method, path, params=params, json_data=json_data, retry_count=retry_count + 1)
            raise NetworkError(f"Network error: {str(e)}") from e
    
    async def get(self, path: str, **params) -> Dict[str, Any]:
        """
        Make a GET request.
        
        Args:
            path: API path
            **params: Query parameters
            
        Returns:
            Response JSON data
        """
        response = await self._request("GET", path, params=params)
        return response.json()
    
    async def post(self, path: str, *, json_data: Optional[Dict[str, Any]] = None, **params) -> Dict[str, Any]:
        """
        Make a POST request.
        
        Args:
            path: API path
            json_data: JSON request body
            **params: Query parameters
            
        Returns:
            Response JSON data
        """
        response = await self._request("POST", path, params=params, json_data=json_data)
        return response.json()
    
    async def put(self, path: str, *, json_data: Optional[Dict[str, Any]] = None, **params) -> Dict[str, Any]:
        """
        Make a PUT request.
        
        Args:
            path: API path
            json_data: JSON request body
            **params: Query parameters
            
        Returns:
            Response JSON data
        """
        response = await self._request("PUT", path, params=params, json_data=json_data)
        return response.json()
    
    async def delete(self, path: str, **params) -> Dict[str, Any]:
        """
        Make a DELETE request.
        
        Args:
            path: API path
            **params: Query parameters
            
        Returns:
            Response JSON data
        """
        response = await self._request("DELETE", path, params=params)
        return response.json()
    
    async def paginate(
        self,
        path: str,
        *,
        cursor_param: str = "cursor",
        limit_param: str = "limit",
        limit: int = 100,
        **params
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Paginate through API results.
        
        Args:
            path: API path
            cursor_param: Name of cursor parameter
            limit_param: Name of limit parameter
            limit: Number of items per page
            **params: Additional query parameters
            
        Yields:
            Individual items from paginated results
        """
        next_cursor = None
        
        while True:
            request_params = {**params, limit_param: limit}
            if next_cursor:
                request_params[cursor_param] = next_cursor
            
            response = await self.get(path, **request_params)
            
            # Handle different response structures
            items = []
            if "webhooks" in response:
                items = response["webhooks"]
                next_cursor = response.get("next_page")
            elif "requests" in response:
                items = response["requests"]
                next_cursor = response.get("next_page")
            else:
                # Fallback for direct item lists
                if isinstance(response, list):
                    items = response
                else:
                    items = [response]
                next_cursor = None
            
            for item in items:
                yield item
            
            if not next_cursor:
                break