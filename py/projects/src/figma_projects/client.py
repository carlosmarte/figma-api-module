"""Low-level HTTP client for Figma Projects API with rate limiting and retries."""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, AsyncIterator, List
from urllib.parse import urljoin

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from .errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    NetworkError,
    TimeoutError,
)
from .models import RateLimitInfo


logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for API requests."""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.tokens = requests_per_minute
        self.last_refill = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire a token from the bucket, waiting if necessary."""
        async with self._lock:
            now = time.time()
            time_passed = now - self.last_refill
            
            # Refill tokens based on time passed
            tokens_to_add = time_passed * (self.requests_per_minute / 60.0)
            self.tokens = min(self.requests_per_minute, self.tokens + tokens_to_add)
            self.last_refill = now
            
            if self.tokens < 1:
                # Wait for enough time to get at least one token
                wait_time = (1 - self.tokens) * (60.0 / self.requests_per_minute)
                logger.debug(f"Rate limit reached, waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)
                self.tokens = 1
            
            self.tokens -= 1
    
    def get_wait_time(self) -> float:
        """Get the wait time until the next token is available."""
        if self.tokens >= 1:
            return 0.0
        return (1 - self.tokens) * (60.0 / self.requests_per_minute)


class FigmaProjectsClient:
    """Low-level API client with rate limiting and retries."""
    
    def __init__(
        self,
        api_token: str,
        base_url: str = "https://api.figma.com",
        requests_per_minute: int = 60,
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        """Initialize the client.
        
        Args:
            api_token: Figma API token
            base_url: Base URL for the API
            requests_per_minute: Rate limit for requests
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self.api_token = api_token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.rate_limiter = RateLimiter(requests_per_minute)
        self._client: Optional[httpx.AsyncClient] = None
        self._stats = {
            "requests_made": 0,
            "requests_failed": 0,
            "rate_limit_hits": 0,
            "total_wait_time": 0.0,
        }
    
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
            headers = {
                "X-Figma-Token": self.api_token,
                "User-Agent": "figma-projects-python/0.1.0",
                "Accept": "application/json",
            }
            self._client = httpx.AsyncClient(
                headers=headers,
                timeout=httpx.Timeout(self.timeout),
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    def _handle_response_errors(self, response: httpx.Response) -> None:
        """Handle HTTP response errors."""
        if response.status_code == 401:
            raise AuthenticationError("Invalid API token")
        elif response.status_code == 403:
            raise AuthorizationError("Insufficient permissions")
        elif response.status_code == 404:
            raise NotFoundError("Resource", "unknown")
        elif response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            self._stats["rate_limit_hits"] += 1
            raise RateLimitError(retry_after)
        elif response.status_code >= 400:
            try:
                error_data = response.json()
                message = error_data.get("message", f"HTTP {response.status_code}")
            except Exception:
                message = f"HTTP {response.status_code}"
            raise ApiError(response.status_code, message, error_data)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((NetworkError, RateLimitError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> httpx.Response:
        """Make an HTTP request with retries and rate limiting.
        
        Args:
            method: HTTP method
            path: API path
            params: Query parameters
            json_data: JSON request body
            **kwargs: Additional request arguments
            
        Returns:
            HTTP response
            
        Raises:
            Various API errors based on response status
        """
        await self._ensure_client()
        await self.rate_limiter.acquire()
        
        url = urljoin(self.base_url, path)
        
        try:
            start_time = time.time()
            self._stats["requests_made"] += 1
            
            response = await self._client.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                **kwargs,
            )
            
            request_time = time.time() - start_time
            logger.debug(f"{method} {url} - {response.status_code} ({request_time:.2f}s)")
            
            self._handle_response_errors(response)
            return response
            
        except httpx.TimeoutException as e:
            self._stats["requests_failed"] += 1
            raise TimeoutError(self.timeout) from e
        except httpx.NetworkError as e:
            self._stats["requests_failed"] += 1
            raise NetworkError(f"Network error: {str(e)}", e) from e
        except (RateLimitError, ApiError):
            self._stats["requests_failed"] += 1
            raise
    
    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a GET request.
        
        Args:
            path: API path
            params: Query parameters
            
        Returns:
            JSON response data
        """
        response = await self._request("GET", path, params=params)
        return response.json()
    
    async def post(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make a POST request.
        
        Args:
            path: API path
            json_data: JSON request body
            params: Query parameters
            
        Returns:
            JSON response data
        """
        response = await self._request("POST", path, params=params, json_data=json_data)
        return response.json()
    
    async def put(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make a PUT request.
        
        Args:
            path: API path
            json_data: JSON request body
            params: Query parameters
            
        Returns:
            JSON response data
        """
        response = await self._request("PUT", path, params=params, json_data=json_data)
        return response.json()
    
    async def delete(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a DELETE request.
        
        Args:
            path: API path
            params: Query parameters
            
        Returns:
            JSON response data
        """
        response = await self._request("DELETE", path, params=params)
        return response.json()
    
    async def paginate(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        page_size: int = 100,
        max_pages: Optional[int] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Paginate through API results.
        
        Args:
            path: API path
            params: Query parameters
            page_size: Items per page
            max_pages: Maximum pages to fetch
            
        Yields:
            Individual items from paginated results
        """
        params = params or {}
        current_page = 0
        
        while max_pages is None or current_page < max_pages:
            page_params = {**params, "page_size": page_size, "page": current_page}
            
            try:
                response = await self.get(path, params=page_params)
                
                # Handle different pagination response formats
                if "data" in response:
                    items = response["data"]
                    has_more = response.get("has_more", False)
                elif "results" in response:
                    items = response["results"]
                    has_more = len(items) == page_size
                else:
                    # Assume response is a list
                    items = response if isinstance(response, list) else [response]
                    has_more = len(items) == page_size
                
                for item in items:
                    yield item
                
                if not has_more or len(items) < page_size:
                    break
                
                current_page += 1
                
            except NotFoundError:
                # No more pages available
                break
    
    def get_rate_limit_info(self) -> RateLimitInfo:
        """Get current rate limit information.
        
        Returns:
            Rate limit information
        """
        wait_time = self.rate_limiter.get_wait_time()
        reset_at = datetime.now() + timedelta(seconds=wait_time)
        
        return RateLimitInfo(
            limit=self.rate_limiter.requests_per_minute,
            remaining=int(self.rate_limiter.tokens),
            reset_at=reset_at,
            retry_after=int(wait_time) if wait_time > 0 else None,
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get client statistics.
        
        Returns:
            Dictionary containing client statistics
        """
        return self._stats.copy()
    
    def reset_stats(self) -> None:
        """Reset client statistics."""
        self._stats = {
            "requests_made": 0,
            "requests_failed": 0,
            "rate_limit_hits": 0,
            "total_wait_time": 0.0,
        }