"""Custom exceptions for figma_files."""
from __future__ import annotations

from typing import Any, Optional


class FigmaFileError(Exception):
    """Base exception for figma_files."""

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize exception.

        Args:
            message: Error message
            code: Optional error code
            details: Optional error details
        """
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class ApiError(FigmaFileError):
    """API request error."""

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize API error.

        Args:
            message: Error message
            status_code: HTTP status code
            **kwargs: Additional error details
        """
        super().__init__(message, **kwargs)
        self.status_code = status_code


class RateLimitError(ApiError):
    """Rate limit exceeded error."""

    def __init__(self, *, retry_after: int = 60, **kwargs: Any) -> None:
        """Initialize rate limit error.

        Args:
            retry_after: Seconds to wait before retry
            **kwargs: Additional error details
        """
        super().__init__(
            f"Rate limit exceeded. Retry after {retry_after} seconds",
            status_code=429,
            **kwargs,
        )
        self.retry_after = retry_after


class AuthenticationError(ApiError):
    """Authentication failure error."""

    def __init__(self, message: str = "Authentication failed", **kwargs: Any) -> None:
        """Initialize authentication error."""
        super().__init__(message, status_code=401, **kwargs)


class ValidationError(FigmaFileError):
    """Data validation error."""
    pass