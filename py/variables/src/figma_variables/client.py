"""
Low-level HTTP client for Figma Variables API with rate limiting and retries.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, AsyncIterator
import httpx
from .errors import (
    FigmaVariablesError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)
from .utils import format_error_message


class RateLimiter:
    """Token bucket rate limiter implementation."""
    
    def __init__(self, max_tokens: int = 30, refill_rate: float = 1.0):
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
    
    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            now = time.time()
            # Add tokens based on time elapsed
            tokens_to_add = (now - self.last_refill) * self.refill_rate
            self.tokens = min(self.max_tokens, self.tokens + tokens_to_add)
            self.last_refill = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return
            
            # Wait for next token
            wait_time = (1 - self.tokens) / self.refill_rate
            await asyncio.sleep(wait_time)
            self.tokens = 0


class FigmaVariablesClient:
    """Low-level HTTP client for Figma Variables API."""
    
    def __init__(
        self,
        api_token: str,
        base_url: str = "https://api.figma.com",
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit_tokens: int = 30,
        rate_limit_refill: float = 1.0,
    ):
        """
        Initialize the Figma Variables API client.
        
        Args:
            api_token: Figma personal access token with file_variables scope
            base_url: Base URL for Figma API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            rate_limit_tokens: Maximum tokens in rate limiter
            rate_limit_refill: Rate limiter refill rate (tokens per second)
        """
        self.api_token = api_token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.rate_limiter = RateLimiter(rate_limit_tokens, rate_limit_refill)
        
        # HTTP client with connection pooling
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
                timeout=self.timeout,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authentication."""
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "User-Agent": "figma-variables-python/0.1.0",
        }
    
    def _handle_error_response(self, response: httpx.Response) -> None:
        """Handle error responses and raise appropriate exceptions."""
        try:
            error_data = response.json()
            error_message = format_error_message(error_data)
        except Exception:
            error_message = f"HTTP {response.status_code}: {response.text}"
        
        if response.status_code == 401:
            raise AuthenticationError(error_message)
        elif response.status_code == 403:
            raise AuthorizationError(error_message)
        elif response.status_code == 404:
            raise NotFoundError(error_message)
        elif response.status_code == 429:
            retry_after = None
            if "retry-after" in response.headers:
                try:
                    retry_after = int(response.headers["retry-after"])
                except ValueError:
                    pass
            raise RateLimitError(error_message, retry_after)
        else:
            raise ApiError(error_message, response.status_code)
    
    async def _request(
        self,
        method: str,
        path: str,
        **kwargs
    ) -> httpx.Response:
        """
        Make HTTP request with retries and rate limiting.
        
        Args:
            method: HTTP method
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            HTTP response
            
        Raises:
            FigmaVariablesError: On API errors
        """
        await self._ensure_client()
        
        url = f"{self.base_url}{path}"
        headers = self._get_headers()
        if "headers" in kwargs:
            headers.update(kwargs.pop("headers"))
        
        for attempt in range(self.max_retries + 1):
            try:
                # Rate limiting
                await self.rate_limiter.acquire()
                
                response = await self._client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    **kwargs
                )
                
                if response.is_success:
                    return response
                
                # Handle rate limiting with exponential backoff
                if response.status_code == 429 and attempt < self.max_retries:
                    retry_after = 1
                    if "retry-after" in response.headers:
                        try:
                            retry_after = int(response.headers["retry-after"])
                        except ValueError:
                            pass
                    
                    wait_time = min(retry_after * (2 ** attempt), 60)
                    await asyncio.sleep(wait_time)
                    continue
                
                # Handle server errors with exponential backoff
                if (
                    response.status_code >= 500 
                    and attempt < self.max_retries
                ):
                    wait_time = min(2 ** attempt, 10)
                    await asyncio.sleep(wait_time)
                    continue
                
                # Raise error for final attempt or non-retryable errors
                self._handle_error_response(response)
                
            except httpx.RequestError as e:
                if attempt == self.max_retries:
                    raise ApiError(f"Request failed: {e}")
                
                wait_time = min(2 ** attempt, 10)
                await asyncio.sleep(wait_time)
        
        raise ApiError("Max retries exceeded")
    
    async def get(self, path: str, **kwargs) -> Dict[str, Any]:
        """
        Make GET request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("GET", path, **kwargs)
        return response.json()
    
    async def post(self, path: str, **kwargs) -> Dict[str, Any]:
        """
        Make POST request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("POST", path, **kwargs)
        return response.json()
    
    async def put(self, path: str, **kwargs) -> Dict[str, Any]:
        """
        Make PUT request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("PUT", path, **kwargs)
        return response.json()
    
    async def delete(self, path: str, **kwargs) -> Dict[str, Any]:
        """
        Make DELETE request.
        
        Args:
            path: API path
            **kwargs: Additional request arguments
            
        Returns:
            JSON response data
        """
        response = await self._request("DELETE", path, **kwargs)
        return response.json()
    
    async def paginate(
        self,
        path: str,
        page_param: str = "cursor",
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Paginate through API results.
        
        Args:
            path: API path
            page_param: Parameter name for pagination
            **kwargs: Additional request arguments
            
        Yields:
            Individual items from paginated response
        """
        params = kwargs.pop("params", {})
        cursor = None
        
        while True:
            if cursor:
                params[page_param] = cursor
            
            response_data = await self.get(path, params=params, **kwargs)
            
            # Extract items from response
            items = []
            if "meta" in response_data:
                meta = response_data["meta"]
                # Try common collection names
                for collection_name in ["variables", "variableCollections", "items"]:
                    if collection_name in meta:
                        if isinstance(meta[collection_name], dict):
                            items = list(meta[collection_name].values())
                        elif isinstance(meta[collection_name], list):
                            items = meta[collection_name]
                        break
            
            for item in items:
                yield item
            
            # Check for next page
            pagination = response_data.get("pagination", {})
            if not pagination.get("next_page", False):
                break
            
            cursor = pagination.get("next_cursor")
            if not cursor:
                break
    
    # Variables API specific methods
    
    async def get_local_variables(self, file_key: str) -> Dict[str, Any]:
        """
        Get local variables from a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            Local variables response
        """
        return await self.get(f"/v1/files/{file_key}/variables/local")
    
    async def get_published_variables(self, file_key: str) -> Dict[str, Any]:
        """
        Get published variables from a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            Published variables response
        """
        return await self.get(f"/v1/files/{file_key}/variables/published")
    
    async def modify_variables(
        self,
        file_key: str,
        variables_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create, modify, or delete variables.
        
        Args:
            file_key: Figma file key
            variables_request: Variables modification request
            
        Returns:
            Variables modification response
        """
        return await self.post(
            f"/v1/files/{file_key}/variables",
            json=variables_request
        )