"""High-level SDK for Figma Projects API."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, AsyncIterator

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
)
from .utils import (
    filter_files_by_name,
    sort_files_by_last_modified,
    is_recent_file,
    calculate_file_statistics,
    export_projects_to_json,
    export_projects_to_csv,
    validate_team_id,
    validate_project_id,
)
from .errors import ValidationError, NotFoundError


logger = logging.getLogger(__name__)


class FigmaProjectsSDK:
    """High-level SDK for Figma Projects API."""
    
    def __init__(
        self,
        api_token: str,
        base_url: str = "https://api.figma.com",
        requests_per_minute: int = 60,
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        """Initialize the SDK.
        
        Args:
            api_token: Figma API token
            base_url: Base URL for the API
            requests_per_minute: Rate limit for requests
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self.client = FigmaProjectsClient(
            api_token=api_token,
            base_url=base_url,
            requests_per_minute=requests_per_minute,
            timeout=timeout,
            max_retries=max_retries,
        )
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.client.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.client.__aexit__(exc_type, exc_val, exc_tb)
    
    async def close(self) -> None:
        """Close the SDK and underlying client."""
        await self.client.close()
    
    # Core API Methods
    
    async def get_team_projects(self, team_id: str) -> TeamProjectsResponse:
        """Get all projects in a team.
        
        Args:
            team_id: ID of the team
            
        Returns:
            Team projects response
            
        Raises:
            ValidationError: If team_id is invalid
            NotFoundError: If team is not found
        """
        if not validate_team_id(team_id):
            raise ValidationError("team_id", team_id, "Invalid team ID format")
        
        path = f"/v1/teams/{team_id}/projects"
        response_data = await self.client.get(path)
        
        return TeamProjectsResponse(**response_data)
    
    async def get_project_files(
        self,
        project_id: str,
        include_branch_data: bool = False,
    ) -> ProjectFilesResponse:
        """Get all files in a project.
        
        Args:
            project_id: ID of the project
            include_branch_data: Whether to include branch metadata
            
        Returns:
            Project files response
            
        Raises:
            ValidationError: If project_id is invalid
            NotFoundError: If project is not found
        """
        if not validate_project_id(project_id):
            raise ValidationError("project_id", project_id, "Invalid project ID format")
        
        path = f"/v1/projects/{project_id}/files"
        params = {}
        if include_branch_data:
            params["branch_data"] = "true"
        
        response_data = await self.client.get(path, params=params)
        
        return ProjectFilesResponse(**response_data)
    
    # Enhanced SDK Methods
    
    async def list_all_team_projects(self, team_id: str) -> List[Project]:
        """Get all projects in a team with automatic pagination.
        
        Args:
            team_id: ID of the team
            
        Returns:
            List of all projects
        """
        response = await self.get_team_projects(team_id)
        return response.projects
    
    async def list_all_project_files(
        self,
        project_id: str,
        include_branch_data: bool = False,
    ) -> List[ProjectFile]:
        """Get all files in a project with automatic pagination.
        
        Args:
            project_id: ID of the project
            include_branch_data: Whether to include branch metadata
            
        Returns:
            List of all files
        """
        response = await self.get_project_files(project_id, include_branch_data)
        return response.files
    
    async def get_project_tree(self, team_id: str) -> ProjectTree:
        """Get hierarchical project/file structure for a team.
        
        Args:
            team_id: ID of the team
            
        Returns:
            Project tree structure
        """
        team_response = await self.get_team_projects(team_id)
        projects_with_files = []
        
        # Fetch files for each project concurrently
        async def get_project_with_files(project: Project) -> Dict[str, Any]:
            try:
                files_response = await self.get_project_files(project.id)
                return {
                    "id": project.id,
                    "name": project.name,
                    "files": [
                        {
                            "key": file.key,
                            "name": file.name,
                            "thumbnail_url": file.thumbnail_url,
                            "last_modified": file.last_modified.isoformat(),
                        }
                        for file in files_response.files
                    ],
                    "file_count": len(files_response.files),
                }
            except Exception as e:
                logger.warning(f"Failed to get files for project {project.id}: {e}")
                return {
                    "id": project.id,
                    "name": project.name,
                    "files": [],
                    "file_count": 0,
                    "error": str(e),
                }
        
        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(5)
        
        async def bounded_get_project_with_files(project: Project) -> Dict[str, Any]:
            async with semaphore:
                return await get_project_with_files(project)
        
        tasks = [
            bounded_get_project_with_files(project)
            for project in team_response.projects
        ]
        
        projects_with_files = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_projects = [
            p for p in projects_with_files
            if not isinstance(p, Exception)
        ]
        
        return ProjectTree(
            team_name=team_response.name,
            projects=valid_projects,
        )
    
    async def find_file_by_name(
        self,
        project_id: str,
        file_name: str,
        exact_match: bool = False,
    ) -> Optional[ProjectFile]:
        """Find a specific file in a project by name.
        
        Args:
            project_id: ID of the project
            file_name: Name of the file to find
            exact_match: Whether to match exactly or partially
            
        Returns:
            Found file or None
        """
        files = await self.list_all_project_files(project_id)
        
        if exact_match:
            for file in files:
                if file.name == file_name:
                    return file
        else:
            for file in files:
                if file_name.lower() in file.name.lower():
                    return file
        
        return None
    
    async def get_recent_files(
        self,
        project_id: str,
        limit: int = 10,
        days: int = 30,
    ) -> List[ProjectFile]:
        """Get recently modified files in a project.
        
        Args:
            project_id: ID of the project
            limit: Maximum number of files to return
            days: Number of days to consider recent
            
        Returns:
            List of recent files
        """
        files = await self.list_all_project_files(project_id)
        recent_files = [f for f in files if is_recent_file(f, days)]
        sorted_files = sort_files_by_last_modified(recent_files, ascending=False)
        
        return sorted_files[:limit]
    
    async def search_projects(self, team_id: str, query: str) -> List[Project]:
        """Search projects by name.
        
        Args:
            team_id: ID of the team
            query: Search query
            
        Returns:
            List of matching projects
        """
        projects = await self.list_all_team_projects(team_id)
        query_lower = query.lower()
        
        return [
            project for project in projects
            if query_lower in project.name.lower()
        ]
    
    async def search_files_in_project(
        self,
        project_id: str,
        query: str,
        case_sensitive: bool = False,
    ) -> List[FileSearchResult]:
        """Search files within a project.
        
        Args:
            project_id: ID of the project
            query: Search query
            case_sensitive: Whether search should be case sensitive
            
        Returns:
            List of search results with relevance scores
        """
        project_response = await self.get_project_files(project_id)
        files = filter_files_by_name(project_response.files, query, case_sensitive)
        
        results = []
        for file in files:
            # Simple relevance scoring
            score = 1.0
            if query.lower() == file.name.lower():
                score = 1.0  # Exact match
            elif file.name.lower().startswith(query.lower()):
                score = 0.8  # Starts with query
            else:
                score = 0.5  # Contains query
            
            results.append(
                FileSearchResult(
                    file=file,
                    project_id=project_id,
                    project_name=project_response.name,
                    match_score=score,
                )
            )
        
        # Sort by relevance score
        return sorted(results, key=lambda r: r.match_score, reverse=True)
    
    async def get_project_statistics(self, project_id: str) -> ProjectStatistics:
        """Get statistics for a project.
        
        Args:
            project_id: ID of the project
            
        Returns:
            Project statistics
        """
        project_response = await self.get_project_files(project_id)
        files = project_response.files
        
        recent_files = [f for f in files if is_recent_file(f)]
        last_activity = max((f.last_modified for f in files), default=None)
        
        return ProjectStatistics(
            project_id=project_id,
            project_name=project_response.name,
            total_files=len(files),
            recent_files=len(recent_files),
            last_activity=last_activity,
        )
    
    async def batch_get_projects(self, project_ids: List[str]) -> List[BatchProjectResult]:
        """Get multiple projects at once.
        
        Args:
            project_ids: List of project IDs
            
        Returns:
            List of batch results
        """
        results = []
        
        async def get_single_project(project_id: str) -> BatchProjectResult:
            try:
                response = await self.get_project_files(project_id)
                project = Project(id=project_id, name=response.name)
                return BatchProjectResult(
                    project_id=project_id,
                    success=True,
                    project=project,
                )
            except Exception as e:
                return BatchProjectResult(
                    project_id=project_id,
                    success=False,
                    error=str(e),
                )
        
        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(3)
        
        async def bounded_get_project(project_id: str) -> BatchProjectResult:
            async with semaphore:
                return await get_single_project(project_id)
        
        tasks = [bounded_get_project(pid) for pid in project_ids]
        results = await asyncio.gather(*tasks)
        
        return results
    
    async def export_project_structure(
        self,
        team_id: str,
        format: ExportFormat = ExportFormat.JSON,
        include_files: bool = True,
    ) -> str:
        """Export project structure as JSON or CSV.
        
        Args:
            team_id: ID of the team
            format: Export format (json or csv)
            include_files: Whether to include file data
            
        Returns:
            Exported data as string
        """
        project_tree = await self.get_project_tree(team_id)
        
        if format == ExportFormat.JSON:
            return export_projects_to_json(project_tree.projects, include_files)
        elif format == ExportFormat.CSV:
            return export_projects_to_csv(project_tree.projects)
        else:
            raise ValidationError("format", format, "Unsupported export format")
    
    # Utility Methods
    
    def get_rate_limit_info(self):
        """Get current rate limit information."""
        return self.client.get_rate_limit_info()
    
    def get_client_stats(self) -> Dict[str, Any]:
        """Get client statistics."""
        return self.client.get_stats()
    
    def reset_client_stats(self) -> None:
        """Reset client statistics."""
        self.client.reset_stats()