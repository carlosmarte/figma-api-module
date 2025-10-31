"""
Low-level HTTP client for Figma Library Analytics API with rate limiting and retries.
"""

import asyncio
import time
from typing import Any, AsyncIterator, Dict, Optional

import httpx
from httpx import Response

from .errors import (
    ApiError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
)


class RateLimiter:
    """Token bucket rate limiter implementation."""
    
    def __init__(self, requests_per_minute: int = 300):
        """
        Initialize rate limiter.
        
        Args:
            requests_per_minute: Maximum requests allowed per minute
        """
        self.requests_per_minute = requests_per_minute
        self.bucket_size = requests_per_minute
        self.tokens = requests_per_minute
        self.last_update = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire a token from the bucket, waiting if necessary."""
        async with self._lock:
            now = time.time()
            # Add tokens based on elapsed time
            elapsed = now - self.last_update
            tokens_to_add = elapsed * (self.requests_per_minute / 60.0)
            self.tokens = min(self.bucket_size, self.tokens + tokens_to_add)
            self.last_update = now
            
            if self.tokens < 1:
                # Calculate wait time
                wait_time = (1 - self.tokens) / (self.requests_per_minute / 60.0)
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1


class FigmaAnalyticsClient:
    """
    Low-level API client with rate limiting and retries.
    
    Handles authentication, rate limiting, error handling, and automatic retries
    with exponential backoff for the Figma Library Analytics API.
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        requests_per_minute: int = 300,
        max_retries: int = 3,
        timeout: float = 30.0,
    ):
        """
        Initialize the client.
        
        Args:
            api_key: Figma API token with library_analytics:read scope
            base_url: Base URL for Figma API
            requests_per_minute: Rate limit for requests
            max_retries: Maximum number of retry attempts
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.max_retries = max_retries
        self.timeout = timeout
        
        self.rate_limiter = RateLimiter(requests_per_minute)
        
        # Create HTTP client with connection pooling
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
            headers={
                "X-Figma-Token": api_key,
                "User-Agent": "figma-library-analytics-python/0.1.0",
            },
        )
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
    
    def _handle_error(self, response: Response) -> None:
        """
        Handle HTTP error responses.
        
        Args:
            response: HTTP response object
            
        Raises:
            Appropriate exception based on status code
        """
        status_code = response.status_code
        
        try:
            error_data = response.json()
            error_message = error_data.get('err') or error_data.get('message', 'Unknown error')
        except Exception:
            error_message = f"HTTP {status_code} error"
        
        if status_code == 401:
            raise AuthenticationError(f"Authentication failed: {error_message}")
        elif status_code == 403:
            raise AuthorizationError(f"Access forbidden: {error_message}")
        elif status_code == 404:
            raise NotFoundError(f"Resource not found: {error_message}")
        elif status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            raise RateLimitError(f"Rate limit exceeded: {error_message}", retry_after)
        else:
            raise ApiError(f"API error: {error_message}", status_code)
    
    async def _request_with_retries(
        self, 
        method: str, 
        path: str, 
        **kwargs
    ) -> Response:
        """
        Make HTTP request with automatic retries and exponential backoff.
        
        Args:
            method: HTTP method
            path: API endpoint path
            **kwargs: Additional request parameters
            
        Returns:
            HTTP response
            
        Raises:
            Various exceptions based on response status
        """
        url = f"{self.base_url}{path}"
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                # Apply rate limiting
                await self.rate_limiter.acquire()
                
                response = await self._client.request(method, url, **kwargs)
                
                # Handle rate limiting from server
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    if attempt < self.max_retries:
                        await asyncio.sleep(retry_after)
                        continue
                
                # Handle server errors with retries
                if response.status_code >= 500 and attempt < self.max_retries:
                    wait_time = 2 ** attempt  # Exponential backoff
                    await asyncio.sleep(wait_time)
                    continue
                
                # Handle client errors immediately (no retry)
                if 400 <= response.status_code < 500:
                    self._handle_error(response)
                
                # Check for other errors
                response.raise_for_status()
                return response
                
            except httpx.RequestError as e:
                last_exception = e
                if attempt < self.max_retries:
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                    continue
                break
        
        # If we get here, all retries failed
        if last_exception:
            raise ApiError(f"Request failed after {self.max_retries} retries: {last_exception}", 0)
        else:
            raise ApiError(f"Request failed after {self.max_retries} retries", 0)
    
    async def get(self, path: str, **kwargs) -> Dict[str, Any]:
        """
        Make GET request.
        
        Args:
            path: API endpoint path
            **kwargs: Query parameters
            
        Returns:
            JSON response data
        """
        response = await self._request_with_retries("GET", path, params=kwargs)
        return response.json()
    
    async def paginate(
        self, 
        path: str, 
        **params
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Paginate through all results from an endpoint.
        
        Args:
            path: API endpoint path
            **params: Query parameters
            
        Yields:
            Individual items from paginated response
        """
        cursor = None
        
        while True:
            # Add cursor to params if available
            request_params = params.copy()
            if cursor:
                request_params['cursor'] = cursor
            
            response_data = await self.get(path, **request_params)
            
            # Yield each row from the current page
            for row in response_data.get('rows', []):
                yield row
            
            # Check if there are more pages
            if not response_data.get('next_page', False):
                break
            
            cursor = response_data.get('cursor')
            if not cursor:
                break