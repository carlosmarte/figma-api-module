"""
Figma Components Integration Library

A comprehensive Python library for interacting with Figma's Components, Component Sets, and Styles APIs.
"""

from .client import FigmaComponentsClient
from .sdk import FigmaComponentsSDK
from .models import (
    PublishedComponent,
    PublishedComponentSet,
    PublishedStyle,
    StyleType,
    FrameInfo,
    User,
    ResponseCursor,
)
from .errors import (
    FigmaComponentsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

__version__ = "0.1.0"

__all__ = [
    # Core classes
    "FigmaComponentsClient",
    "FigmaComponentsSDK",
    # Models
    "PublishedComponent",
    "PublishedComponentSet",
    "PublishedStyle",
    "StyleType",
    "FrameInfo",
    "User",
    "ResponseCursor",
    # Exceptions
    "FigmaComponentsError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ApiError",
]