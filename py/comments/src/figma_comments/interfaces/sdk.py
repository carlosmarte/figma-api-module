"""High-level SDK interface for Figma Comments API."""

import json
import csv
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Union, TextIO
import asyncio

from ..core.client import FigmaCommentsClient
from ..core.service import FigmaCommentsService
from ..core.models import (
    Comment,
    CommentThread,
    CommentStatistics,
    CreateCommentRequest,
    CreateCommentResponse,
    Vector,
    FrameOffset,
    Region,
    FrameOffsetRegion,
    CommentSearchResult,
    BulkCommentResult,
    CommentExportFormat,
    Emoji,
    # New reaction models
    ReactionSummary,
    UserReaction,
    ReactionsList,
    BulkReactionOperation,
    BulkReactionResult,
    TrendingReactions,
    GetReactionsResponse,
    CreateReactionResponse,
    ReactionExport,
)
from ..core.exceptions import FigmaCommentsError, ValidationError


class FigmaCommentsSDK:
    """
    High-level SDK for Figma Comments API.
    
    Provides convenient methods for common comment operations with proper
    error handling and data transformation.
    """
    
    def __init__(
        self,
        api_token: Optional[str] = None,
        *,
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit_capacity: int = 60,
        rate_limit_refill_rate: float = 1.0,
    ) -> None:
        """
        Initialize the SDK.
        
        Args:
            api_token: Figma API token (defaults to FIGMA_TOKEN env var)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            rate_limit_capacity: Rate limit capacity (requests per minute)
            rate_limit_refill_rate: Rate limit refill rate (tokens per second)
        """
        if api_token is None:
            api_token = os.getenv("FIGMA_TOKEN")
            if not api_token:
                raise ValueError(
                    "API token must be provided or set in FIGMA_TOKEN environment variable"
                )
        
        self._client = FigmaCommentsClient(
            api_token=api_token,
            timeout=timeout,
            max_retries=max_retries,
            rate_limit_capacity=rate_limit_capacity,
            rate_limit_refill_rate=rate_limit_refill_rate,
        )
        self._service = FigmaCommentsService(self._client)
    
    async def __aenter__(self) -> "FigmaCommentsSDK":
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()
    
    async def close(self) -> None:
        """Close the underlying client."""
        await self._client.close()
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Get client statistics."""
        return self._client.stats
    
    # Core comment operations
    
    async def list_all_comments(self, file_key: str) -> List[Comment]:
        """
        Get all comments in a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            List of all comments
        """
        return await self._service.get_file_comments(file_key)
    
    async def add_comment_with_coordinates(
        self,
        file_key: str,
        x: float,
        y: float,
        message: str,
    ) -> CreateCommentResponse:
        """
        Add a comment at specific coordinates.
        
        Args:
            file_key: Figma file key
            x: X coordinate
            y: Y coordinate
            message: Comment message
            
        Returns:
            Created comment response
        """
        request = CreateCommentRequest(
            message=message,
            client_meta=Vector(x=x, y=y),
        )
        return await self._service.add_comment(file_key, request)
    
    async def add_comment_to_node(
        self,
        file_key: str,
        node_id: str,
        message: str,
        *,
        x: float = 0.0,
        y: float = 0.0,
    ) -> CreateCommentResponse:
        """
        Add a comment to a specific node.
        
        Args:
            file_key: Figma file key
            node_id: Target node ID
            message: Comment message
            x: X offset within the node
            y: Y offset within the node
            
        Returns:
            Created comment response
        """
        request = CreateCommentRequest(
            message=message,
            client_meta=FrameOffset(
                node_id=node_id,
                node_offset=Vector(x=x, y=y),
            ),
        )
        return await self._service.add_comment(file_key, request)
    
    async def add_comment_to_region(
        self,
        file_key: str,
        node_id: str,
        message: str,
        *,
        x: float,
        y: float,
        width: float,
        height: float,
        offset_x: float = 0.0,
        offset_y: float = 0.0,
    ) -> CreateCommentResponse:
        """
        Add a comment to a specific region within a node.
        
        Args:
            file_key: Figma file key
            node_id: Target node ID
            message: Comment message
            x: Region X coordinate
            y: Region Y coordinate
            width: Region width
            height: Region height
            offset_x: X offset within the node
            offset_y: Y offset within the node
            
        Returns:
            Created comment response
        """
        request = CreateCommentRequest(
            message=message,
            client_meta=FrameOffsetRegion(
                node_id=node_id,
                node_offset=Vector(x=offset_x, y=offset_y),
                region=Region(x=x, y=y, width=width, height=height),
            ),
        )
        return await self._service.add_comment(file_key, request)
    
    async def reply_to_comment(
        self,
        file_key: str,
        parent_comment_id: str,
        message: str,
    ) -> CreateCommentResponse:
        """
        Reply to an existing comment.
        
        Args:
            file_key: Figma file key
            parent_comment_id: Parent comment ID
            message: Reply message
            
        Returns:
            Created reply response
        """
        return await self._service.reply_to_comment(file_key, parent_comment_id, message)
    
    async def delete_comment(self, file_key: str, comment_id: str) -> bool:
        """
        Delete a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID to delete
            
        Returns:
            True if deletion was successful
        """
        return await self._service.delete_comment(file_key, comment_id)
    
    async def get_comment_thread(
        self,
        file_key: str,
        comment_id: str,
    ) -> CommentThread:
        """
        Get a comment thread with all replies.
        
        Args:
            file_key: Figma file key
            comment_id: Root comment ID
            
        Returns:
            Comment thread
        """
        return await self._service.get_comment_thread(file_key, comment_id)
    
    # Search and filtering
    
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
        return await self._service.search_comments(
            file_key,
            query,
            case_sensitive=case_sensitive,
            include_resolved=include_resolved,
        )
    
    async def get_comments_by_user(
        self,
        file_key: str,
        user_identifier: str,
    ) -> List[Comment]:
        """
        Get all comments by a specific user.
        
        Args:
            file_key: Figma file key
            user_identifier: User ID or handle
            
        Returns:
            List of comments by the user
        """
        return await self._service.get_comments_by_user(file_key, user_identifier)
    
    async def get_unresolved_comments(self, file_key: str) -> List[Comment]:
        """
        Get all unresolved comments in a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            List of unresolved comments
        """
        return await self._service.get_unresolved_comments(file_key)
    
    async def get_comment_statistics(self, file_key: str) -> CommentStatistics:
        """
        Get comment statistics for a file.
        
        Args:
            file_key: Figma file key
            
        Returns:
            Comment statistics
        """
        return await self._service.get_comment_statistics(file_key)
    
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
        return await self._service.get_comment_history(file_key, days)
    
    # Bulk operations
    
    async def bulk_add_comments(
        self,
        file_key: str,
        comments: List[CreateCommentRequest],
    ) -> List[CreateCommentResponse]:
        """
        Add multiple comments at once.
        
        Args:
            file_key: Figma file key
            comments: List of comment requests
            
        Returns:
            List of created comment responses
        """
        semaphore = asyncio.Semaphore(5)  # Limit concurrency
        
        async def add_single(request: CreateCommentRequest) -> CreateCommentResponse:
            async with semaphore:
                return await self._service.add_comment(file_key, request)
        
        tasks = [add_single(request) for request in comments]
        responses = await asyncio.gather(*tasks)
        return list(responses)
    
    async def bulk_delete_comments(
        self,
        file_key: str,
        comment_ids: List[str],
    ) -> BulkCommentResult:
        """
        Delete multiple comments at once.
        
        Args:
            file_key: Figma file key
            comment_ids: List of comment IDs to delete
            
        Returns:
            Bulk operation result
        """
        return await self._service.batch_delete_comments(file_key, comment_ids)
    
    # New reaction convenience methods
    
    async def list_comment_reactions(
        self,
        file_key: str,
        comment_id: str,
    ) -> ReactionsList:
        """
        Get reactions for a comment with user info and summary.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            
        Returns:
            Reactions list with summary
        """
        reactions_response = await self._service.get_comment_reactions(file_key, comment_id)
        summary = await self._service.get_reactions_summary(file_key, comment_id)
        
        return ReactionsList(
            comment_id=comment_id,
            reactions=reactions_response.reactions,
            summary=summary,
            cursor=reactions_response.cursor,
        )
    
    async def add_emoji_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: Union[str, Emoji],
    ) -> CreateReactionResponse:
        """
        Add emoji reaction to a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            emoji: Emoji reaction (string or Emoji enum)
            
        Returns:
            Created reaction response
        """
        emoji_str = emoji.value if isinstance(emoji, Emoji) else emoji
        return await self._service.add_reaction(file_key, comment_id, emoji_str)
    
    async def remove_emoji_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: Union[str, Emoji],
    ) -> bool:
        """
        Remove emoji reaction from a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            emoji: Emoji reaction to remove
            
        Returns:
            True if removal was successful
        """
        emoji_str = emoji.value if isinstance(emoji, Emoji) else emoji
        return await self._service.delete_reaction(file_key, comment_id, emoji_str)
    
    async def toggle_emoji_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: Union[str, Emoji],
    ) -> Dict[str, Any]:
        """
        Toggle emoji reaction on/off for a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            emoji: Emoji reaction to toggle
            
        Returns:
            Result indicating whether reaction was added or removed
        """
        emoji_str = emoji.value if isinstance(emoji, Emoji) else emoji
        return await self._service.toggle_reaction(file_key, comment_id, emoji_str)
    
    async def get_popular_reactions(
        self,
        file_key: str,
        comment_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Get most popular reactions for a comment.
        
        Args:
            file_key: Figma file key
            comment_id: Comment ID
            
        Returns:
            List of popular reactions sorted by count
        """
        summary = await self._service.get_reactions_summary(file_key, comment_id)
        
        popular_reactions = [
            {"emoji": emoji, "count": count}
            for emoji, count in sorted(
                summary.reactions_by_emoji.items(),
                key=lambda x: x[1],
                reverse=True
            )
        ]
        
        return popular_reactions
    
    async def bulk_react_to_comments(
        self,
        file_key: str,
        comment_ids: List[str],
        emoji: Union[str, Emoji],
        operation: str = "add",
    ) -> BulkReactionResult:
        """
        Add or remove reactions to multiple comments.
        
        Args:
            file_key: Figma file key
            comment_ids: List of comment IDs
            emoji: Emoji reaction
            operation: 'add' or 'remove'
            
        Returns:
            Bulk operation result
        """
        emoji_enum = Emoji(emoji) if isinstance(emoji, str) else emoji
        bulk_operation = BulkReactionOperation(
            comment_ids=comment_ids,
            emoji=emoji_enum,
            operation=operation,
        )
        
        return await self._service.bulk_react_to_comments(file_key, bulk_operation)
    
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
        return await self._service.get_trending_reactions(file_key, hours)
    
    async def export_reactions_data(
        self,
        file_key: str,
        format: CommentExportFormat,
        output_path: Optional[Union[str, Path]] = None,
    ) -> str:
        """
        Export reactions data in various formats.
        
        Args:
            file_key: Figma file key
            format: Export format
            output_path: Optional output file path
            
        Returns:
            Exported data as string (or file path if output_path provided)
        """
        comments = await self.list_all_comments(file_key)
        
        if format == CommentExportFormat.JSON:
            data = self._export_reactions_json(comments, file_key)
        elif format == CommentExportFormat.CSV:
            data = self._export_reactions_csv(comments, file_key)
        elif format == CommentExportFormat.MARKDOWN:
            data = self._export_reactions_markdown(comments, file_key)
        else:
            raise ValidationError(f"Unsupported export format: {format}")
        
        if output_path:
            Path(output_path).write_text(data, encoding="utf-8")
            return str(output_path)
        
        return data
    
    def _export_reactions_json(self, comments: List[Comment], file_key: str) -> str:
        """Export reactions data as JSON."""
        reactions_data = []
        total_reactions = 0
        
        for comment in comments:
            if comment.reactions:
                for reaction in comment.reactions:
                    total_reactions += 1
                    reactions_data.append({
                        "comment_id": comment.id,
                        "comment_message": comment.message[:100] + "..." if len(comment.message) > 100 else comment.message,
                        "emoji": reaction.emoji.value,
                        "user_id": reaction.user.id,
                        "user_handle": reaction.user.handle,
                        "created_at": reaction.created_at.isoformat(),
                    })
        
        export_data = {
            "file_key": file_key,
            "exported_at": datetime.now().isoformat(),
            "total_comments": len(comments),
            "total_reactions": total_reactions,
            "reactions": reactions_data,
        }
        
        return json.dumps(export_data, indent=2, ensure_ascii=False)
    
    def _export_reactions_csv(self, comments: List[Comment], file_key: str) -> str:
        """Export reactions data as CSV."""
        import io
        
        output = io.StringIO()
        fieldnames = [
            "comment_id", "comment_message", "emoji", "user_id", "user_handle", "created_at"
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for comment in comments:
            for reaction in comment.reactions:
                row = {
                    "comment_id": comment.id,
                    "comment_message": comment.message[:100] + "..." if len(comment.message) > 100 else comment.message,
                    "emoji": reaction.emoji.value,
                    "user_id": reaction.user.id,
                    "user_handle": reaction.user.handle,
                    "created_at": reaction.created_at.isoformat(),
                }
                writer.writerow(row)
        
        return output.getvalue()
    
    def _export_reactions_markdown(self, comments: List[Comment], file_key: str) -> str:
        """Export reactions data as Markdown."""
        lines = [
            f"# Reactions for Figma File: {file_key}",
            "",
            f"*Exported on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
            "",
        ]
        
        # Aggregate statistics
        total_reactions = sum(len(comment.reactions) for comment in comments)
        emoji_counts = {}
        user_counts = {}
        
        for comment in comments:
            for reaction in comment.reactions:
                emoji = reaction.emoji.value
                user = reaction.user.handle
                emoji_counts[emoji] = emoji_counts.get(emoji, 0) + 1
                user_counts[user] = user_counts.get(user, 0) + 1
        
        lines.extend([
            "## Summary",
            "",
            f"- **Total Comments:** {len(comments)}",
            f"- **Total Reactions:** {total_reactions}",
            f"- **Unique Emojis:** {len(emoji_counts)}",
            f"- **Active Reactors:** {len(user_counts)}",
            "",
        ])
        
        # Popular emojis
        if emoji_counts:
            lines.extend([
                "## Popular Reactions",
                "",
            ])
            sorted_emojis = sorted(emoji_counts.items(), key=lambda x: x[1], reverse=True)
            for emoji, count in sorted_emojis[:10]:
                lines.append(f"- {emoji} {count} reactions")
            lines.append("")
        
        # Comments with reactions
        comments_with_reactions = [c for c in comments if c.reactions]
        if comments_with_reactions:
            lines.extend([
                "## Comments with Reactions",
                "",
            ])
            
            for comment in comments_with_reactions:
                lines.extend([
                    f"### Comment: {comment.id}",
                    f"**Author:** {comment.user.handle}",
                    f"**Message:** {comment.message[:200]}{'...' if len(comment.message) > 200 else ''}",
                    "",
                ])
                
                # Group reactions by emoji
                reaction_summary = {}
                for reaction in comment.reactions:
                    emoji = reaction.emoji.value
                    if emoji not in reaction_summary:
                        reaction_summary[emoji] = []
                    reaction_summary[emoji].append(reaction.user.handle)
                
                lines.append("**Reactions:**")
                for emoji, users in reaction_summary.items():
                    user_list = ", ".join(users[:5])  # Limit to first 5 users
                    if len(users) > 5:
                        user_list += f" and {len(users) - 5} more"
                    lines.append(f"- {emoji} by {user_list}")
                
                lines.extend(["", "---", ""])
        
        return "\n".join(lines)
    
    # Export functionality
    
    async def export_comments(
        self,
        file_key: str,
        format: CommentExportFormat,
        output_path: Optional[Union[str, Path]] = None,
    ) -> str:
        """
        Export comments in various formats.
        
        Args:
            file_key: Figma file key
            format: Export format
            output_path: Optional output file path
            
        Returns:
            Exported data as string (or file path if output_path provided)
        """
        comments = await self.list_all_comments(file_key)
        
        if format == CommentExportFormat.JSON:
            data = self._export_json(comments)
        elif format == CommentExportFormat.CSV:
            data = self._export_csv(comments)
        elif format == CommentExportFormat.MARKDOWN:
            data = self._export_markdown(comments, file_key)
        else:
            raise ValidationError(f"Unsupported export format: {format}")
        
        if output_path:
            Path(output_path).write_text(data, encoding="utf-8")
            return str(output_path)
        
        return data
    
    def _export_json(self, comments: List[Comment]) -> str:
        """Export comments as JSON."""
        data = []
        for comment in comments:
            comment_dict = comment.model_dump()
            # Convert datetime objects to ISO strings
            for field in ["created_at", "updated_at", "resolved_at"]:
                if comment_dict.get(field):
                    comment_dict[field] = comment_dict[field].isoformat()
            data.append(comment_dict)
        
        return json.dumps(data, indent=2, ensure_ascii=False)
    
    def _export_csv(self, comments: List[Comment]) -> str:
        """Export comments as CSV."""
        import io
        
        output = io.StringIO()
        fieldnames = [
            "id", "message", "user_handle", "user_email", "created_at",
            "updated_at", "resolved_at", "parent_id", "node_id",
            "x", "y", "reactions_count"
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for comment in comments:
            row = {
                "id": comment.id,
                "message": comment.message,
                "user_handle": comment.user.handle,
                "user_email": comment.user.email or "",
                "created_at": comment.created_at.isoformat(),
                "updated_at": comment.updated_at.isoformat() if comment.updated_at else "",
                "resolved_at": comment.resolved_at.isoformat() if comment.resolved_at else "",
                "parent_id": comment.parent_id or "",
                "node_id": comment.node_id or "",
                "x": comment.coordinates.x if comment.coordinates else "",
                "y": comment.coordinates.y if comment.coordinates else "",
                "reactions_count": len(comment.reactions),
            }
            writer.writerow(row)
        
        return output.getvalue()
    
    def _export_markdown(self, comments: List[Comment], file_key: str) -> str:
        """Export comments as Markdown."""
        lines = [
            f"# Comments for Figma File: {file_key}",
            "",
            f"*Exported on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
            "",
        ]
        
        # Group comments by threads
        threads = {}
        orphaned_replies = []
        
        for comment in comments:
            if comment.parent_id is None:
                threads[comment.id] = {"root": comment, "replies": []}
            else:
                if comment.parent_id in threads:
                    threads[comment.parent_id]["replies"].append(comment)
                else:
                    orphaned_replies.append(comment)
        
        # Export threads
        for thread_id, thread_data in threads.items():
            root_comment = thread_data["root"]
            replies = thread_data["replies"]
            
            # Root comment
            lines.extend([
                f"## Comment: {root_comment.id}",
                "",
                f"**Author:** {root_comment.user.handle}  ",
                f"**Created:** {root_comment.created_at.strftime('%Y-%m-%d %H:%M:%S')}  ",
            ])
            
            if root_comment.is_resolved:
                lines.append(f"**Status:** ✅ Resolved  ")
            
            if root_comment.coordinates:
                lines.append(f"**Position:** ({root_comment.coordinates.x}, {root_comment.coordinates.y})  ")
            
            if root_comment.node_id:
                lines.append(f"**Node:** {root_comment.node_id}  ")
            
            lines.extend([
                "",
                root_comment.message,
                "",
            ])
            
            # Reactions
            if root_comment.reactions:
                reaction_summary = {}
                for reaction in root_comment.reactions:
                    emoji = reaction.emoji.value
                    reaction_summary[emoji] = reaction_summary.get(emoji, 0) + 1
                
                reaction_text = " ".join(f"{emoji} {count}" for emoji, count in reaction_summary.items())
                lines.extend([
                    f"**Reactions:** {reaction_text}",
                    "",
                ])
            
            # Replies
            if replies:
                lines.append("### Replies")
                lines.append("")
                
                for reply in sorted(replies, key=lambda r: r.created_at):
                    lines.extend([
                        f"#### Reply by {reply.user.handle}",
                        f"*{reply.created_at.strftime('%Y-%m-%d %H:%M:%S')}*",
                        "",
                        reply.message,
                        "",
                    ])
            
            lines.append("---")
            lines.append("")
        
        # Export orphaned replies
        if orphaned_replies:
            lines.extend([
                "## Orphaned Replies",
                "",
                "*These replies don't have a parent comment in the current data.*",
                "",
            ])
            
            for reply in orphaned_replies:
                lines.extend([
                    f"### Reply: {reply.id}",
                    f"**Author:** {reply.user.handle}  ",
                    f"**Created:** {reply.created_at.strftime('%Y-%m-%d %H:%M:%S')}  ",
                    f"**Parent ID:** {reply.parent_id}  ",
                    "",
                    reply.message,
                    "",
                    "---",
                    "",
                ])
        
        return "\n".join(lines)
    
    # Archive functionality
    
    async def archive_resolved_comments(self, file_key: str) -> BulkCommentResult:
        """
        Archive (delete) all resolved comments.
        
        Args:
            file_key: Figma file key
            
        Returns:
            Bulk operation result
        """
        comments = await self.list_all_comments(file_key)
        resolved_comment_ids = [
            comment.id for comment in comments
            if comment.is_resolved
        ]
        
        if not resolved_comment_ids:
            return BulkCommentResult()
        
        return await self.bulk_delete_comments(file_key, resolved_comment_ids)
    
    # Utility methods
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the API connection.
        
        Returns:
            Health check results
        """
        try:
            # Try to make a simple request
            start_time = datetime.now()
            await self._client.get("/v1/me")
            end_time = datetime.now()
            
            response_time = (end_time - start_time).total_seconds()
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "client_stats": self.stats,
            }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "client_stats": self.stats,
            }