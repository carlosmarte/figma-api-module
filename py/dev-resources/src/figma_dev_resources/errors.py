"""Custom exceptions for Figma Dev Resources SDK."""


class FigmaDevResourcesError(Exception):
    """Base exception for all Figma Dev Resources SDK errors."""

    def __init__(self, message: str, status_code: int = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthenticationError(FigmaDevResourcesError):
    """Authentication failed - token is missing or invalid."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(FigmaDevResourcesError):
    """Authorization failed - insufficient permissions."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)


class NotFoundError(FigmaDevResourcesError):
    """Resource not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class RateLimitError(FigmaDevResourcesError):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class ApiError(FigmaDevResourcesError):
    """General API error."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code)


class ValidationError(FigmaDevResourcesError):
    """Request validation error."""

    def __init__(self, message: str = "Request validation failed"):
        super().__init__(message, status_code=400)