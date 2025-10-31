"""Figma Projects - A comprehensive Python library for Figma Projects integration."""

from .sdk import FigmaProjectsSDK
from .client import FigmaProjectsClient
from .models import (
    Project,
    ProjectFile,
    TeamProjectsResponse,
    ProjectFilesResponse,
    ProjectTree,
    ProjectStatistics,
    FileSearchResult,
    BatchProjectResult,
    ExportFormat,
    RateLimitInfo,
    User,
)
from .errors import (
    FigmaProjectsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
    ValidationError,
    NetworkError,
    TimeoutError,
    ConfigurationError,
)
from .utils import (
    extract_team_id_from_url,
    extract_project_id_from_url,
    extract_file_key_from_url,
    validate_team_id,
    validate_project_id,
    validate_api_token,
    filter_files_by_name,
    sort_files_by_last_modified,
    is_recent_file,
    calculate_file_statistics,
    export_projects_to_json,
    export_projects_to_csv,
    sanitize_filename,
)

__version__ = "0.1.0"
__author__ = "Figma Projects Team"
__email__ = "info@figmaprojects.dev"
__description__ = "A comprehensive Python library for Figma Projects integration"

# Public API exports
__all__ = [
    # Main SDK class
    "FigmaProjectsSDK",
    "FigmaProjectsClient",
    
    # Models
    "Project",
    "ProjectFile", 
    "TeamProjectsResponse",
    "ProjectFilesResponse",
    "ProjectTree",
    "ProjectStatistics",
    "FileSearchResult",
    "BatchProjectResult",
    "ExportFormat",
    "RateLimitInfo",
    "User",
    
    # Errors
    "FigmaProjectsError",
    "AuthenticationError",
    "AuthorizationError", 
    "NotFoundError",
    "RateLimitError",
    "ApiError",
    "ValidationError",
    "NetworkError",
    "TimeoutError",
    "ConfigurationError",
    
    # Utilities
    "extract_team_id_from_url",
    "extract_project_id_from_url", 
    "extract_file_key_from_url",
    "validate_team_id",
    "validate_project_id",
    "validate_api_token",
    "filter_files_by_name",
    "sort_files_by_last_modified",
    "is_recent_file",
    "calculate_file_statistics",
    "export_projects_to_json",
    "export_projects_to_csv",
    "sanitize_filename",
]