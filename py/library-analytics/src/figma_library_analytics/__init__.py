"""
Figma Library Analytics - Python SDK for Figma Library Analytics API

This package provides a comprehensive interface to the Figma Library Analytics API,
including component, style, and variable analytics data.
"""

from .client import FigmaAnalyticsClient
from .sdk import FigmaAnalyticsSDK
from .models import (
    LibraryAnalyticsComponentActionsByAsset,
    LibraryAnalyticsComponentActionsByTeam,
    LibraryAnalyticsComponentUsagesByAsset,
    LibraryAnalyticsComponentUsagesByFile,
    LibraryAnalyticsStyleActionsByAsset,
    LibraryAnalyticsStyleActionsByTeam,
    LibraryAnalyticsStyleUsagesByAsset,
    LibraryAnalyticsStyleUsagesByFile,
    LibraryAnalyticsVariableActionsByAsset,
    LibraryAnalyticsVariableActionsByTeam,
    LibraryAnalyticsVariableUsagesByAsset,
    LibraryAnalyticsVariableUsagesByFile,
    AnalyticsResponse,
    GroupBy,
)
from .errors import (
    FigmaAnalyticsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

__version__ = "0.1.0"

__all__ = [
    # Core classes
    "FigmaAnalyticsClient",
    "FigmaAnalyticsSDK",
    
    # Models - Component Actions
    "LibraryAnalyticsComponentActionsByAsset",
    "LibraryAnalyticsComponentActionsByTeam",
    
    # Models - Component Usages
    "LibraryAnalyticsComponentUsagesByAsset",
    "LibraryAnalyticsComponentUsagesByFile",
    
    # Models - Style Actions
    "LibraryAnalyticsStyleActionsByAsset",
    "LibraryAnalyticsStyleActionsByTeam",
    
    # Models - Style Usages
    "LibraryAnalyticsStyleUsagesByAsset",
    "LibraryAnalyticsStyleUsagesByFile",
    
    # Models - Variable Actions
    "LibraryAnalyticsVariableActionsByAsset",
    "LibraryAnalyticsVariableActionsByTeam",
    
    # Models - Variable Usages
    "LibraryAnalyticsVariableUsagesByAsset",
    "LibraryAnalyticsVariableUsagesByFile",
    
    # Common models
    "AnalyticsResponse",
    "GroupBy",
    
    # Exceptions
    "FigmaAnalyticsError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ApiError",
]