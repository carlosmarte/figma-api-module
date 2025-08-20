# Figma Projects - Usage Examples

This document provides practical examples for using the Figma Projects Python library across different interfaces.

## Table of Contents

- [SDK Examples](#sdk-examples)
- [CLI Examples](#cli-examples)
- [Server Examples](#server-examples)
- [Advanced Use Cases](#advanced-use-cases)

## SDK Examples

### Basic Usage

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def basic_usage():
    """Basic SDK usage example."""
    async with FigmaProjectsSDK("your-figma-token") as sdk:
        # Get team projects
        team_projects = await sdk.get_team_projects("123456789")
        print(f"Team: {team_projects.name}")
        print(f"Projects: {len(team_projects.projects)}")
        
        # Get project files
        if team_projects.projects:
            project = team_projects.projects[0]
            files = await sdk.get_project_files(project.id)
            print(f"Files in '{project.name}': {len(files.files)}")

asyncio.run(basic_usage())
```

### Error Handling

```python
import asyncio
from figma_projects import (
    FigmaProjectsSDK,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError
)

async def error_handling_example():
    """Comprehensive error handling."""
    try:
        async with FigmaProjectsSDK("your-token") as sdk:
            # This might fail for various reasons
            projects = await sdk.get_team_projects("invalid-team-id")
            
    except AuthenticationError:
        print("❌ Authentication failed - check your API token")
        
    except ValidationError as e:
        print(f"❌ Validation error: {e.message}")
        print(f"   Field: {e.context.get('field')}")
        
    except NotFoundError as e:
        print(f"❌ Resource not found: {e.message}")
        
    except RateLimitError as e:
        print(f"⏰ Rate limit exceeded - retry after {e.retry_after} seconds")
        
    except Exception as e:
        print(f"💥 Unexpected error: {e}")

asyncio.run(error_handling_example())
```

### Search and Filtering

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def search_examples():
    """Search and filtering examples."""
    async with FigmaProjectsSDK("your-token") as sdk:
        team_id = "123456789"
        
        # Search projects by name
        design_projects = await sdk.search_projects(team_id, "Design")
        print(f"Found {len(design_projects)} design projects")
        
        # Search files in a specific project
        if design_projects:
            project_id = design_projects[0].id
            component_files = await sdk.search_files_in_project(
                project_id, "component", case_sensitive=False
            )
            
            print(f"Component files found:")
            for result in component_files:
                print(f"  - {result.file.name} (score: {result.match_score})")
        
        # Find a specific file
        file = await sdk.find_file_by_name(project_id, "Design System", exact_match=False)
        if file:
            print(f"Found file: {file.name}")
        else:
            print("File not found")

asyncio.run(search_examples())
```

### Batch Operations

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def batch_operations():
    """Batch processing examples."""
    async with FigmaProjectsSDK("your-token") as sdk:
        # Get multiple projects at once
        project_ids = ["123", "456", "789"]
        results = await sdk.batch_get_projects(project_ids)
        
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]
        
        print(f"✅ Successfully fetched: {len(successful)} projects")
        print(f"❌ Failed to fetch: {len(failed)} projects")
        
        for result in failed:
            print(f"   Project {result.project_id}: {result.error}")

asyncio.run(batch_operations())
```

### Monitoring and Statistics

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def monitoring_example():
    """Monitor API usage and get statistics."""
    async with FigmaProjectsSDK("your-token") as sdk:
        # Check rate limits before making requests
        rate_limit = sdk.get_rate_limit_info()
        print(f"Rate limit: {rate_limit.remaining}/{rate_limit.limit}")
        
        if rate_limit.remaining < 10:
            print("⚠️  Low rate limit remaining!")
        
        # Make some API calls
        await sdk.get_team_projects("123456789")
        
        # Get usage statistics
        stats = sdk.get_client_stats()
        print(f"Requests made: {stats['requests_made']}")
        print(f"Requests failed: {stats['requests_failed']}")
        print(f"Rate limit hits: {stats['rate_limit_hits']}")
        
        # Get project statistics
        project_stats = await sdk.get_project_statistics("987654321")
        print(f"Project: {project_stats.project_name}")
        print(f"Total files: {project_stats.total_files}")
        print(f"Recent files: {project_stats.recent_files}")

asyncio.run(monitoring_example())
```

### Export and Backup

```python
import asyncio
from figma_projects import FigmaProjectsSDK, ExportFormat

async def export_examples():
    """Export project data for backup or analysis."""
    async with FigmaProjectsSDK("your-token") as sdk:
        team_id = "123456789"
        
        # Export as JSON (full data)
        json_data = await sdk.export_project_structure(
            team_id, 
            format=ExportFormat.JSON,
            include_files=True
        )
        
        with open("team_backup.json", "w") as f:
            f.write(json_data)
        print("✅ Exported full data as JSON")
        
        # Export as CSV (summary)
        csv_data = await sdk.export_project_structure(
            team_id,
            format=ExportFormat.CSV,
            include_files=False
        )
        
        with open("team_summary.csv", "w") as f:
            f.write(csv_data)
        print("✅ Exported summary as CSV")

asyncio.run(export_examples())
```

## CLI Examples

### Basic Commands

```bash
# Set your API token
export FIGMA_TOKEN="your-figma-token"

# List all projects in a team
figma-projects list-projects 123456789

# List projects with JSON output
figma-projects list-projects 123456789 --format json

# Save output to file
figma-projects list-projects 123456789 --output team_projects.json
```

### File Operations

```bash
# List files in a project
figma-projects list-files 987654321

# Include branch metadata
figma-projects list-files 987654321 --branch-data

# Get recent files (last 7 days)
figma-projects recent 987654321 --days 7 --limit 5
```

### Search Operations

```bash
# Search projects
figma-projects search 123456789 "Design System"

# Get project tree structure
figma-projects get-tree 123456789 --output project_tree.json

# Get project statistics
figma-projects stats 987654321 --format json
```

### Export Operations

```bash
# Export as JSON
figma-projects export 123456789 --format json --output backup.json

# Export as CSV without file details
figma-projects export 123456789 --format csv --no-files --output summary.csv
```

### Server Management

```bash
# Start server on default port (8000)
figma-projects serve

# Start on custom port with API key
figma-projects serve --port 3000 --api-key "your-token"

# Development mode with auto-reload
figma-projects serve --reload --port 8080

# Check health and rate limits
figma-projects health
```

## Server Examples

### Starting the Server

```bash
# Method 1: Using CLI
figma-projects serve --port 8000

# Method 2: Using uvicorn directly
uvicorn figma_projects.server:app --host 0.0.0.0 --port 8000

# Method 3: Using Python
python -m figma_projects.server
```

### API Usage Examples

#### Using curl

```bash
# Health check (no auth)
curl http://localhost:8000/health

# Get team projects (with header auth)
curl -H "X-Figma-Token: your-token" \
     http://localhost:8000/v1/teams/123456789/projects

# Get project files (with query auth)
curl "http://localhost:8000/v1/projects/987654321/files?token=your-token"

# Search projects
curl -H "X-Figma-Token: your-token" \
     "http://localhost:8000/v1/teams/123456789/projects/search?q=Design"

# Get recent files
curl -H "X-Figma-Token: your-token" \
     "http://localhost:8000/v1/projects/987654321/files/recent?limit=10&days=30"
```

#### Using Python requests

```python
import requests

# Configuration
BASE_URL = "http://localhost:8000"
HEADERS = {"X-Figma-Token": "your-token"}

# Get team projects
response = requests.get(f"{BASE_URL}/v1/teams/123456789/projects", headers=HEADERS)
projects = response.json()
print(f"Found {len(projects['projects'])} projects")

# Get project files
response = requests.get(f"{BASE_URL}/v1/projects/987654321/files", headers=HEADERS)
files = response.json()
print(f"Found {len(files['files'])} files")

# Search projects
params = {"q": "Design System"}
response = requests.get(
    f"{BASE_URL}/v1/teams/123456789/projects/search", 
    headers=HEADERS, 
    params=params
)
search_results = response.json()
print(f"Search found {len(search_results)} projects")
```

#### Using httpx (async)

```python
import asyncio
import httpx

async def api_client_example():
    """Async API client example."""
    headers = {"X-Figma-Token": "your-token"}
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Get team projects
        response = await client.get(
            f"{base_url}/v1/teams/123456789/projects",
            headers=headers
        )
        projects = response.json()
        
        # Get files for each project
        for project in projects["projects"]:
            files_response = await client.get(
                f"{base_url}/v1/projects/{project['id']}/files",
                headers=headers
            )
            files = files_response.json()
            print(f"Project '{project['name']}': {len(files['files'])} files")

asyncio.run(api_client_example())
```

### Batch Operations via API

```python
import requests

# Batch get projects
project_ids = ["123", "456", "789"]
response = requests.post(
    "http://localhost:8000/v1/projects/batch",
    headers={"X-Figma-Token": "your-token"},
    json=project_ids
)

results = response.json()
for result in results:
    if result["success"]:
        print(f"✅ {result['project']['name']}")
    else:
        print(f"❌ {result['project_id']}: {result['error']}")
```

## Advanced Use Cases

### 1. Project Audit and Reporting

```python
import asyncio
from datetime import datetime, timedelta
from figma_projects import FigmaProjectsSDK

async def project_audit():
    """Generate a comprehensive project audit report."""
    async with FigmaProjectsSDK("your-token") as sdk:
        team_id = "123456789"
        
        # Get all projects
        team_projects = await sdk.get_team_projects(team_id)
        print(f"🔍 Auditing {len(team_projects.projects)} projects...")
        
        report = {
            "audit_date": datetime.now().isoformat(),
            "team_name": team_projects.name,
            "total_projects": len(team_projects.projects),
            "projects": []
        }
        
        for project in team_projects.projects:
            try:
                # Get project statistics
                stats = await sdk.get_project_statistics(project.id)
                
                # Get recent files
                recent_files = await sdk.get_recent_files(project.id, limit=5, days=30)
                
                project_report = {
                    "id": project.id,
                    "name": project.name,
                    "total_files": stats.total_files,
                    "recent_files": stats.recent_files,
                    "last_activity": stats.last_activity.isoformat() if stats.last_activity else None,
                    "recent_file_names": [f.name for f in recent_files]
                }
                
                report["projects"].append(project_report)
                print(f"✅ {project.name}: {stats.total_files} files")
                
            except Exception as e:
                print(f"❌ Failed to audit {project.name}: {e}")
        
        # Save report
        import json
        with open(f"audit_report_{datetime.now().strftime('%Y%m%d')}.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"📊 Audit complete! Report saved.")

asyncio.run(project_audit())
```

### 2. Automated Backup System

```python
import asyncio
import os
from datetime import datetime
from figma_projects import FigmaProjectsSDK, ExportFormat

async def automated_backup():
    """Automated backup system with rotation."""
    async with FigmaProjectsSDK("your-token") as sdk:
        team_id = "123456789"
        backup_dir = "figma_backups"
        
        # Create backup directory
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            # Full backup (JSON)
            print("📦 Creating full backup...")
            full_backup = await sdk.export_project_structure(
                team_id, ExportFormat.JSON, include_files=True
            )
            
            full_path = f"{backup_dir}/full_backup_{timestamp}.json"
            with open(full_path, "w") as f:
                f.write(full_backup)
            print(f"✅ Full backup saved: {full_path}")
            
            # Summary backup (CSV)
            print("📋 Creating summary backup...")
            summary_backup = await sdk.export_project_structure(
                team_id, ExportFormat.CSV, include_files=False
            )
            
            summary_path = f"{backup_dir}/summary_{timestamp}.csv"
            with open(summary_path, "w") as f:
                f.write(summary_backup)
            print(f"✅ Summary backup saved: {summary_path}")
            
            # Cleanup old backups (keep last 7 days)
            cleanup_old_backups(backup_dir, days=7)
            
        except Exception as e:
            print(f"❌ Backup failed: {e}")

def cleanup_old_backups(backup_dir: str, days: int = 7):
    """Remove backup files older than specified days."""
    cutoff_time = datetime.now() - timedelta(days=days)
    
    for filename in os.listdir(backup_dir):
        filepath = os.path.join(backup_dir, filename)
        if os.path.isfile(filepath):
            file_time = datetime.fromtimestamp(os.path.getctime(filepath))
            if file_time < cutoff_time:
                os.remove(filepath)
                print(f"🗑️  Removed old backup: {filename}")

asyncio.run(automated_backup())
```

### 3. Project Migration Helper

```python
import asyncio
from figma_projects import FigmaProjectsSDK

async def migration_helper():
    """Help migrate projects between teams."""
    async with FigmaProjectsSDK("your-token") as sdk:
        source_team = "123456789"
        target_team = "987654321"
        
        # Get source team projects
        source_projects = await sdk.get_team_projects(source_team)
        print(f"📂 Source team '{source_projects.name}' has {len(source_projects.projects)} projects")
        
        # Get target team projects for comparison
        target_projects = await sdk.get_team_projects(target_team)
        target_names = {p.name for p in target_projects.projects}
        
        migration_plan = []
        
        for project in source_projects.projects:
            # Get project details
            files = await sdk.get_project_files(project.id)
            
            # Check if project exists in target
            exists_in_target = project.name in target_names
            
            plan_item = {
                "project_id": project.id,
                "project_name": project.name,
                "file_count": len(files.files),
                "exists_in_target": exists_in_target,
                "action": "skip" if exists_in_target else "migrate",
                "files": [{"name": f.name, "key": f.key} for f in files.files]
            }
            
            migration_plan.append(plan_item)
            
            status = "⚠️  EXISTS" if exists_in_target else "✅ MIGRATE"
            print(f"{status} {project.name} ({len(files.files)} files)")
        
        # Save migration plan
        import json
        with open("migration_plan.json", "w") as f:
            json.dump(migration_plan, f, indent=2)
        
        print(f"📋 Migration plan saved to migration_plan.json")

asyncio.run(migration_helper())
```

### 4. Real-time Monitoring Dashboard

```python
import asyncio
import time
from figma_projects import FigmaProjectsSDK

async def monitoring_dashboard():
    """Real-time monitoring dashboard."""
    async with FigmaProjectsSDK("your-token") as sdk:
        print("🖥️  Figma Projects Monitoring Dashboard")
        print("=" * 50)
        
        while True:
            try:
                # Get rate limit info
                rate_limit = sdk.get_rate_limit_info()
                
                # Get client stats
                stats = sdk.get_client_stats()
                
                # Clear screen (simple version)
                print("\033[2J\033[H")
                
                # Display dashboard
                print("🖥️  Figma Projects Monitoring Dashboard")
                print("=" * 50)
                print(f"⏰ Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
                print()
                print("📊 Rate Limits:")
                print(f"   Remaining: {rate_limit.remaining}/{rate_limit.limit}")
                print(f"   Reset at: {rate_limit.reset_at.strftime('%H:%M:%S')}")
                print()
                print("📈 Statistics:")
                print(f"   Requests made: {stats['requests_made']}")
                print(f"   Requests failed: {stats['requests_failed']}")
                print(f"   Rate limit hits: {stats['rate_limit_hits']}")
                print()
                
                # Status indicators
                if rate_limit.remaining < 10:
                    print("🔴 WARNING: Low rate limit remaining!")
                elif rate_limit.remaining < 30:
                    print("🟡 CAUTION: Moderate rate limit usage")
                else:
                    print("🟢 STATUS: Normal operation")
                
                print("\nPress Ctrl+C to exit...")
                
                # Wait before refresh
                await asyncio.sleep(10)
                
            except KeyboardInterrupt:
                print("\n👋 Monitoring stopped")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                await asyncio.sleep(5)

# Run dashboard
asyncio.run(monitoring_dashboard())
```

### 5. Webhook Integration Server

```python
from fastapi import FastAPI, Request
from figma_projects import FigmaProjectsSDK
import asyncio

# Create webhook server
webhook_app = FastAPI(title="Figma Projects Webhook Handler")

@webhook_app.post("/webhook/figma")
async def handle_figma_webhook(request: Request):
    """Handle Figma webhooks and sync project data."""
    payload = await request.json()
    
    # Verify webhook (implement your verification logic)
    event_type = payload.get("event_type")
    
    if event_type == "FILE_UPDATE":
        file_key = payload.get("file_key")
        print(f"🔄 File updated: {file_key}")
        
        # Update your local cache/database
        await sync_file_data(file_key)
    
    return {"status": "ok"}

async def sync_file_data(file_key: str):
    """Sync file data when webhook is received."""
    async with FigmaProjectsSDK("your-token") as sdk:
        # Find which project contains this file
        # This is a simplified example
        print(f"🔄 Syncing data for file {file_key}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(webhook_app, host="0.0.0.0", port=8001)
```

These examples demonstrate the full range of capabilities available in the Figma Projects Python library, from basic usage to advanced automation and monitoring scenarios.