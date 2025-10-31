"""
Pydantic models for Figma Webhooks API.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, ConfigDict


class WebhookEvent(str, Enum):
    """Enum representing the possible events that a webhook can subscribe to."""
    PING = "PING"
    FILE_UPDATE = "FILE_UPDATE"
    FILE_VERSION_UPDATE = "FILE_VERSION_UPDATE"
    FILE_DELETE = "FILE_DELETE"
    LIBRARY_PUBLISH = "LIBRARY_PUBLISH"
    FILE_COMMENT = "FILE_COMMENT"
    DEV_MODE_STATUS_UPDATE = "DEV_MODE_STATUS_UPDATE"


class WebhookStatus(str, Enum):
    """Enum representing the possible statuses for a webhook."""
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"


class WebhookContext(str, Enum):
    """Enum representing the possible context types for a webhook."""
    TEAM = "TEAM"
    PROJECT = "PROJECT"
    FILE = "FILE"


class Webhook(BaseModel):
    """A webhook configuration."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique identifier for the webhook")
    event_type: WebhookEvent = Field(..., description="Type of event this webhook subscribes to")
    team_id: Optional[str] = Field(None, description="DEPRECATED: Team ID for the webhook")
    context: WebhookContext = Field(..., description="Type of context this webhook is attached to")
    context_id: str = Field(..., description="ID of the context this webhook is attached to")
    plan_api_id: str = Field(..., description="Plan API ID of the team or organization")
    status: WebhookStatus = Field(..., description="Current status of the webhook")
    client_id: Optional[str] = Field(None, description="OAuth client ID that registered this webhook")
    passcode: str = Field(..., description="Passcode for webhook verification")
    endpoint: str = Field(..., description="Endpoint URL that receives webhook events")
    description: Optional[str] = Field(None, description="User-provided description for the webhook")


class WebhookRequestInfo(BaseModel):
    """Information about a webhook request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="ID of the webhook")
    endpoint: str = Field(..., description="Endpoint the request was sent to")
    payload: Dict[str, Any] = Field(..., description="Contents of the request")
    sent_at: datetime = Field(..., description="UTC timestamp when request was sent")


class WebhookResponseInfo(BaseModel):
    """Information about a webhook response."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: str = Field(..., description="HTTP status code of the response")
    received_at: datetime = Field(..., description="UTC timestamp when response was received")


class WebhookRequest(BaseModel):
    """Information about webhook request-response interactions."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    webhook_id: str = Field(..., description="ID of the webhook")
    request_info: WebhookRequestInfo = Field(..., description="Request information")
    response_info: Optional[WebhookResponseInfo] = Field(None, description="Response information")
    error_msg: Optional[str] = Field(None, description="Error message if request failed")


class CreateWebhookData(BaseModel):
    """Data for creating a new webhook."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    event_type: WebhookEvent = Field(..., description="Event type to subscribe to")
    context: WebhookContext = Field(..., description="Context type for the webhook")
    context_id: str = Field(..., description="ID of the context")
    endpoint: str = Field(..., max_length=2048, description="HTTP endpoint URL")
    passcode: str = Field(..., max_length=100, description="Passcode for verification")
    status: WebhookStatus = Field(WebhookStatus.ACTIVE, description="Initial status")
    description: Optional[str] = Field(None, max_length=150, description="Description")
    
    # Deprecated fields
    team_id: Optional[str] = Field(None, description="DEPRECATED: Use context and context_id instead")


class UpdateWebhookData(BaseModel):
    """Data for updating an existing webhook."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    event_type: Optional[WebhookEvent] = Field(None, description="Event type to subscribe to")
    endpoint: Optional[str] = Field(None, max_length=2048, description="HTTP endpoint URL")
    passcode: Optional[str] = Field(None, max_length=100, description="Passcode for verification")
    status: Optional[WebhookStatus] = Field(None, description="Webhook status")
    description: Optional[str] = Field(None, max_length=150, description="Description")


# Webhook Payload Models

class User(BaseModel):
    """User information in webhook payloads."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="User ID")
    handle: str = Field(..., description="User handle")
    img_url: str = Field(..., description="User avatar URL")
    email: str = Field(..., description="User email")


class LibraryItemData(BaseModel):
    """Library item information in LIBRARY_PUBLISH event."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    key: str = Field(..., description="Unique identifier for the library item")
    name: str = Field(..., description="Name of the library item")


class CommentFragment(BaseModel):
    """Fragment of a comment in FILE_COMMENT event."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    text: Optional[str] = Field(None, description="Comment text")
    mention: Optional[str] = Field(None, description="User ID for mentions")


class WebhookBasePayload(BaseModel):
    """Base payload structure for all webhook events."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    passcode: str = Field(..., description="Webhook passcode for verification")
    timestamp: datetime = Field(..., description="UTC timestamp when event was triggered")
    webhook_id: str = Field(..., description="ID of the webhook that caused the callback")


class WebhookPingPayload(WebhookBasePayload):
    """Payload for PING webhook events."""
    event_type: str = Field("PING", description="Event type")


class WebhookFileUpdatePayload(WebhookBasePayload):
    """Payload for FILE_UPDATE webhook events."""
    event_type: str = Field("FILE_UPDATE", description="Event type")
    file_key: str = Field(..., description="Key of the file that was updated")
    file_name: str = Field(..., description="Name of the file that was updated")


class WebhookFileDeletePayload(WebhookBasePayload):
    """Payload for FILE_DELETE webhook events."""
    event_type: str = Field("FILE_DELETE", description="Event type")
    file_key: str = Field(..., description="Key of the file that was deleted")
    file_name: str = Field(..., description="Name of the file that was deleted")
    triggered_by: User = Field(..., description="User who deleted the file")


class WebhookFileVersionUpdatePayload(WebhookBasePayload):
    """Payload for FILE_VERSION_UPDATE webhook events."""
    event_type: str = Field("FILE_VERSION_UPDATE", description="Event type")
    created_at: datetime = Field(..., description="When the version was created")
    description: str = Field(..., description="Version description")
    file_key: str = Field(..., description="Key of the file that was updated")
    file_name: str = Field(..., description="Name of the file that was updated")
    triggered_by: User = Field(..., description="User who created the version")
    version_id: str = Field(..., description="ID of the published version")


class WebhookLibraryPublishPayload(WebhookBasePayload):
    """Payload for LIBRARY_PUBLISH webhook events."""
    event_type: str = Field("LIBRARY_PUBLISH", description="Event type")
    created_components: List[LibraryItemData] = Field(default_factory=list, description="Created components")
    created_styles: List[LibraryItemData] = Field(default_factory=list, description="Created styles")
    created_variables: List[LibraryItemData] = Field(default_factory=list, description="Created variables")
    modified_components: List[LibraryItemData] = Field(default_factory=list, description="Modified components")
    modified_styles: List[LibraryItemData] = Field(default_factory=list, description="Modified styles")
    modified_variables: List[LibraryItemData] = Field(default_factory=list, description="Modified variables")
    deleted_components: List[LibraryItemData] = Field(default_factory=list, description="Deleted components")
    deleted_styles: List[LibraryItemData] = Field(default_factory=list, description="Deleted styles")
    deleted_variables: List[LibraryItemData] = Field(default_factory=list, description="Deleted variables")
    file_key: str = Field(..., description="Key of the library file")
    file_name: str = Field(..., description="Name of the library file")
    triggered_by: User = Field(..., description="User who published the library")


class WebhookFileCommentPayload(WebhookBasePayload):
    """Payload for FILE_COMMENT webhook events."""
    event_type: str = Field("FILE_COMMENT", description="Event type")
    comment_id: str = Field(..., description="ID of the comment")
    file_key: str = Field(..., description="Key of the file")
    file_name: str = Field(..., description="Name of the file")
    triggered_by: User = Field(..., description="User who made the comment")
    comment: List[CommentFragment] = Field(..., description="Comment fragments")
    created_at: datetime = Field(..., description="When the comment was created")
    order_id: str = Field(..., description="Comment order ID")
    parent_id: Optional[str] = Field(None, description="Parent comment ID for replies")


class WebhookDevModeStatusUpdatePayload(WebhookBasePayload):
    """Payload for DEV_MODE_STATUS_UPDATE webhook events."""
    event_type: str = Field("DEV_MODE_STATUS_UPDATE", description="Event type")
    file_key: str = Field(..., description="Key of the file")
    file_name: str = Field(..., description="Name of the file")
    triggered_by: User = Field(..., description="User who updated the status")
    layer_id: str = Field(..., description="ID of the layer")
    layer_name: str = Field(..., description="Name of the layer")
    status: str = Field(..., description="New dev mode status")


# Response Models

class WebhooksResponse(BaseModel):
    """Response for listing webhooks."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    webhooks: List[Webhook] = Field(..., description="List of webhooks")
    next_page: Optional[str] = Field(None, description="Cursor for next page")
    prev_page: Optional[str] = Field(None, description="Cursor for previous page")


class WebhookRequestsResponse(BaseModel):
    """Response for listing webhook requests."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    requests: List[WebhookRequest] = Field(..., description="List of webhook requests")