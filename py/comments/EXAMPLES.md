# Figma Comments - Usage Examples

This document provides comprehensive examples of how to use the Figma Comments library for various common use cases.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Comment Management](#comment-management)
- [Search and Filtering](#search-and-filtering)
- [Comment Analytics](#comment-analytics)
- [Export and Reporting](#export-and-reporting)
- [Batch Operations](#batch-operations)
- [Comment Positioning](#comment-positioning)
- [Error Handling](#error-handling)
- [CLI Examples](#cli-examples)
- [Integration Patterns](#integration-patterns)

## Basic Setup

### Simple SDK Usage

```python
import asyncio
from figma_comments import FigmaCommentsSDK

async def main():
    # Initialize SDK with environment token
    async with FigmaCommentsSDK() as sdk:
        file_key = "your_figma_file_key"
        
        # Get all comments
        comments = await sdk.list_all_comments(file_key)
        print(f"Found {len(comments)} comments")

asyncio.run(main())
```

### Custom Configuration

```python
from figma_comments import FigmaCommentsSDK

async def main():
    # Custom configuration for high-traffic applications
    async with FigmaCommentsSDK(
        api_token="your_token_here",
        timeout=60.0,                    # 60 second timeout
        max_retries=5,                   # 5 retry attempts
        rate_limit_capacity=120,         # 120 requests per minute
        rate_limit_refill_rate=2.0,      # 2 tokens per second
    ) as sdk:
        # Your code here
        pass
```

## Comment Management

### Creating Comments

```python
async def create_comments_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # 1. Simple comment without position
        from figma_comments.core.models import CreateCommentRequest
        
        request = CreateCommentRequest(message="Please review this design")
        response = await sdk._service.add_comment(file_key, request)
        print(f"Created comment: {response.id}")
        
        # 2. Comment at specific coordinates
        response = await sdk.add_comment_with_coordinates(
            file_key,
            x=150.0,
            y=300.0,
            message="This button needs to be larger"
        )
        print(f"Created positioned comment: {response.id}")
        
        # 3. Comment attached to a specific node
        response = await sdk.add_comment_to_node(
            file_key,
            node_id="123:456",
            message="Can we use a different color here?",
            x=10.0,  # Offset within the node
            y=10.0
        )
        print(f"Created node comment: {response.id}")
        
        # 4. Comment on a specific region
        response = await sdk.add_comment_to_region(
            file_key,
            node_id="123:456",
            message="This entire section needs work",
            x=0, y=0, width=200, height=100,  # Region coordinates
            offset_x=5, offset_y=5            # Offset within node
        )
        print(f"Created region comment: {response.id}")
```

### Managing Comment Threads

```python
async def comment_threads_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Create a root comment
        root_response = await sdk.add_comment_with_coordinates(
            file_key, x=100, y=100, message="Initial feedback"
        )
        root_id = root_response.id
        
        # Add replies to the thread
        reply1 = await sdk.reply_to_comment(
            file_key, root_id, "I agree with this feedback"
        )
        
        reply2 = await sdk.reply_to_comment(
            file_key, root_id, "Here's an alternative approach..."
        )
        
        # Get the full thread
        thread = await sdk.get_comment_thread(file_key, root_id)
        
        print(f"Thread has {thread.total_comments} comments")
        print(f"Root comment: {thread.root_comment.message}")
        print(f"Replies: {len(thread.replies)}")
        
        for i, reply in enumerate(thread.replies, 1):
            print(f"  Reply {i}: {reply.message} (by {reply.user.handle})")
```

### Deleting Comments

```python
async def delete_comments_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Delete a single comment
        comment_id = "comment_to_delete"
        success = await sdk.delete_comment(file_key, comment_id)
        
        if success:
            print(f"Successfully deleted comment {comment_id}")
        else:
            print(f"Failed to delete comment {comment_id}")
        
        # Bulk delete multiple comments
        comment_ids = ["comment1", "comment2", "comment3"]
        result = await sdk.bulk_delete_comments(file_key, comment_ids)
        
        print(f"Deleted {len(result.successful)} comments successfully")
        print(f"Failed to delete {len(result.failed)} comments")
        
        if result.failed:
            print("Failed deletions:")
            for comment_id in result.failed:
                error = result.errors.get(comment_id, "Unknown error")
                print(f"  {comment_id}: {error}")
```

## Search and Filtering

### Text Search

```python
async def search_comments_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Basic text search
        results = await sdk.search_comments(file_key, "bug")
        print(f"Found {results.total_matches} comments mentioning 'bug'")
        
        # Case-sensitive search
        results = await sdk.search_comments(
            file_key, "TODO", case_sensitive=True
        )
        print(f"Found {results.total_matches} comments with 'TODO'")
        
        # Exclude resolved comments
        results = await sdk.search_comments(
            file_key, "needs work", include_resolved=False
        )
        print(f"Found {results.total_matches} unresolved comments")
        
        # Display search results
        for comment in results.comments:
            status = "✅ Resolved" if comment.is_resolved else "💬 Active"
            print(f"{comment.id}: {comment.message[:50]}... ({status})")
```

### Filter by User

```python
async def filter_by_user_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Get comments by specific user
        user_comments = await sdk.get_comments_by_user(file_key, "designer123")
        
        print(f"Found {len(user_comments)} comments by designer123")
        
        # Group comments by user
        all_comments = await sdk.list_all_comments(file_key)
        comments_by_user = {}
        
        for comment in all_comments:
            user_handle = comment.user.handle
            if user_handle not in comments_by_user:
                comments_by_user[user_handle] = []
            comments_by_user[user_handle].append(comment)
        
        print("\nComments by user:")
        for user, comments in comments_by_user.items():
            print(f"  {user}: {len(comments)} comments")
```

### Filter by Status and Date

```python
async def filter_by_status_date_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Get unresolved comments
        unresolved = await sdk.get_unresolved_comments(file_key)
        print(f"Found {len(unresolved)} unresolved comments")
        
        # Get recent comments (last 7 days)
        recent = await sdk.get_comment_history(file_key, days=7)
        print(f"Found {len(recent)} comments from last 7 days")
        
        # Get comments from specific date range
        from datetime import datetime, timedelta
        
        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now() - timedelta(days=7)
        
        all_comments = await sdk.list_all_comments(file_key)
        date_filtered = [
            comment for comment in all_comments
            if start_date <= comment.created_at.replace(tzinfo=None) <= end_date
        ]
        
        print(f"Found {len(date_filtered)} comments from 7-30 days ago")
```

## Comment Analytics

### Basic Statistics

```python
async def comment_analytics_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Get comprehensive statistics
        stats = await sdk.get_comment_statistics(file_key)
        
        print("📊 Comment Statistics")
        print(f"  Total comments: {stats.total_comments}")
        print(f"  Comment threads: {stats.total_threads}")
        print(f"  Resolved: {stats.resolved_comments}")
        print(f"  Unresolved: {stats.unresolved_comments}")
        print(f"  Resolution rate: {stats.resolution_rate:.1f}%")
        print(f"  Total reactions: {stats.total_reactions}")
        print(f"  Contributors: {stats.unique_contributors}")
        
        # Top contributors
        print("\n👥 Top Contributors:")
        sorted_users = sorted(
            stats.comments_by_user.items(),
            key=lambda x: x[1],
            reverse=True
        )
        for i, (user, count) in enumerate(sorted_users[:5], 1):
            print(f"  {i}. {user}: {count} comments")
        
        # Popular reactions
        if stats.reactions_by_emoji:
            print("\n😀 Popular Reactions:")
            sorted_reactions = sorted(
                stats.reactions_by_emoji.items(),
                key=lambda x: x[1],
                reverse=True
            )
            for emoji, count in sorted_reactions:
                print(f"  {emoji}: {count}")
```

### Advanced Analytics

```python
async def advanced_analytics_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        comments = await sdk.list_all_comments(file_key)
        
        # Comment activity by day of week
        from collections import defaultdict
        import calendar
        
        by_weekday = defaultdict(int)
        for comment in comments:
            weekday = comment.created_at.weekday()
            by_weekday[calendar.day_name[weekday]] += 1
        
        print("📅 Comments by Day of Week:")
        for day, count in by_weekday.items():
            print(f"  {day}: {count}")
        
        # Average response time for threads
        threads_response_times = []
        
        for comment in comments:
            if not comment.is_reply:  # Root comment
                # Find replies to this comment
                replies = [c for c in comments if c.parent_id == comment.id]
                if replies:
                    first_reply = min(replies, key=lambda r: r.created_at)
                    response_time = (first_reply.created_at - comment.created_at).total_seconds() / 3600
                    threads_response_times.append(response_time)
        
        if threads_response_times:
            avg_response_time = sum(threads_response_times) / len(threads_response_times)
            print(f"\n⏱️  Average response time: {avg_response_time:.1f} hours")
        
        # Comments needing attention (old unresolved)
        from datetime import datetime, timedelta
        
        old_threshold = datetime.now() - timedelta(days=7)
        old_unresolved = [
            comment for comment in comments
            if not comment.is_resolved
            and comment.created_at.replace(tzinfo=None) < old_threshold
        ]
        
        print(f"\n⚠️  Old unresolved comments: {len(old_unresolved)}")
```

## Export and Reporting

### Export to Different Formats

```python
async def export_examples():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Export to JSON
        json_path = await sdk.export_comments(
            file_key, 
            format="json", 
            output_path="comments.json"
        )
        print(f"Exported to JSON: {json_path}")
        
        # Export to CSV
        csv_data = await sdk.export_comments(file_key, format="csv")
        print(f"CSV data length: {len(csv_data)} characters")
        
        # Export to Markdown
        md_path = await sdk.export_comments(
            file_key,
            format="md",
            output_path="comments_report.md"
        )
        print(f"Exported to Markdown: {md_path}")
        
        # Get data without saving to file
        json_data = await sdk.export_comments(file_key, format="json")
        import json
        parsed_data = json.loads(json_data)
        print(f"Parsed {len(parsed_data)} comments from JSON")
```

### Custom Reports

```python
async def custom_report_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        comments = await sdk.list_all_comments(file_key)
        stats = await sdk.get_comment_statistics(file_key)
        
        # Generate HTML report
        html_report = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comment Report - {file_key}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ background: #f5f5f5; padding: 20px; border-radius: 5px; }}
                .stats {{ display: flex; gap: 20px; margin: 20px 0; }}
                .stat-box {{ background: #e8f4fd; padding: 15px; border-radius: 5px; }}
                .comment {{ border-left: 3px solid #0066cc; margin: 10px 0; padding: 10px; }}
                .resolved {{ border-left-color: #28a745; }}
                .old {{ border-left-color: #dc3545; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Figma Comments Report</h1>
                <p>File: {file_key}</p>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <h3>Total Comments</h3>
                    <p style="font-size: 24px; margin: 0;">{stats.total_comments}</p>
                </div>
                <div class="stat-box">
                    <h3>Resolution Rate</h3>
                    <p style="font-size: 24px; margin: 0;">{stats.resolution_rate:.1f}%</p>
                </div>
                <div class="stat-box">
                    <h3>Contributors</h3>
                    <p style="font-size: 24px; margin: 0;">{stats.unique_contributors}</p>
                </div>
            </div>
            
            <h2>Recent Unresolved Comments</h2>
        """
        
        # Add unresolved comments
        unresolved = [c for c in comments if not c.is_resolved]
        for comment in unresolved[:10]:  # Show first 10
            age_days = (datetime.now() - comment.created_at.replace(tzinfo=None)).days
            css_class = "comment old" if age_days > 7 else "comment"
            
            html_report += f"""
            <div class="{css_class}">
                <strong>{comment.user.handle}</strong> - {age_days} days ago<br>
                {comment.message[:200]}{'...' if len(comment.message) > 200 else ''}
            </div>
            """
        
        html_report += """
        </body>
        </html>
        """
        
        # Save report
        with open("comment_report.html", "w", encoding="utf-8") as f:
            f.write(html_report)
        
        print("Generated HTML report: comment_report.html")
```

## Batch Operations

### Bulk Comment Creation

```python
async def bulk_create_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        from figma_comments.core.models import CreateCommentRequest, Vector
        
        # Create multiple comments at once
        comment_requests = []
        
        # Design review checklist
        checklist_items = [
            ("Accessibility", 100, 100),
            ("Mobile responsiveness", 200, 100),
            ("Brand consistency", 300, 100),
            ("User experience", 400, 100),
            ("Performance", 500, 100),
        ]
        
        for item, x, y in checklist_items:
            request = CreateCommentRequest(
                message=f"Please review: {item}",
                client_meta=Vector(x=x, y=y)
            )
            comment_requests.append(request)
        
        # Bulk create
        responses = await sdk.bulk_add_comments(file_key, comment_requests)
        
        print(f"Created {len(responses)} review comments")
        for response in responses:
            print(f"  - {response.id}: {response.message}")
```

### Cleanup Operations

```python
async def cleanup_operations_example():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Archive all resolved comments
        print("Archiving resolved comments...")
        archive_result = await sdk.archive_resolved_comments(file_key)
        
        print(f"Archived {len(archive_result.successful)} resolved comments")
        if archive_result.failed:
            print(f"Failed to archive {len(archive_result.failed)} comments")
        
        # Clean up old comments by specific user
        old_comments = await sdk.get_comment_history(file_key, days=90)
        bot_comments = [
            comment.id for comment in old_comments
            if comment.user.handle == "automation-bot"
        ]
        
        if bot_comments:
            cleanup_result = await sdk.bulk_delete_comments(file_key, bot_comments)
            print(f"Cleaned up {len(cleanup_result.successful)} old bot comments")
        
        # Find and handle duplicate comments
        all_comments = await sdk.list_all_comments(file_key)
        seen_messages = {}
        duplicates = []
        
        for comment in all_comments:
            message_key = (comment.message.strip().lower(), comment.user.id)
            if message_key in seen_messages:
                duplicates.append(comment.id)
            else:
                seen_messages[message_key] = comment.id
        
        if duplicates:
            print(f"Found {len(duplicates)} potential duplicate comments")
            # Optionally delete them
            # duplicate_result = await sdk.bulk_delete_comments(file_key, duplicates)
```

## Comment Positioning

### Working with Coordinates

```python
async def positioning_examples():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Get all comments and analyze their positions
        comments = await sdk.list_all_comments(file_key)
        
        positioned_comments = [c for c in comments if c.coordinates]
        
        print(f"Found {len(positioned_comments)} positioned comments")
        
        # Find comments in specific regions
        top_left_comments = [
            c for c in positioned_comments
            if c.coordinates.x < 100 and c.coordinates.y < 100
        ]
        
        print(f"Comments in top-left quadrant: {len(top_left_comments)}")
        
        # Group comments by approximate location
        location_groups = {
            "top-left": [],
            "top-right": [],
            "bottom-left": [],
            "bottom-right": [],
            "center": []
        }
        
        for comment in positioned_comments:
            x, y = comment.coordinates.x, comment.coordinates.y
            
            if x < 200:
                if y < 200:
                    location_groups["top-left"].append(comment)
                else:
                    location_groups["bottom-left"].append(comment)
            elif x > 600:
                if y < 200:
                    location_groups["top-right"].append(comment)
                else:
                    location_groups["bottom-right"].append(comment)
            else:
                location_groups["center"].append(comment)
        
        print("\nComments by region:")
        for region, region_comments in location_groups.items():
            print(f"  {region}: {len(region_comments)} comments")
        
        # Find node-attached comments
        node_comments = [c for c in comments if c.node_id]
        print(f"\nNode-attached comments: {len(node_comments)}")
        
        # Group by node
        by_node = {}
        for comment in node_comments:
            node_id = comment.node_id
            if node_id not in by_node:
                by_node[node_id] = []
            by_node[node_id].append(comment)
        
        print("Comments by node:")
        for node_id, node_comments in by_node.items():
            print(f"  {node_id}: {len(node_comments)} comments")
```

### Creating Positioned Comments

```python
async def create_positioned_comments():
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Add comments at specific design review points
        review_points = [
            {
                "type": "coordinate",
                "x": 100, "y": 50,
                "message": "Logo placement looks good"
            },
            {
                "type": "node",
                "node_id": "123:456",
                "x": 10, "y": 10,
                "message": "Button text should be more prominent"
            },
            {
                "type": "region",
                "node_id": "789:012",
                "x": 0, "y": 0, "width": 200, "height": 100,
                "offset_x": 5, "offset_y": 5,
                "message": "This entire section needs better spacing"
            }
        ]
        
        for point in review_points:
            if point["type"] == "coordinate":
                response = await sdk.add_comment_with_coordinates(
                    file_key, point["x"], point["y"], point["message"]
                )
            elif point["type"] == "node":
                response = await sdk.add_comment_to_node(
                    file_key, point["node_id"], point["message"],
                    x=point["x"], y=point["y"]
                )
            elif point["type"] == "region":
                response = await sdk.add_comment_to_region(
                    file_key, point["node_id"], point["message"],
                    x=point["x"], y=point["y"],
                    width=point["width"], height=point["height"],
                    offset_x=point["offset_x"], offset_y=point["offset_y"]
                )
            
            print(f"Created {point['type']} comment: {response.id}")
```

## Error Handling

### Comprehensive Error Handling

```python
async def error_handling_example():
    from figma_comments import (
        FigmaCommentsSDK,
        AuthenticationError,
        AuthorizationError,
        NotFoundError,
        RateLimitError,
        ValidationError,
        NetworkError,
        TimeoutError,
    )
    
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        try:
            comments = await sdk.list_all_comments(file_key)
            print(f"Successfully retrieved {len(comments)} comments")
            
        except AuthenticationError:
            print("❌ Authentication failed - check your API token")
            
        except AuthorizationError:
            print("❌ Access denied - insufficient permissions for this file")
            
        except NotFoundError:
            print("❌ File not found - check the file key")
            
        except RateLimitError as e:
            print(f"❌ Rate limit exceeded - retry after {e.retry_after} seconds")
            
        except ValidationError as e:
            print(f"❌ Invalid request: {e}")
            if hasattr(e, 'field_errors'):
                for field, error in e.field_errors.items():
                    print(f"  {field}: {error}")
                    
        except NetworkError as e:
            print(f"❌ Network error: {e}")
            
        except TimeoutError as e:
            print(f"❌ Request timeout: {e}")
            
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
```

### Retry Logic for Failures

```python
async def retry_with_backoff():
    import asyncio
    from figma_comments import FigmaCommentsSDK, RateLimitError, NetworkError
    
    async def with_retry(func, max_retries=3):
        """Execute function with exponential backoff retry."""
        for attempt in range(max_retries):
            try:
                return await func()
            except (RateLimitError, NetworkError) as e:
                if attempt == max_retries - 1:
                    raise
                
                wait_time = 2 ** attempt  # Exponential backoff
                if isinstance(e, RateLimitError) and e.retry_after:
                    wait_time = max(wait_time, e.retry_after)
                
                print(f"Attempt {attempt + 1} failed, retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
    
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Use retry wrapper for operations that might fail
        comments = await with_retry(
            lambda: sdk.list_all_comments(file_key)
        )
        
        print(f"Retrieved {len(comments)} comments with retry logic")
```

## CLI Examples

### Basic CLI Operations

```bash
# Set your API token
export FIGMA_TOKEN="your_figma_api_token"

# List all comments
figma-comments list abc123def456

# List in JSON format
figma-comments list abc123def456 --format json

# List only unresolved comments
figma-comments list abc123def456 --hide-resolved

# Add a comment
figma-comments add abc123def456 "This needs work" --x 100 --y 200

# Reply to a comment
figma-comments reply abc123def456 comment_id "Thanks for the feedback!"

# Search comments
figma-comments search abc123def456 "bug" --case-sensitive

# Export comments
figma-comments export abc123def456 json --output comments.json

# Get statistics
figma-comments stats abc123def456

# Check API health
figma-comments health
```

### CLI Automation Scripts

```bash
#!/bin/bash
# Automated comment review script

FILE_KEY="abc123def456"

echo "🔍 Starting comment review for $FILE_KEY"

# Check unresolved comments
echo "📝 Checking unresolved comments..."
UNRESOLVED=$(figma-comments unresolved $FILE_KEY --format json | jq length)
echo "Found $UNRESOLVED unresolved comments"

# Generate statistics
echo "📊 Generating statistics..."
figma-comments stats $FILE_KEY

# Export recent comments for review
echo "💾 Exporting comments..."
figma-comments export $FILE_KEY md --output daily_review.md

# Search for urgent items
echo "🚨 Checking for urgent items..."
figma-comments search $FILE_KEY "urgent" --exclude-resolved

echo "✅ Review complete!"
```

### PowerShell Scripts

```powershell
# PowerShell script for Windows users

$FileKey = "abc123def456"
$env:FIGMA_TOKEN = "your_token_here"

Write-Host "🔍 Starting comment analysis for $FileKey" -ForegroundColor Green

# Get comment statistics
$stats = figma-comments stats $FileKey | ConvertFrom-Json

Write-Host "📊 Comment Statistics:" -ForegroundColor Blue
Write-Host "  Total: $($stats.total_comments)"
Write-Host "  Resolved: $($stats.resolved_comments)"
Write-Host "  Unresolved: $($stats.unresolved_comments)"
Write-Host "  Resolution Rate: $($stats.resolution_rate)%"

# Check for old unresolved comments
$unresolved = figma-comments unresolved $FileKey --format json | ConvertFrom-Json

$oldComments = $unresolved | Where-Object {
    (Get-Date) - [DateTime]$_.created_at -gt [TimeSpan]::FromDays(7)
}

if ($oldComments.Count -gt 0) {
    Write-Host "⚠️  Found $($oldComments.Count) old unresolved comments" -ForegroundColor Yellow
}

Write-Host "✅ Analysis complete!" -ForegroundColor Green
```

## Integration Patterns

### GitHub Actions Integration

```yaml
# .github/workflows/figma-comments.yml
name: Figma Comments Review

on:
  schedule:
    - cron: '0 9 * * MON'  # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  comment-review:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        pip install figma-comments
    
    - name: Generate comment report
      env:
        FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
      run: |
        figma-comments stats ${{ vars.FIGMA_FILE_KEY }} > comment-stats.txt
        figma-comments unresolved ${{ vars.FIGMA_FILE_KEY }} --format json > unresolved.json
        figma-comments export ${{ vars.FIGMA_FILE_KEY }} md --output weekly-report.md
    
    - name: Create Issue for Old Comments
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const unresolved = JSON.parse(fs.readFileSync('unresolved.json', 'utf8'));
          
          const oldComments = unresolved.filter(comment => {
            const created = new Date(comment.created_at);
            const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff > 7;
          });
          
          if (oldComments.length > 0) {
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Weekly Review: ${oldComments.length} Old Unresolved Figma Comments`,
              body: `Found ${oldComments.length} comments older than 7 days that need attention.`
            });
          }
```

### Slack Integration

```python
async def slack_integration_example():
    """Send daily comment summary to Slack."""
    import json
    import httpx
    from figma_comments import FigmaCommentsSDK
    
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        
        # Get statistics
        stats = await sdk.get_comment_statistics(file_key)
        unresolved = await sdk.get_unresolved_comments(file_key)
        
        # Find urgent comments (containing specific keywords)
        urgent_keywords = ["urgent", "critical", "blocking", "asap"]
        urgent_comments = []
        
        for comment in unresolved:
            if any(keyword in comment.message.lower() for keyword in urgent_keywords):
                urgent_comments.append(comment)
        
        # Create Slack message
        slack_message = {
            "text": "Daily Figma Comments Summary",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "📝 Daily Figma Comments Summary"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Total Comments:* {stats.total_comments}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Unresolved:* {stats.unresolved_comments}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Resolution Rate:* {stats.resolution_rate:.1f}%"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Contributors:* {stats.unique_contributors}"
                        }
                    ]
                }
            ]
        }
        
        # Add urgent comments section if any
        if urgent_comments:
            urgent_section = {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"🚨 *{len(urgent_comments)} Urgent Comments Need Attention:*"
                }
            }
            slack_message["blocks"].append(urgent_section)
            
            for comment in urgent_comments[:3]:  # Show first 3
                comment_section = {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"• {comment.message[:100]}... (by {comment.user.handle})"
                    }
                }
                slack_message["blocks"].append(comment_section)
        
        # Send to Slack
        webhook_url = "YOUR_SLACK_WEBHOOK_URL"
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=slack_message)
            
            if response.status_code == 200:
                print("✅ Slack notification sent successfully")
            else:
                print(f"❌ Failed to send Slack notification: {response.status_code}")
```

### Database Storage

```python
async def database_storage_example():
    """Store comments in a database for historical tracking."""
    import sqlite3
    from datetime import datetime
    from figma_comments import FigmaCommentsSDK
    
    # Setup database
    conn = sqlite3.connect('figma_comments.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            file_key TEXT,
            message TEXT,
            user_handle TEXT,
            user_email TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            resolved_at TIMESTAMP,
            parent_id TEXT,
            node_id TEXT,
            x REAL,
            y REAL,
            last_synced TIMESTAMP
        )
    ''')
    
    async with FigmaCommentsSDK() as sdk:
        file_key = "abc123def456"
        comments = await sdk.list_all_comments(file_key)
        
        for comment in comments:
            # Insert or update comment
            cursor.execute('''
                INSERT OR REPLACE INTO comments 
                (id, file_key, message, user_handle, user_email, created_at, 
                 updated_at, resolved_at, parent_id, node_id, x, y, last_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                comment.id,
                comment.file_key,
                comment.message,
                comment.user.handle,
                comment.user.email,
                comment.created_at,
                comment.updated_at,
                comment.resolved_at,
                comment.parent_id,
                comment.node_id,
                comment.coordinates.x if comment.coordinates else None,
                comment.coordinates.y if comment.coordinates else None,
                datetime.now()
            ))
        
        conn.commit()
        print(f"💾 Stored {len(comments)} comments in database")
    
    conn.close()
```

This comprehensive examples document should help users understand how to effectively use the Figma Comments library for various use cases, from basic comment management to advanced integration patterns.