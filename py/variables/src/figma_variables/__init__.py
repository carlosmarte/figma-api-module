"""
Figma Variables API Python Library

A comprehensive Python library for interacting with Figma's Variables API.
Supports Enterprise-only features for creating, reading, and modifying variables.
"""

from .client import FigmaVariablesClient
from .sdk import FigmaVariablesSDK
from .models import (
    LocalVariable,
    LocalVariableCollection,
    PublishedVariable,
    PublishedVariableCollection,
    VariableCollectionChange,
    VariableModeChange,
    VariableChange,
    VariableModeValue,
    VariableScope,
    VariableCodeSyntax,
    VariableResolvedDataType,
)
from .errors import (
    FigmaVariablesError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

__version__ = "0.1.0"
__author__ = "Figma Variables Team"
__email__ = "support@figma.com"

__all__ = [
    "FigmaVariablesClient",
    "FigmaVariablesSDK",
    "LocalVariable",
    "LocalVariableCollection", 
    "PublishedVariable",
    "PublishedVariableCollection",
    "VariableCollectionChange",
    "VariableModeChange",
    "VariableChange",
    "VariableModeValue",
    "VariableScope",
    "VariableCodeSyntax",
    "VariableResolvedDataType",
    "FigmaVariablesError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ApiError",
]