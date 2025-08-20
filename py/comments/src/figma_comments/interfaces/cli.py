"""Command-line interface for Figma Comments API."""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional, List, Any

import typer
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.text import Text
from rich.prompt import Confirm

from ..interfaces.sdk import FigmaCommentsSDK
from ..core.models import CommentExportFormat, Emoji
from ..core.exceptions import FigmaCommentsError


# Create Typer app
app = typer.Typer(
    name="figma-comments",
    help="CLI tool for Figma Comments API operations",
    add_completion=False,
)

# Create reactions subcommand group
reactions_app = typer.Typer(
    name="reactions",
    help="Manage comment reactions",
    add_completion=False,
)
app.add_typer(reactions_app, name="reactions")

# Rich console for output
console = Console()


def get_api_token() -> str:
    """Get API token from environment or prompt user."""
    token = os.getenv("FIGMA_TOKEN")
    if not token:
        console.print(
            "[yellow]Warning:[/yellow] FIGMA_TOKEN environment variable not set."
        )
        token = typer.prompt("Please enter your Figma API token", hide_input=True)
    return token


def handle_async(coro):
    """Handle async functions in CLI commands."""
    try:
        return asyncio.run(coro)
    except KeyboardInterrupt:
        console.print("\n[yellow]Operation cancelled by user[/yellow]")
        raise typer.Exit(1)
    except FigmaCommentsError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Unexpected error:[/red] {e}")
        raise typer.Exit(1)


@app.command()
def list(
    file_key: str = typer.Argument(..., help="Figma file key"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    show_resolved: bool = typer.Option(True, "--show-resolved/--hide-resolved", help="Show resolved comments"),
    limit: Optional[int] = typer.Option(None, "--limit", "-n", help="Limit number of comments shown"),
) -> None:
    """List all comments in a file."""
    
    async def _list_comments():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Fetching comments...", total=None)
                comments = await sdk.list_all_comments(file_key)
            
            # Filter resolved comments if needed
            if not show_resolved:
                comments = [c for c in comments if not c.is_resolved]
            
            # Apply limit
            if limit:
                comments = comments[:limit]
            
            if output_format == "json":
                # Export as JSON
                data = []
                for comment in comments:
                    comment_dict = comment.model_dump()
                    # Convert datetime objects to ISO strings
                    for field in ["created_at", "updated_at", "resolved_at"]:
                        if comment_dict.get(field):
                            comment_dict[field] = comment_dict[field].isoformat()
                    data.append(comment_dict)
                
                console.print_json(json.dumps(data, indent=2))
                
            else:
                # Display as table
                table = Table(title=f"Comments in {file_key}")
                table.add_column("ID", style="cyan", no_wrap=True)
                table.add_column("Author", style="green")
                table.add_column("Message", style="white")
                table.add_column("Created", style="blue")
                table.add_column("Status", style="yellow")
                table.add_column("Replies", style="magenta")
                table.add_column("Reactions", style="red")
                
                for comment in comments:
                    status = "✅ Resolved" if comment.is_resolved else "💬 Active"
                    reply_count = len([c for c in comments if c.parent_id == comment.id])
                    
                    # Truncate long messages
                    message = comment.message
                    if len(message) > 50:
                        message = message[:47] + "..."
                    
                    # Format reactions
                    reaction_text = ""
                    if comment.reactions:
                        reaction_summary = {}
                        for reaction in comment.reactions:
                            emoji = reaction.emoji.value
                            reaction_summary[emoji] = reaction_summary.get(emoji, 0) + 1
                        reaction_text = " ".join(f"{emoji}{count}" for emoji, count in reaction_summary.items())
                    
                    table.add_row(
                        comment.id[:8] + "...",
                        comment.user.handle,
                        message,
                        comment.created_at.strftime("%Y-%m-%d %H:%M"),
                        status,
                        str(reply_count),
                        reaction_text or "-",
                    )
                
                console.print(table)
                console.print(f"\n[green]Total comments:[/green] {len(comments)}")
    
    handle_async(_list_comments())


@app.command()
def add(
    file_key: str = typer.Argument(..., help="Figma file key"),
    message: str = typer.Argument(..., help="Comment message"),
    x: Optional[float] = typer.Option(None, "--x", help="X coordinate"),
    y: Optional[float] = typer.Option(None, "--y", help="Y coordinate"),
    node_id: Optional[str] = typer.Option(None, "--node-id", help="Node ID to attach comment to"),
) -> None:
    """Add a new comment to a file."""
    
    async def _add_comment():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Adding comment...", total=None)
                
                if node_id:
                    response = await sdk.add_comment_to_node(
                        file_key, node_id, message, x=x or 0.0, y=y or 0.0
                    )
                elif x is not None and y is not None:
                    response = await sdk.add_comment_with_coordinates(file_key, x, y, message)
                else:
                    # Add without coordinates
                    from ..core.models import CreateCommentRequest
                    request = CreateCommentRequest(message=message)
                    response = await sdk._service.add_comment(file_key, request)
            
            console.print(Panel(
                f"[green]Comment added successfully![/green]\n"
                f"ID: {response.id}\n"
                f"Message: {response.message}\n"
                f"Author: {response.user.handle}",
                title="Success"
            ))
    
    handle_async(_add_comment())


@app.command()
def delete(
    file_key: str = typer.Argument(..., help="Figma file key"),
    comment_id: str = typer.Argument(..., help="Comment ID to delete"),
    confirm: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation prompt"),
) -> None:
    """Delete a comment."""
    
    async def _delete_comment():
        if not confirm:
            if not Confirm.ask(f"Are you sure you want to delete comment {comment_id}?"):
                console.print("[yellow]Operation cancelled[/yellow]")
                return
        
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Deleting comment...", total=None)
                success = await sdk.delete_comment(file_key, comment_id)
            
            if success:
                console.print(f"[green]Comment {comment_id} deleted successfully![/green]")
            else:
                console.print(f"[red]Failed to delete comment {comment_id}[/red]")
    
    handle_async(_delete_comment())


@app.command()
def reply(
    file_key: str = typer.Argument(..., help="Figma file key"),
    parent_id: str = typer.Argument(..., help="Parent comment ID"),
    message: str = typer.Argument(..., help="Reply message"),
) -> None:
    """Reply to a comment."""
    
    async def _reply_to_comment():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Adding reply...", total=None)
                response = await sdk.reply_to_comment(file_key, parent_id, message)
            
            console.print(Panel(
                f"[green]Reply added successfully![/green]\n"
                f"ID: {response.id}\n"
                f"Parent: {parent_id}\n"
                f"Message: {response.message}\n"
                f"Author: {response.user.handle}",
                title="Success"
            ))
    
    handle_async(_reply_to_comment())


@app.command()
def search(
    file_key: str = typer.Argument(..., help="Figma file key"),
    query: str = typer.Argument(..., help="Search query"),
    case_sensitive: bool = typer.Option(False, "--case-sensitive", help="Case sensitive search"),
    include_resolved: bool = typer.Option(True, "--include-resolved/--exclude-resolved", help="Include resolved comments"),
) -> None:
    """Search comments by content."""
    
    async def _search_comments():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Searching comments...", total=None)
                result = await sdk.search_comments(
                    file_key, query,
                    case_sensitive=case_sensitive,
                    include_resolved=include_resolved
                )
            
            if not result.comments:
                console.print(f"[yellow]No comments found matching '{query}'[/yellow]")
                return
            
            table = Table(title=f"Search Results for '{query}'")
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Author", style="green")
            table.add_column("Message", style="white")
            table.add_column("Created", style="blue")
            table.add_column("Status", style="yellow")
            
            for comment in result.comments:
                status = "✅ Resolved" if comment.is_resolved else "💬 Active"
                
                # Highlight search terms
                message = comment.message
                if len(message) > 80:
                    message = message[:77] + "..."
                
                table.add_row(
                    comment.id[:8] + "...",
                    comment.user.handle,
                    message,
                    comment.created_at.strftime("%Y-%m-%d %H:%M"),
                    status,
                )
            
            console.print(table)
            console.print(f"\n[green]Found {result.total_matches} matching comments[/green]")
    
    handle_async(_search_comments())


@app.command()
def unresolved(
    file_key: str = typer.Argument(..., help="Figma file key"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
) -> None:
    """Get unresolved comments."""
    
    async def _get_unresolved():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Fetching unresolved comments...", total=None)
                comments = await sdk.get_unresolved_comments(file_key)
            
            if output_format == "json":
                data = []
                for comment in comments:
                    comment_dict = comment.model_dump()
                    for field in ["created_at", "updated_at", "resolved_at"]:
                        if comment_dict.get(field):
                            comment_dict[field] = comment_dict[field].isoformat()
                    data.append(comment_dict)
                
                console.print_json(json.dumps(data, indent=2))
                
            else:
                if not comments:
                    console.print("[green]No unresolved comments found! 🎉[/green]")
                    return
                
                table = Table(title=f"Unresolved Comments in {file_key}")
                table.add_column("ID", style="cyan", no_wrap=True)
                table.add_column("Author", style="green")
                table.add_column("Message", style="white")
                table.add_column("Created", style="blue")
                table.add_column("Days Old", style="red")
                
                from datetime import datetime
                now = datetime.now()
                
                for comment in comments:
                    days_old = (now - comment.created_at.replace(tzinfo=None)).days
                    
                    message = comment.message
                    if len(message) > 60:
                        message = message[:57] + "..."
                    
                    table.add_row(
                        comment.id[:8] + "...",
                        comment.user.handle,
                        message,
                        comment.created_at.strftime("%Y-%m-%d %H:%M"),
                        str(days_old),
                    )
                
                console.print(table)
                console.print(f"\n[red]Total unresolved:[/red] {len(comments)}")
    
    handle_async(_get_unresolved())


@app.command()
def export(
    file_key: str = typer.Argument(..., help="Figma file key"),
    format: CommentExportFormat = typer.Argument(..., help="Export format: json, csv, md"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
) -> None:
    """Export comments to file."""
    
    async def _export_comments():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Exporting comments...", total=None)
                
                # Generate output path if not provided
                if output is None:
                    output_path = f"comments_{file_key}.{format.value}"
                else:
                    output_path = output
                
                result_path = await sdk.export_comments(file_key, format, output_path)
            
            console.print(f"[green]Comments exported to:[/green] {result_path}")
            
            # Show file size
            file_size = Path(result_path).stat().st_size
            console.print(f"[blue]File size:[/blue] {file_size:,} bytes")
    
    handle_async(_export_comments())


@app.command()
def stats(
    file_key: str = typer.Argument(..., help="Figma file key"),
) -> None:
    """Get comment statistics for a file."""
    
    async def _get_stats():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Calculating statistics...", total=None)
                stats = await sdk.get_comment_statistics(file_key)
            
            # Create statistics panel
            stats_text = Text()
            stats_text.append(f"Total Comments: ", style="bold blue")
            stats_text.append(f"{stats.total_comments}\n", style="white")
            
            stats_text.append(f"Comment Threads: ", style="bold blue")
            stats_text.append(f"{stats.total_threads}\n", style="white")
            
            stats_text.append(f"Resolved: ", style="bold green")
            stats_text.append(f"{stats.resolved_comments}\n", style="white")
            
            stats_text.append(f"Unresolved: ", style="bold red")
            stats_text.append(f"{stats.unresolved_comments}\n", style="white")
            
            stats_text.append(f"Resolution Rate: ", style="bold yellow")
            stats_text.append(f"{stats.resolution_rate:.1f}%\n", style="white")
            
            stats_text.append(f"Total Reactions: ", style="bold magenta")
            stats_text.append(f"{stats.total_reactions}\n", style="white")
            
            stats_text.append(f"Contributors: ", style="bold cyan")
            stats_text.append(f"{stats.unique_contributors}", style="white")
            
            console.print(Panel(stats_text, title=f"Comment Statistics - {file_key}"))
            
            # Show top contributors if available
            if stats.comments_by_user:
                console.print("\n[bold]Top Contributors:[/bold]")
                sorted_users = sorted(
                    stats.comments_by_user.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                for i, (user, count) in enumerate(sorted_users[:5], 1):
                    console.print(f"{i}. {user}: {count} comments")
            
            # Show popular reactions if available
            if stats.reactions_by_emoji:
                console.print("\n[bold]Popular Reactions:[/bold]")
                sorted_reactions = sorted(
                    stats.reactions_by_emoji.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                reaction_text = " ".join(f"{emoji} {count}" for emoji, count in sorted_reactions)
                console.print(reaction_text)
    
    handle_async(_get_stats())


@app.command()
def health(
    timeout: float = typer.Option(10.0, "--timeout", "-t", help="Request timeout in seconds"),
) -> None:
    """Check API health and connection."""
    
    async def _health_check():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token, timeout=timeout) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Checking API health...", total=None)
                health_data = await sdk.health_check()
            
            if health_data["status"] == "healthy":
                console.print(Panel(
                    f"[green]✅ API is healthy[/green]\n"
                    f"Response time: {health_data['response_time_seconds']:.3f}s\n"
                    f"Requests made: {health_data['client_stats']['request_count']}\n"
                    f"Error rate: {health_data['client_stats']['error_rate']:.2%}",
                    title="Health Check - OK"
                ))
            else:
                console.print(Panel(
                    f"[red]❌ API is unhealthy[/red]\n"
                    f"Error: {health_data.get('error', 'Unknown error')}\n"
                    f"Requests made: {health_data['client_stats']['request_count']}\n"
                    f"Error rate: {health_data['client_stats']['error_rate']:.2%}",
                    title="Health Check - FAILED"
                ))
                raise typer.Exit(1)
    
    handle_async(_health_check())


# Reaction commands

@reactions_app.command("list")
def list_reactions(
    file_key: str = typer.Argument(..., help="Figma file key"),
    comment_id: str = typer.Argument(..., help="Comment ID"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
) -> None:
    """List reactions for a comment."""
    
    async def _list_reactions():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Fetching reactions...", total=None)
                reactions_list = await sdk.list_comment_reactions(file_key, comment_id)
            
            if output_format == "json":
                data = {
                    "comment_id": reactions_list.comment_id,
                    "summary": reactions_list.summary.model_dump(),
                    "reactions": [r.model_dump() for r in reactions_list.reactions]
                }
                console.print_json(json.dumps(data, indent=2, default=str))
            else:
                if not reactions_list.reactions:
                    console.print(f"[yellow]No reactions found for comment {comment_id}[/yellow]")
                    return
                
                # Show summary first
                summary = reactions_list.summary
                console.print(Panel(
                    f"[green]Total Reactions:[/green] {summary.total_reactions}\n"
                    f"[blue]Unique Reactors:[/blue] {summary.unique_reactors}\n"
                    f"[yellow]Popular Emoji:[/yellow] {summary.most_popular_emoji or 'N/A'}\n"
                    f"[magenta]Trending Score:[/magenta] {summary.trending_score:.1f}",
                    title=f"Reaction Summary - {comment_id}"
                ))
                
                # Show reactions table
                table = Table(title="Reactions")
                table.add_column("Emoji", style="yellow")
                table.add_column("User", style="green")
                table.add_column("Created", style="blue")
                
                for reaction in reactions_list.reactions:
                    table.add_row(
                        reaction.emoji.value,
                        reaction.user.handle,
                        reaction.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    )
                
                console.print(table)
                
                # Show emoji breakdown
                if summary.reactions_by_emoji:
                    console.print("\n[bold]Emoji Breakdown:[/bold]")
                    for emoji, count in summary.reactions_by_emoji.items():
                        console.print(f"{emoji} {count}")
    
    handle_async(_list_reactions())


@reactions_app.command("add")
def add_reaction(
    file_key: str = typer.Argument(..., help="Figma file key"),
    comment_id: str = typer.Argument(..., help="Comment ID"),
    emoji: str = typer.Argument(..., help="Emoji reaction (e.g., 👍, ❤️, 🎉)"),
) -> None:
    """Add a reaction to a comment."""
    
    async def _add_reaction():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Adding reaction...", total=None)
                response = await sdk.add_emoji_reaction(file_key, comment_id, emoji)
            
            console.print(Panel(
                f"[green]Reaction added successfully![/green]\n"
                f"Emoji: {response.emoji}\n"
                f"User: {response.user.handle}\n"
                f"Comment: {response.comment_id}",
                title="Success"
            ))
    
    handle_async(_add_reaction())


@reactions_app.command("remove")
def remove_reaction(
    file_key: str = typer.Argument(..., help="Figma file key"),
    comment_id: str = typer.Argument(..., help="Comment ID"),
    emoji: str = typer.Argument(..., help="Emoji reaction to remove"),
) -> None:
    """Remove a reaction from a comment."""
    
    async def _remove_reaction():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Removing reaction...", total=None)
                success = await sdk.remove_emoji_reaction(file_key, comment_id, emoji)
            
            if success:
                console.print(f"[green]Reaction {emoji} removed successfully![/green]")
            else:
                console.print(f"[red]Failed to remove reaction {emoji}[/red]")
    
    handle_async(_remove_reaction())


@reactions_app.command("toggle")
def toggle_reaction(
    file_key: str = typer.Argument(..., help="Figma file key"),
    comment_id: str = typer.Argument(..., help="Comment ID"),
    emoji: str = typer.Argument(..., help="Emoji reaction to toggle"),
) -> None:
    """Toggle a reaction on/off for a comment."""
    
    async def _toggle_reaction():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Toggling reaction...", total=None)
                result = await sdk.toggle_emoji_reaction(file_key, comment_id, emoji)
            
            action = result.get("action", "unknown")
            emoji_result = result.get("emoji", emoji)
            
            if action == "added":
                console.print(f"[green]Reaction {emoji_result} added![/green]")
            elif action == "removed":
                console.print(f"[yellow]Reaction {emoji_result} removed![/yellow]")
            else:
                console.print(f"[blue]Reaction {emoji_result} toggled ({action})[/blue]")
    
    handle_async(_toggle_reaction())


@reactions_app.command("summary")
def reaction_summary(
    file_key: str = typer.Argument(..., help="Figma file key"),
    comment_id: str = typer.Argument(..., help="Comment ID"),
) -> None:
    """Get reaction summary for a comment."""
    
    async def _reaction_summary():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Getting reaction summary...", total=None)
                summary = await sdk._service.get_reactions_summary(file_key, comment_id)
            
            # Display summary
            summary_text = Text()
            summary_text.append(f"Total Reactions: ", style="bold blue")
            summary_text.append(f"{summary.total_reactions}\n", style="white")
            
            summary_text.append(f"Unique Reactors: ", style="bold green")
            summary_text.append(f"{summary.unique_reactors}\n", style="white")
            
            summary_text.append(f"Most Popular: ", style="bold yellow")
            summary_text.append(f"{summary.most_popular_emoji or 'N/A'}\n", style="white")
            
            summary_text.append(f"Trending Score: ", style="bold magenta")
            summary_text.append(f"{summary.trending_score:.1f}", style="white")
            
            console.print(Panel(summary_text, title=f"Reaction Summary - {comment_id}"))
            
            # Show emoji breakdown
            if summary.reactions_by_emoji:
                console.print("\n[bold]Emoji Breakdown:[/bold]")
                sorted_emojis = sorted(
                    summary.reactions_by_emoji.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                for emoji, count in sorted_emojis:
                    console.print(f"{emoji} {count}")
            
            # Show user breakdown (top 10)
            if summary.reactions_by_user:
                console.print("\n[bold]Top Reactors:[/bold]")
                user_counts = {}
                for user_id, emojis in summary.reactions_by_user.items():
                    user_counts[user_id] = len(emojis)
                
                sorted_users = sorted(
                    user_counts.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                for user_id, count in sorted_users[:10]:
                    emojis = summary.reactions_by_user[user_id]
                    emoji_text = " ".join(emojis)
                    console.print(f"{user_id}: {count} reactions ({emoji_text})")
    
    handle_async(_reaction_summary())


@reactions_app.command("trending")
def trending_reactions(
    file_key: str = typer.Argument(..., help="Figma file key"),
    hours: int = typer.Option(24, "--hours", "-h", help="Time period in hours"),
) -> None:
    """Get trending reactions for a file."""
    
    async def _trending_reactions():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Analyzing trending reactions...", total=None)
                trending = await sdk.get_trending_reactions(file_key, hours)
            
            # Display trending analysis
            console.print(Panel(
                f"[blue]Time Period:[/blue] {trending.time_period_hours} hours\n"
                f"[green]Reaction Velocity:[/green] {trending.reaction_velocity:.2f} reactions/hour",
                title=f"Trending Analysis - {file_key}"
            ))
            
            # Show trending emojis
            if trending.trending_emojis:
                console.print("\n[bold]Trending Emojis:[/bold]")
                table = Table()
                table.add_column("Emoji", style="yellow")
                table.add_column("Count", style="green")
                table.add_column("Score", style="blue")
                
                for emoji_data in trending.trending_emojis[:10]:
                    table.add_row(
                        emoji_data["emoji"],
                        str(emoji_data["count"]),
                        f"{emoji_data['score']:.2%}",
                    )
                
                console.print(table)
            
            # Show most reacted comments
            if trending.most_reacted_comments:
                console.print("\n[bold]Most Reacted Comments:[/bold]")
                for comment_data in trending.most_reacted_comments[:5]:
                    console.print(f"{comment_data['comment_id'][:8]}... - {comment_data['reaction_count']} reactions")
            
            # Show active reactors
            if trending.active_reactors:
                console.print("\n[bold]Active Reactors:[/bold]")
                for user_data in trending.active_reactors[:5]:
                    console.print(f"{user_data['user_id']} - {user_data['reaction_count']} reactions")
    
    handle_async(_trending_reactions())


@reactions_app.command("export")
def export_reactions(
    file_key: str = typer.Argument(..., help="Figma file key"),
    format: CommentExportFormat = typer.Argument(..., help="Export format: json, csv, md"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
) -> None:
    """Export reactions data to file."""
    
    async def _export_reactions():
        api_token = get_api_token()
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Exporting reactions...", total=None)
                
                # Generate output path if not provided
                if output is None:
                    output_path = f"reactions_{file_key}.{format.value}"
                else:
                    output_path = output
                
                result_path = await sdk.export_reactions_data(file_key, format, output_path)
            
            console.print(f"[green]Reactions exported to:[/green] {result_path}")
            
            # Show file size
            file_size = Path(result_path).stat().st_size
            console.print(f"[blue]File size:[/blue] {file_size:,} bytes")
    
    handle_async(_export_reactions())


@reactions_app.command("bulk")
def bulk_reactions(
    file_key: str = typer.Argument(..., help="Figma file key"),
    emoji: str = typer.Argument(..., help="Emoji reaction"),
    operation: str = typer.Argument(..., help="Operation: add or remove"),
    comment_ids: str = typer.Argument(..., help="Comma-separated comment IDs"),
) -> None:
    """Add or remove reactions to multiple comments."""
    
    async def _bulk_reactions():
        api_token = get_api_token()
        comment_id_list = [cid.strip() for cid in comment_ids.split(",")]
        
        async with FigmaCommentsSDK(api_token) as sdk:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task(f"Bulk {operation} reactions...", total=None)
                result = await sdk.bulk_react_to_comments(
                    file_key, comment_id_list, emoji, operation
                )
            
            # Display results
            console.print(Panel(
                f"[green]Successful:[/green] {len(result.successful)}\n"
                f"[red]Failed:[/red] {len(result.failed)}\n"
                f"[blue]Success Rate:[/blue] {result.success_rate:.1f}%",
                title=f"Bulk {operation.title()} Results"
            ))
            
            if result.successful:
                console.print(f"\n[green]Successfully {operation}ed {emoji} to:[/green]")
                for comment_id in result.successful[:10]:  # Show first 10
                    console.print(f"  - {comment_id}")
                if len(result.successful) > 10:
                    console.print(f"  ... and {len(result.successful) - 10} more")
            
            if result.failed:
                console.print(f"\n[red]Failed to {operation}:[/red]")
                for comment_id in result.failed[:5]:  # Show first 5 failures
                    error = result.errors.get(comment_id, "Unknown error")
                    console.print(f"  - {comment_id}: {error}")
                if len(result.failed) > 5:
                    console.print(f"  ... and {len(result.failed) - 5} more failures")
    
    handle_async(_bulk_reactions())


if __name__ == "__main__":
    app()