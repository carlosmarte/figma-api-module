"""Custom exceptions for Figma Projects API."""

from typing import Optional, Dict, Any


class FigmaProjectsError(Exception):
    """Base exception for all Figma Projects errors."""
    
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.context = context or {}


class AuthenticationError(FigmaProjectsError):
    """Authentication failed - invalid or missing API token."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message)


class AuthorizationError(FigmaProjectsError):
    """Authorization failed - insufficient permissions."""
    
    def __init__(self, message: str = "Authorization failed"):
        super().__init__(message)


class NotFoundError(FigmaProjectsError):
    """Requested resource was not found."""
    
    def __init__(self, resource_type: str, resource_id: str):
        message = f"{resource_type} with ID '{resource_id}' not found"
        super().__init__(message, {"resource_type": resource_type, "resource_id": resource_id})


class RateLimitError(FigmaProjectsError):
    """Rate limit exceeded."""
    
    def __init__(self, retry_after: int):
        message = f"Rate limit exceeded. Retry after {retry_after} seconds"
        super().__init__(message, {"retry_after": retry_after})
        self.retry_after = retry_after


class ApiError(FigmaProjectsError):
    """General API error."""
    
    def __init__(self, status_code: int, message: str, response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message, {"status_code": status_code, "response_data": response_data})
        self.status_code = status_code
        self.response_data = response_data


class ValidationError(FigmaProjectsError):
    """Data validation error."""
    
    def __init__(self, field: str, value: Any, message: str):
        error_message = f"Validation error for field '{field}': {message}"
        super().__init__(error_message, {"field": field, "value": value})


class NetworkError(FigmaProjectsError):
    """Network-related error."""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message, {"original_error": str(original_error) if original_error else None})
        self.original_error = original_error


class TimeoutError(FigmaProjectsError):
    """Request timeout error."""
    
    def __init__(self, timeout_seconds: float):
        message = f"Request timed out after {timeout_seconds} seconds"
        super().__init__(message, {"timeout_seconds": timeout_seconds})


class ConfigurationError(FigmaProjectsError):
    """Configuration error."""
    
    def __init__(self, parameter: str, message: str):
        error_message = f"Configuration error for '{parameter}': {message}"
        super().__init__(error_message, {"parameter": parameter})