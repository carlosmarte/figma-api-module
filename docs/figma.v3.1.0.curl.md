# Figma API CURL Examples

**Base URL:** `https://api.figma.com`

## Authentication Headers

All requests require authentication via Personal Access Token:
```bash
-H "X-Figma-Token: YOUR_FIGMA_TOKEN"
```

For proxy usage, include proxy configuration:
```bash
-x http://proxy.example.com:8080
-U proxy_user:proxy_pass
```

---

## Files Endpoints

### Get File JSON
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get File Nodes
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/nodes?ids=0:1,1:2" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Render Images
```bash
curl -X GET "https://api.figma.com/v1/images/FILE_KEY?ids=0:1&scale=2&format=png" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Image Fills
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/images" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get File Metadata
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/meta" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get File Versions
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/versions" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Projects Endpoints

### Get Team Projects
```bash
curl -X GET "https://api.figma.com/v1/teams/TEAM_ID/projects" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Project Files
```bash
curl -X GET "https://api.figma.com/v1/projects/PROJECT_ID/files?branch_data=true" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Comments Endpoints

### Get File Comments
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/comments" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Add Comment
```bash
curl -X POST "https://api.figma.com/v1/files/FILE_KEY/comments" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "message": "This is a comment",
    "client_meta": {
      "x": 100,
      "y": 200,
      "node_id": "0:1"
    }
  }'
```

### Delete Comment
```bash
curl -X DELETE "https://api.figma.com/v1/files/FILE_KEY/comments/COMMENT_ID" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Comment Reactions Endpoints

### Get Comment Reactions
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/comments/COMMENT_ID/reactions" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Add Reaction
```bash
curl -X POST "https://api.figma.com/v1/files/FILE_KEY/comments/COMMENT_ID/reactions" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "emoji": "👍"
  }'
```

### Delete Reaction
```bash
curl -X DELETE "https://api.figma.com/v1/files/FILE_KEY/comments/COMMENT_ID/reactions?emoji=👍" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Users Endpoints

### Get Current User
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Components Endpoints

### Get Team Components
```bash
curl -X GET "https://api.figma.com/v1/teams/TEAM_ID/components?page_size=50" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get File Components
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/components" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Component
```bash
curl -X GET "https://api.figma.com/v1/components/COMPONENT_KEY" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Component Sets Endpoints

### Get Team Component Sets
```bash
curl -X GET "https://api.figma.com/v1/teams/TEAM_ID/component_sets?page_size=50" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get File Component Sets
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/component_sets" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Component Set
```bash
curl -X GET "https://api.figma.com/v1/component_sets/COMPONENT_SET_KEY" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Styles Endpoints

### Get Team Styles
```bash
curl -X GET "https://api.figma.com/v1/teams/TEAM_ID/styles?page_size=50" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get File Styles
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/styles" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Style
```bash
curl -X GET "https://api.figma.com/v1/styles/STYLE_KEY" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Webhooks Endpoints

### Get Webhooks
```bash
curl -X GET "https://api.figma.com/v2/webhooks?team_id=TEAM_ID" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Create Webhook
```bash
curl -X POST "https://api.figma.com/v2/webhooks" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "event_type": "FILE_UPDATE",
    "team_id": "TEAM_ID",
    "endpoint": "https://your-endpoint.com/webhook",
    "description": "File update webhook"
  }'
```

### Get Webhook
```bash
curl -X GET "https://api.figma.com/v2/webhooks/WEBHOOK_ID" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Update Webhook
```bash
curl -X PUT "https://api.figma.com/v2/webhooks/WEBHOOK_ID" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "event_type": "FILE_UPDATE",
    "endpoint": "https://your-new-endpoint.com/webhook",
    "description": "Updated webhook"
  }'
```

### Delete Webhook
```bash
curl -X DELETE "https://api.figma.com/v2/webhooks/WEBHOOK_ID" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Webhook Requests
```bash
curl -X GET "https://api.figma.com/v2/webhooks/WEBHOOK_ID/requests" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Activity Logs Endpoints

### Get Activity Logs (Organization OAuth2 Required)
```bash
curl -X GET "https://api.figma.com/v1/activity_logs?start_time=2024-01-01T00:00:00Z&end_time=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Payments Endpoints

### Get Payments
```bash
curl -X GET "https://api.figma.com/v1/payments" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Variables Endpoints (Enterprise Only)

### Get Local Variables
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/variables/local" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Published Variables
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/variables/published" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Create/Modify/Delete Variables
```bash
curl -X POST "https://api.figma.com/v1/files/FILE_KEY/variables" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "variableCollections": [],
    "variableModes": [],
    "variables": [],
    "variableModeValues": []
  }'
```

---

## Dev Resources Endpoints

### Get Dev Resources
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY/dev_resources" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Create Dev Resources
```bash
curl -X POST "https://api.figma.com/v1/dev_resources" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "dev_resources": [{
      "file_key": "FILE_KEY",
      "node_id": "0:1",
      "url": "https://github.com/example/repo",
      "name": "Component Implementation"
    }]
  }'
```

### Update Dev Resources
```bash
curl -X PUT "https://api.figma.com/v1/dev_resources" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -H "Content-Type: application/json" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -d '{
    "dev_resources": [{
      "id": "DEV_RESOURCE_ID",
      "url": "https://github.com/example/new-repo",
      "name": "Updated Implementation"
    }]
  }'
```

### Delete Dev Resource
```bash
curl -X DELETE "https://api.figma.com/v1/files/FILE_KEY/dev_resources/DEV_RESOURCE_ID" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Library Analytics Endpoints

### Get Component Action Data
```bash
curl -X GET "https://api.figma.com/v1/analytics/libraries/FILE_KEY/component/actions?start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Component Usage Data
```bash
curl -X GET "https://api.figma.com/v1/analytics/libraries/FILE_KEY/component/usages?start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Style Action Data
```bash
curl -X GET "https://api.figma.com/v1/analytics/libraries/FILE_KEY/style/actions?start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Style Usage Data
```bash
curl -X GET "https://api.figma.com/v1/analytics/libraries/FILE_KEY/style/usages?start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Variable Action Data
```bash
curl -X GET "https://api.figma.com/v1/analytics/libraries/FILE_KEY/variable/actions?start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### Get Variable Usage Data
```bash
curl -X GET "https://api.figma.com/v1/analytics/libraries/FILE_KEY/variable/usages?start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

---

## Proxy Configuration Options

### HTTP Proxy with Authentication
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass
```

### HTTPS Proxy
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x https://proxy.example.com:8443 \
  --proxy-cacert /path/to/proxy-ca.pem
```

### SOCKS5 Proxy
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x socks5://proxy.example.com:1080 \
  -U proxy_user:proxy_pass
```

### Environment Variable Configuration
```bash
export https_proxy=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN"
```

### Bypass Proxy for Specific Domains
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  --noproxy "internal.domain.com"
```

---

## Response Handling Examples

### Pretty Print JSON Response
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  | jq '.'
```

### Save Response to File
```bash
curl -X GET "https://api.figma.com/v1/files/FILE_KEY" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -o file_data.json
```

### Show Response Headers
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -i
```

### Verbose Output for Debugging
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -v
```

---

## Error Handling

### Check Rate Limiting
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  -w "\nHTTP Status: %{http_code}\n"
```

### Handle Authentication Errors
```bash
curl -X GET "https://api.figma.com/v1/me" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN" \
  -x http://proxy.example.com:8080 \
  -U proxy_user:proxy_pass \
  --fail-with-body
```

---

## Notes

- Replace `YOUR_FIGMA_TOKEN` with your actual Figma Personal Access Token
- Replace `FILE_KEY`, `TEAM_ID`, `PROJECT_ID`, etc. with actual values
- Replace proxy URLs and credentials with your actual proxy configuration
- All endpoints support rate limiting (429 status code)
- Enterprise features require appropriate organization membership
- OAuth2 endpoints require Bearer token instead of X-Figma-Token

---

_Generated from Figma OpenAPI v3.1.0 specification_