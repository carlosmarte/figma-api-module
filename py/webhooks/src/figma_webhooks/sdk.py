"""
High-level SDK for Figma Webhooks API.
"""

from typing import List, Optional, Dict, Any, AsyncIterator

from .client import FigmaWebhooksClient
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
from .utils import (
    validate_webhook_endpoint,
    validate_passcode,
    validate_description,
    clean_webhook_data,
)


class FigmaWebhooksSDK:
    """High-level SDK for Figma Webhooks API."""
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        """
        Initialize the Figma Webhooks SDK.
        
        Args:
            api_key: Figma API key
            base_url: Base URL for Figma API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self.client = FigmaWebhooksClient(
            api_key=api_key,
            base_url=base_url,
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
        """Close the underlying client."""
        await self.client.close()
    
    # Webhook Management
    
    async def list_webhooks(
        self,
        *,
        context: Optional[WebhookContext] = None,
        context_id: Optional[str] = None,
        plan_api_id: Optional[str] = None,
        cursor: Optional[str] = None,
    ) -> WebhooksResponse:
        """
        List webhooks by context or plan.
        
        Args:
            context: Context type (TEAM, PROJECT, FILE)
            context_id: ID of the context
            plan_api_id: Plan API ID for getting all webhooks
            cursor: Pagination cursor
            
        Returns:
            Webhooks response with list of webhooks
        """
        params = {}
        if context:
            params["context"] = context.value
        if context_id:
            params["context_id"] = context_id
        if plan_api_id:
            params["plan_api_id"] = plan_api_id
        if cursor:
            params["cursor"] = cursor
        
        response = await self.client.get("/v2/webhooks", **params)
        return WebhooksResponse(**response)
    
    async def get_webhook(self, webhook_id: str) -> Webhook:
        """
        Get a webhook by ID.
        
        Args:
            webhook_id: ID of the webhook
            
        Returns:
            Webhook object
        """
        response = await self.client.get(f"/v2/webhooks/{webhook_id}")
        return Webhook(**response["webhook"])
    
    async def create_webhook(self, webhook_data: CreateWebhookData) -> Webhook:
        """
        Create a new webhook.
        
        Args:
            webhook_data: Webhook creation data
            
        Returns:
            Created webhook object
        """
        # Validate webhook data
        if not validate_webhook_endpoint(webhook_data.endpoint):
            raise ValueError("Invalid webhook endpoint URL")
        
        if not validate_passcode(webhook_data.passcode):
            raise ValueError("Invalid webhook passcode")
        
        if not validate_description(webhook_data.description):
            raise ValueError("Invalid webhook description")
        
        # Convert to dict and clean
        data = clean_webhook_data(webhook_data.model_dump(exclude_none=True))
        
        # Convert enums to values
        if "event_type" in data:
            data["event_type"] = data["event_type"].value if hasattr(data["event_type"], "value") else data["event_type"]
        if "context" in data:
            data["context"] = data["context"].value if hasattr(data["context"], "value") else data["context"]
        if "status" in data:
            data["status"] = data["status"].value if hasattr(data["status"], "value") else data["status"]
        
        response = await self.client.post("/v2/webhooks", json_data=data)
        return Webhook(**response["webhook"])
    
    async def update_webhook(self, webhook_id: str, webhook_data: UpdateWebhookData) -> Webhook:
        """
        Update an existing webhook.
        
        Args:
            webhook_id: ID of the webhook to update
            webhook_data: Webhook update data
            
        Returns:
            Updated webhook object
        """
        # Validate webhook data
        if webhook_data.endpoint and not validate_webhook_endpoint(webhook_data.endpoint):
            raise ValueError("Invalid webhook endpoint URL")
        
        if webhook_data.passcode and not validate_passcode(webhook_data.passcode):
            raise ValueError("Invalid webhook passcode")
        
        if webhook_data.description is not None and not validate_description(webhook_data.description):
            raise ValueError("Invalid webhook description")
        
        # Convert to dict and clean
        data = clean_webhook_data(webhook_data.model_dump(exclude_none=True))
        
        # Convert enums to values
        if "event_type" in data:
            data["event_type"] = data["event_type"].value if hasattr(data["event_type"], "value") else data["event_type"]
        if "status" in data:
            data["status"] = data["status"].value if hasattr(data["status"], "value") else data["status"]
        
        response = await self.client.put(f"/v2/webhooks/{webhook_id}", json_data=data)
        return Webhook(**response["webhook"])
    
    async def delete_webhook(self, webhook_id: str) -> bool:
        """
        Delete a webhook.
        
        Args:
            webhook_id: ID of the webhook to delete
            
        Returns:
            True if deletion was successful
        """
        await self.client.delete(f"/v2/webhooks/{webhook_id}")
        return True
    
    async def get_webhook_requests(self, webhook_id: str) -> WebhookRequestsResponse:
        """
        Get requests for a webhook.
        
        Args:
            webhook_id: ID of the webhook
            
        Returns:
            Webhook requests response
        """
        response = await self.client.get(f"/v2/webhooks/{webhook_id}/requests")
        return WebhookRequestsResponse(**response)
    
    # Convenience Methods
    
    async def create_file_webhook(
        self,
        file_id: str,
        endpoint: str,
        passcode: str,
        event_type: WebhookEvent = WebhookEvent.FILE_UPDATE,
        description: Optional[str] = None,
        status: WebhookStatus = WebhookStatus.ACTIVE,
    ) -> Webhook:
        """
        Create a webhook for a specific file.
        
        Args:
            file_id: Figma file ID
            endpoint: Webhook endpoint URL
            passcode: Webhook passcode
            event_type: Type of event to subscribe to
            description: Optional description
            status: Initial webhook status
            
        Returns:
            Created webhook object
        """
        webhook_data = CreateWebhookData(
            event_type=event_type,
            context=WebhookContext.FILE,
            context_id=file_id,
            endpoint=endpoint,
            passcode=passcode,
            description=description,
            status=status,
        )
        return await self.create_webhook(webhook_data)
    
    async def create_team_webhook(
        self,
        team_id: str,
        endpoint: str,
        passcode: str,
        event_type: WebhookEvent = WebhookEvent.FILE_UPDATE,
        description: Optional[str] = None,
        status: WebhookStatus = WebhookStatus.ACTIVE,
    ) -> Webhook:
        """
        Create a webhook for a team.
        
        Args:
            team_id: Figma team ID
            endpoint: Webhook endpoint URL
            passcode: Webhook passcode
            event_type: Type of event to subscribe to
            description: Optional description
            status: Initial webhook status
            
        Returns:
            Created webhook object
        """
        webhook_data = CreateWebhookData(
            event_type=event_type,
            context=WebhookContext.TEAM,
            context_id=team_id,
            endpoint=endpoint,
            passcode=passcode,
            description=description,
            status=status,
        )
        return await self.create_webhook(webhook_data)
    
    async def create_project_webhook(
        self,
        project_id: str,
        endpoint: str,
        passcode: str,
        event_type: WebhookEvent = WebhookEvent.FILE_UPDATE,
        description: Optional[str] = None,
        status: WebhookStatus = WebhookStatus.ACTIVE,
    ) -> Webhook:
        """
        Create a webhook for a project.
        
        Args:
            project_id: Figma project ID
            endpoint: Webhook endpoint URL
            passcode: Webhook passcode
            event_type: Type of event to subscribe to
            description: Optional description
            status: Initial webhook status
            
        Returns:
            Created webhook object
        """
        webhook_data = CreateWebhookData(
            event_type=event_type,
            context=WebhookContext.PROJECT,
            context_id=project_id,
            endpoint=endpoint,
            passcode=passcode,
            description=description,
            status=status,
        )
        return await self.create_webhook(webhook_data)
    
    async def pause_webhook(self, webhook_id: str) -> Webhook:
        """
        Pause a webhook.
        
        Args:
            webhook_id: ID of the webhook to pause
            
        Returns:
            Updated webhook object
        """
        webhook_data = UpdateWebhookData(status=WebhookStatus.PAUSED)
        return await self.update_webhook(webhook_id, webhook_data)
    
    async def activate_webhook(self, webhook_id: str) -> Webhook:
        """
        Activate a paused webhook.
        
        Args:
            webhook_id: ID of the webhook to activate
            
        Returns:
            Updated webhook object
        """
        webhook_data = UpdateWebhookData(status=WebhookStatus.ACTIVE)
        return await self.update_webhook(webhook_id, webhook_data)
    
    async def search_webhooks(
        self,
        *,
        event_type: Optional[WebhookEvent] = None,
        status: Optional[WebhookStatus] = None,
        context: Optional[WebhookContext] = None,
        plan_api_id: Optional[str] = None,
    ) -> List[Webhook]:
        """
        Search for webhooks with filters.
        
        Args:
            event_type: Filter by event type
            status: Filter by status
            context: Filter by context type
            plan_api_id: Plan API ID for searching across all contexts
            
        Returns:
            List of matching webhooks
        """
        webhooks = []
        
        # Get all webhooks (paginated if using plan_api_id)
        if plan_api_id:
            async for webhook_data in self.client.paginate("/v2/webhooks", plan_api_id=plan_api_id):
                webhook = Webhook(**webhook_data)
                
                # Apply filters
                if event_type and webhook.event_type != event_type:
                    continue
                if status and webhook.status != status:
                    continue
                if context and webhook.context != context:
                    continue
                
                webhooks.append(webhook)
        else:
            # Without plan_api_id, we can only search within specific contexts
            if not context:
                raise ValueError("Either plan_api_id or context must be provided")
            
            response = await self.list_webhooks(context=context)
            for webhook in response.webhooks:
                # Apply filters
                if event_type and webhook.event_type != event_type:
                    continue
                if status and webhook.status != status:
                    continue
                
                webhooks.append(webhook)
        
        return webhooks
    
    async def batch_get_webhooks(self, webhook_ids: List[str]) -> List[Optional[Webhook]]:
        """
        Get multiple webhooks by their IDs.
        
        Args:
            webhook_ids: List of webhook IDs
            
        Returns:
            List of webhook objects (None for webhooks that don't exist)
        """
        webhooks = []
        
        for webhook_id in webhook_ids:
            try:
                webhook = await self.get_webhook(webhook_id)
                webhooks.append(webhook)
            except Exception:
                webhooks.append(None)
        
        return webhooks