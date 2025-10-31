"""
Figma Comments - A comprehensive Python library for Figma Comments API integration.

This library provides a clean, async-first interface for working with Figma's
Comments API, including rate limiting, retries, and comprehensive error handling.
"""

from figma_comments.core.exceptions import (
    FigmaCommentsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)
from figma_comments.core.models import (
    Comment,
    CommentReaction,
    User,
    Vector,
    FrameOffset,
    Region,
    FrameOffsetRegion,
)
from figma_comments.interfaces.sdk import FigmaCommentsSDK

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

__all__ = [
    # SDK
    "FigmaCommentsSDK",
    # Models
    "Comment",
    "CommentReaction", 
    "User",
    "Vector",
    "FrameOffset",
    "Region",
    "FrameOffsetRegion",
    # Exceptions
    "FigmaCommentsError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ApiError",
    # Metadata
    "__version__",
]