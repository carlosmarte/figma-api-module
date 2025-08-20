"""FastAPI server for Figma Components API."""

import os
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .sdk import FigmaComponentsSDK
from .models import (
    PublishedComponent,
    PublishedComponentSet,
    PublishedStyle,
    StyleType,
)
from .errors import (
    FigmaComponentsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

# FastAPI app
app = FastAPI(
    title="Figma Components API Server",
    description="REST API server for Figma Components, Component Sets, and Styles",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global SDK instance cache
_sdk_cache: Dict[str, FigmaComponentsSDK] = {}


async def get_figma_token(
    x_figma_token: Optional[str] = Header(None),
    figma_token: Optional[str] = Query(None, alias="token"),
) -> str:
    """Validate and retrieve token from headers, query, or env."""
    token = x_figma_token or figma_token or os.getenv("FIGMA_TOKEN")
    if not token:
        raise HTTPException(
            status_code=401,
            detail="X-Figma-Token header, 'token' query parameter, or FIGMA_TOKEN environment variable is required."
        )
    return token


async def get_sdk(token: str = Depends(get_figma_token)) -> FigmaComponentsSDK:
    """Get SDK instance with validated token."""
    # Use cached SDK if available
    if token not in _sdk_cache:
        sdk = FigmaComponentsSDK(token)
        await sdk.start()
        _sdk_cache[token] = sdk
    
    return _sdk_cache[token]


# Exception handlers
@app.exception_handler(FigmaComponentsError)
async def handle_figma_error(request, exc: FigmaComponentsError):
    """Handle Figma Components errors."""
    status_code = exc.status_code or 500
    return JSONResponse(
        status_code=status_code,
        content={
            "error": True,
            "message": exc.message,
            "status_code": status_code,
        }
    )


@app.exception_handler(Exception)
async def handle_general_error(request, exc: Exception):
    """Handle general exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
        }
    )


# Health check endpoint (no auth required)
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "figma-components"}


# Component endpoints
@app.get("/v1/components/{key}", response_model=PublishedComponent)
async def get_component(
    key: str,
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> PublishedComponent:
    """Get a component by key."""
    try:
        return await sdk.get_component(key)
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Component with key '{key}' not found")


@app.get("/v1/teams/{team_id}/components", response_model=List[PublishedComponent])
async def list_team_components(
    team_id: str,
    page_size: int = Query(30, ge=1, le=1000, description="Number of items per page"),
    after: Optional[int] = Query(None, description="Cursor for pagination"),
    before: Optional[int] = Query(None, description="Cursor for pagination"),
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedComponent]:
    """List components from a team."""
    if after is not None and before is not None:
        raise HTTPException(status_code=400, detail="Cannot specify both 'after' and 'before' parameters")
    
    return await sdk.list_team_components(
        team_id=team_id,
        page_size=page_size,
        after=after,
        before=before,
    )


@app.get("/v1/files/{file_key}/components", response_model=List[PublishedComponent])
async def list_file_components(
    file_key: str,
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedComponent]:
    """List components from a file."""
    return await sdk.list_file_components(file_key)


@app.get("/v1/teams/{team_id}/components/search", response_model=List[PublishedComponent])
async def search_team_components(
    team_id: str,
    q: str = Query(..., description="Search query"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Maximum number of results"),
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedComponent]:
    """Search components within a team."""
    return await sdk.search_team_components(team_id, q, limit)


# Component Set endpoints
@app.get("/v1/component_sets/{key}", response_model=PublishedComponentSet)
async def get_component_set(
    key: str,
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> PublishedComponentSet:
    """Get a component set by key."""
    try:
        return await sdk.get_component_set(key)
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Component set with key '{key}' not found")


@app.get("/v1/teams/{team_id}/component_sets", response_model=List[PublishedComponentSet])
async def list_team_component_sets(
    team_id: str,
    page_size: int = Query(30, ge=1, le=1000, description="Number of items per page"),
    after: Optional[int] = Query(None, description="Cursor for pagination"),
    before: Optional[int] = Query(None, description="Cursor for pagination"),
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedComponentSet]:
    """List component sets from a team."""
    if after is not None and before is not None:
        raise HTTPException(status_code=400, detail="Cannot specify both 'after' and 'before' parameters")
    
    return await sdk.list_team_component_sets(
        team_id=team_id,
        page_size=page_size,
        after=after,
        before=before,
    )


@app.get("/v1/files/{file_key}/component_sets", response_model=List[PublishedComponentSet])
async def list_file_component_sets(
    file_key: str,
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedComponentSet]:
    """List component sets from a file."""
    return await sdk.list_file_component_sets(file_key)


# Style endpoints
@app.get("/v1/styles/{key}", response_model=PublishedStyle)
async def get_style(
    key: str,
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> PublishedStyle:
    """Get a style by key."""
    try:
        return await sdk.get_style(key)
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Style with key '{key}' not found")


@app.get("/v1/teams/{team_id}/styles", response_model=List[PublishedStyle])
async def list_team_styles(
    team_id: str,
    page_size: int = Query(30, ge=1, le=1000, description="Number of items per page"),
    after: Optional[int] = Query(None, description="Cursor for pagination"),
    before: Optional[int] = Query(None, description="Cursor for pagination"),
    style_type: Optional[StyleType] = Query(None, description="Filter by style type"),
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedStyle]:
    """List styles from a team."""
    if after is not None and before is not None:
        raise HTTPException(status_code=400, detail="Cannot specify both 'after' and 'before' parameters")
    
    return await sdk.list_team_styles(
        team_id=team_id,
        page_size=page_size,
        after=after,
        before=before,
        style_type=style_type,
    )


@app.get("/v1/files/{file_key}/styles", response_model=List[PublishedStyle])
async def list_file_styles(
    file_key: str,
    style_type: Optional[StyleType] = Query(None, description="Filter by style type"),
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedStyle]:
    """List styles from a file."""
    return await sdk.list_file_styles(file_key, style_type)


# Batch operations
@app.post("/v1/components/batch", response_model=List[PublishedComponent])
async def batch_get_components(
    keys: List[str],
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> List[PublishedComponent]:
    """Get multiple components by their keys."""
    if len(keys) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 keys allowed per batch request")
    
    return await sdk.batch_get_components(keys)


# Convenience endpoints
@app.get("/v1/teams/{team_id}/assets")
async def get_all_team_assets(
    team_id: str,
    sdk: FigmaComponentsSDK = Depends(get_sdk),
) -> Dict[str, Any]:
    """Get all assets (components, component sets, styles) from a team."""
    assets = await sdk.get_all_team_assets(team_id)
    
    return {
        "components": [comp.model_dump() for comp in assets["components"]],
        "component_sets": [cs.model_dump() for cs in assets["component_sets"]],
        "styles": [style.model_dump() for style in assets["styles"]],
        "summary": {
            "total_components": len(assets["components"]),
            "total_component_sets": len(assets["component_sets"]),
            "total_styles": len(assets["styles"]),
        }
    }


# Utility endpoints
@app.get("/v1/utils/extract-ids")
async def extract_ids_from_url(
    url: str = Query(..., description="Figma URL"),
) -> Dict[str, Optional[str]]:
    """Extract team ID and file key from a Figma URL."""
    from .utils import extract_team_id_from_url, extract_file_key_from_url
    
    return {
        "team_id": extract_team_id_from_url(url),
        "file_key": extract_file_key_from_url(url),
        "url": url,
    }


# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up SDK instances on shutdown."""
    for sdk in _sdk_cache.values():
        await sdk.close()
    _sdk_cache.clear()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)