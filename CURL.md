# Example with Proxy
```
curl -X GET "https://api.figma.com/v1/teams/{ID}/projects" \
  -H "X-Figma-Token: $FIGMA_TOKEN"
  --proxy http://proxy.example.com:8080
```

# Get Projects in Team
```
curl -X GET "https://api.figma.com/v1/teams/{ID}/projects" \
  -H "X-Figma-Token: $FIGMA_TOKEN"
```

# Get Files in Project
```
curl -X GET "https://api.figma.com/v1/projects/PROJECT_ID/files" \
  -H "X-Figma-Token: YOUR_FIGMA_TOKEN"
```
