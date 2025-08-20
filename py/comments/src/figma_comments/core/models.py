"""Pydantic models for Figma Comments API data structures."""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Union, Dict, Any

from pydantic import BaseModel, Field, ConfigDict, validator


class Emoji(str, Enum):
    """Supported emoji reactions for comments."""
    THUMBS_UP = "👍"
    THUMBS_DOWN = "👎"
    HEART = "❤️"
    LAUGH = "😂"
    CONFUSED = "😕"
    HOORAY = "🎉"
    EYES = "👀"
    ROCKET = "🚀"


class Vector(BaseModel):
    """Represents a 2D point with x and y coordinates."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    x: float = Field(..., description="X coordinate position")
    y: float = Field(..., description="Y coordinate position")


class Region(BaseModel):
    """Represents a rectangular region."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    x: float = Field(..., description="X coordinate of the region")
    y: float = Field(..., description="Y coordinate of the region") 
    width: float = Field(..., description="Width of the region")
    height: float = Field(..., description="Height of the region")


class FrameOffset(BaseModel):
    """Represents a position within a frame."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    node_id: str = Field(..., description="ID of the frame node")
    node_offset: Vector = Field(..., description="Offset position within the frame")


class FrameOffsetRegion(BaseModel):
    """Represents a rectangular region within a frame."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    node_id: str = Field(..., description="ID of the frame node") 
    node_offset: Vector = Field(..., description="Offset position within the frame")
    region: Region = Field(..., description="Rectangular region")


class User(BaseModel):
    """Represents a Figma user."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    id: str = Field(..., description="Unique user identifier")
    handle: str = Field(..., description="User handle/username")
    img_url: Optional[str] = Field(None, description="User profile image URL")
    email: Optional[str] = Field(None, description="User email address")


class CommentReaction(BaseModel):
    """Represents a reaction to a comment."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    emoji: Emoji = Field(..., description="The emoji reaction")
    user: User = Field(..., description="User who reacted")
    created_at: datetime = Field(..., description="When the reaction was created")


class Comment(BaseModel):
    """Represents a Figma comment."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    id: str = Field(..., description="Unique comment identifier")
    message: str = Field(..., description="Comment text content")
    user: User = Field(..., description="User who created the comment")
    created_at: datetime = Field(..., description="When the comment was created")
    updated_at: Optional[datetime] = Field(None, description="When the comment was last updated")
    resolved_at: Optional[datetime] = Field(None, description="When the comment was resolved")
    file_key: str = Field(..., description="Figma file key this comment belongs to")
    parent_id: Optional[str] = Field(None, description="Parent comment ID if this is a reply")
    order_id: Optional[str] = Field(None, description="Order ID for comment threading")
    client_meta: Optional[Union[Vector, FrameOffset, Region, FrameOffsetRegion]] = Field(
        None, description="Position metadata for the comment"
    )
    reactions: List[CommentReaction] = Field(
        default_factory=list, description="Reactions to this comment"
    )
    
    @property
    def is_reply(self) -> bool:
        """Check if this comment is a reply to another comment."""
        return self.parent_id is not None
    
    @property
    def is_resolved(self) -> bool:
        """Check if this comment is resolved."""
        return self.resolved_at is not None
    
    @property
    def coordinates(self) -> Optional[Vector]:
        """Get comment coordinates if available."""
        if isinstance(self.client_meta, Vector):
            return self.client_meta
        elif isinstance(self.client_meta, (FrameOffset, FrameOffsetRegion)):
            return self.client_meta.node_offset
        return None
    
    @property
    def node_id(self) -> Optional[str]:
        """Get the node ID this comment is attached to, if any."""
        if isinstance(self.client_meta, (FrameOffset, FrameOffsetRegion)):
            return self.client_meta.node_id
        return None


class CommentThread(BaseModel):
    """Represents a comment thread with replies."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    root_comment: Comment = Field(..., description="The root comment")
    replies: List[Comment] = Field(default_factory=list, description="Replies to the root comment")
    
    @property
    def total_comments(self) -> int:
        """Total number of comments in this thread."""
        return 1 + len(self.replies)
    
    @property
    def is_resolved(self) -> bool:
        """Check if the thread is resolved."""
        return self.root_comment.is_resolved
    
    @property
    def last_activity(self) -> datetime:
        """Get the timestamp of the last activity in this thread."""
        all_dates = [self.root_comment.created_at]
        all_dates.extend(reply.created_at for reply in self.replies)
        if self.root_comment.updated_at:
            all_dates.append(self.root_comment.updated_at)
        for reply in self.replies:
            if reply.updated_at:
                all_dates.append(reply.updated_at)
        return max(all_dates)


class CommentStatistics(BaseModel):
    """Statistics about comments in a file."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    total_comments: int = Field(..., description="Total number of comments")
    total_threads: int = Field(..., description="Total number of comment threads")
    resolved_comments: int = Field(..., description="Number of resolved comments")
    unresolved_comments: int = Field(..., description="Number of unresolved comments")
    total_reactions: int = Field(..., description="Total number of reactions")
    unique_contributors: int = Field(..., description="Number of unique contributors")
    comments_by_user: Dict[str, int] = Field(
        default_factory=dict, description="Comment count by user handle"
    )
    reactions_by_emoji: Dict[str, int] = Field(
        default_factory=dict, description="Reaction count by emoji"
    )
    
    @property
    def resolution_rate(self) -> float:
        """Calculate the percentage of resolved comments."""
        if self.total_comments == 0:
            return 0.0
        return (self.resolved_comments / self.total_comments) * 100


class CreateCommentRequest(BaseModel):
    """Request model for creating a new comment."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    message: str = Field(..., min_length=1, description="Comment text content")
    comment_id: Optional[str] = Field(None, description="Parent comment ID for replies")
    client_meta: Optional[Union[Vector, FrameOffset, Region, FrameOffsetRegion]] = Field(
        None, description="Position metadata for the comment"
    )
    
    @validator('message')
    def validate_message(cls, v: str) -> str:
        """Validate comment message."""
        if not v.strip():
            raise ValueError("Comment message cannot be empty or whitespace only")
        if len(v) > 10000:  # Reasonable limit
            raise ValueError("Comment message is too long (max 10000 characters)")
        return v.strip()


class CreateCommentResponse(BaseModel):
    """Response model for comment creation."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    id: str = Field(..., description="The ID of the created comment")
    message: str = Field(..., description="The comment message")
    user: User = Field(..., description="The user who created the comment")
    created_at: datetime = Field(..., description="When the comment was created")
    file_key: str = Field(..., description="The file key")
    parent_id: Optional[str] = Field(None, description="Parent comment ID if this is a reply")
    client_meta: Optional[Union[Vector, FrameOffset, Region, FrameOffsetRegion]] = Field(
        None, description="Position metadata"
    )


class GetCommentsResponse(BaseModel):
    """Response model for getting comments."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    comments: List[Comment] = Field(..., description="List of comments")


class CommentReactionRequest(BaseModel):
    """Request model for adding a comment reaction."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    emoji: Emoji = Field(..., description="The emoji reaction to add")


class CommentSearchResult(BaseModel):
    """Result model for comment search operations."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    comments: List[Comment] = Field(..., description="Matching comments")
    total_matches: int = Field(..., description="Total number of matches")
    query: str = Field(..., description="The search query used")


class CommentExportFormat(str, Enum):
    """Supported export formats for comments."""
    JSON = "json"
    CSV = "csv"
    MARKDOWN = "md"


class BulkCommentOperation(BaseModel):
    """Model for bulk comment operations."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    comment_ids: List[str] = Field(..., min_items=1, description="List of comment IDs")
    
    @validator('comment_ids')
    def validate_comment_ids(cls, v: List[str]) -> List[str]:
        """Validate comment IDs."""
        if len(v) > 100:  # Reasonable bulk limit
            raise ValueError("Too many comment IDs (max 100)")
        unique_ids = list(set(v))
        if len(unique_ids) != len(v):
            raise ValueError("Duplicate comment IDs found")
        return v


class BulkCommentResult(BaseModel):
    """Result model for bulk comment operations."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    successful: List[str] = Field(default_factory=list, description="Successfully processed comment IDs")
    failed: List[str] = Field(default_factory=list, description="Failed comment IDs")
    errors: Dict[str, str] = Field(default_factory=dict, description="Error messages by comment ID")
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        total = len(self.successful) + len(self.failed)
        if total == 0:
            return 0.0
        return (len(self.successful) / total) * 100


# New reaction-specific models

class ReactionSummary(BaseModel):
    """Summary of reactions for a comment."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    comment_id: str = Field(..., description="Comment ID")
    total_reactions: int = Field(..., description="Total number of reactions")
    reactions_by_emoji: Dict[str, int] = Field(
        default_factory=dict, description="Count of reactions by emoji"
    )
    reactions_by_user: Dict[str, List[str]] = Field(
        default_factory=dict, description="Reactions by user (user_id -> list of emojis)"
    )
    most_popular_emoji: Optional[str] = Field(None, description="Most popular emoji reaction")
    trending_score: float = Field(0.0, description="Trending score based on recent activity")
    
    @property
    def unique_reactors(self) -> int:
        """Number of unique users who reacted."""
        return len(self.reactions_by_user)


class UserReaction(BaseModel):
    """User-specific reaction information."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    user: User = Field(..., description="User who reacted")
    emojis: List[Emoji] = Field(default_factory=list, description="Emojis the user reacted with")
    created_at: datetime = Field(..., description="When the first reaction was created")
    updated_at: Optional[datetime] = Field(None, description="When reactions were last updated")


class ReactionsList(BaseModel):
    """Collection of reactions for a comment."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    comment_id: str = Field(..., description="Comment ID")
    reactions: List[CommentReaction] = Field(default_factory=list, description="All reactions")
    summary: ReactionSummary = Field(..., description="Reaction summary")
    cursor: Optional[str] = Field(None, description="Pagination cursor for more reactions")
    
    @property
    def has_more(self) -> bool:
        """Check if there are more reactions to fetch."""
        return self.cursor is not None


class ReactionExport(BaseModel):
    """Export format for reactions data."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    file_key: str = Field(..., description="Figma file key")
    export_format: CommentExportFormat = Field(..., description="Export format")
    exported_at: datetime = Field(default_factory=datetime.now, description="Export timestamp")
    total_comments: int = Field(..., description="Total comments exported")
    total_reactions: int = Field(..., description="Total reactions exported")
    reactions_summary: Dict[str, Any] = Field(
        default_factory=dict, description="Summary of exported reactions"
    )


class BulkReactionOperation(BaseModel):
    """Model for bulk reaction operations."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    comment_ids: List[str] = Field(..., min_items=1, description="List of comment IDs")
    emoji: Emoji = Field(..., description="Emoji to add/remove")
    operation: str = Field(..., description="Operation type: 'add' or 'remove'")
    
    @validator('comment_ids')
    def validate_comment_ids(cls, v: List[str]) -> List[str]:
        """Validate comment IDs."""
        if len(v) > 50:  # Lower limit for reaction operations
            raise ValueError("Too many comment IDs for bulk reaction (max 50)")
        return list(set(v))  # Remove duplicates
    
    @validator('operation')
    def validate_operation(cls, v: str) -> str:
        """Validate operation type."""
        if v not in ('add', 'remove'):
            raise ValueError("Operation must be 'add' or 'remove'")
        return v


class BulkReactionResult(BaseModel):
    """Result model for bulk reaction operations."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    operation: str = Field(..., description="Operation performed")
    emoji: str = Field(..., description="Emoji that was added/removed")
    successful: List[str] = Field(default_factory=list, description="Successfully processed comment IDs")
    failed: List[str] = Field(default_factory=list, description="Failed comment IDs")
    errors: Dict[str, str] = Field(default_factory=dict, description="Error messages by comment ID")
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        total = len(self.successful) + len(self.failed)
        if total == 0:
            return 0.0
        return (len(self.successful) / total) * 100


class TrendingReactions(BaseModel):
    """Model for trending reaction analysis."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    file_key: str = Field(..., description="Figma file key")
    time_period_hours: int = Field(..., description="Time period analyzed in hours")
    trending_emojis: List[Dict[str, Any]] = Field(
        default_factory=list, description="Trending emojis with scores"
    )
    most_reacted_comments: List[Dict[str, Any]] = Field(
        default_factory=list, description="Comments with most reactions"
    )
    active_reactors: List[Dict[str, Any]] = Field(
        default_factory=list, description="Most active users adding reactions"
    )
    reaction_velocity: float = Field(0.0, description="Reactions per hour")


class GetReactionsResponse(BaseModel):
    """Response model for getting comment reactions."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    reactions: List[CommentReaction] = Field(..., description="List of reactions")
    cursor: Optional[str] = Field(None, description="Pagination cursor")
    
    @property
    def has_more(self) -> bool:
        """Check if there are more reactions to fetch."""
        return self.cursor is not None


class CreateReactionResponse(BaseModel):
    """Response model for reaction creation."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    
    emoji: str = Field(..., description="The emoji reaction that was added")
    user: User = Field(..., description="The user who added the reaction")
    created_at: datetime = Field(..., description="When the reaction was created")
    comment_id: str = Field(..., description="The comment ID the reaction was added to")