"""Pydantic models for Figma Projects API."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class User(BaseModel):
    """A description of a user."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique stable id of the user")
    handle: str = Field(..., description="Name of the user")
    img_url: str = Field(..., description="URL link to the user's profile image")


class Project(BaseModel):
    """A Figma project containing multiple files."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique identifier for the project")
    name: str = Field(..., description="Name of the project")


class ProjectFile(BaseModel):
    """A file within a Figma project."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    key: str = Field(..., description="The file's key")
    name: str = Field(..., description="The file's name")
    thumbnail_url: Optional[str] = Field(None, description="The file's thumbnail URL")
    last_modified: datetime = Field(..., description="The UTC ISO 8601 time at which the file was last modified")


class TeamProjectsResponse(BaseModel):
    """Response from the GET /v1/teams/{team_id}/projects endpoint."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    name: str = Field(..., description="The team's name")
    projects: List[Project] = Field(..., description="An array of projects")


class ProjectFilesResponse(BaseModel):
    """Response from the GET /v1/projects/{project_id}/files endpoint."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    name: str = Field(..., description="The project's name")
    files: List[ProjectFile] = Field(..., description="An array of files")


class ProjectTree(BaseModel):
    """Hierarchical representation of projects and files."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    team_name: str = Field(..., description="Name of the team")
    projects: List[Dict[str, Any]] = Field(..., description="Projects with their files")


class ProjectStatistics(BaseModel):
    """Statistics for a project."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    project_id: str = Field(..., description="Project identifier")
    project_name: str = Field(..., description="Project name")
    total_files: int = Field(..., description="Total number of files")
    recent_files: int = Field(..., description="Files modified in last 30 days")
    last_activity: Optional[datetime] = Field(None, description="Last file modification time")


class FileSearchResult(BaseModel):
    """Result from searching files in a project."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    file: ProjectFile = Field(..., description="The matching file")
    project_id: str = Field(..., description="ID of the project containing the file")
    project_name: str = Field(..., description="Name of the project containing the file")
    match_score: float = Field(..., description="Relevance score for the search match")


class BatchProjectResult(BaseModel):
    """Result from batch project operations."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    project_id: str = Field(..., description="Project identifier")
    success: bool = Field(..., description="Whether the operation succeeded")
    project: Optional[Project] = Field(None, description="Project data if successful")
    error: Optional[str] = Field(None, description="Error message if failed")


class ExportFormat(str):
    """Supported export formats."""
    JSON = "json"
    CSV = "csv"


class RateLimitInfo(BaseModel):
    """Rate limit information."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    limit: int = Field(..., description="Rate limit per minute")
    remaining: int = Field(..., description="Remaining requests in current window")
    reset_at: datetime = Field(..., description="When the rate limit resets")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retrying")