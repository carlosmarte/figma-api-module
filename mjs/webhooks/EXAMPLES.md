# Figma Webhooks - Practical Examples

This document provides real-world examples of using the Figma Webhooks API client for common design workflow automation scenarios.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [File Monitoring](#file-monitoring)
3. [Team Workflow Automation](#team-workflow-automation)
4. [Library Management](#library-management)
5. [Comment Integration](#comment-integration)
6. [Dev Mode Integration](#dev-mode-integration)
7. [Webhook Servers](#webhook-servers)
8. [Advanced Patterns](#advanced-patterns)

## Basic Setup

### Initialize the SDK

```javascript
import { FigmaWebhooksSDK } from 'figma-webhooks';

// Basic initialization
const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

// Advanced initialization with options
const figma = new FigmaWebhooksSDK({
  apiToken: process.env.FIGMA_TOKEN,
  baseUrl: 'https://api.figma.com',
  enableRetries: true,
  enableCaching: true,
  logger: console
});
```

### CLI Setup

```bash
# Set your token globally
export FIGMA_TOKEN="figd_your_token_here"

# Or pass it with each command
figma-webhooks list --token "figd_your_token_here"
```

## File Monitoring

### 1. Auto-Deploy Static Site from Figma

Monitor a design file and trigger a static site rebuild when designers make changes:

```javascript
// setup-autodeploy.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupAutoDeployWebhook() {
  try {
    const webhook = await figma.createFileWebhook({
      fileKey: 'abc123def456', // Your Figma file key
      endpoint: 'https://your-deploy-service.com/build-trigger',
      passcode: process.env.WEBHOOK_SECRET,
      description: 'Auto-deploy static site on design changes'
    });

    console.log('✅ Auto-deploy webhook created:', webhook.id);
    console.log('🌐 Endpoint:', webhook.endpoint);
    return webhook;
  } catch (error) {
    console.error('❌ Failed to create webhook:', error.message);
  }
}

setupAutoDeployWebhook();
```

```bash
# CLI equivalent
figma-webhooks create \
  --event FILE_UPDATE \
  --context file \
  --context-id abc123def456 \
  --endpoint https://your-deploy-service.com/build-trigger \
  --passcode $WEBHOOK_SECRET \
  --description "Auto-deploy static site on design changes"
```

### 2. Sync Figma Changes with CMS

Keep your content management system in sync with design updates:

```javascript
// sync-with-cms.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupCMSSync() {
  const designFiles = [
    { key: 'homepage-abc123', name: 'Homepage Design' },
    { key: 'product-def456', name: 'Product Pages' },
    { key: 'blog-ghi789', name: 'Blog Templates' }
  ];

  const results = await figma.createBulkWebhooks(
    designFiles.map(f => f.key),
    {
      context: 'file',
      eventType: 'FILE_UPDATE',
      endpoint: 'https://your-cms.com/api/figma-sync',
      passcode: process.env.CMS_WEBHOOK_SECRET,
      status: 'ACTIVE'
    }
  );

  console.log(`✅ Created ${results.created.length} CMS sync webhooks`);
  
  if (results.errors.length > 0) {
    console.log(`❌ ${results.errors.length} errors occurred:`);
    results.errors.forEach(error => {
      console.log(`  - ${error.contextId}: ${error.error}`);
    });
  }
}

setupCMSSync();
```

## Team Workflow Automation

### 1. Slack Notifications for Team Activity

Send Slack notifications when files are updated or commented on:

```javascript
// slack-integration.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupSlackNotifications(teamId) {
  // File updates notification
  const fileUpdateWebhook = await figma.createTeamWebhook({
    teamId: teamId,
    eventType: 'FILE_UPDATE',
    endpoint: 'https://your-app.com/slack/file-updates',
    passcode: process.env.SLACK_WEBHOOK_SECRET,
    description: 'Slack notifications for file updates'
  });

  // Comment notifications
  const commentWebhook = await figma.createTeamWebhook({
    teamId: teamId,
    eventType: 'FILE_COMMENT',
    endpoint: 'https://your-app.com/slack/comments',
    passcode: process.env.SLACK_WEBHOOK_SECRET,
    description: 'Slack notifications for new comments'
  });

  console.log('✅ Slack webhooks created:');
  console.log(`   File updates: ${fileUpdateWebhook.id}`);
  console.log(`   Comments: ${commentWebhook.id}`);
}

// Usage
setupSlackNotifications('team_123abc456def');
```

### 2. Project Status Dashboard

Create a dashboard that tracks project activity across multiple projects:

```javascript
// project-dashboard.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupProjectDashboard() {
  const projects = [
    'project_mobile_app',
    'project_website_redesign', 
    'project_marketing_materials'
  ];

  const webhooks = [];

  for (const projectId of projects) {
    // Track file updates
    const updateWebhook = await figma.createProjectWebhook({
      projectId: projectId,
      eventType: 'FILE_UPDATE',
      endpoint: 'https://dashboard.company.com/api/project-activity',
      passcode: process.env.DASHBOARD_SECRET,
      description: `Dashboard tracking for ${projectId}`
    });

    // Track version updates
    const versionWebhook = await figma.createProjectWebhook({
      projectId: projectId,
      eventType: 'FILE_VERSION_UPDATE',
      endpoint: 'https://dashboard.company.com/api/version-tracking',
      passcode: process.env.DASHBOARD_SECRET,
      description: `Version tracking for ${projectId}`
    });

    webhooks.push(updateWebhook, versionWebhook);
  }

  console.log(`✅ Created ${webhooks.length} dashboard webhooks`);
  return webhooks;
}

setupProjectDashboard();
```

## Library Management

### 1. Component Library Release Pipeline

Automate component library releases when designers publish updates:

```javascript
// library-pipeline.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupLibraryPipeline(libraryFileKey) {
  const webhook = await figma.createFileWebhook({
    fileKey: libraryFileKey,
    eventType: 'LIBRARY_PUBLISH',
    endpoint: 'https://your-ci.com/library-release-pipeline',
    passcode: process.env.LIBRARY_PIPELINE_SECRET,
    description: 'Trigger library release pipeline'
  });

  console.log('✅ Library pipeline webhook created:', webhook.id);
  
  // Also set up monitoring
  setTimeout(async () => {
    const health = await figma.checkWebhookHealth(webhook.id);
    console.log(`📊 Webhook health: ${health.status} (${Math.round(health.successRate * 100)}% success rate)`);
  }, 5000);

  return webhook;
}

setupLibraryPipeline('library_abc123def456');
```

### 2. Design Token Sync

Sync design tokens when library components are updated:

```javascript
// design-tokens.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

class DesignTokenSync {
  constructor() {
    this.webhooks = new Map();
  }

  async setupTokenSync(libraryFiles) {
    for (const { fileKey, name } of libraryFiles) {
      const webhook = await figma.createFileWebhook({
        fileKey: fileKey,
        eventType: 'LIBRARY_PUBLISH',
        endpoint: 'https://tokens.company.com/api/sync',
        passcode: process.env.TOKENS_SECRET,
        description: `Design token sync for ${name}`,
        active: true
      });

      this.webhooks.set(fileKey, webhook);
      console.log(`✅ Token sync enabled for ${name}: ${webhook.id}`);
    }
  }

  async checkSyncHealth() {
    console.log('📊 Checking design token sync health...');
    
    for (const [fileKey, webhook] of this.webhooks) {
      const health = await figma.checkWebhookHealth(webhook.id);
      console.log(`   ${fileKey}: ${health.status} (${health.successRate * 100}%)`);
    }
  }

  async pauseAllSync() {
    console.log('⏸️  Pausing all token sync webhooks...');
    
    const results = await figma.pauseBulkWebhooks(
      Array.from(this.webhooks.values()).map(w => w.id)
    );

    console.log(`   Paused: ${results.paused.length}`);
    console.log(`   Errors: ${results.errors.length}`);
  }
}

// Usage
const tokenSync = new DesignTokenSync();

await tokenSync.setupTokenSync([
  { fileKey: 'components_abc123', name: 'UI Components' },
  { fileKey: 'colors_def456', name: 'Color Palette' },
  { fileKey: 'typography_ghi789', name: 'Typography System' }
]);

// Check health every hour
setInterval(() => tokenSync.checkSyncHealth(), 3600000);
```

## Comment Integration

### 1. Jira Issue Creation

Automatically create Jira issues when designers add comments:

```javascript
// jira-integration.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupJiraIntegration(projectIds) {
  const webhooks = [];

  for (const projectId of projectIds) {
    const webhook = await figma.createProjectWebhook({
      projectId: projectId,
      eventType: 'FILE_COMMENT',
      endpoint: 'https://your-app.com/jira/create-issue',
      passcode: process.env.JIRA_WEBHOOK_SECRET,
      description: `Jira integration for ${projectId}`
    });

    webhooks.push(webhook);
    console.log(`✅ Jira integration enabled for ${projectId}`);
  }

  return webhooks;
}

setupJiraIntegration([
  'project_mobile_app',
  'project_web_redesign'
]);
```

### 2. Comment Analytics

Track comment patterns and team collaboration:

```javascript
// comment-analytics.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupCommentAnalytics(teamId) {
  const webhook = await figma.createTeamWebhook({
    teamId: teamId,
    eventType: 'FILE_COMMENT',
    endpoint: 'https://analytics.company.com/figma/comments',
    passcode: process.env.ANALYTICS_SECRET,
    description: 'Comment analytics tracking'
  });

  console.log('✅ Comment analytics webhook:', webhook.id);

  // Monitor webhook health
  setInterval(async () => {
    const health = await figma.checkWebhookHealth(webhook.id);
    if (health.status !== 'healthy') {
      console.warn(`⚠️  Analytics webhook health: ${health.message}`);
    }
  }, 300000); // Check every 5 minutes

  return webhook;
}

setupCommentAnalytics('team_analytics_123');
```

## Dev Mode Integration

### 1. Task Management Sync

Sync Dev Mode status changes with project management tools:

```javascript
// dev-mode-sync.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

async function setupDevModeSync(projectIds) {
  const webhooks = [];

  for (const projectId of projectIds) {
    const webhook = await figma.createProjectWebhook({
      projectId: projectId,
      eventType: 'DEV_MODE_STATUS_UPDATE',
      endpoint: 'https://your-pm-tool.com/api/figma-dev-status',
      passcode: process.env.PM_WEBHOOK_SECRET,
      description: `Dev mode sync for ${projectId}`
    });

    webhooks.push(webhook);
    console.log(`✅ Dev mode sync enabled for ${projectId}`);
  }

  return webhooks;
}

setupDevModeSync(['project_app_v2', 'project_dashboard']);
```

## Webhook Servers

### 1. Express.js Webhook Handler

```javascript
// webhook-server.js
import express from 'express';
import { FigmaWebhooksSDK } from 'figma-webhooks';

const app = express();
const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

// Middleware to parse raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Webhook handler
app.post('/webhooks/figma', (req, res) => {
  const signature = req.headers['x-figma-signature'];
  const payload = req.body.toString();

  // Verify signature
  const isValid = figma.verifySignature(
    payload,
    signature,
    process.env.WEBHOOK_PASSCODE
  );

  if (!isValid) {
    console.warn('⚠️  Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);
  console.log(`📨 Received ${event.event_type} event for ${event.file_name}`);

  try {
    // Handle different event types
    switch (event.event_type) {
      case 'FILE_UPDATE':
        handleFileUpdate(event);
        break;
      case 'FILE_COMMENT':
        handleComment(event);
        break;
      case 'LIBRARY_PUBLISH':
        handleLibraryPublish(event);
        break;
      default:
        console.log(`ℹ️  Unhandled event type: ${event.event_type}`);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

function handleFileUpdate(event) {
  console.log(`🎨 File updated: ${event.file_name} (${event.file_key})`);
  // Trigger your build process, send notifications, etc.
}

function handleComment(event) {
  console.log(`💬 New comment on ${event.file_name} by ${event.triggered_by.handle}`);
  // Create Jira issue, send Slack notification, etc.
}

function handleLibraryPublish(event) {
  console.log(`📚 Library published: ${event.file_name}`);
  console.log(`   Components: ${event.created_components.length} created, ${event.modified_components.length} modified`);
  // Update design system, trigger pipeline, etc.
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});
```

### 2. Serverless Webhook Handler (Vercel)

```javascript
// api/webhooks/figma.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

const figma = new FigmaWebhooksSDK(process.env.FIGMA_TOKEN);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-figma-signature'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const isValid = figma.verifySignature(
    payload,
    signature,
    process.env.WEBHOOK_PASSCODE
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  try {
    // Process event
    await processWebhookEvent(event);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

async function processWebhookEvent(event) {
  switch (event.event_type) {
    case 'FILE_UPDATE':
      // Trigger Netlify build
      await fetch(process.env.NETLIFY_BUILD_HOOK, { method: 'POST' });
      break;
    
    case 'FILE_COMMENT':
      // Send to Slack
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New comment on ${event.file_name}: ${event.comment[0].text}`
        })
      });
      break;
  }
}
```

## Advanced Patterns

### 1. Webhook Management Dashboard

```javascript
// webhook-dashboard.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

class WebhookDashboard {
  constructor(apiToken) {
    this.figma = new FigmaWebhooksSDK(apiToken);
    this.webhooks = new Map();
  }

  async loadWebhooks(planId) {
    console.log('🔄 Loading webhooks...');
    const allWebhooks = await this.figma.listAllWebhooks(planId);
    
    allWebhooks.forEach(webhook => {
      this.webhooks.set(webhook.id, webhook);
    });

    console.log(`✅ Loaded ${allWebhooks.length} webhooks`);
    return allWebhooks;
  }

  async getHealthSummary() {
    const summary = {
      total: this.webhooks.size,
      healthy: 0,
      degraded: 0,
      failing: 0,
      unknown: 0
    };

    console.log('🔍 Checking webhook health...');

    for (const [id, webhook] of this.webhooks) {
      try {
        const health = await this.figma.checkWebhookHealth(id);
        summary[health.status]++;
        
        if (health.status !== 'healthy') {
          console.warn(`⚠️  ${webhook.description || id}: ${health.message}`);
        }
      } catch (error) {
        summary.unknown++;
        console.error(`❌ Failed to check health for ${id}:`, error.message);
      }
    }

    return summary;
  }

  async cleanupInactiveWebhooks() {
    console.log('🧹 Finding inactive webhooks...');
    
    const inactive = Array.from(this.webhooks.values())
      .filter(w => w.status === 'PAUSED');

    if (inactive.length === 0) {
      console.log('✅ No inactive webhooks found');
      return;
    }

    console.log(`Found ${inactive.length} inactive webhooks:`);
    inactive.forEach(w => {
      console.log(`  - ${w.description || w.id} (${w.event_type})`);
    });

    // Optionally delete them
    const confirm = process.argv.includes('--confirm-delete');
    if (confirm) {
      const results = await this.figma.deleteBulkWebhooks(
        inactive.map(w => w.id)
      );
      console.log(`🗑️  Deleted ${results.deleted.length} inactive webhooks`);
    } else {
      console.log('ℹ️  Use --confirm-delete flag to actually delete them');
    }
  }

  async generateReport() {
    const health = await this.getHealthSummary();
    
    console.log('\n📊 Webhook Health Report');
    console.log('========================');
    console.log(`Total Webhooks: ${health.total}`);
    console.log(`Healthy: ${health.healthy} (${Math.round(health.healthy / health.total * 100)}%)`);
    console.log(`Degraded: ${health.degraded}`);
    console.log(`Failing: ${health.failing}`);
    console.log(`Unknown: ${health.unknown}`);

    // Group by event type
    const byEventType = {};
    this.webhooks.forEach(webhook => {
      byEventType[webhook.event_type] = (byEventType[webhook.event_type] || 0) + 1;
    });

    console.log('\n📈 Webhooks by Event Type:');
    Object.entries(byEventType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    return { health, byEventType };
  }
}

// Usage
const dashboard = new WebhookDashboard(process.env.FIGMA_TOKEN);

async function main() {
  await dashboard.loadWebhooks(process.env.PLAN_ID);
  await dashboard.generateReport();
  await dashboard.cleanupInactiveWebhooks();
}

main().catch(console.error);
```

### 2. Webhook Testing Framework

```javascript
// webhook-testing.js
import { FigmaWebhooksSDK } from 'figma-webhooks';

class WebhookTester {
  constructor(apiToken) {
    this.figma = new FigmaWebhooksSDK(apiToken);
  }

  async testEndpoint(endpoint) {
    console.log(`🧪 Testing endpoint: ${endpoint}`);
    
    const result = await this.figma.testWebhookEndpoint(endpoint);
    
    if (result.reachable) {
      console.log(`✅ Endpoint reachable (${result.status})`);
      return true;
    } else {
      console.log(`❌ Endpoint not reachable: ${result.error}`);
      return false;
    }
  }

  async createTestWebhook(endpoint) {
    console.log('🎯 Creating test webhook...');
    
    const webhook = await this.figma.createFileWebhook({
      fileKey: 'test_file_key', // Use a test file
      endpoint: endpoint,
      passcode: 'test-passcode',
      description: 'Test webhook - safe to delete',
      active: true
    });

    console.log(`✅ Test webhook created: ${webhook.id}`);
    return webhook;
  }

  async monitorTestWebhook(webhookId, duration = 30000) {
    console.log(`👀 Monitoring webhook ${webhookId} for ${duration}ms...`);
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          const health = await this.figma.checkWebhookHealth(webhookId);
          console.log(`📊 Health: ${health.status} (${health.totalRequests} requests)`);
          
          if (Date.now() - startTime >= duration) {
            clearInterval(checkInterval);
            resolve(health);
          }
        } catch (error) {
          console.error('❌ Health check failed:', error.message);
        }
      }, 5000);
    });
  }

  async runEndToEndTest(endpoint) {
    console.log('🚀 Starting end-to-end webhook test...\n');

    try {
      // Test endpoint reachability
      const reachable = await this.testEndpoint(endpoint);
      if (!reachable) {
        throw new Error('Endpoint not reachable');
      }

      // Create test webhook
      const webhook = await this.createTestWebhook(endpoint);

      // Monitor for events
      const health = await this.monitorTestWebhook(webhook.id);

      // Cleanup
      await this.figma.deleteWebhook(webhook.id);
      console.log('🧹 Test webhook deleted');

      console.log('\n✅ End-to-end test completed successfully!');
      return { success: true, health };

    } catch (error) {
      console.error('\n❌ End-to-end test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Usage
const tester = new WebhookTester(process.env.FIGMA_TOKEN);

// Test your webhook endpoint
await tester.runEndToEndTest('https://your-app.com/webhook');
```

### 3. CLI Automation Scripts

```bash
#!/bin/bash
# scripts/setup-project-webhooks.sh

set -e

PROJECT_ID=$1
ENDPOINT_BASE=$2
WEBHOOK_SECRET=$3

if [ -z "$PROJECT_ID" ] || [ -z "$ENDPOINT_BASE" ] || [ -z "$WEBHOOK_SECRET" ]; then
  echo "Usage: $0 <project-id> <endpoint-base> <webhook-secret>"
  exit 1
fi

echo "🚀 Setting up webhooks for project: $PROJECT_ID"

# Create file update webhook
FILE_UPDATE_ID=$(figma-webhooks create \
  --event FILE_UPDATE \
  --context project \
  --context-id $PROJECT_ID \
  --endpoint "${ENDPOINT_BASE}/file-updates" \
  --passcode $WEBHOOK_SECRET \
  --description "Auto-deploy on file updates" \
  --json | jq -r '.id')

echo "✅ File update webhook: $FILE_UPDATE_ID"

# Create comment webhook  
COMMENT_ID=$(figma-webhooks create \
  --event FILE_COMMENT \
  --context project \
  --context-id $PROJECT_ID \
  --endpoint "${ENDPOINT_BASE}/comments" \
  --passcode $WEBHOOK_SECRET \
  --description "Comment notifications" \
  --json | jq -r '.id')

echo "✅ Comment webhook: $COMMENT_ID"

# Create version webhook
VERSION_ID=$(figma-webhooks create \
  --event FILE_VERSION_UPDATE \
  --context project \
  --context-id $PROJECT_ID \
  --endpoint "${ENDPOINT_BASE}/versions" \
  --passcode $WEBHOOK_SECRET \
  --description "Version tracking" \
  --json | jq -r '.id')

echo "✅ Version webhook: $VERSION_ID"

echo ""
echo "📝 Webhook IDs saved to webhooks.json"
cat > webhooks.json <<EOF
{
  "project_id": "$PROJECT_ID",
  "webhooks": {
    "file_updates": "$FILE_UPDATE_ID",
    "comments": "$COMMENT_ID", 
    "versions": "$VERSION_ID"
  }
}
EOF

echo ""
echo "🎉 Project webhook setup complete!"
echo "Monitor health with: figma-webhooks health <webhook-id>"
```

These examples demonstrate practical, real-world usage patterns for the Figma Webhooks API client. Each example can be adapted to your specific workflow requirements and integrated into your existing development processes.