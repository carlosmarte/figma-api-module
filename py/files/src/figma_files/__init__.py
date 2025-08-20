"""Figma Files SDK - Python SDK for Figma Files API."""

from .client import FigmaFileClient
from .sdk import FigmaFileSDK
from .models import (
    FileResponse,
    FileNodesResponse,
    ImageRenderResponse,
    ImageFillsResponse,
    FileMetaResponse,
    FileVersionsResponse,
    Node,
    Component,
    Style,
    Version,
    User,
    Branch,
)
from .errors import (
    FigmaFileError,
    ApiError,
    RateLimitError,
    AuthenticationError,
    ValidationError,
)

__version__ = "0.1.0"
__all__ = [
    # Main classes
    "FigmaFileClient",
    "FigmaFileSDK",
    # Response models
    "FileResponse",
    "FileNodesResponse", 
    "ImageRenderResponse",
    "ImageFillsResponse",
    "FileMetaResponse",
    "FileVersionsResponse",
    # Data models
    "Node",
    "Component",
    "Style",
    "Version",
    "User",
    "Branch",
    # Exceptions
    "FigmaFileError",
    "ApiError",
    "RateLimitError",
    "AuthenticationError",
    "ValidationError",
]