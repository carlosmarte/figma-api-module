"""FastAPI server for Figma Projects API with token validation."""

import os
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .sdk import FigmaProjectsSDK
from .models import (
    Project,
    ProjectFile,
    TeamProjectsResponse,
    ProjectFilesResponse,
    ProjectTree,
    ProjectStatistics,
    ExportFormat,
)
from .errors import FigmaProjectsError, AuthenticationError, NotFoundError, RateLimitError


# Create FastAPI app
app = FastAPI(
    title="Figma Projects API",
    description="A comprehensive API for Figma Projects integration",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_figma_token(
    x_figma_token: Optional[str] = Header(None),
    figma_token: Optional[str] = Query(None, alias="token"),
) -> str:
    """Validate and retrieve token from headers, query, or environment.
    
    Priority order:
    1. X-Figma-Token header
    2. token query parameter
    3. FIGMA_TOKEN environment variable
    
    Args:
        x_figma_token: Token from X-Figma-Token header
        figma_token: Token from query parameter
        
    Returns:
        Valid Figma API token
        
    Raises:
        HTTPException: If no valid token is found
    """
    token = x_figma_token or figma_token or os.getenv("FIGMA_TOKEN")
    if not token:
        raise HTTPException(
            status_code=401,
            detail="X-Figma-Token header is required. Provide via header, query param, or FIGMA_TOKEN env var."
        )
    return token


async def get_sdk(token: str = Depends(get_figma_token)) -> FigmaProjectsSDK:
    """Get SDK instance with validated token.
    
    Args:
        token: Validated Figma API token
        
    Returns:
        Configured SDK instance
    """
    return FigmaProjectsSDK(api_key=token)


# Exception handlers
@app.exception_handler(FigmaProjectsError)
async def figma_projects_exception_handler(request, exc: FigmaProjectsError):
    """Handle Figma Projects specific errors."""
    if isinstance(exc, AuthenticationError):
        status_code = 401
    elif isinstance(exc, NotFoundError):
        status_code = 404
    elif isinstance(exc, RateLimitError):
        status_code = 429
    else:
        status_code = 400
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": True,
            "message": exc.message,
            "type": exc.__class__.__name__,
            "context": exc.context,
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "type": "InternalServerError",
        }
    )


# Health check endpoint (no auth required)
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "figma-projects-api",
        "version": "0.1.0"
    }


# API Routes
@app.get("/v1/teams/{team_id}/projects", response_model=TeamProjectsResponse, tags=["Projects"])
async def get_team_projects(
    team_id: str,
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Get all projects in a team.
    
    Args:
        team_id: ID of the team
        sdk: SDK instance with authentication
        
    Returns:
        Team projects response
    """
    async with sdk:
        return await sdk.get_team_projects(team_id)


@app.get("/v1/projects/{project_id}/files", response_model=ProjectFilesResponse, tags=["Projects"])
async def get_project_files(
    project_id: str,
    branch_data: bool = Query(False, description="Include branch metadata"),
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Get all files in a project.
    
    Args:
        project_id: ID of the project
        branch_data: Whether to include branch metadata
        sdk: SDK instance with authentication
        
    Returns:
        Project files response
    """
    async with sdk:
        return await sdk.get_project_files(project_id, branch_data)


@app.get("/v1/teams/{team_id}/projects/tree", response_model=ProjectTree, tags=["Projects"])
async def get_project_tree(
    team_id: str,
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Get hierarchical project and file structure for a team.
    
    Args:
        team_id: ID of the team
        sdk: SDK instance with authentication
        
    Returns:
        Project tree structure
    """
    async with sdk:
        return await sdk.get_project_tree(team_id)


@app.get("/v1/teams/{team_id}/projects/search", response_model=List[Project], tags=["Search"])
async def search_projects(
    team_id: str,
    q: str = Query(..., description="Search query"),
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Search projects by name.
    
    Args:
        team_id: ID of the team
        q: Search query
        sdk: SDK instance with authentication
        
    Returns:
        List of matching projects
    """
    async with sdk:
        return await sdk.search_projects(team_id, q)


@app.get("/v1/projects/{project_id}/files/search", tags=["Search"])
async def search_files_in_project(
    project_id: str,
    q: str = Query(..., description="Search query"),
    case_sensitive: bool = Query(False, description="Case sensitive search"),
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Search files within a project.
    
    Args:
        project_id: ID of the project
        q: Search query
        case_sensitive: Whether search should be case sensitive
        sdk: SDK instance with authentication
        
    Returns:
        List of search results with relevance scores
    """
    async with sdk:
        return await sdk.search_files_in_project(project_id, q, case_sensitive)


@app.get("/v1/projects/{project_id}/files/recent", response_model=List[ProjectFile], tags=["Files"])
async def get_recent_files(
    project_id: str,
    limit: int = Query(10, description="Maximum number of files", ge=1, le=100),
    days: int = Query(30, description="Number of days to consider recent", ge=1, le=365),
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Get recently modified files in a project.
    
    Args:
        project_id: ID of the project
        limit: Maximum number of files to return
        days: Number of days to consider recent
        sdk: SDK instance with authentication
        
    Returns:
        List of recent files
    """
    async with sdk:
        return await sdk.get_recent_files(project_id, limit, days)


@app.get("/v1/projects/{project_id}/statistics", response_model=ProjectStatistics, tags=["Statistics"])
async def get_project_statistics(
    project_id: str,
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Get statistics for a project.
    
    Args:
        project_id: ID of the project
        sdk: SDK instance with authentication
        
    Returns:
        Project statistics
    """
    async with sdk:
        return await sdk.get_project_statistics(project_id)


@app.get("/v1/teams/{team_id}/export", tags=["Export"])
async def export_project_structure(
    team_id: str,
    format: ExportFormat = Query(ExportFormat.JSON, description="Export format"),
    include_files: bool = Query(True, description="Include file data"),
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Export project structure as JSON or CSV.
    
    Args:
        team_id: ID of the team
        format: Export format (json or csv)
        include_files: Whether to include file data
        sdk: SDK instance with authentication
        
    Returns:
        Exported data as string
    """
    async with sdk:
        exported_data = await sdk.export_project_structure(team_id, format, include_files)
        
        if format == ExportFormat.JSON:
            content_type = "application/json"
        else:
            content_type = "text/csv"
        
        return JSONResponse(
            content={"data": exported_data},
            headers={"Content-Type": content_type}
        )


@app.post("/v1/projects/batch", tags=["Batch Operations"])
async def batch_get_projects(
    project_ids: List[str],
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Get multiple projects at once.
    
    Args:
        project_ids: List of project IDs
        sdk: SDK instance with authentication
        
    Returns:
        List of batch results
    """
    async with sdk:
        return await sdk.batch_get_projects(project_ids)


@app.get("/v1/projects/{project_id}/files/{file_name}/find", tags=["Files"])
async def find_file_by_name(
    project_id: str,
    file_name: str,
    exact_match: bool = Query(False, description="Exact match or partial"),
    sdk: FigmaProjectsSDK = Depends(get_sdk)
):
    """Find a specific file in a project by name.
    
    Args:
        project_id: ID of the project
        file_name: Name of the file to find
        exact_match: Whether to match exactly or partially
        sdk: SDK instance with authentication
        
    Returns:
        Found file or 404 if not found
    """
    async with sdk:
        file = await sdk.find_file_by_name(project_id, file_name, exact_match)
        if file is None:
            raise HTTPException(
                status_code=404,
                detail=f"File '{file_name}' not found in project {project_id}"
            )
        return file


@app.get("/v1/rate-limit", tags=["Utility"])
async def get_rate_limit_info(sdk: FigmaProjectsSDK = Depends(get_sdk)):
    """Get current rate limit information.
    
    Args:
        sdk: SDK instance with authentication
        
    Returns:
        Rate limit information
    """
    return sdk.get_rate_limit_info()


@app.get("/v1/stats", tags=["Utility"])
async def get_client_stats(sdk: FigmaProjectsSDK = Depends(get_sdk)):
    """Get client statistics.
    
    Args:
        sdk: SDK instance with authentication
        
    Returns:
        Client statistics
    """
    return sdk.get_client_stats()


# Additional utility endpoints
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Figma Projects API",
        "version": "0.1.0",
        "description": "A comprehensive API for Figma Projects integration",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json"
    }


# Add startup event to log server info
@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    import logging
    logger = logging.getLogger("figma_projects.server")
    logger.info("Figma Projects API server starting up")
    logger.info("Available endpoints:")
    logger.info("  - GET /health (no auth)")
    logger.info("  - GET /docs (API documentation)")
    logger.info("  - GET /v1/teams/{team_id}/projects")
    logger.info("  - GET /v1/projects/{project_id}/files")
    logger.info("  - GET /v1/teams/{team_id}/projects/tree")
    logger.info("  - GET /v1/teams/{team_id}/projects/search")
    logger.info("  - GET /v1/projects/{project_id}/statistics")
    logger.info("Token validation: X-Figma-Token header, token query param, or FIGMA_TOKEN env var")