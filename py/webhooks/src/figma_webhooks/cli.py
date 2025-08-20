"""
Command-line interface for Figma Webhooks.
"""

import asyncio
import json
import os
import sys
from typing import Optional, List

import typer
import uvicorn
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.syntax import Syntax

from .sdk import FigmaWebhooksSDK
from .models import (
    WebhookEvent,
    WebhookStatus,
    WebhookContext,
    CreateWebhookData,
    UpdateWebhookData,
)
from .errors import FigmaWebhooksError

app = typer.Typer(
    name="figma-webhooks",
    help="Figma Webhooks CLI - Manage Figma webhooks from the command line",
    add_completion=False,
)
console = Console()


def get_api_key(api_key: Optional[str] = None) -> str:
    """Get API key from parameter or environment."""
    if api_key:
        return api_key
    
    api_key = os.getenv("FIGMA_TOKEN")
    if not api_key:
        console.print("[red]Error: API key required. Use --api-key or set FIGMA_TOKEN environment variable.[/red]")
        raise typer.Exit(1)
    
    return api_key


def format_webhook_table(webhooks: List) -> Table:
    """Format webhooks as a rich table."""
    table = Table(title="Figma Webhooks")
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Event Type", style="magenta")
    table.add_column("Context", style="green")
    table.add_column("Status", style="yellow")
    table.add_column("Endpoint", style="blue", max_width=40)
    table.add_column("Description", max_width=30)
    
    for webhook in webhooks:
        status_style = "green" if webhook.status == "ACTIVE" else "red"
        context_info = f"{webhook.context}: {webhook.context_id[:8]}..."
        
        table.add_row(
            webhook.id[:8] + "...",
            webhook.event_type,
            context_info,
            f"[{status_style}]{webhook.status}[/{status_style}]",
            webhook.endpoint,
            webhook.description or "",
        )
    
    return table


def format_requests_table(requests: List) -> Table:
    """Format webhook requests as a rich table."""
    table = Table(title="Webhook Requests")
    table.add_column("Webhook ID", style="cyan", no_wrap=True)
    table.add_column("Endpoint", style="blue", max_width=40)
    table.add_column("Status", style="yellow")
    table.add_column("Sent At", style="green")
    table.add_column("Error", style="red", max_width=30)
    
    for request in requests:
        webhook_id = request.webhook_id[:8] + "..." if len(request.webhook_id) > 8 else request.webhook_id
        status = request.response_info.status if request.response_info else "No Response"
        sent_at = request.request_info.sent_at.strftime("%Y-%m-%d %H:%M:%S")
        error = request.error_msg or ""
        
        table.add_row(
            webhook_id,
            request.request_info.endpoint,
            status,
            sent_at,
            error,
        )
    
    return table


async def run_async_command(coro):
    """Run an async command with proper error handling."""
    try:
        return await coro
    except FigmaWebhooksError as e:
        console.print(f"[red]API Error: {e.message}[/red]")
        if e.status_code:
            console.print(f"[red]Status Code: {e.status_code}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Unexpected error: {str(e)}[/red]")
        raise typer.Exit(1)


@app.command()
def list(
    context: Optional[str] = typer.Option(None, "--context", "-c", help="Context type (team, project, file)"),
    context_id: Optional[str] = typer.Option(None, "--context-id", help="Context ID"),
    plan_api_id: Optional[str] = typer.Option(None, "--plan-api-id", help="Plan API ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
    output: str = typer.Option("table", "--output", "-o", help="Output format (table, json)"),
):
    """List webhooks by context or plan."""
    
    async def _list():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching webhooks...", total=None)
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                webhook_context = None
                if context:
                    webhook_context = WebhookContext(context.upper())
                
                response = await sdk.list_webhooks(
                    context=webhook_context,
                    context_id=context_id,
                    plan_api_id=plan_api_id,
                )
                
                progress.remove_task(task)
        
        if output == "json":
            console.print(json.dumps(response.model_dump(), indent=2, default=str))
        else:
            if response.webhooks:
                table = format_webhook_table(response.webhooks)
                console.print(table)
            else:
                console.print("[yellow]No webhooks found.[/yellow]")
    
    asyncio.run(run_async_command(_list()))


@app.command()
def get(
    webhook_id: str = typer.Argument(..., help="Webhook ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
    output: str = typer.Option("table", "--output", "-o", help="Output format (table, json)"),
):
    """Get a webhook by ID."""
    
    async def _get():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching webhook...", total=None)
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                webhook = await sdk.get_webhook(webhook_id)
                progress.remove_task(task)
        
        if output == "json":
            console.print(json.dumps(webhook.model_dump(), indent=2, default=str))
        else:
            table = format_webhook_table([webhook])
            console.print(table)
    
    asyncio.run(run_async_command(_get()))


@app.command()
def create(
    event_type: str = typer.Option(..., "--event-type", "-e", help="Event type"),
    context: str = typer.Option(..., "--context", "-c", help="Context type (team, project, file)"),
    context_id: str = typer.Option(..., "--context-id", help="Context ID"),
    endpoint: str = typer.Option(..., "--endpoint", help="Webhook endpoint URL"),
    passcode: str = typer.Option(..., "--passcode", help="Webhook passcode"),
    description: Optional[str] = typer.Option(None, "--description", "-d", help="Webhook description"),
    status: str = typer.Option("ACTIVE", "--status", "-s", help="Initial status (ACTIVE, PAUSED)"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
    output: str = typer.Option("table", "--output", "-o", help="Output format (table, json)"),
):
    """Create a new webhook."""
    
    async def _create():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Creating webhook...", total=None)
            
            webhook_data = CreateWebhookData(
                event_type=WebhookEvent(event_type.upper()),
                context=WebhookContext(context.upper()),
                context_id=context_id,
                endpoint=endpoint,
                passcode=passcode,
                description=description,
                status=WebhookStatus(status.upper()),
            )
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                webhook = await sdk.create_webhook(webhook_data)
                progress.remove_task(task)
        
        console.print("[green]✓ Webhook created successfully![/green]")
        
        if output == "json":
            console.print(json.dumps(webhook.model_dump(), indent=2, default=str))
        else:
            table = format_webhook_table([webhook])
            console.print(table)
    
    asyncio.run(run_async_command(_create()))


@app.command()
def update(
    webhook_id: str = typer.Argument(..., help="Webhook ID"),
    event_type: Optional[str] = typer.Option(None, "--event-type", "-e", help="Event type"),
    endpoint: Optional[str] = typer.Option(None, "--endpoint", help="Webhook endpoint URL"),
    passcode: Optional[str] = typer.Option(None, "--passcode", help="Webhook passcode"),
    description: Optional[str] = typer.Option(None, "--description", "-d", help="Webhook description"),
    status: Optional[str] = typer.Option(None, "--status", "-s", help="Status (ACTIVE, PAUSED)"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
    output: str = typer.Option("table", "--output", "-o", help="Output format (table, json)"),
):
    """Update an existing webhook."""
    
    async def _update():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Updating webhook...", total=None)
            
            webhook_data = UpdateWebhookData(
                event_type=WebhookEvent(event_type.upper()) if event_type else None,
                endpoint=endpoint,
                passcode=passcode,
                description=description,
                status=WebhookStatus(status.upper()) if status else None,
            )
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                webhook = await sdk.update_webhook(webhook_id, webhook_data)
                progress.remove_task(task)
        
        console.print("[green]✓ Webhook updated successfully![/green]")
        
        if output == "json":
            console.print(json.dumps(webhook.model_dump(), indent=2, default=str))
        else:
            table = format_webhook_table([webhook])
            console.print(table)
    
    asyncio.run(run_async_command(_update()))


@app.command()
def delete(
    webhook_id: str = typer.Argument(..., help="Webhook ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation prompt"),
):
    """Delete a webhook."""
    
    async def _delete():
        api_key_value = get_api_key(api_key)
        
        if not yes:
            confirm = typer.confirm(f"Are you sure you want to delete webhook {webhook_id}?")
            if not confirm:
                console.print("Cancelled.")
                return
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Deleting webhook...", total=None)
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                await sdk.delete_webhook(webhook_id)
                progress.remove_task(task)
        
        console.print("[green]✓ Webhook deleted successfully![/green]")
    
    asyncio.run(run_async_command(_delete()))


@app.command()
def requests(
    webhook_id: str = typer.Argument(..., help="Webhook ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
    output: str = typer.Option("table", "--output", "-o", help="Output format (table, json)"),
):
    """Get webhook requests for debugging."""
    
    async def _requests():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching webhook requests...", total=None)
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                response = await sdk.get_webhook_requests(webhook_id)
                progress.remove_task(task)
        
        if output == "json":
            console.print(json.dumps(response.model_dump(), indent=2, default=str))
        else:
            if response.requests:
                table = format_requests_table(response.requests)
                console.print(table)
            else:
                console.print("[yellow]No requests found for this webhook.[/yellow]")
    
    asyncio.run(run_async_command(_requests()))


@app.command()
def pause(
    webhook_id: str = typer.Argument(..., help="Webhook ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
):
    """Pause a webhook."""
    
    async def _pause():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Pausing webhook...", total=None)
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                webhook = await sdk.pause_webhook(webhook_id)
                progress.remove_task(task)
        
        console.print("[yellow]✓ Webhook paused successfully![/yellow]")
    
    asyncio.run(run_async_command(_pause()))


@app.command()
def activate(
    webhook_id: str = typer.Argument(..., help="Webhook ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="FIGMA_TOKEN", help="Figma API key"),
):
    """Activate a paused webhook."""
    
    async def _activate():
        api_key_value = get_api_key(api_key)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Activating webhook...", total=None)
            
            async with FigmaWebhooksSDK(api_key_value) as sdk:
                webhook = await sdk.activate_webhook(webhook_id)
                progress.remove_task(task)
        
        console.print("[green]✓ Webhook activated successfully![/green]")
    
    asyncio.run(run_async_command(_activate()))


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run the server on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind the server to"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload for development"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
):
    """Start the FastAPI webhook server."""
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    console.print(Panel.fit(
        f"[bold green]Starting Figma Webhooks Server[/bold green]\n\n"
        f"[blue]Host:[/blue] {host}\n"
        f"[blue]Port:[/blue] {port}\n"
        f"[blue]Docs:[/blue] http://{host}:{port}/docs\n"
        f"[blue]Reload:[/blue] {reload}",
        title="🚀 Server Starting",
        border_style="green",
    ))
    
    uvicorn.run(
        "figma_webhooks.server:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    app()