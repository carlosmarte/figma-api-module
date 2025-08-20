# Figma Webhooks Examples

This document provides comprehensive examples of using the Figma Webhooks Python library.

## Table of Contents

- [Basic Usage](#basic-usage)
- [SDK Examples](#sdk-examples)
- [CLI Examples](#cli-examples)
- [Server Examples](#server-examples)
- [Advanced Use Cases](#advanced-use-cases)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)

## Basic Usage

### Setting up Authentication

```python
import os
from figma_webhooks import FigmaWebhooksSDK

# Option 1: Direct API key
sdk = FigmaWebhooksSDK(api_key="your-figma-token")

# Option 2: Environment variable
os.environ["FIGMA_TOKEN"] = "your-figma-token"
sdk = FigmaWebhooksSDK(api_key=os.getenv("FIGMA_TOKEN"))
```

### Simple Webhook Creation

```python
import asyncio
from figma_webhooks import FigmaWebhooksSDK, WebhookEvent

async def create_simple_webhook():
    async with FigmaWebhooksSDK("your-token") as sdk:
        webhook = await sdk.create_file_webhook(
            file_id="ABC123",
            endpoint="https://myapp.com/webhook",
            passcode="secret123",
            event_type=WebhookEvent.FILE_UPDATE,
            description="Monitor file changes"
        )
        print(f"Created webhook {webhook.id}")

asyncio.run(create_simple_webhook())
```

## SDK Examples

### Complete Webhook Management

```python
import asyncio
from figma_webhooks import (
    FigmaWebhooksSDK,
    WebhookEvent,
    WebhookContext,
    WebhookStatus,
    CreateWebhookData,
    UpdateWebhookData
)

async def webhook_management_example():
    async with FigmaWebhooksSDK("your-token") as sdk:
        # 1. List existing webhooks
        print("📋 Listing existing webhooks...")
        response = await sdk.list_webhooks(
            context=WebhookContext.TEAM,
            context_id="team-123"
        )
        print(f"Found {len(response.webhooks)} webhooks")
        
        # 2. Create different types of webhooks
        print("\n🎯 Creating webhooks...")
        
        # File webhook
        file_webhook = await sdk.create_file_webhook(
            file_id="file-456",
            endpoint="https://myapp.com/file-updates",
            passcode="file-secret",
            event_type=WebhookEvent.FILE_UPDATE,
            description="Track file changes"
        )
        print(f"✅ File webhook: {file_webhook.id}")
        
        # Team webhook for library publishing
        team_webhook = await sdk.create_team_webhook(
            team_id="team-123",
            endpoint="https://myapp.com/library-updates",
            passcode="team-secret",
            event_type=WebhookEvent.LIBRARY_PUBLISH,
            description="Track library publications"
        )
        print(f"✅ Team webhook: {team_webhook.id}")
        
        # Project webhook for comments
        project_webhook = await sdk.create_project_webhook(
            project_id="project-789",
            endpoint="https://myapp.com/comment-updates",
            passcode="project-secret",
            event_type=WebhookEvent.FILE_COMMENT,
            description="Track project comments"
        )
        print(f"✅ Project webhook: {project_webhook.id}")
        
        # 3. Update webhook
        print(f"\n🔧 Updating webhook {file_webhook.id}...")
        updated_webhook = await sdk.update_webhook(
            file_webhook.id,
            UpdateWebhookData(
                description="Updated file tracking webhook",
                status=WebhookStatus.PAUSED
            )
        )
        print(f"✅ Updated: {updated_webhook.description}, Status: {updated_webhook.status}")
        
        # 4. Get webhook details
        print(f"\n🔍 Getting webhook details...")
        webhook_details = await sdk.get_webhook(file_webhook.id)
        print(f"Webhook {webhook_details.id}:")
        print(f"  Event: {webhook_details.event_type}")
        print(f"  Context: {webhook_details.context} ({webhook_details.context_id})")
        print(f"  Status: {webhook_details.status}")
        print(f"  Endpoint: {webhook_details.endpoint}")
        
        # 5. Get webhook requests for debugging
        print(f"\n📊 Getting webhook requests...")
        requests_response = await sdk.get_webhook_requests(file_webhook.id)
        print(f"Found {len(requests_response.requests)} requests")
        
        for request in requests_response.requests[:3]:  # Show first 3
            status = request.response_info.status if request.response_info else "No response"
            print(f"  Request to {request.request_info.endpoint}: {status}")
        
        # 6. Search webhooks
        print(f"\n🔎 Searching active webhooks...")
        active_webhooks = await sdk.search_webhooks(
            status=WebhookStatus.ACTIVE,
            plan_api_id="plan-abc"  # Required for search across contexts
        )
        print(f"Found {len(active_webhooks)} active webhooks")
        
        # 7. Batch operations
        print(f"\n📦 Batch getting webhooks...")
        webhook_ids = [file_webhook.id, team_webhook.id, project_webhook.id]
        webhooks = await sdk.batch_get_webhooks(webhook_ids)
        for i, webhook in enumerate(webhooks):
            if webhook:
                print(f"  {i+1}. {webhook.id}: {webhook.description}")
            else:
                print(f"  {i+1}. Webhook not found")
        
        # 8. Pause and activate webhooks
        print(f"\n⏸️ Managing webhook states...")
        await sdk.pause_webhook(team_webhook.id)
        print(f"Paused team webhook")
        
        await sdk.activate_webhook(file_webhook.id)
        print(f"Activated file webhook")
        
        # 9. Clean up - delete webhooks
        print(f"\n🗑️ Cleaning up...")
        for webhook_id in [file_webhook.id, team_webhook.id, project_webhook.id]:
            try:
                await sdk.delete_webhook(webhook_id)
                print(f"Deleted webhook {webhook_id}")
            except Exception as e:
                print(f"Failed to delete {webhook_id}: {e}")

asyncio.run(webhook_management_example())
```

### Working with Different Event Types

```python
import asyncio
from figma_webhooks import FigmaWebhooksSDK, WebhookEvent

async def event_types_example():
    async with FigmaWebhooksSDK("your-token") as sdk:
        base_config = {
            "file_id": "your-file-id",
            "endpoint": "https://myapp.com/webhooks",
            "passcode": "secret123"
        }
        
        # File update webhook (most common)
        file_update_webhook = await sdk.create_file_webhook(
            **base_config,
            event_type=WebhookEvent.FILE_UPDATE,
            description="Track all file changes"
        )
        
        # Version update webhook (for named versions)
        version_webhook = await sdk.create_file_webhook(
            **base_config,
            endpoint="https://myapp.com/webhooks/versions",
            event_type=WebhookEvent.FILE_VERSION_UPDATE,
            description="Track named versions"
        )
        
        # Comment webhook
        comment_webhook = await sdk.create_file_webhook(
            **base_config,
            endpoint="https://myapp.com/webhooks/comments",
            event_type=WebhookEvent.FILE_COMMENT,
            description="Track comments"
        )
        
        # Dev mode status webhook
        dev_mode_webhook = await sdk.create_file_webhook(
            **base_config,
            endpoint="https://myapp.com/webhooks/dev-mode",
            event_type=WebhookEvent.DEV_MODE_STATUS_UPDATE,
            description="Track dev mode changes"
        )
        
        print("Created webhooks for different event types:")
        print(f"  File updates: {file_update_webhook.id}")
        print(f"  Version updates: {version_webhook.id}")
        print(f"  Comments: {comment_webhook.id}")
        print(f"  Dev mode: {dev_mode_webhook.id}")

asyncio.run(event_types_example())
```

### Pagination Example

```python
import asyncio
from figma_webhooks import FigmaWebhooksClient

async def pagination_example():
    async with FigmaWebhooksClient("your-token") as client:
        print("📄 Paginating through all webhooks...")
        
        webhook_count = 0
        async for webhook in client.paginate("/v2/webhooks", plan_api_id="your-plan-id"):
            webhook_count += 1
            print(f"  {webhook_count}. {webhook['id']}: {webhook.get('description', 'No description')}")
            
            # Stop after 10 for demo
            if webhook_count >= 10:
                break
        
        print(f"Processed {webhook_count} webhooks")

asyncio.run(pagination_example())
```

## CLI Examples

### Basic Commands

```bash
# Set API key
export FIGMA_TOKEN="your-figma-token"

# List all webhooks for a specific context
figma-webhooks list --context team --context-id team-123

# List webhooks with JSON output
figma-webhooks list --context file --context-id file-456 --output json

# List all webhooks across contexts (requires plan API ID)
figma-webhooks list --plan-api-id plan-abc
```

### Creating Webhooks

```bash
# Create a file webhook
figma-webhooks create \
  --event-type FILE_UPDATE \
  --context file \
  --context-id ABC123 \
  --endpoint https://myapp.com/webhook \
  --passcode secret123 \
  --description "My file webhook"

# Create a team webhook for library publishing
figma-webhooks create \
  --event-type LIBRARY_PUBLISH \
  --context team \
  --context-id team-456 \
  --endpoint https://myapp.com/library-webhook \
  --passcode library-secret \
  --description "Library updates"

# Create a paused webhook
figma-webhooks create \
  --event-type FILE_COMMENT \
  --context project \
  --context-id project-789 \
  --endpoint https://myapp.com/comments \
  --passcode comment-secret \
  --status PAUSED \
  --description "Comment tracking (paused)"
```

### Managing Webhooks

```bash
# Get webhook details
figma-webhooks get webhook-id-123

# Update webhook
figma-webhooks update webhook-id-123 \
  --description "Updated webhook description" \
  --status ACTIVE

# Change webhook endpoint
figma-webhooks update webhook-id-123 \
  --endpoint https://new-endpoint.com/webhook \
  --passcode new-secret

# Pause a webhook
figma-webhooks pause webhook-id-123

# Activate a webhook
figma-webhooks activate webhook-id-123

# Get webhook requests for debugging
figma-webhooks requests webhook-id-123

# Delete webhook (with confirmation)
figma-webhooks delete webhook-id-123

# Delete webhook (skip confirmation)
figma-webhooks delete webhook-id-123 --yes
```

### CLI with Different Output Formats

```bash
# Table output (default)
figma-webhooks list --context file --context-id ABC123

# JSON output for scripting
figma-webhooks list --context file --context-id ABC123 --output json | jq '.webhooks[0].id'

# Get webhook details as JSON
figma-webhooks get webhook-id-123 --output json | jq '.endpoint'
```

## Server Examples

### Starting the Server

```bash
# Basic server start
figma-webhooks serve

# Custom configuration
figma-webhooks serve \
  --host 127.0.0.1 \
  --port 3000 \
  --api-key "your-token"

# Development mode
figma-webhooks serve --reload
```

### Using the API Server

```bash
# Health check (no auth required)
curl http://localhost:8000/health

# List webhooks with header authentication
curl -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/webhooks?context=file&context_id=ABC123"

# List webhooks with query parameter authentication
curl "http://localhost:8000/v1/webhooks?context=file&context_id=ABC123&token=your-token"

# Create a webhook
curl -X POST \
  -H "X-Figma-Token: your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "FILE_UPDATE",
    "context": "FILE",
    "context_id": "ABC123",
    "endpoint": "https://myapp.com/webhook",
    "passcode": "secret123",
    "description": "API created webhook"
  }' \
  "http://localhost:8000/v1/webhooks"

# Get webhook details
curl -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/webhooks/webhook-id-123"

# Update webhook
curl -X PUT \
  -H "X-Figma-Token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "PAUSED", "description": "Updated via API"}' \
  "http://localhost:8000/v1/webhooks/webhook-id-123"

# Delete webhook
curl -X DELETE \
  -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/webhooks/webhook-id-123"

# Convenience endpoints
curl -X POST \
  -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/webhooks/file?file_id=ABC123&endpoint=https://myapp.com/webhook&passcode=secret"

# Search webhooks
curl -H "X-Figma-Token: your-token" \
  "http://localhost:8000/v1/webhooks/search?event_type=FILE_UPDATE&status=ACTIVE"
```

### JavaScript/TypeScript Client Example

```javascript
class FigmaWebhooksClient {
  constructor(token, baseUrl = 'http://localhost:8000') {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async request(method, path, data = null) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Figma-Token': this.token,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async listWebhooks(context, contextId) {
    return this.request('GET', `/v1/webhooks?context=${context}&context_id=${contextId}`);
  }

  async createWebhook(webhookData) {
    return this.request('POST', '/v1/webhooks', webhookData);
  }

  async getWebhook(webhookId) {
    return this.request('GET', `/v1/webhooks/${webhookId}`);
  }

  async updateWebhook(webhookId, updates) {
    return this.request('PUT', `/v1/webhooks/${webhookId}`, updates);
  }

  async deleteWebhook(webhookId) {
    return this.request('DELETE', `/v1/webhooks/${webhookId}`);
  }
}

// Usage
const client = new FigmaWebhooksClient('your-token');

// Create a webhook
const webhook = await client.createWebhook({
  event_type: 'FILE_UPDATE',
  context: 'FILE',
  context_id: 'ABC123',
  endpoint: 'https://myapp.com/webhook',
  passcode: 'secret123',
  description: 'JS created webhook'
});

console.log('Created webhook:', webhook.id);
```

## Advanced Use Cases

### Building a Webhook Server

```python
from fastapi import FastAPI, Request, HTTPException
from figma_webhooks.models import (
    WebhookPingPayload,
    WebhookFileUpdatePayload,
    WebhookFileCommentPayload
)
import hashlib
import hmac

app = FastAPI()

# Your webhook passcode
WEBHOOK_PASSCODE = "your-secret-passcode"

def verify_webhook(payload: dict, expected_passcode: str) -> bool:
    """Verify webhook authenticity."""
    return payload.get("passcode") == expected_passcode

@app.post("/webhook")
async def handle_webhook(request: Request):
    """Handle incoming Figma webhooks."""
    try:
        payload = await request.json()
        
        # Verify the webhook
        if not verify_webhook(payload, WEBHOOK_PASSCODE):
            raise HTTPException(status_code=401, detail="Invalid passcode")
        
        event_type = payload.get("event_type")
        
        if event_type == "PING":
            ping_payload = WebhookPingPayload(**payload)
            print(f"🏓 Ping received from webhook {ping_payload.webhook_id}")
            
        elif event_type == "FILE_UPDATE":
            file_payload = WebhookFileUpdatePayload(**payload)
            print(f"📝 File updated: {file_payload.file_name} ({file_payload.file_key})")
            await handle_file_update(file_payload)
            
        elif event_type == "FILE_COMMENT":
            comment_payload = WebhookFileCommentPayload(**payload)
            print(f"💬 New comment by {comment_payload.triggered_by.handle}")
            await handle_file_comment(comment_payload)
            
        else:
            print(f"⚠️ Unhandled event type: {event_type}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def handle_file_update(payload: WebhookFileUpdatePayload):
    """Handle file update events."""
    # Your business logic here
    print(f"Processing file update for {payload.file_name}")
    # e.g., regenerate exports, update database, notify team, etc.

async def handle_file_comment(payload: WebhookFileCommentPayload):
    """Handle comment events."""
    # Your business logic here
    comment_text = " ".join([
        fragment.text or f"@{fragment.mention}" 
        for fragment in payload.comment 
        if fragment.text or fragment.mention
    ])
    print(f"Comment: {comment_text}")
    # e.g., create tasks, send notifications, etc.
```

### Monitoring and Analytics

```python
import asyncio
from datetime import datetime, timedelta
from figma_webhooks import FigmaWebhooksSDK
from collections import defaultdict

async def webhook_analytics():
    """Analyze webhook performance and status."""
    async with FigmaWebhooksSDK("your-token") as sdk:
        # Get all webhooks
        all_webhooks = await sdk.search_webhooks(plan_api_id="your-plan-id")
        
        print(f"📊 Webhook Analytics Report")
        print(f"{'='*50}")
        print(f"Total webhooks: {len(all_webhooks)}")
        
        # Status breakdown
        status_counts = defaultdict(int)
        event_counts = defaultdict(int)
        context_counts = defaultdict(int)
        
        for webhook in all_webhooks:
            status_counts[webhook.status] += 1
            event_counts[webhook.event_type] += 1
            context_counts[webhook.context] += 1
        
        print(f"\n📈 Status Distribution:")
        for status, count in status_counts.items():
            print(f"  {status}: {count}")
        
        print(f"\n🎯 Event Types:")
        for event, count in event_counts.items():
            print(f"  {event}: {count}")
        
        print(f"\n🏗️ Context Distribution:")
        for context, count in context_counts.items():
            print(f"  {context}: {count}")
        
        # Check webhook health
        print(f"\n🏥 Webhook Health Check:")
        unhealthy_webhooks = []
        
        for webhook in all_webhooks[:5]:  # Check first 5 for demo
            try:
                requests = await sdk.get_webhook_requests(webhook.id)
                recent_failures = sum(
                    1 for req in requests.requests
                    if req.error_msg or (
                        req.response_info and 
                        not req.response_info.status.startswith('2')
                    )
                )
                
                if recent_failures > 0:
                    unhealthy_webhooks.append({
                        'id': webhook.id,
                        'description': webhook.description,
                        'failures': recent_failures,
                        'total_requests': len(requests.requests)
                    })
                    
            except Exception as e:
                print(f"  ⚠️ Could not check {webhook.id}: {e}")
        
        if unhealthy_webhooks:
            print(f"  ❌ Found {len(unhealthy_webhooks)} unhealthy webhooks:")
            for webhook in unhealthy_webhooks:
                print(f"    {webhook['id']}: {webhook['failures']}/{webhook['total_requests']} failures")
        else:
            print(f"  ✅ All checked webhooks are healthy")

asyncio.run(webhook_analytics())
```

### Webhook Migration Tool

```python
import asyncio
from figma_webhooks import FigmaWebhooksSDK, WebhookContext, CreateWebhookData

async def migrate_webhooks():
    """Migrate webhooks from one context to another."""
    async with FigmaWebhooksSDK("your-token") as sdk:
        # Get webhooks from old context
        old_webhooks = await sdk.list_webhooks(
            context=WebhookContext.TEAM,
            context_id="old-team-id"
        )
        
        print(f"🚚 Migrating {len(old_webhooks.webhooks)} webhooks...")
        
        migration_results = []
        
        for webhook in old_webhooks.webhooks:
            try:
                # Create new webhook in target context
                new_webhook_data = CreateWebhookData(
                    event_type=webhook.event_type,
                    context=WebhookContext.TEAM,
                    context_id="new-team-id",
                    endpoint=webhook.endpoint,
                    passcode="new-passcode",  # Update passcode
                    description=f"Migrated: {webhook.description}",
                    status=webhook.status
                )
                
                new_webhook = await sdk.create_webhook(new_webhook_data)
                
                # Pause old webhook (don't delete yet)
                await sdk.pause_webhook(webhook.id)
                
                migration_results.append({
                    'old_id': webhook.id,
                    'new_id': new_webhook.id,
                    'status': 'success'
                })
                
                print(f"  ✅ {webhook.id} → {new_webhook.id}")
                
            except Exception as e:
                migration_results.append({
                    'old_id': webhook.id,
                    'new_id': None,
                    'status': 'failed',
                    'error': str(e)
                })
                print(f"  ❌ Failed to migrate {webhook.id}: {e}")
        
        # Summary
        successful = sum(1 for r in migration_results if r['status'] == 'success')
        failed = len(migration_results) - successful
        
        print(f"\n📋 Migration Summary:")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        
        if failed > 0:
            print(f"\n❌ Failed migrations:")
            for result in migration_results:
                if result['status'] == 'failed':
                    print(f"    {result['old_id']}: {result['error']}")

asyncio.run(migrate_webhooks())
```

## Error Handling

### Comprehensive Error Handling

```python
import asyncio
import logging
from figma_webhooks import (
    FigmaWebhooksSDK,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ApiError,
    NetworkError,
    TimeoutError
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def robust_webhook_operations():
    """Demonstrate robust error handling."""
    
    try:
        async with FigmaWebhooksSDK("your-token") as sdk:
            await perform_webhook_operations(sdk)
            
    except AuthenticationError as e:
        logger.error(f"Authentication failed: {e.message}")
        # Handle by refreshing token or prompting user
        
    except AuthorizationError as e:
        logger.error(f"Access denied: {e.message}")
        # Handle by checking permissions
        
    except RateLimitError as e:
        logger.warning(f"Rate limited. Retry after {e.retry_after} seconds")
        if e.retry_after:
            await asyncio.sleep(e.retry_after)
            # Retry the operation
        
    except ValidationError as e:
        logger.error(f"Validation error: {e.message}")
        # Handle by fixing request data
        
    except NetworkError as e:
        logger.error(f"Network error: {e.message}")
        # Handle by checking connectivity
        
    except TimeoutError as e:
        logger.error(f"Request timeout: {e.message}")
        # Handle by retrying with longer timeout
        
    except ApiError as e:
        logger.error(f"API error {e.status_code}: {e.message}")
        # Handle based on status code
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        # Handle unknown errors

async def perform_webhook_operations(sdk):
    """Perform webhook operations with individual error handling."""
    
    # Operation 1: List webhooks
    try:
        webhooks = await sdk.list_webhooks(context="INVALID")  # Will cause validation error
    except ValidationError:
        logger.info("Invalid context, using default")
        webhooks = await sdk.list_webhooks(plan_api_id="your-plan-id")
    
    # Operation 2: Get webhook with retry
    webhook_id = "some-webhook-id"
    for attempt in range(3):
        try:
            webhook = await sdk.get_webhook(webhook_id)
            break
        except NotFoundError:
            logger.warning(f"Webhook {webhook_id} not found")
            break
        except (NetworkError, TimeoutError) as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e.message}")
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
    
    # Operation 3: Create webhook with validation
    try:
        webhook_data = {
            "event_type": "FILE_UPDATE",
            "context": "FILE",
            "context_id": "file-123",
            "endpoint": "invalid-url",  # Invalid endpoint
            "passcode": "secret",
        }
        await sdk.create_webhook(webhook_data)
    except (ValidationError, ValueError) as e:
        logger.error(f"Invalid webhook data: {e}")
        # Fix the data and retry
        webhook_data["endpoint"] = "https://valid-endpoint.com/webhook"
        webhook = await sdk.create_webhook(webhook_data)
        logger.info(f"Created webhook {webhook.id} after fixing data")

asyncio.run(robust_webhook_operations())
```

## Integration Examples

### Slack Integration

```python
import asyncio
import json
from figma_webhooks import FigmaWebhooksSDK, WebhookEvent
import httpx

async def setup_slack_integration():
    """Set up Figma webhooks to post to Slack."""
    
    # Slack webhook URL (get from Slack app settings)
    slack_webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    
    async with FigmaWebhooksSDK("your-figma-token") as sdk:
        # Create webhook that posts to your webhook handler
        webhook = await sdk.create_file_webhook(
            file_id="your-file-id",
            endpoint="https://yourapp.com/slack-webhook-handler",
            passcode="slack-secret",
            event_type=WebhookEvent.FILE_UPDATE,
            description="Slack notifications for file updates"
        )
        
        print(f"Created Slack integration webhook: {webhook.id}")

# Your webhook handler (FastAPI example)
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/slack-webhook-handler")
async def slack_webhook_handler(request: Request):
    """Handle Figma webhook and post to Slack."""
    payload = await request.json()
    
    if payload["event_type"] == "FILE_UPDATE":
        slack_message = {
            "text": f"📝 Figma file updated: {payload['file_name']}",
            "attachments": [
                {
                    "color": "good",
                    "fields": [
                        {
                            "title": "File",
                            "value": f"<https://figma.com/file/{payload['file_key']}|{payload['file_name']}>",
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": payload["timestamp"],
                            "short": True
                        }
                    ]
                }
            ]
        }
        
        # Post to Slack
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
                json=slack_message
            )
    
    return {"status": "ok"}
```

### GitHub Actions Integration

```yaml
# .github/workflows/figma-sync.yml
name: Sync Figma Updates

on:
  repository_dispatch:
    types: [figma-update]

jobs:
  sync-figma:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install figma-webhooks
      
      - name: Process Figma Update
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
        run: |
          python scripts/process_figma_update.py
```

```python
# scripts/process_figma_update.py
import asyncio
import os
from figma_webhooks import FigmaWebhooksSDK

async def process_figma_update():
    """Process Figma file updates in GitHub Actions."""
    
    file_key = os.environ.get('FIGMA_FILE_KEY')
    if not file_key:
        print("No file key provided")
        return
    
    async with FigmaWebhooksSDK(os.environ['FIGMA_TOKEN']) as sdk:
        # Get latest webhook requests to see what changed
        webhooks = await sdk.search_webhooks(
            event_type="FILE_UPDATE",
            plan_api_id=os.environ.get('FIGMA_PLAN_ID')
        )
        
        for webhook in webhooks:
            if webhook.context_id == file_key:
                requests = await sdk.get_webhook_requests(webhook.id)
                latest_request = requests.requests[0] if requests.requests else None
                
                if latest_request:
                    print(f"Processing update from {latest_request.request_info.sent_at}")
                    # Your processing logic here
                    # e.g., export assets, update documentation, etc.

if __name__ == "__main__":
    asyncio.run(process_figma_update())
```

These examples demonstrate the full range of capabilities of the Figma Webhooks Python library, from basic usage to advanced integrations and error handling patterns.