"""Unit tests for FigmaCommentsService."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock

from figma_comments.core.service import FigmaCommentsService
from figma_comments.core.models import (
    Comment,
    CommentThread,
    CreateCommentRequest,
    CreateCommentResponse,
    User,
    Vector,
    CommentReaction,
    Emoji,
)
from figma_comments.core.exceptions import (
    CommentNotFoundError,
    FileNotFoundError,
    InvalidCommentError,
)


class TestFigmaCommentsService:
    """Test the Figma Comments service layer."""
    
    @pytest.fixture
    def mock_client(self):
        """Create a mock client."""
        return AsyncMock()
    
    @pytest.fixture
    def service(self, mock_client):
        """Create a service instance with mock client."""
        return FigmaCommentsService(mock_client)
    
    @pytest.mark.asyncio
    async def test_get_file_comments_success(self, service, sample_comments_response):
        """Test successful retrieval of file comments."""
        service.client.get_comments.return_value = sample_comments_response
        
        comments = await service.get_file_comments("test_file_key")
        
        assert len(comments) == 1
        assert isinstance(comments[0], Comment)
        assert comments[0].id == "comment123"
        assert comments[0].message == "This is a test comment"
        assert comments[0].file_key == "test_file_key"
        
        service.client.get_comments.assert_called_once_with("test_file_key", as_md=False)
    
    @pytest.mark.asyncio
    async def test_get_file_comments_with_markdown(self, service, sample_comments_response):
        """Test retrieval of file comments with markdown."""
        service.client.get_comments.return_value = sample_comments_response
        
        await service.get_file_comments("test_file_key", as_markdown=True)
        
        service.client.get_comments.assert_called_once_with("test_file_key", as_md=True)
    
    @pytest.mark.asyncio
    async def test_get_file_comments_file_not_found(self, service):
        """Test file not found error."""
        service.client.get_comments.side_effect = Exception("File not found")
        
        with pytest.raises(FileNotFoundError) as exc_info:
            await service.get_file_comments("nonexistent_file")
        
        assert exc_info.value.file_key == "nonexistent_file"
    
    @pytest.mark.asyncio
    async def test_add_comment_success(self, service, sample_create_comment_response):
        """Test successful comment creation."""
        service.client.create_comment.return_value = sample_create_comment_response
        
        request = CreateCommentRequest(
            message="Test comment",
            client_meta=Vector(x=100.0, y=200.0)
        )
        
        response = await service.add_comment("test_file_key", request)
        
        assert isinstance(response, CreateCommentResponse)
        assert response.id == "new_comment123"
        assert response.message == "New test comment"
        
        service.client.create_comment.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_add_comment_invalid_data(self, service):
        """Test comment creation with invalid data."""
        from figma_comments.core.exceptions import ValidationError
        
        service.client.create_comment.side_effect = ValidationError("Invalid message")
        
        request = CreateCommentRequest(message="")
        
        with pytest.raises(InvalidCommentError):
            await service.add_comment("test_file_key", request)
    
    @pytest.mark.asyncio
    async def test_delete_comment_success(self, service):
        """Test successful comment deletion."""
        service.client.delete_comment.return_value = {}
        
        result = await service.delete_comment("test_file_key", "comment123")
        
        assert result is True
        service.client.delete_comment.assert_called_once_with("test_file_key", "comment123")
    
    @pytest.mark.asyncio
    async def test_delete_comment_not_found(self, service):
        """Test comment deletion when comment not found."""
        service.client.delete_comment.side_effect = Exception("Comment not found")
        
        with pytest.raises(CommentNotFoundError) as exc_info:
            await service.delete_comment("test_file_key", "nonexistent_comment")
        
        assert exc_info.value.comment_id == "nonexistent_comment"
        assert exc_info.value.file_key == "test_file_key"
    
    @pytest.mark.asyncio
    async def test_get_comment_thread(self, service, sample_comment, sample_reply_comment):
        """Test getting a comment thread."""
        # Mock the get_file_comments to return root comment and reply
        service.get_file_comments = AsyncMock(return_value=[sample_comment, sample_reply_comment])
        
        thread = await service.get_comment_thread("test_file_key", "comment123")
        
        assert isinstance(thread, CommentThread)
        assert thread.root_comment.id == "comment123"
        assert len(thread.replies) == 1
        assert thread.replies[0].id == "reply123"
        assert thread.total_comments == 2
    
    @pytest.mark.asyncio
    async def test_get_comment_thread_not_found(self, service):
        """Test getting a thread for non-existent comment."""
        service.get_file_comments = AsyncMock(return_value=[])
        
        with pytest.raises(CommentNotFoundError):
            await service.get_comment_thread("test_file_key", "nonexistent_comment")
    
    @pytest.mark.asyncio
    async def test_reply_to_comment(self, service, sample_create_comment_response):
        """Test replying to a comment."""
        service.add_comment = AsyncMock(return_value=CreateCommentResponse(**sample_create_comment_response))
        
        response = await service.reply_to_comment("test_file_key", "parent123", "This is a reply")
        
        assert isinstance(response, CreateCommentResponse)
        service.add_comment.assert_called_once()
        
        # Verify the request had the correct parent_id
        call_args = service.add_comment.call_args
        request = call_args[0][1]  # Second argument is the CreateCommentRequest
        assert request.comment_id == "parent123"
        assert request.message == "This is a reply"
    
    @pytest.mark.asyncio
    async def test_search_comments(self, service, sample_comment):
        """Test searching comments."""
        # Create test comments
        comment1 = sample_comment
        comment2 = Comment(
            id="comment456",
            message="Another test comment with different content",
            user=sample_comment.user,
            created_at=datetime.now(),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[comment1, comment2])
        
        # Search for "test"
        result = await service.search_comments("test_file_key", "test")
        
        assert result.total_matches == 2
        assert len(result.comments) == 2
        assert result.query == "test"
    
    @pytest.mark.asyncio
    async def test_search_comments_case_sensitive(self, service, sample_comment):
        """Test case-sensitive comment search."""
        comment1 = sample_comment  # Contains "This"
        comment2 = Comment(
            id="comment456",
            message="this is lowercase",
            user=sample_comment.user,
            created_at=datetime.now(),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[comment1, comment2])
        
        # Case-sensitive search for "This"
        result = await service.search_comments("test_file_key", "This", case_sensitive=True)
        
        assert result.total_matches == 1
        assert result.comments[0].id == "comment123"
    
    @pytest.mark.asyncio
    async def test_search_comments_exclude_resolved(self, service, sample_comment):
        """Test excluding resolved comments from search."""
        # Create resolved comment
        resolved_comment = Comment(
            id="resolved123",
            message="This is resolved test comment",
            user=sample_comment.user,
            created_at=datetime.now(),
            resolved_at=datetime.now(),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[sample_comment, resolved_comment])
        
        # Search excluding resolved comments
        result = await service.search_comments(
            "test_file_key", "test", include_resolved=False
        )
        
        assert result.total_matches == 1
        assert result.comments[0].id == "comment123"
    
    @pytest.mark.asyncio
    async def test_get_comments_by_user(self, service, sample_comment):
        """Test getting comments by user."""
        comment2 = Comment(
            id="comment456",
            message="Another comment",
            user=User(id="user456", handle="otheruser"),
            created_at=datetime.now(),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[sample_comment, comment2])
        
        # Search by user ID
        result = await service.get_comments_by_user("test_file_key", "user123")
        
        assert len(result) == 1
        assert result[0].id == "comment123"
        
        # Search by user handle
        result = await service.get_comments_by_user("test_file_key", "testuser")
        
        assert len(result) == 1
        assert result[0].id == "comment123"
    
    @pytest.mark.asyncio
    async def test_get_unresolved_comments(self, service, sample_comment):
        """Test getting unresolved comments."""
        resolved_comment = Comment(
            id="resolved123",
            message="Resolved comment",
            user=sample_comment.user,
            created_at=datetime.now(),
            resolved_at=datetime.now(),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[sample_comment, resolved_comment])
        
        result = await service.get_unresolved_comments("test_file_key")
        
        assert len(result) == 1
        assert result[0].id == "comment123"
        assert not result[0].is_resolved
    
    @pytest.mark.asyncio
    async def test_get_comment_statistics(self, service, sample_comment, sample_reply_comment):
        """Test getting comment statistics."""
        # Create additional test data
        resolved_comment = Comment(
            id="resolved123",
            message="Resolved comment",
            user=User(id="user456", handle="otheruser"),
            created_at=datetime.now(),
            resolved_at=datetime.now(),
            file_key="test_file_key",
            reactions=[
                CommentReaction(
                    emoji=Emoji.HEART,
                    user=sample_comment.user,
                    created_at=datetime.now(),
                )
            ],
        )
        
        comments = [sample_comment, sample_reply_comment, resolved_comment]
        service.get_file_comments = AsyncMock(return_value=comments)
        
        stats = await service.get_comment_statistics("test_file_key")
        
        assert stats.total_comments == 3
        assert stats.total_threads == 1  # One root comment
        assert stats.resolved_comments == 1
        assert stats.unresolved_comments == 2
        assert stats.total_reactions == 2  # One from sample_comment, one from resolved_comment
        assert stats.unique_contributors == 2  # testuser and otheruser
        assert stats.comments_by_user["testuser"] == 2  # sample_comment and sample_reply_comment
        assert stats.comments_by_user["otheruser"] == 1
    
    @pytest.mark.asyncio
    async def test_get_comments_by_date_range(self, service, sample_comment):
        """Test getting comments by date range."""
        # Create comments with different dates
        old_comment = Comment(
            id="old123",
            message="Old comment",
            user=sample_comment.user,
            created_at=datetime(2024, 1, 1, 10, 0, 0),
            file_key="test_file_key",
        )
        
        new_comment = Comment(
            id="new123",
            message="New comment",
            user=sample_comment.user,
            created_at=datetime(2024, 1, 20, 10, 0, 0),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[old_comment, new_comment])
        
        # Get comments from January 10-25, 2024
        start_date = datetime(2024, 1, 10)
        end_date = datetime(2024, 1, 25)
        
        result = await service.get_comments_by_date_range("test_file_key", start_date, end_date)
        
        assert len(result) == 1
        assert result[0].id == "new123"
    
    @pytest.mark.asyncio
    async def test_get_comment_history(self, service, sample_comment):
        """Test getting recent comment history."""
        # Create comments with different ages
        recent_comment = Comment(
            id="recent123",
            message="Recent comment",
            user=sample_comment.user,
            created_at=datetime.now() - timedelta(days=2),
            file_key="test_file_key",
        )
        
        old_comment = Comment(
            id="old123",
            message="Old comment",
            user=sample_comment.user,
            created_at=datetime.now() - timedelta(days=10),
            file_key="test_file_key",
        )
        
        service.get_file_comments = AsyncMock(return_value=[recent_comment, old_comment])
        
        # Get comments from last 7 days
        result = await service.get_comment_history("test_file_key", days=7)
        
        assert len(result) == 1
        assert result[0].id == "recent123"
    
    @pytest.mark.asyncio
    async def test_batch_delete_comments(self, service):
        """Test batch deletion of comments."""
        # Mock individual delete operations
        delete_results = {
            "comment1": None,  # Success
            "comment2": None,  # Success
            "comment3": Exception("Not found"),  # Failure
        }
        
        async def mock_delete(file_key, comment_id):
            if comment_id in delete_results:
                result = delete_results[comment_id]
                if isinstance(result, Exception):
                    raise result
                return True
            return True
        
        service.delete_comment = AsyncMock(side_effect=mock_delete)
        
        result = await service.batch_delete_comments(
            "test_file_key", ["comment1", "comment2", "comment3"]
        )
        
        assert len(result.successful) == 2
        assert len(result.failed) == 1
        assert "comment1" in result.successful
        assert "comment2" in result.successful
        assert "comment3" in result.failed
        assert "comment3" in result.errors
    
    def test_parse_comment_with_vector_meta(self, service):
        """Test parsing comment with Vector client_meta."""
        comment_data = {
            "id": "comment123",
            "message": "Test comment",
            "user": {
                "id": "user123",
                "handle": "testuser",
                "img_url": "https://example.com/avatar.jpg",
                "email": "test@example.com",
            },
            "created_at": "2024-01-15T10:30:00Z",
            "client_meta": {
                "x": 100.0,
                "y": 200.0,
            },
            "reactions": [],
        }
        
        comment = service._parse_comment(comment_data, "test_file_key")
        
        assert isinstance(comment.client_meta, Vector)
        assert comment.client_meta.x == 100.0
        assert comment.client_meta.y == 200.0
        assert comment.coordinates.x == 100.0
        assert comment.coordinates.y == 200.0
    
    def test_parse_comment_with_frame_offset_meta(self, service):
        """Test parsing comment with FrameOffset client_meta."""
        comment_data = {
            "id": "comment123",
            "message": "Test comment",
            "user": {
                "id": "user123",
                "handle": "testuser",
            },
            "created_at": "2024-01-15T10:30:00Z",
            "client_meta": {
                "node_id": "frame123",
                "node_offset": {
                    "x": 50.0,
                    "y": 75.0,
                },
            },
            "reactions": [],
        }
        
        comment = service._parse_comment(comment_data, "test_file_key")
        
        assert comment.node_id == "frame123"
        assert comment.coordinates.x == 50.0
        assert comment.coordinates.y == 75.0