"""
FastAPI server for Figma Library Analytics API with token validation.
"""

import os
from datetime import date
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    ComponentActionsResponse,
    ComponentUsagesResponse,
    GroupBy,
    StyleActionsResponse,
    StyleUsagesResponse,
    VariableActionsResponse,
    VariableUsagesResponse,
)
from .sdk import FigmaAnalyticsSDK

app = FastAPI(
    title="Figma Library Analytics API",
    description="Access analytics data for your published Figma libraries",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
    """
    Validate and retrieve token from headers, query, or env.
    
    Priority order:
    1. X-Figma-Token header (recommended)
    2. token query parameter  
    3. FIGMA_TOKEN environment variable
    """
    token = x_figma_token or figma_token or os.getenv("FIGMA_TOKEN")
    if not token:
        raise HTTPException(
            status_code=401,
            detail="X-Figma-Token header is required. You can also use ?token=YOUR_TOKEN or set FIGMA_TOKEN environment variable."
        )
    return token


async def get_sdk(token: str = Depends(get_figma_token)) -> FigmaAnalyticsSDK:
    """Get SDK instance with validated token."""
    return FigmaAnalyticsSDK(api_key=token)


@app.get("/health")
async def health_check():
    """Health check endpoint (no authentication required)."""
    return {"status": "healthy", "service": "figma-library-analytics"}


@app.get("/v1/analytics/libraries/{file_key}/component/actions", response_model=ComponentActionsResponse)
async def get_component_actions(
    file_key: str,
    group_by: GroupBy = Query(..., description="Dimension to group data by (component or team)"),
    start_date: Optional[date] = Query(None, description="Earliest week to include (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Latest week to include (YYYY-MM-DD)"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaAnalyticsSDK = Depends(get_sdk),
):
    """Get library analytics component action data."""
    if group_by not in [GroupBy.COMPONENT, GroupBy.TEAM]:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'component' or 'team' for component actions"
        )
    
    try:
        async with sdk:
            return await sdk.get_component_actions(file_key, group_by, start_date, end_date, cursor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/analytics/libraries/{file_key}/component/usages", response_model=ComponentUsagesResponse)
async def get_component_usages(
    file_key: str,
    group_by: GroupBy = Query(..., description="Dimension to group data by (component or file)"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaAnalyticsSDK = Depends(get_sdk),
):
    """Get library analytics component usage data."""
    if group_by not in [GroupBy.COMPONENT, GroupBy.FILE]:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'component' or 'file' for component usages"
        )
    
    try:
        async with sdk:
            return await sdk.get_component_usages(file_key, group_by, cursor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/analytics/libraries/{file_key}/style/actions", response_model=StyleActionsResponse)
async def get_style_actions(
    file_key: str,
    group_by: GroupBy = Query(..., description="Dimension to group data by (style or team)"),
    start_date: Optional[date] = Query(None, description="Earliest week to include (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Latest week to include (YYYY-MM-DD)"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaAnalyticsSDK = Depends(get_sdk),
):
    """Get library analytics style action data."""
    if group_by not in [GroupBy.STYLE, GroupBy.TEAM]:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'style' or 'team' for style actions"
        )
    
    try:
        async with sdk:
            return await sdk.get_style_actions(file_key, group_by, start_date, end_date, cursor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/analytics/libraries/{file_key}/style/usages", response_model=StyleUsagesResponse)
async def get_style_usages(
    file_key: str,
    group_by: GroupBy = Query(..., description="Dimension to group data by (style or file)"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaAnalyticsSDK = Depends(get_sdk),
):
    """Get library analytics style usage data."""
    if group_by not in [GroupBy.STYLE, GroupBy.FILE]:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'style' or 'file' for style usages"
        )
    
    try:
        async with sdk:
            return await sdk.get_style_usages(file_key, group_by, cursor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/analytics/libraries/{file_key}/variable/actions", response_model=VariableActionsResponse)
async def get_variable_actions(
    file_key: str,
    group_by: GroupBy = Query(..., description="Dimension to group data by (variable or team)"),
    start_date: Optional[date] = Query(None, description="Earliest week to include (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Latest week to include (YYYY-MM-DD)"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaAnalyticsSDK = Depends(get_sdk),
):
    """Get library analytics variable action data."""
    if group_by not in [GroupBy.VARIABLE, GroupBy.TEAM]:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'variable' or 'team' for variable actions"
        )
    
    try:
        async with sdk:
            return await sdk.get_variable_actions(file_key, group_by, start_date, end_date, cursor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/analytics/libraries/{file_key}/variable/usages", response_model=VariableUsagesResponse)
async def get_variable_usages(
    file_key: str,
    group_by: GroupBy = Query(..., description="Dimension to group data by (variable or file)"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaAnalyticsSDK = Depends(get_sdk),
):
    """Get library analytics variable usage data."""
    if group_by not in [GroupBy.VARIABLE, GroupBy.FILE]:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'variable' or 'file' for variable usages"
        )
    
    try:
        async with sdk:
            return await sdk.get_variable_usages(file_key, group_by, cursor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Error handlers
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    return HTTPException(status_code=500, detail=f"Internal server error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)