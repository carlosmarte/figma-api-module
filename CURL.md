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
  -H "X-Figma-Token: $FIGMA_TOKEN"
```

# Get File in Project
```
curl -L \
  -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/FILE_ID"
```

# Get File in Project
```
curl -L \
  -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/FILE_ID/nodes?ids=NODE_ID_1,NODE_ID_2"
```

# Get rendered image (PNG, SVG, or PDF) of node(s)
```
curl -L \
  -H "X-Figma-Token: YOUR_FIGMA_PERSONAL_ACCESS_TOKEN" \
  "https://api.figma.com/v1/images/FILE_ID?ids=NODE_ID&format=png&scale=2"
```

# Get raw file JSON and save to file
```
curl -L \
  -H "X-Figma-Token: YOUR_FIGMA_PERSONAL_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/FILE_ID" \
  -o figma_file.json
```
