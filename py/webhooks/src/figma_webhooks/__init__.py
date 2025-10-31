"""
Figma Webhooks Python Library

A comprehensive Python library for managing Figma webhooks with SDK, CLI, and server interfaces.
"""

from .client import FigmaWebhooksClient
from .sdk import FigmaWebhooksSDK
from .models import (
    Webhook,
    WebhookRequest,
    WebhookRequestInfo,
    WebhookResponseInfo,
    WebhookEvent,
    WebhookStatus,
    WebhookContext,
    CreateWebhookData,
    UpdateWebhookData,
    WebhookPingPayload,
    WebhookFileUpdatePayload,
    WebhookFileDeletePayload,
    WebhookFileVersionUpdatePayload,
    WebhookLibraryPublishPayload,
    WebhookFileCommentPayload,
    WebhookDevModeStatusUpdatePayload,
)
from .errors import (
    FigmaWebhooksError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ApiError,
)

__version__ = "0.1.0"
__author__ = "Figma Webhooks Library"

__all__ = [
    # Core classes
    "FigmaWebhooksClient",
    "FigmaWebhooksSDK",
    
    # Models
    "Webhook",
    "WebhookRequest",
    "WebhookRequestInfo",
    "WebhookResponseInfo",
    "WebhookEvent",
    "WebhookStatus",
    "WebhookContext",
    "CreateWebhookData",
    "UpdateWebhookData",
    
    # Payload models
    "WebhookPingPayload",
    "WebhookFileUpdatePayload",
    "WebhookFileDeletePayload",
    "WebhookFileVersionUpdatePayload",
    "WebhookLibraryPublishPayload",
    "WebhookFileCommentPayload",
    "WebhookDevModeStatusUpdatePayload",
    
    # Errors
    "FigmaWebhooksError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ApiError",
]