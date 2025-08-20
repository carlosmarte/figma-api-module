"""
Custom exceptions for Figma Library Analytics API.
"""

from typing import Optional


class FigmaAnalyticsError(Exception):
    """Base exception for all Figma Analytics API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthenticationError(FigmaAnalyticsError):
    """Raised when authentication fails (401)."""
    
    def __init__(self, message: str = "Authentication failed. Invalid or missing API token."):
        super().__init__(message, 401)


class AuthorizationError(FigmaAnalyticsError):
    """Raised when authorization fails (403)."""
    
    def __init__(self, message: str = "Access forbidden. Insufficient permissions or missing 'library_analytics:read' scope."):
        super().__init__(message, 403)


class NotFoundError(FigmaAnalyticsError):
    """Raised when a resource is not found (404)."""
    
    def __init__(self, message: str = "Resource not found."):
        super().__init__(message, 404)


class RateLimitError(FigmaAnalyticsError):
    """Raised when rate limit is exceeded (429)."""
    
    def __init__(self, message: str = "Rate limit exceeded.", retry_after: Optional[int] = None):
        super().__init__(message, 429)
        self.retry_after = retry_after or 60


class ApiError(FigmaAnalyticsError):
    """Raised for general API errors (400, 500, etc.)."""
    
    def __init__(self, message: str, status_code: int):
        super().__init__(message, status_code)