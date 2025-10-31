"""Business logic layer for Figma Comments operations."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Set, Union
from collections import defaultdict

from .client import FigmaCommentsClient
from .models import (
    Comment,
    CommentThread,
    CommentStatistics,
    CommentReaction,
    CreateCommentRequest,
    CreateCommentResponse,
    User,
    Vector,
    FrameOffset,
    Region,
    FrameOffsetRegion,
    Emoji,
    CommentSearchResult,
    BulkCommentResult,
    # New reaction models
    ReactionSummary,
    UserReaction,
    ReactionsList,
    BulkReactionOperation,
    BulkReactionResult,
    TrendingReactions,
    GetReactionsResponse,
    CreateReactionResponse,
)
from .exceptions import (
    CommentNotFoundError,
    FileNotFoundError,
    ValidationError,
    InvalidCommentError,
)


logger = logging.getLogger(__name__)


class FigmaCommentsService:
    """Business logic service for Figma Comments operations."""
    
    def __init__(self, client: FigmaCommentsClient) -> None:
        """
        Initialize the service with a client.
        
        Args:
            client: Configured FigmaCommentsClient instance
        """
        self.client = client
    
    async def get_file_comments(
        self,
        file_key: str,
        *,
        as_markdown: bool = False,
    ) -> List[Comment]:
        """
        Get all comments in a file.
        
        Args:
            file_key: Figma file key
            as_markdown: Return comments as markdown when applicable
            
        Returns:
            List of comments
            
        Raises:
            FileNotFoundError: If file is not found
        """
        try:
            response = await self.client.get_comments(file_key, as_md=as_markdown)
            comments_data = response.get("comments", [])
            
            comments = []
            for comment_data in comments_data:
                comment = self._parse_comment(comment_data, file_key)
                comments.append(comment)
            
            return comments
            
        except Exception as e:
            if "not found" in str(e).lower():
                raise FileNotFoundError(file_key) from e
            raise
    
    async def add_comment(
        self,
        file_key: str,
        comment_request: CreateCommentRequest,
    ) -> CreateCommentResponse:
        """
        Add a new comment to a file.
        
        Args:
            file_key: Figma file key
            comment_request: Comment creation request
            
        Returns:
            Created comment response
            
        Raises:
            FileNotFoundError: If file is not found
            InvalidCommentError: If comment data is invalid
        """
        try:
            # Convert client_meta to dict if needed
            client_meta_dict = None
            if comment_request.client_meta:
                client_meta_dict = comment_request.client_meta.model_dump()
            
            response = await self.client.create_comment(
                file_key,
                message=comment_request.message,
                comment_id=comment_request.comment_id,
                client_meta=client_meta_dict,
            )
            
            return CreateCommentResponse(**response)
            
        except ValidationError as e:
            raise InvalidCommentError("Invalid comment data", response_data=e.response_data) from e
        except Exception as e:
            if "not found" in str(e).lower():
                raise FileNotFoundError(file_key) from e
            raise
    
    async def delete_comment(
        self,
        file_key: str,
        comment_id: str,
    ) -> bool:
        """
        Delete a specific comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            CommentNotFoundError: If comment is not found
            FileNotFoundError: If file is not found
        """
        try:
            await self.client.delete_comment(file_key, comment_id)
            return True
            
        except Exception as e:
            error_msg = str(e).lower()
            if "comment" in error_msg and "not found" in error_msg:
                raise CommentNotFoundError(comment_id, file_key) from e
            elif "file" in error_msg and "not found" in error_msg:
                raise FileNotFoundError(file_key) from e
            raise
    
    async def get_comment_thread(
        self,
        file_key: str,
        comment_id: str,
    ) -> CommentThread:
        """
        Get a comment thread including all replies.
        
        Args:
            file_key: Figma file key
            comment_id: Root comment ID
            
        Returns:
            Comment thread with replies
            
        Raises:
            CommentNotFoundError: If comment is not found
        """
        comments = await self.get_file_comments(file_key)
        
        # Find the root comment
        root_comment = None
        for comment in comments:
            if comment.id == comment_id:
                root_comment = comment
                break
        
        if not root_comment:
            raise CommentNotFoundError(comment_id, file_key)
        
        # Find all replies
        replies = [
            comment for comment in comments
            if comment.parent_id == comment_id
        ]
        
        # Sort replies by creation time
        replies.sort(key=lambda c: c.created_at)
        
        return CommentThread(root_comment=root_comment, replies=replies)
    
    async def reply_to_comment(
        self,
        file_key: str,
        parent_id: str,
        message: str,
    ) -> CreateCommentResponse:
        """
        Reply to an existing comment.
        
        Args:
            file_key: Figma file key
            parent_id: Parent comment ID
            message: Reply message
            
        Returns:
            Created reply response
        """
        request = CreateCommentRequest(message=message, comment_id=parent_id)
        return await self.add_comment(file_key, request)
    
    async def search_comments(
        self,
        file_key: str,
        query: str,
        *,
        case_sensitive: bool = False,
        include_resolved: bool = True,
    ) -> CommentSearchResult:
        """
        Search comments by content.
        
        Args:
            file_key: Figma file key
            query: Search query
            case_sensitive: Whether search should be case sensitive
            include_resolved: Whether to include resolved comments
            
        Returns:
            Search results
        """
        comments = await self.get_file_comments(file_key)
        
        if not case_sensitive:
            query = query.lower()
        
        matching_comments = []
        for comment in comments:
            if not include_resolved and comment.is_resolved:
                continue
            
            search_text = comment.message
            if not case_sensitive:
                search_text = search_text.lower()
            
            if query in search_text:
                matching_comments.append(comment)
        
        return CommentSearchResult(
            comments=matching_comments,
            total_matches=len(matching_comments),
            query=query,
        )
    
    async def get_comments_by_user(
        self,
        file_key: str,
        user_id: str,
    ) -> List[Comment]:
        """
        Get all comments by a specific user.
        
        Args:
            file_key: Figma file key
            user_id: User ID or handle
            
        Returns:
            List of comments by the user
        """
        comments = await self.get_file_comments(file_key)
        
        user_comments = [
            comment for comment in comments
            if comment.user.id == user_id or comment.user.handle == user_id
        ]
        
        return user_comments
    
    async def get_unresolved_comments(
        self,
        file_key: str,
    ) -> List[Comment]:
        """
        Get all unresolved comments in a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            List of unresolved comments
        """
        comments = await self.get_file_comments(file_key)
        return [comment for comment in comments if not comment.is_resolved]
    
    async def resolve_comment(
        self,
        file_key: str,
        comment_id: str,
    ) -> bool:
        """
        Mark a comment as resolved.
        
        Note: This is a logical operation - Figma API doesn't have direct resolve endpoint.
        In practice, this would be handled by the UI or require additional implementation.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID to resolve
            
        Returns:
            True if operation was successful
        """
        # This is a placeholder - actual implementation would depend on 
        # how resolution is handled in your application
        logger.warning(
            f"resolve_comment called for {comment_id} in {file_key} - "
            "implementation depends on application logic"
        )
        return True
    
    async def batch_delete_comments(
        self,
        file_key: str,
        comment_ids: List[str],
    ) -> BulkCommentResult:
        """
        Delete multiple comments in batch.
        
        Args:
            file_key: Figma file key
            comment_ids: List of comment IDs to delete
            
        Returns:
            Bulk operation result
        """
        successful = []
        failed = []
        errors = {}
        
        # Process deletions concurrently with semaphore to limit concurrency
        semaphore = asyncio.Semaphore(5)
        
        async def delete_single(comment_id: str) -> None:
            async with semaphore:
                try:
                    await self.delete_comment(file_key, comment_id)
                    successful.append(comment_id)
                except Exception as e:
                    failed.append(comment_id)
                    errors[comment_id] = str(e)
        
        tasks = [delete_single(comment_id) for comment_id in comment_ids]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        return BulkCommentResult(
            successful=successful,
            failed=failed,
            errors=errors,
        )
    
    async def get_comment_statistics(
        self,
        file_key: str,
    ) -> CommentStatistics:
        """
        Get statistics about comments in a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            Comment statistics
        """
        comments = await self.get_file_comments(file_key)
        
        # Basic counts
        total_comments = len(comments)
        resolved_comments = sum(1 for c in comments if c.is_resolved)
        unresolved_comments = total_comments - resolved_comments
        
        # Thread counting
        thread_roots = set()
        for comment in comments:
            if comment.parent_id is None:
                thread_roots.add(comment.id)
            else:
                # Find the root of this reply chain
                root_id = comment.parent_id
                while True:
                    parent = next((c for c in comments if c.id == root_id), None)
                    if parent is None or parent.parent_id is None:
                        break
                    root_id = parent.parent_id
                thread_roots.add(root_id)
        
        total_threads = len(thread_roots)
        
        # User statistics
        users = set()
        comments_by_user = defaultdict(int)
        for comment in comments:
            users.add(comment.user.id)
            comments_by_user[comment.user.handle] += 1
        
        # Reaction statistics
        total_reactions = 0
        reactions_by_emoji = defaultdict(int)
        for comment in comments:
            total_reactions += len(comment.reactions)
            for reaction in comment.reactions:
                reactions_by_emoji[reaction.emoji.value] += 1
        
        return CommentStatistics(
            total_comments=total_comments,
            total_threads=total_threads,
            resolved_comments=resolved_comments,
            unresolved_comments=unresolved_comments,
            total_reactions=total_reactions,
            unique_contributors=len(users),
            comments_by_user=dict(comments_by_user),
            reactions_by_emoji=dict(reactions_by_emoji),
        )
    
    async def get_comments_by_date_range(
        self,
        file_key: str,
        start_date: datetime,
        end_date: Optional[datetime] = None,
    ) -> List[Comment]:
        """
        Get comments within a date range.
        
        Args:
            file_key: Figma file key
            start_date: Start date (inclusive)
            end_date: End date (inclusive), defaults to now
            
        Returns:
            List of comments in date range
        """
        if end_date is None:
            end_date = datetime.now()
        
        comments = await self.get_file_comments(file_key)
        
        filtered_comments = [
            comment for comment in comments
            if start_date <= comment.created_at <= end_date
        ]
        
        return filtered_comments
    
    async def get_comment_history(
        self,
        file_key: str,
        days: int = 7,
    ) -> List[Comment]:
        """
        Get comments from the last N days.
        
        Args:
            file_key: Figma file key
            days: Number of days to look back
            
        Returns:
            List of recent comments
        """
        start_date = datetime.now() - timedelta(days=days)
        return await self.get_comments_by_date_range(file_key, start_date)
    
    # New reaction methods
    
    async def get_comment_reactions(
        self,
        file_key: str,
        comment_id: str,
        *,
        cursor: Optional[str] = None,
    ) -> GetReactionsResponse:
        """
        Get all reactions for a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            cursor: Pagination cursor
            
        Returns:
            Reactions response with pagination
        """
        try:
            response = await self.client.get_comment_reactions(
                file_key, comment_id, cursor=cursor
            )
            
            reactions = []
            reactions_data = response.get("reactions", [])
            for reaction_data in reactions_data:
                reaction = self._parse_reaction(reaction_data)
                reactions.append(reaction)
            
            return GetReactionsResponse(
                reactions=reactions,
                cursor=response.get("cursor"),
            )
            
        except Exception as e:
            if "not found" in str(e).lower():
                raise CommentNotFoundError(comment_id, file_key) from e
            raise
    
    async def add_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: str,
    ) -> CreateReactionResponse:
        """
        Add a reaction to a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            emoji: Emoji reaction
            
        Returns:
            Created reaction response
        """
        try:
            response = await self.client.create_comment_reaction(
                file_key, comment_id, emoji=emoji
            )
            
            return CreateReactionResponse(**response)
            
        except Exception as e:
            if "not found" in str(e).lower():
                raise CommentNotFoundError(comment_id, file_key) from e
            raise
    
    async def delete_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: str,
    ) -> bool:
        """
        Delete a reaction from a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            emoji: Emoji reaction to remove
            
        Returns:
            True if deletion was successful
        """
        try:
            await self.client.delete_comment_reaction(
                file_key, comment_id, emoji=emoji
            )
            return True
            
        except Exception as e:
            if "not found" in str(e).lower():
                raise CommentNotFoundError(comment_id, file_key) from e
            raise
    
    async def get_reactions_summary(
        self,
        file_key: str,
        comment_id: str,
    ) -> ReactionSummary:
        """
        Get reaction statistics for a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            
        Returns:
            Reaction summary with statistics
        """
        reactions_response = await self.get_comment_reactions(file_key, comment_id)
        reactions = reactions_response.reactions
        
        # Build statistics
        total_reactions = len(reactions)
        reactions_by_emoji = defaultdict(int)
        reactions_by_user = defaultdict(list)
        
        for reaction in reactions:
            emoji_str = reaction.emoji.value
            user_id = reaction.user.id
            
            reactions_by_emoji[emoji_str] += 1
            reactions_by_user[user_id].append(emoji_str)
        
        # Find most popular emoji
        most_popular_emoji = None
        if reactions_by_emoji:
            most_popular_emoji = max(reactions_by_emoji.items(), key=lambda x: x[1])[0]
        
        # Calculate trending score (simplified)
        now = datetime.now()
        recent_reactions = [
            r for r in reactions 
            if (now - r.created_at).total_seconds() < 3600  # Last hour
        ]
        trending_score = len(recent_reactions) / max(1, total_reactions) * 100
        
        return ReactionSummary(
            comment_id=comment_id,
            total_reactions=total_reactions,
            reactions_by_emoji=dict(reactions_by_emoji),
            reactions_by_user=dict(reactions_by_user),
            most_popular_emoji=most_popular_emoji,
            trending_score=trending_score,
        )
    
    async def toggle_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: str,
    ) -> Dict[str, Any]:
        """
        Toggle a reaction on/off for a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            emoji: Emoji reaction to toggle
            
        Returns:
            Result indicating whether reaction was added or removed
        """
        # Get current reactions to check if user already reacted with this emoji
        reactions_response = await self.get_comment_reactions(file_key, comment_id)
        
        # For now, we can't easily determine current user, so we'll try to add
        # and handle the error if it already exists
        try:
            await self.add_reaction(file_key, comment_id, emoji)
            return {"action": "added", "emoji": emoji, "comment_id": comment_id}
        except Exception:
            # If adding fails, try removing
            try:
                await self.delete_reaction(file_key, comment_id, emoji)
                return {"action": "removed", "emoji": emoji, "comment_id": comment_id}
            except Exception as e:
                # If both fail, re-raise the original error
                raise e
    
    async def get_user_reactions(
        self,
        file_key: str,
        comment_id: str,
        user_id: str,
    ) -> List[CommentReaction]:
        """
        Get reactions by a specific user for a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            user_id: User ID
            
        Returns:
            List of reactions by the user
        """
        reactions_response = await self.get_comment_reactions(file_key, comment_id)
        
        user_reactions = [
            reaction for reaction in reactions_response.reactions
            if reaction.user.id == user_id
        ]
        
        return user_reactions
    
    async def clear_all_reactions(
        self,
        file_key: str,
        comment_id: str,
    ) -> BulkReactionResult:
        """
        Clear all reactions from a comment (admin operation).
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            
        Returns:
            Bulk operation result
        """
        reactions_response = await self.get_comment_reactions(file_key, comment_id)
        
        successful = []
        failed = []
        errors = {}
        
        # Group reactions by emoji to avoid duplicates
        emojis_to_remove = set()
        for reaction in reactions_response.reactions:
            emojis_to_remove.add(reaction.emoji.value)
        
        for emoji in emojis_to_remove:
            try:
                await self.delete_reaction(file_key, comment_id, emoji)
                successful.append(f"{comment_id}:{emoji}")
            except Exception as e:
                failed.append(f"{comment_id}:{emoji}")
                errors[f"{comment_id}:{emoji}"] = str(e)
        
        return BulkReactionResult(
            operation="clear_all",
            emoji="all",
            successful=successful,
            failed=failed,
            errors=errors,
        )
    
    async def bulk_react_to_comments(
        self,
        file_key: str,
        operation: BulkReactionOperation,
    ) -> BulkReactionResult:
        """
        Add or remove reactions to multiple comments.
        
        Args:
            file_key: Figma file key
            operation: Bulk reaction operation details
            
        Returns:
            Bulk operation result
        """
        successful = []
        failed = []
        errors = {}
        
        semaphore = asyncio.Semaphore(3)  # Lower concurrency for reactions
        
        async def process_single(comment_id: str) -> None:
            async with semaphore:
                try:
                    if operation.operation == "add":
                        await self.add_reaction(file_key, comment_id, operation.emoji.value)
                    else:  # remove
                        await self.delete_reaction(file_key, comment_id, operation.emoji.value)
                    successful.append(comment_id)
                except Exception as e:
                    failed.append(comment_id)
                    errors[comment_id] = str(e)
        
        tasks = [process_single(comment_id) for comment_id in operation.comment_ids]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        return BulkReactionResult(
            operation=operation.operation,
            emoji=operation.emoji.value,
            successful=successful,
            failed=failed,
            errors=errors,
        )
    
    async def get_trending_reactions(
        self,
        file_key: str,
        hours: int = 24,
    ) -> TrendingReactions:
        """
        Get trending reaction analysis for a file.
        
        Args:
            file_key: Figma file key
            hours: Time period to analyze in hours
            
        Returns:
            Trending reactions analysis
        """
        comments = await self.get_file_comments(file_key)
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Analyze recent reactions
        emoji_counts = defaultdict(int)
        comment_reaction_counts = defaultdict(int)
        user_reaction_counts = defaultdict(int)
        total_recent_reactions = 0
        
        for comment in comments:
            recent_reactions = [
                r for r in comment.reactions
                if r.created_at >= cutoff_time
            ]
            
            comment_reaction_counts[comment.id] = len(recent_reactions)
            total_recent_reactions += len(recent_reactions)
            
            for reaction in recent_reactions:
                emoji_counts[reaction.emoji.value] += 1
                user_reaction_counts[reaction.user.id] += 1
        
        # Build trending data
        trending_emojis = [
            {"emoji": emoji, "count": count, "score": count / max(1, total_recent_reactions)}
            for emoji, count in sorted(emoji_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        most_reacted_comments = [
            {"comment_id": comment_id, "reaction_count": count}
            for comment_id, count in sorted(
                comment_reaction_counts.items(), key=lambda x: x[1], reverse=True
            )[:10]
        ]
        
        active_reactors = [
            {"user_id": user_id, "reaction_count": count}
            for user_id, count in sorted(
                user_reaction_counts.items(), key=lambda x: x[1], reverse=True
            )[:10]
        ]
        
        reaction_velocity = total_recent_reactions / hours if hours > 0 else 0
        
        return TrendingReactions(
            file_key=file_key,
            time_period_hours=hours,
            trending_emojis=trending_emojis,
            most_reacted_comments=most_reacted_comments,
            active_reactors=active_reactors,
            reaction_velocity=reaction_velocity,
        )
    
    def _parse_comment(self, comment_data: Dict[str, Any], file_key: str) -> Comment:
        """
        Parse comment data from API response.
        
        Args:
            comment_data: Raw comment data from API
            file_key: Figma file key
            
        Returns:
            Parsed Comment object
        """
        # Parse user
        user_data = comment_data.get("user", {})
        user = User(
            id=user_data.get("id", ""),
            handle=user_data.get("handle", ""),
            img_url=user_data.get("img_url"),
            email=user_data.get("email"),
        )
        
        # Parse client_meta
        client_meta = None
        client_meta_data = comment_data.get("client_meta")
        if client_meta_data:
            client_meta = self._parse_client_meta(client_meta_data)
        
        # Parse timestamps
        created_at = datetime.fromisoformat(comment_data["created_at"].replace("Z", "+00:00"))
        updated_at = None
        if comment_data.get("updated_at"):
            updated_at = datetime.fromisoformat(comment_data["updated_at"].replace("Z", "+00:00"))
        resolved_at = None
        if comment_data.get("resolved_at"):
            resolved_at = datetime.fromisoformat(comment_data["resolved_at"].replace("Z", "+00:00"))
        
        # Parse reactions
        reactions = []
        reactions_data = comment_data.get("reactions", [])
        for reaction_data in reactions_data:
            reaction = self._parse_reaction(reaction_data)
            reactions.append(reaction)
        
        return Comment(
            id=comment_data["id"],
            message=comment_data["message"],
            user=user,
            created_at=created_at,
            updated_at=updated_at,
            resolved_at=resolved_at,
            file_key=file_key,
            parent_id=comment_data.get("parent_id"),
            order_id=comment_data.get("order_id"),
            client_meta=client_meta,
            reactions=reactions,
        )
    
    def _parse_client_meta(
        self, 
        client_meta_data: Dict[str, Any]
    ) -> Union[Vector, FrameOffset, Region, FrameOffsetRegion]:
        """Parse client_meta from API response."""
        if "node_id" in client_meta_data:
            if "region" in client_meta_data:
                return FrameOffsetRegion(
                    node_id=client_meta_data["node_id"],
                    node_offset=Vector(**client_meta_data["node_offset"]),
                    region=Region(**client_meta_data["region"]),
                )
            else:
                return FrameOffset(
                    node_id=client_meta_data["node_id"],
                    node_offset=Vector(**client_meta_data["node_offset"]),
                )
        elif "width" in client_meta_data and "height" in client_meta_data:
            return Region(**client_meta_data)
        else:
            return Vector(**client_meta_data)
    
    def _parse_reaction(self, reaction_data: Dict[str, Any]) -> CommentReaction:
        """Parse reaction data from API response."""
        user_data = reaction_data.get("user", {})
        user = User(
            id=user_data.get("id", ""),
            handle=user_data.get("handle", ""),
            img_url=user_data.get("img_url"),
            email=user_data.get("email"),
        )
        
        created_at = datetime.fromisoformat(reaction_data["created_at"].replace("Z", "+00:00"))
        
        return CommentReaction(
            emoji=Emoji(reaction_data["emoji"]),
            user=user,
            created_at=created_at,
        )