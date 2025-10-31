"""Custom exceptions for the Figma Components library."""

from typing import Optional


class FigmaComponentsError(Exception):
    """Base exception for all Figma Components library errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthenticationError(FigmaComponentsError):
    """Authentication failed (401 Unauthorized)."""
    
    def __init__(self, message: str = "Authentication failed. Check your API token.") -> None:
        super().__init__(message, 401)


class AuthorizationError(FigmaComponentsError):
    """Authorization failed (403 Forbidden)."""
    
    def __init__(self, message: str = "Insufficient permissions for this operation.") -> None:
        super().__init__(message, 403)


class NotFoundError(FigmaComponentsError):
    """Resource not found (404 Not Found)."""
    
    def __init__(self, message: str = "Requested resource not found.") -> None:
        super().__init__(message, 404)


class RateLimitError(FigmaComponentsError):
    """Rate limit exceeded (429 Too Many Requests)."""
    
    def __init__(self, message: str = "Rate limit exceeded.", retry_after: Optional[int] = None) -> None:
        super().__init__(message, 429)
        self.retry_after = retry_after or 60


class ApiError(FigmaComponentsError):
    """Generic API error for all other status codes."""
    
    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message, status_code)


class ValidationError(FigmaComponentsError):
    """Invalid input parameters or configuration."""
    
    def __init__(self, message: str) -> None:
        super().__init__(message, 400)


class NetworkError(FigmaComponentsError):
    """Network connectivity issues."""
    
    def __init__(self, message: str = "Network error occurred.") -> None:
        super().__init__(message)