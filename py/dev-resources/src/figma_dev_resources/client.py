"""Low-level HTTP client for Figma Dev Resources API with rate limiting and retries."""

import asyncio
import time
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx
from .errors import (
    ApiError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)


class RateLimiter:
    """Token bucket rate limiter for API requests."""

    def __init__(self, max_requests: int = 100, time_window: int = 60):
        """Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests allowed in time window
            time_window: Time window in seconds
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.tokens = max_requests
        self.last_refill = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_refill
            
            # Refill tokens based on elapsed time
            if elapsed > 0:
                tokens_to_add = elapsed * (self.max_requests / self.time_window)
                self.tokens = min(self.max_requests, self.tokens + tokens_to_add)
                self.last_refill = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return
            
            # Wait for next token
            wait_time = (1 - self.tokens) * (self.time_window / self.max_requests)
            await asyncio.sleep(wait_time)
            self.tokens = 0


class FigmaDevResourcesClient:
    """Low-level HTTP client for Figma Dev Resources API with rate limiting and retries."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        max_retries: int = 3,
        timeout: float = 30.0,
        rate_limit_requests: int = 100,
        rate_limit_window: int = 60,
    ):
        """Initialize the client.
        
        Args:
            api_key: Figma API key
            base_url: Base URL for the API
            max_retries: Maximum number of retries for failed requests
            timeout: Request timeout in seconds
            rate_limit_requests: Maximum requests per time window
            rate_limit_window: Rate limit time window in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.timeout = timeout
        
        self._rate_limiter = RateLimiter(rate_limit_requests, rate_limit_window)
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
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "figma-dev-resources-sdk/0.1.0",
                },
            )

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        path: str,
        retry_count: int = 0,
        **kwargs
    ) -> httpx.Response:
        """Make HTTP request with rate limiting and retries.
        
        Args:
            method: HTTP method
            path: API path
            retry_count: Current retry attempt
            **kwargs: Additional request arguments
            
        Returns:
            HTTP response
            
        Raises:
            Various API errors based on response status
        """
        await self._rate_limiter.acquire()
        await self._ensure_client()
        
        url = f"{self.base_url}/{path.lstrip('/')}"
        
        try:
            response = await self._client.request(method, url, **kwargs)
        except httpx.TimeoutException:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count  # Exponential backoff
                await asyncio.sleep(wait_time)
                return await self._request(method, path, retry_count + 1, **kwargs)
            raise ApiError("Request timeout")
        except httpx.RequestError as e:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await self._request(method, path, retry_count + 1, **kwargs)
            raise ApiError(f"Request failed: {e}")

        # Handle rate limiting
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            if retry_count < self.max_retries:
                await asyncio.sleep(retry_after)
                return await self._request(method, path, retry_count + 1, **kwargs)
            raise RateLimitError("Rate limit exceeded", retry_after)

        # Handle other errors
        if response.status_code == 401:
            raise AuthenticationError("Invalid API key")
        elif response.status_code == 403:
            raise AuthorizationError("Insufficient permissions")
        elif response.status_code == 404:
            raise NotFoundError("Resource not found")
        elif response.status_code == 400:
            try:
                error_data = response.json()
                message = error_data.get("message", "Bad request")
            except Exception:
                message = "Bad request"
            raise ValidationError(message)
        elif response.status_code >= 500:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await self._request(method, path, retry_count + 1, **kwargs)
            raise ApiError(f"Server error: {response.status_code}")
        elif not response.is_success:
            raise ApiError(f"Request failed: {response.status_code}")

        return response

    async def get(self, path: str, **kwargs) -> Dict[str, Any]:
        """Make GET request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("GET", path, **kwargs)
        return response.json()

    async def post(self, path: str, **kwargs) -> Dict[str, Any]:
        """Make POST request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("POST", path, **kwargs)
        return response.json()

    async def put(self, path: str, **kwargs) -> Dict[str, Any]:
        """Make PUT request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("PUT", path, **kwargs)
        return response.json()

    async def delete(self, path: str, **kwargs) -> Dict[str, Any]:
        """Make DELETE request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("DELETE", path, **kwargs)
        try:
            return response.json()
        except Exception:
            # DELETE responses might not have JSON body
            return {"status": response.status_code}

    async def paginate(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        page_size: int = 100
    ) -> AsyncIterator[Dict[str, Any]]:
        """Paginate through API results.
        
        Args:
            path: API path
            params: Query parameters
            page_size: Number of items per page
            
        Yields:
            Individual items from paginated results
        """
        params = params or {}
        params["limit"] = page_size
        
        while True:
            response = await self.get(path, params=params)
            
            # Handle different pagination patterns
            if "dev_resources" in response:
                items = response["dev_resources"]
            elif "data" in response:
                items = response["data"]
            else:
                items = response.get("items", [])
            
            for item in items:
                yield item
            
            # Check for next page
            if "pagination" in response:
                next_page = response["pagination"].get("next_page")
                if not next_page:
                    break
                # Extract cursor from next page URL
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(next_page)
                query_params = parse_qs(parsed.query)
                if "cursor" in query_params:
                    params["cursor"] = query_params["cursor"][0]
                else:
                    break
            elif "next_page" in response and response["next_page"]:
                cursor = response.get("cursor")
                if cursor:
                    params["cursor"] = cursor
                else:
                    break
            else:
                # No pagination info, assume single page
                break