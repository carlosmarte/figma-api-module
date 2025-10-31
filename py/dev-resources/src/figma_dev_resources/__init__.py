"""Figma Dev Resources SDK - A complete Python client for the Figma Dev Resources API.

This package provides a comprehensive interface for interacting with Figma's Dev Resources API,
enabling developers to manage development resources attached to Figma design files.

Example:
    >>> from figma_dev_resources import FigmaDevResourcesSDK
    >>> sdk = FigmaDevResourcesSDK(api_key="your_token")
    >>> resources = await sdk.get_dev_resources("file_key")
"""

from .client import FigmaDevResourcesClient, RateLimiter
from .sdk import FigmaDevResourcesSDK
from .models import DevResource, DevResourceCreate, DevResourceUpdate
from .errors import (
    FigmaDevResourcesError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

__all__ = [
    # High-level SDK
    "FigmaDevResourcesSDK",
    # Low-level client
    "FigmaDevResourcesClient",
    "RateLimiter",
    # Models
    "DevResource",
    "DevResourceCreate", 
    "DevResourceUpdate",
    # Exceptions
    "FigmaDevResourcesError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ApiError",
]

__version__ = "0.1.0"
__author__ = "Figma Dev Resources SDK Team"
__email__ = "support@figma.com"