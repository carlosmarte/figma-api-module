"""Low-level HTTP client for Figma Components API."""

import asyncio
import time
from typing import Optional, Dict, Any, AsyncIterator, List, Union
from contextlib import asynccontextmanager

import httpx
from httpx import HTTPStatusError, RequestError

from .errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    NetworkError,
    ValidationError,
)
from .utils import validate_api_key, build_query_params


class RateLimiter:
    """Token bucket rate limiter for API requests."""
    
    def __init__(self, max_requests: int = 100, time_window: int = 60) -> None:
        """
        Initialize the rate limiter.
        
        Args:
            max_requests: Maximum number of requests per time window
            time_window: Time window in seconds
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.tokens = max_requests
        self.last_refill = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire a token from the bucket, waiting if necessary."""
        async with self._lock:
            now = time.time()
            time_passed = now - self.last_refill
            
            # Refill tokens based on time passed
            tokens_to_add = time_passed * (self.max_requests / self.time_window)
            self.tokens = min(self.max_requests, self.tokens + tokens_to_add)
            self.last_refill = now
            
            if self.tokens < 1:
                # Calculate wait time
                wait_time = (1 - self.tokens) / (self.max_requests / self.time_window)
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1


class FigmaComponentsClient:
    """Low-level API client with rate limiting and retries."""
    
    BASE_URL = "https://api.figma.com"
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit_requests: int = 100,
        rate_limit_window: int = 60,
        **httpx_kwargs: Any,
    ) -> None:
        """
        Initialize the Figma Components client.
        
        Args:
            api_key: Figma API token
            base_url: Base URL for the API (defaults to Figma's API)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            rate_limit_requests: Maximum requests per rate limit window
            rate_limit_window: Rate limit window in seconds
            **httpx_kwargs: Additional arguments for httpx.AsyncClient
        """
        if not validate_api_key(api_key):
            raise ValidationError("Invalid API key format")
        
        self.api_key = api_key
        self.base_url = base_url or self.BASE_URL
        self.timeout = timeout
        self.max_retries = max_retries
        
        # Rate limiter
        self.rate_limiter = RateLimiter(rate_limit_requests, rate_limit_window)
        
        # HTTP client configuration
        headers = {
            "X-Figma-Token": api_key,
            "User-Agent": "figma-components-python/0.1.0",
            "Accept": "application/json",
        }
        
        client_kwargs = {
            "base_url": self.base_url,
            "timeout": timeout,
            "headers": headers,
            **httpx_kwargs,
        }
        
        self._client: Optional[httpx.AsyncClient] = None
        self._client_kwargs = client_kwargs
    
    async def __aenter__(self) -> "FigmaComponentsClient":
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()
    
    async def start(self) -> None:
        """Start the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(**self._client_kwargs)
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get the HTTP client, raising an error if not started."""
        if self._client is None:
            raise RuntimeError("Client not started. Use 'async with client:' or call 'await client.start()'")
        return self._client
    
    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> httpx.Response:
        """
        Make an HTTP request with rate limiting and retries.
        
        Args:
            method: HTTP method
            path: API endpoint path
            params: Query parameters
            json: JSON body data
            **kwargs: Additional request arguments
            
        Returns:
            HTTP response
            
        Raises:
            Various API errors based on response status
        """
        url = f"{path.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                # Rate limiting
                await self.rate_limiter.acquire()
                
                # Make request
                response = await self.client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    **kwargs,
                )
                
                # Check for rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    if attempt < self.max_retries:
                        await asyncio.sleep(retry_after)
                        continue
                    raise RateLimitError("Rate limit exceeded", retry_after)
                
                # Check for other errors
                response.raise_for_status()
                return response
                
            except HTTPStatusError as e:
                if attempt == self.max_retries:
                    self._handle_http_error(e.response)
                
                # Retry on server errors
                if e.response.status_code >= 500:
                    wait_time = 2 ** attempt  # Exponential backoff
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    self._handle_http_error(e.response)
                    
            except RequestError as e:
                if attempt == self.max_retries:
                    raise NetworkError(f"Network error: {e}")
                
                wait_time = 2 ** attempt  # Exponential backoff
                await asyncio.sleep(wait_time)
        
        # This should never be reached
        raise ApiError("Max retries exceeded", 500)
    
    def _handle_http_error(self, response: httpx.Response) -> None:
        """Handle HTTP errors and raise appropriate exceptions."""
        status_code = response.status_code
        
        try:
            error_data = response.json()
            message = error_data.get("message", response.text)
        except Exception:
            message = response.text or f"HTTP {status_code} error"
        
        if status_code == 401:
            raise AuthenticationError(message)
        elif status_code == 403:
            raise AuthorizationError(message)
        elif status_code == 404:
            raise NotFoundError(message)
        elif status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            raise RateLimitError(message, retry_after)
        else:
            raise ApiError(message, status_code)
    
    async def get(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Make a GET request and return JSON data."""
        response = await self._request("GET", path, **kwargs)
        return response.json()
    
    async def post(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Make a POST request and return JSON data."""
        response = await self._request("POST", path, **kwargs)
        return response.json()
    
    async def put(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Make a PUT request and return JSON data."""
        response = await self._request("PUT", path, **kwargs)
        return response.json()
    
    async def delete(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Make a DELETE request and return JSON data."""
        response = await self._request("DELETE", path, **kwargs)
        return response.json()
    
    async def paginate(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        items_key: str = "components",
        cursor_key: str = "cursor",
        page_size: int = 30,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Paginate through API results.
        
        Args:
            path: API endpoint path
            params: Query parameters
            items_key: Key in response containing items
            cursor_key: Key in response containing cursor info
            page_size: Number of items per page
            
        Yields:
            Individual items from paginated results
        """
        current_params = dict(params or {})
        current_params["page_size"] = page_size
        
        while True:
            response_data = await self.get(path, params=current_params)
            
            # Extract items
            meta = response_data.get("meta", {})
            items = meta.get(items_key, [])
            
            for item in items:
                yield item
            
            # Check for next page
            cursor = meta.get(cursor_key)
            if not cursor or not cursor.get("after"):
                break
            
            current_params["after"] = cursor["after"]
    
    # Component endpoints
    async def get_team_components(
        self,
        team_id: str,
        page_size: int = 30,
        after: Optional[int] = None,
        before: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get team components."""
        params = build_query_params(
            page_size=page_size,
            after=after,
            before=before,
        )
        return await self.get(f"/v1/teams/{team_id}/components", params=params)
    
    async def get_file_components(self, file_key: str) -> Dict[str, Any]:
        """Get file components."""
        return await self.get(f"/v1/files/{file_key}/components")
    
    async def get_component(self, key: str) -> Dict[str, Any]:
        """Get component by key."""
        return await self.get(f"/v1/components/{key}")
    
    # Component set endpoints
    async def get_team_component_sets(
        self,
        team_id: str,
        page_size: int = 30,
        after: Optional[int] = None,
        before: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get team component sets."""
        params = build_query_params(
            page_size=page_size,
            after=after,
            before=before,
        )
        return await self.get(f"/v1/teams/{team_id}/component_sets", params=params)
    
    async def get_file_component_sets(self, file_key: str) -> Dict[str, Any]:
        """Get file component sets."""
        return await self.get(f"/v1/files/{file_key}/component_sets")
    
    async def get_component_set(self, key: str) -> Dict[str, Any]:
        """Get component set by key."""
        return await self.get(f"/v1/component_sets/{key}")
    
    # Style endpoints
    async def get_team_styles(
        self,
        team_id: str,
        page_size: int = 30,
        after: Optional[int] = None,
        before: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get team styles."""
        params = build_query_params(
            page_size=page_size,
            after=after,
            before=before,
        )
        return await self.get(f"/v1/teams/{team_id}/styles", params=params)
    
    async def get_file_styles(self, file_key: str) -> Dict[str, Any]:
        """Get file styles."""
        return await self.get(f"/v1/files/{file_key}/styles")
    
    async def get_style(self, key: str) -> Dict[str, Any]:
        """Get style by key."""
        return await self.get(f"/v1/styles/{key}")


@asynccontextmanager
async def create_client(api_key: str, **kwargs: Any) -> AsyncIterator[FigmaComponentsClient]:
    """
    Create and manage a Figma Components client.
    
    Args:
        api_key: Figma API token
        **kwargs: Additional client arguments
        
    Yields:
        Configured client instance
    """
    client = FigmaComponentsClient(api_key, **kwargs)
    try:
        await client.start()
        yield client
    finally:
        await client.close()