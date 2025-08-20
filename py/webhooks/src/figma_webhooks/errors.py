"""
Custom exceptions for the Figma Webhooks library.
"""

from typing import Optional, Dict, Any


class FigmaWebhooksError(Exception):
    """Base exception for all Figma Webhooks API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}


class AuthenticationError(FigmaWebhooksError):
    """Raised when authentication fails (401)."""
    
    def __init__(self, message: str = "Authentication failed. Check your API token.", **kwargs):
        super().__init__(message, status_code=401, **kwargs)


class AuthorizationError(FigmaWebhooksError):
    """Raised when authorization fails (403)."""
    
    def __init__(self, message: str = "Access forbidden. Check your permissions.", **kwargs):
        super().__init__(message, status_code=403, **kwargs)


class NotFoundError(FigmaWebhooksError):
    """Raised when a resource is not found (404)."""
    
    def __init__(self, message: str = "Resource not found.", **kwargs):
        super().__init__(message, status_code=404, **kwargs)


class RateLimitError(FigmaWebhooksError):
    """Raised when rate limit is exceeded (429)."""
    
    def __init__(self, message: str = "Rate limit exceeded.", retry_after: Optional[int] = None, **kwargs):
        super().__init__(message, status_code=429, **kwargs)
        self.retry_after = retry_after


class ValidationError(FigmaWebhooksError):
    """Raised when request validation fails (400)."""
    
    def __init__(self, message: str = "Request validation failed.", **kwargs):
        super().__init__(message, status_code=400, **kwargs)


class ApiError(FigmaWebhooksError):
    """Raised for general API errors."""
    
    def __init__(self, message: str, status_code: int = 500, **kwargs):
        super().__init__(message, status_code=status_code, **kwargs)


class NetworkError(FigmaWebhooksError):
    """Raised when network connection fails."""
    
    def __init__(self, message: str = "Network connection failed.", **kwargs):
        super().__init__(message, **kwargs)


class TimeoutError(FigmaWebhooksError):
    """Raised when request times out."""
    
    def __init__(self, message: str = "Request timed out.", **kwargs):
        super().__init__(message, **kwargs)