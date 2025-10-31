"""
FastAPI server for Figma Webhooks with token validation.
"""

import os
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .sdk import FigmaWebhooksSDK
from .models import (
    Webhook,
    WebhookRequest,
    WebhookEvent,
    WebhookStatus,
    WebhookContext,
    CreateWebhookData,
    UpdateWebhookData,
    WebhooksResponse,
    WebhookRequestsResponse,
)
from .errors import FigmaWebhooksError

app = FastAPI(
    title="Figma Webhooks API",
    description="A FastAPI server for managing Figma webhooks",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
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
            detail="X-Figma-Token header is required."
        )
    
    return token


async def get_sdk(token: str = Depends(get_figma_token)) -> FigmaWebhooksSDK:
    """Get SDK instance with validated token."""
    return FigmaWebhooksSDK(api_key=token)


@app.exception_handler(FigmaWebhooksError)
async def figma_exception_handler(request, exc: FigmaWebhooksError):
    """Handle Figma API exceptions."""
    return JSONResponse(
        status_code=exc.status_code or 500,
        content={"detail": exc.message, "error": True}
    )


@app.get("/health")
async def health_check():
    """Health check endpoint (no authentication required)."""
    return {"status": "healthy", "service": "figma-webhooks"}


@app.get("/v1/webhooks", response_model=WebhooksResponse)
async def list_webhooks(
    context: Optional[str] = Query(None, description="Context type (team, project, file)"),
    context_id: Optional[str] = Query(None, description="Context ID"),
    plan_api_id: Optional[str] = Query(None, description="Plan API ID"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """List webhooks by context or plan."""
    webhook_context = None
    if context:
        try:
            webhook_context = WebhookContext(context.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid context: {context}")
    
    async with sdk:
        return await sdk.list_webhooks(
            context=webhook_context,
            context_id=context_id,
            plan_api_id=plan_api_id,
            cursor=cursor,
        )


@app.post("/v1/webhooks", response_model=Webhook)
async def create_webhook(
    webhook_data: CreateWebhookData,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Create a new webhook."""
    async with sdk:
        return await sdk.create_webhook(webhook_data)


@app.get("/v1/webhooks/{webhook_id}", response_model=Webhook)
async def get_webhook(
    webhook_id: str,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Get a webhook by ID."""
    async with sdk:
        return await sdk.get_webhook(webhook_id)


@app.put("/v1/webhooks/{webhook_id}", response_model=Webhook)
async def update_webhook(
    webhook_id: str,
    webhook_data: UpdateWebhookData,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Update an existing webhook."""
    async with sdk:
        return await sdk.update_webhook(webhook_id, webhook_data)


@app.delete("/v1/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Delete a webhook."""
    async with sdk:
        success = await sdk.delete_webhook(webhook_id)
        return {"success": success, "message": "Webhook deleted successfully"}


@app.get("/v1/webhooks/{webhook_id}/requests", response_model=WebhookRequestsResponse)
async def get_webhook_requests(
    webhook_id: str,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Get webhook requests for debugging."""
    async with sdk:
        return await sdk.get_webhook_requests(webhook_id)


# Convenience endpoints

@app.post("/v1/webhooks/file", response_model=Webhook)
async def create_file_webhook(
    file_id: str = Query(..., description="Figma file ID"),
    endpoint: str = Query(..., description="Webhook endpoint URL"),
    passcode: str = Query(..., description="Webhook passcode"),
    event_type: str = Query("FILE_UPDATE", description="Event type"),
    description: Optional[str] = Query(None, description="Webhook description"),
    status: str = Query("ACTIVE", description="Initial status"),
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Create a webhook for a specific file."""
    try:
        webhook_event = WebhookEvent(event_type.upper())
        webhook_status = WebhookStatus(status.upper())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    async with sdk:
        return await sdk.create_file_webhook(
            file_id=file_id,
            endpoint=endpoint,
            passcode=passcode,
            event_type=webhook_event,
            description=description,
            status=webhook_status,
        )


@app.post("/v1/webhooks/team", response_model=Webhook)
async def create_team_webhook(
    team_id: str = Query(..., description="Figma team ID"),
    endpoint: str = Query(..., description="Webhook endpoint URL"),
    passcode: str = Query(..., description="Webhook passcode"),
    event_type: str = Query("FILE_UPDATE", description="Event type"),
    description: Optional[str] = Query(None, description="Webhook description"),
    status: str = Query("ACTIVE", description="Initial status"),
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Create a webhook for a team."""
    try:
        webhook_event = WebhookEvent(event_type.upper())
        webhook_status = WebhookStatus(status.upper())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    async with sdk:
        return await sdk.create_team_webhook(
            team_id=team_id,
            endpoint=endpoint,
            passcode=passcode,
            event_type=webhook_event,
            description=description,
            status=webhook_status,
        )


@app.post("/v1/webhooks/project", response_model=Webhook)
async def create_project_webhook(
    project_id: str = Query(..., description="Figma project ID"),
    endpoint: str = Query(..., description="Webhook endpoint URL"),
    passcode: str = Query(..., description="Webhook passcode"),
    event_type: str = Query("FILE_UPDATE", description="Event type"),
    description: Optional[str] = Query(None, description="Webhook description"),
    status: str = Query("ACTIVE", description="Initial status"),
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Create a webhook for a project."""
    try:
        webhook_event = WebhookEvent(event_type.upper())
        webhook_status = WebhookStatus(status.upper())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    async with sdk:
        return await sdk.create_project_webhook(
            project_id=project_id,
            endpoint=endpoint,
            passcode=passcode,
            event_type=webhook_event,
            description=description,
            status=webhook_status,
        )


@app.patch("/v1/webhooks/{webhook_id}/pause", response_model=Webhook)
async def pause_webhook(
    webhook_id: str,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Pause a webhook."""
    async with sdk:
        return await sdk.pause_webhook(webhook_id)


@app.patch("/v1/webhooks/{webhook_id}/activate", response_model=Webhook)
async def activate_webhook(
    webhook_id: str,
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Activate a paused webhook."""
    async with sdk:
        return await sdk.activate_webhook(webhook_id)


@app.get("/v1/webhooks/search", response_model=List[Webhook])
async def search_webhooks(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    context: Optional[str] = Query(None, description="Filter by context type"),
    plan_api_id: Optional[str] = Query(None, description="Plan API ID"),
    sdk: FigmaWebhooksSDK = Depends(get_sdk),
):
    """Search for webhooks with filters."""
    webhook_event = None
    webhook_status = None
    webhook_context = None
    
    try:
        if event_type:
            webhook_event = WebhookEvent(event_type.upper())
        if status:
            webhook_status = WebhookStatus(status.upper())
        if context:
            webhook_context = WebhookContext(context.upper())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    async with sdk:
        return await sdk.search_webhooks(
            event_type=webhook_event,
            status=webhook_status,
            context=webhook_context,
            plan_api_id=plan_api_id,
        )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8000)