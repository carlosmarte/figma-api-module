# Figma Comments

A comprehensive Python library for integrating with the Figma Comments API. This library provides a clean, async-first interface for managing comments in Figma files with built-in rate limiting, retries, and error handling.

## Features

- **Async/await support** - Built for modern Python applications
- **Rate limiting** - Token bucket algorithm with configurable limits
- **Automatic retries** - Exponential backoff for transient failures
- **Comprehensive error handling** - Detailed exception types for different API errors
- **Type safety** - Full type hints with Pydantic models
- **CLI tool** - Command-line interface for all operations
- **Export functionality** - Export comments to JSON, CSV, or Markdown
- **Search and filtering** - Find comments by content, user, or date
- **Batch operations** - Bulk delete and create operations
- **Statistics** - Detailed analytics on comment activity

## Installation

### Using pip

```bash
pip install figma-comments
```

### Using Poetry

```bash
poetry add figma-comments
```

### From source

```bash
git clone https://github.com/your-org/figma-comments
cd figma-comments
poetry install
```

## Quick Start

### Environment Setup

Set your Figma API token as an environment variable:

```bash
export FIGMA_TOKEN="your_figma_api_token_here"
```

### Basic Usage

```python
import asyncio
from figma_comments import FigmaCommentsSDK

async def main():
    async with FigmaCommentsSDK() as sdk:
        # List all comments in a file
        comments = await sdk.list_all_comments("your_file_key")
        print(f"Found {len(comments)} comments")
        
        # Add a comment at specific coordinates
        response = await sdk.add_comment_with_coordinates(
            "your_file_key",
            x=100.0,
            y=200.0,
            message="This needs attention!"
        )
        print(f"Created comment: {response.id}")
        
        # Search for comments
        results = await sdk.search_comments("your_file_key", "needs attention")
        print(f"Found {results.total_matches} matching comments")

asyncio.run(main())
```

## SDK Reference

### Core Operations

#### List Comments

```python
# Get all comments in a file
comments = await sdk.list_all_comments(file_key)

# Get only unresolved comments
unresolved = await sdk.get_unresolved_comments(file_key)

# Get comments by specific user
user_comments = await sdk.get_comments_by_user(file_key, "username")
```

#### Create Comments

```python
# Add comment at coordinates
response = await sdk.add_comment_with_coordinates(
    file_key, x=100.0, y=200.0, message="Comment text"
)

# Add comment to specific node
response = await sdk.add_comment_to_node(
    file_key, node_id="123:456", message="Node-specific comment"
)

# Add comment to region within node
response = await sdk.add_comment_to_region(
    file_key,
    node_id="123:456",
    message="Region comment",
    x=10.0, y=20.0, width=100.0, height=50.0
)

# Reply to existing comment
response = await sdk.reply_to_comment(
    file_key, parent_comment_id="comment123", message="Reply text"
)
```

#### Delete Comments

```python
# Delete single comment
success = await sdk.delete_comment(file_key, comment_id)

# Bulk delete comments
result = await sdk.bulk_delete_comments(file_key, [comment_id1, comment_id2])
print(f"Deleted {len(result.successful)} comments")

# Archive all resolved comments
result = await sdk.archive_resolved_comments(file_key)
```

### Search and Analytics

```python
# Search comments
results = await sdk.search_comments(
    file_key, 
    query="bug", 
    case_sensitive=False,
    include_resolved=True
)

# Get comment statistics
stats = await sdk.get_comment_statistics(file_key)
print(f"Resolution rate: {stats.resolution_rate:.1f}%")

# Get recent comment activity
recent_comments = await sdk.get_comment_history(file_key, days=7)
```

### Export Comments

```python
# Export to JSON file
await sdk.export_comments(file_key, format="json", output_path="comments.json")

# Export to CSV
csv_data = await sdk.export_comments(file_key, format="csv")

# Export to Markdown
await sdk.export_comments(file_key, format="md", output_path="comments.md")
```

### Comment Threads

```python
# Get full thread with replies
thread = await sdk.get_comment_thread(file_key, root_comment_id)
print(f"Thread has {thread.total_comments} comments")
print(f"Last activity: {thread.last_activity}")
```

## CLI Usage

The library includes a comprehensive command-line interface:

### List Comments

```bash
# List all comments in table format
figma-comments list FILE_KEY

# List as JSON
figma-comments list FILE_KEY --format json

# Hide resolved comments
figma-comments list FILE_KEY --hide-resolved

# Limit results
figma-comments list FILE_KEY --limit 10
```

### Add Comments

```bash
# Add comment at coordinates
figma-comments add FILE_KEY "This needs work" --x 100 --y 200

# Add comment to specific node
figma-comments add FILE_KEY "Node feedback" --node-id "123:456"

# Reply to comment
figma-comments reply FILE_KEY PARENT_ID "Thanks for the feedback!"
```

### Search and Filter

```bash
# Search comments
figma-comments search FILE_KEY "bug" --case-sensitive

# Get unresolved comments
figma-comments unresolved FILE_KEY

# Export comments
figma-comments export FILE_KEY json --output comments.json
```

### Statistics and Health

```bash
# Get comment statistics
figma-comments stats FILE_KEY

# Check API health
figma-comments health
```

### Delete Comments

```bash
# Delete single comment (with confirmation)
figma-comments delete FILE_KEY COMMENT_ID

# Skip confirmation
figma-comments delete FILE_KEY COMMENT_ID --yes
```

## Error Handling

The library provides detailed exception types for different error scenarios:

```python
from figma_comments import (
    FigmaCommentsError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

try:
    comments = await sdk.list_all_comments("invalid_file_key")
except AuthenticationError:
    print("Invalid API token")
except NotFoundError:
    print("File not found or not accessible")
except RateLimitError as e:
    print(f"Rate limit exceeded, retry after {e.retry_after} seconds")
except ValidationError as e:
    print(f"Invalid request: {e}")
```

## Configuration

### SDK Options

```python
sdk = FigmaCommentsSDK(
    api_token="your_token",  # or set FIGMA_TOKEN env var
    timeout=30.0,           # Request timeout in seconds
    max_retries=3,          # Maximum retry attempts
    rate_limit_capacity=60, # Requests per minute
    rate_limit_refill_rate=1.0,  # Tokens per second
)
```

### Environment Variables

- `FIGMA_TOKEN` - Your Figma API token (required)

## Advanced Usage

### Custom Rate Limiting

```python
# Higher rate limits for team accounts
sdk = FigmaCommentsSDK(
    rate_limit_capacity=120,  # 120 requests per minute
    rate_limit_refill_rate=2.0,  # 2 tokens per second
)
```

### Bulk Operations

```python
# Bulk create comments
from figma_comments.core.models import CreateCommentRequest, Vector

requests = [
    CreateCommentRequest(
        message=f"Comment {i}",
        client_meta=Vector(x=i*10, y=i*10)
    )
    for i in range(10)
]

responses = await sdk.bulk_add_comments(file_key, requests)
print(f"Created {len(responses)} comments")
```

### Working with Comment Positions

```python
# Comments can be positioned in different ways
from figma_comments.core.models import Vector, FrameOffset, Region

# Absolute coordinates
vector_comment = await sdk.add_comment_with_coordinates(
    file_key, x=100, y=200, message="Absolute position"
)

# Relative to a node
node_comment = await sdk.add_comment_to_node(
    file_key, node_id="123:456", message="On this component",
    x=10, y=10  # Offset within the node
)

# Specific region
region_comment = await sdk.add_comment_to_region(
    file_key, node_id="123:456", message="This area needs work",
    x=0, y=0, width=100, height=50
)
```

## Data Models

### Comment Structure

```python
class Comment:
    id: str                    # Unique comment ID
    message: str              # Comment text
    user: User               # Author information
    created_at: datetime     # Creation timestamp
    updated_at: Optional[datetime]  # Last update
    resolved_at: Optional[datetime] # Resolution timestamp
    file_key: str            # Figma file key
    parent_id: Optional[str] # Parent comment for replies
    client_meta: Optional[...] # Position information
    reactions: List[CommentReaction]  # Emoji reactions
    
    # Properties
    is_reply: bool           # True if this is a reply
    is_resolved: bool        # True if resolved
    coordinates: Optional[Vector]  # Position coordinates
    node_id: Optional[str]   # Associated node ID
```

### Comment Statistics

```python
class CommentStatistics:
    total_comments: int
    total_threads: int
    resolved_comments: int
    unresolved_comments: int
    total_reactions: int
    unique_contributors: int
    comments_by_user: Dict[str, int]
    reactions_by_emoji: Dict[str, int]
    resolution_rate: float  # Percentage
```

## Testing

### Running Tests

```bash
# Install development dependencies
poetry install

# Run all tests
pytest

# Run with coverage
pytest --cov=figma_comments

# Run only unit tests
pytest tests/unit/

# Run integration tests (requires FIGMA_TOKEN)
export FIGMA_TOKEN="your_token"
pytest tests/integration/
```

### Writing Tests

```python
import pytest
from figma_comments import FigmaCommentsSDK

@pytest.mark.asyncio
async def test_comment_creation():
    async with FigmaCommentsSDK("test_token") as sdk:
        # Your test code here
        pass
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`pytest`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/figma-comments
cd figma-comments

# Install dependencies
poetry install

# Install pre-commit hooks
pre-commit install

# Run tests
pytest

# Run linting
ruff check .
mypy src/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v0.1.0

- Initial release
- Core comment operations (list, create, delete)
- Search and filtering functionality
- CLI interface
- Export to JSON, CSV, and Markdown
- Comprehensive error handling
- Rate limiting and retries
- Full type safety with Pydantic models

## Support

- **Documentation**: [Link to documentation]
- **Issues**: [GitHub Issues](https://github.com/your-org/figma-comments/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/figma-comments/discussions)

## Related Projects

- [Figma API Documentation](https://www.figma.com/developers/api)
- [Figma Community](https://www.figma.com/community)

---

Made with ❤️ for the Figma community