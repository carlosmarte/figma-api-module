"""Custom exceptions for Figma Comments API operations."""

from typing import Optional, Dict, Any


class FigmaCommentsError(Exception):
    """Base exception for all Figma Comments API errors."""

    def __init__(
        self, 
        message: str, 
        status_code: Optional[int] = None,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}

    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(FigmaCommentsError):
    """Raised when authentication fails (401 Unauthorized)."""

    def __init__(
        self, 
        message: str = "Invalid or missing API token",
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, 401, response_data)


class AuthorizationError(FigmaCommentsError):
    """Raised when authorization fails (403 Forbidden)."""

    def __init__(
        self, 
        message: str = "Insufficient permissions for this operation",
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, 403, response_data)


class NotFoundError(FigmaCommentsError):
    """Raised when a resource is not found (404 Not Found)."""

    def __init__(
        self, 
        message: str = "Requested resource not found",
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, 404, response_data)


class RateLimitError(FigmaCommentsError):
    """Raised when rate limit is exceeded (429 Too Many Requests)."""

    def __init__(
        self, 
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, 429, response_data)
        self.retry_after = retry_after

    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.retry_after:
            return f"{base_msg} (retry after {self.retry_after} seconds)"
        return base_msg


class ValidationError(FigmaCommentsError):
    """Raised when request validation fails (400 Bad Request)."""

    def __init__(
        self, 
        message: str = "Request validation failed",
        errors: Optional[list] = None,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, 400, response_data)
        self.errors = errors or []

    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.errors:
            error_details = "; ".join(str(error) for error in self.errors)
            return f"{base_msg}: {error_details}"
        return base_msg


class ApiError(FigmaCommentsError):
    """Generic API error for unexpected status codes."""

    def __init__(
        self, 
        message: str,
        status_code: int,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, status_code, response_data)


class NetworkError(FigmaCommentsError):
    """Raised when network/connection errors occur."""

    def __init__(
        self, 
        message: str = "Network error occurred",
        original_exception: Optional[Exception] = None
    ) -> None:
        super().__init__(message)
        self.original_exception = original_exception

    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.original_exception:
            return f"{base_msg}: {self.original_exception}"
        return base_msg


class TimeoutError(FigmaCommentsError):
    """Raised when request timeout occurs."""

    def __init__(
        self, 
        message: str = "Request timeout",
        timeout_seconds: Optional[float] = None
    ) -> None:
        super().__init__(message)
        self.timeout_seconds = timeout_seconds

    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.timeout_seconds:
            return f"{base_msg} ({self.timeout_seconds}s)"
        return base_msg


class CommentNotFoundError(NotFoundError):
    """Raised when a specific comment is not found."""

    def __init__(
        self, 
        comment_id: str,
        file_key: str,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        message = f"Comment '{comment_id}' not found in file '{file_key}'"
        super().__init__(message, response_data)
        self.comment_id = comment_id
        self.file_key = file_key


class FileNotFoundError(NotFoundError):
    """Raised when a Figma file is not found."""

    def __init__(
        self, 
        file_key: str,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        message = f"Figma file '{file_key}' not found or not accessible"
        super().__init__(message, response_data)
        self.file_key = file_key


class InvalidCommentError(ValidationError):
    """Raised when comment data is invalid."""

    def __init__(
        self, 
        message: str = "Invalid comment data",
        field_errors: Optional[Dict[str, str]] = None,
        response_data: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message, response_data=response_data)
        self.field_errors = field_errors or {}

    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.field_errors:
            field_details = "; ".join(f"{field}: {error}" for field, error in self.field_errors.items())
            return f"{base_msg}: {field_details}"
        return base_msg