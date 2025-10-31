"""
Custom exceptions for the Figma Variables API client.
"""

from typing import Optional


class FigmaVariablesError(Exception):
    """Base exception for all Figma Variables API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationError(FigmaVariablesError):
    """Authentication failed (401)."""
    
    def __init__(self, message: str = "Authentication failed. Check your API token."):
        super().__init__(message, 401)


class AuthorizationError(FigmaVariablesError):
    """Authorization failed (403)."""
    
    def __init__(self, message: str = "Insufficient permissions. Enterprise organization and file_variables scope required."):
        super().__init__(message, 403)


class NotFoundError(FigmaVariablesError):
    """Resource not found (404)."""
    
    def __init__(self, message: str = "Resource not found."):
        super().__init__(message, 404)


class RateLimitError(FigmaVariablesError):
    """Rate limit exceeded (429)."""
    
    def __init__(self, message: str = "Rate limit exceeded.", retry_after: Optional[int] = None):
        self.retry_after = retry_after
        super().__init__(message, 429)


class ApiError(FigmaVariablesError):
    """General API error."""
    
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code)