"""
FastAPI server for Figma Variables API with token validation.
"""

import os
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .sdk import FigmaVariablesSDK
from .models import (
    LocalVariablesResponse,
    PublishedVariablesResponse,
    VariablesRequest,
    VariablesModifyResponse,
    VariableResolvedDataType,
    VariableScope,
)
from .errors import FigmaVariablesError
from .utils import extract_file_key_from_url

app = FastAPI(
    title="Figma Variables API Server",
    description="Enterprise-only Figma Variables API server with token validation",
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


async def get_figma_token(
    x_figma_token: Optional[str] = Header(None),
    figma_token: Optional[str] = Query(None, alias="token"),
) -> str:
    """
    Validate and retrieve Figma token from headers, query, or environment.
    
    Priority order:
    1. X-Figma-Token header
    2. token query parameter
    3. FIGMA_TOKEN environment variable
    """
    token = x_figma_token or figma_token or os.getenv("FIGMA_TOKEN")
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="X-Figma-Token header, token query parameter, or FIGMA_TOKEN environment variable is required."
        )
    
    return token


async def get_sdk(token: str = Depends(get_figma_token)) -> FigmaVariablesSDK:
    """Get SDK instance with validated token."""
    return FigmaVariablesSDK(api_token=token)


@app.exception_handler(FigmaVariablesError)
async def figma_variables_exception_handler(request, exc: FigmaVariablesError):
    """Handle Figma Variables API errors."""
    return JSONResponse(
        status_code=exc.status_code or 500,
        content={
            "error": True,
            "message": exc.message,
            "status_code": exc.status_code,
        }
    )


@app.get("/health")
async def health_check():
    """Health check endpoint (no authentication required)."""
    return {"status": "healthy", "service": "figma-variables-api"}


@app.get("/v1/files/{file_key}/variables/local", response_model=Dict[str, Any])
async def get_local_variables(
    file_key: str,
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Get local variables from a file.
    
    **Enterprise only**: Requires file_variables:read scope.
    
    Args:
        file_key: Figma file key or branch key
        
    Returns:
        Local variables and collections
    """
    try:
        async with sdk:
            response = await sdk.get_local_variables(file_key)
            return response.dict()
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_key}/variables/published", response_model=Dict[str, Any])
async def get_published_variables(
    file_key: str,
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Get published variables from a file.
    
    **Enterprise only**: Requires file_variables:read scope.
    
    Args:
        file_key: Figma main file key (not branch key)
        
    Returns:
        Published variables and collections
    """
    try:
        async with sdk:
            response = await sdk.get_published_variables(file_key)
            return response.dict()
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/files/{file_key}/variables", response_model=Dict[str, Any])
async def modify_variables(
    file_key: str,
    request: VariablesRequest,
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Create, modify, or delete variables and variable collections.
    
    **Enterprise only**: Requires file_variables:write scope and Editor seat.
    
    Args:
        file_key: Figma file key or branch key
        request: Variables modification request
        
    Returns:
        Modification response with temp ID mapping
    """
    try:
        async with sdk:
            response = await sdk.modify_variables(file_key, request)
            return response.dict()
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_key}/variables/{variable_id}")
async def get_variable(
    file_key: str,
    variable_id: str,
    published: bool = Query(False, description="Get published version"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Get a specific variable by ID.
    
    Args:
        file_key: Figma file key
        variable_id: Variable ID
        published: Whether to get published version
        
    Returns:
        Variable details
    """
    try:
        async with sdk:
            variable = await sdk.get_variable(file_key, variable_id, published=published)
            return variable.dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_key}/variables")
async def list_variables(
    file_key: str,
    collection_id: Optional[str] = Query(None, description="Filter by collection ID"),
    published: bool = Query(False, description="List published variables"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    List variables in a file.
    
    Args:
        file_key: Figma file key
        collection_id: Optional collection ID filter
        published: Whether to list published variables
        
    Returns:
        List of variables
    """
    try:
        async with sdk:
            variables = await sdk.list_variables(
                file_key, 
                collection_id=collection_id, 
                published=published
            )
            return {
                "variables": [var.dict() for var in variables],
                "count": len(variables)
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_key}/variable-collections")
async def list_variable_collections(
    file_key: str,
    published: bool = Query(False, description="List published collections"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    List variable collections in a file.
    
    Args:
        file_key: Figma file key
        published: Whether to list published collections
        
    Returns:
        List of variable collections
    """
    try:
        async with sdk:
            collections = await sdk.list_variable_collections(file_key, published=published)
            return {
                "variable_collections": [coll.dict() for coll in collections],
                "count": len(collections)
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_key}/variables/search")
async def search_variables(
    file_key: str,
    q: str = Query(..., description="Search query"),
    published: bool = Query(False, description="Search published variables"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Search for variables by name.
    
    Args:
        file_key: Figma file key
        q: Search query
        published: Whether to search published variables
        
    Returns:
        Matching variables
    """
    try:
        async with sdk:
            variables = await sdk.search_variables(file_key, q, published=published)
            return {
                "variables": [var.dict() for var in variables],
                "query": q,
                "count": len(variables)
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/files/{file_key}/variables/collections")
async def create_variable_collection(
    file_key: str,
    name: str = Query(..., description="Collection name"),
    hidden_from_publishing: bool = Query(False, description="Hide from publishing"),
    initial_mode_name: str = Query("Mode 1", description="Initial mode name"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Create a new variable collection.
    
    Args:
        file_key: Figma file key
        name: Collection name
        hidden_from_publishing: Whether to hide from publishing
        initial_mode_name: Name for the initial mode
        
    Returns:
        Created collection ID
    """
    try:
        async with sdk:
            collection_id = await sdk.create_variable_collection(
                file_key,
                name,
                hidden_from_publishing=hidden_from_publishing,
                initial_mode_name=initial_mode_name
            )
            return {
                "collection_id": collection_id,
                "name": name,
                "message": "Collection created successfully"
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/files/{file_key}/variables/create")
async def create_variable(
    file_key: str,
    name: str = Query(..., description="Variable name"),
    collection_id: str = Query(..., description="Collection ID"),
    variable_type: VariableResolvedDataType = Query(..., description="Variable type"),
    description: str = Query("", description="Variable description"),
    hidden_from_publishing: bool = Query(False, description="Hide from publishing"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Create a new variable.
    
    Args:
        file_key: Figma file key
        name: Variable name
        collection_id: Collection ID
        variable_type: Variable data type
        description: Variable description
        hidden_from_publishing: Whether to hide from publishing
        
    Returns:
        Created variable ID
    """
    try:
        async with sdk:
            variable_id = await sdk.create_variable(
                file_key,
                name,
                collection_id,
                variable_type,
                description=description,
                hidden_from_publishing=hidden_from_publishing
            )
            return {
                "variable_id": variable_id,
                "name": name,
                "type": variable_type,
                "message": "Variable created successfully"
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/v1/files/{file_key}/variables/{variable_id}")
async def delete_variable(
    file_key: str,
    variable_id: str,
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Delete a variable.
    
    Args:
        file_key: Figma file key
        variable_id: Variable ID to delete
        
    Returns:
        Deletion confirmation
    """
    try:
        async with sdk:
            await sdk.delete_variable(file_key, variable_id)
            return {
                "variable_id": variable_id,
                "message": "Variable deleted successfully"
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_key}/variables/batch")
async def batch_get_variables(
    file_key: str,
    variable_ids: str = Query(..., description="Comma-separated variable IDs"),
    published: bool = Query(False, description="Get published versions"),
    sdk: FigmaVariablesSDK = Depends(get_sdk)
) -> Dict[str, Any]:
    """
    Get multiple variables by ID.
    
    Args:
        file_key: Figma file key
        variable_ids: Comma-separated variable IDs
        published: Whether to get published versions
        
    Returns:
        List of variables
    """
    try:
        ids_list = [id.strip() for id in variable_ids.split(",") if id.strip()]
        
        async with sdk:
            variables = await sdk.batch_get_variables(file_key, ids_list, published=published)
            return {
                "variables": [var.dict() for var in variables],
                "requested_ids": ids_list,
                "found_count": len(variables)
            }
    except Exception as e:
        if isinstance(e, FigmaVariablesError):
            raise
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)