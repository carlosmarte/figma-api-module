"""Command-line interface for Figma Components."""

import os
import asyncio
import json
from typing import Optional, List, Any
from pathlib import Path

import typer
import uvicorn
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt
from rich import print as rprint

from .sdk import FigmaComponentsSDK
from .models import StyleType
from .errors import FigmaComponentsError
from .utils import (
    extract_file_key_from_url,
    extract_team_id_from_url,
    format_pagination_info,
)

app = typer.Typer(
    name="figma-components",
    help="Figma Components CLI - Interact with Figma's Components, Component Sets, and Styles APIs",
    no_args_is_help=True,
)

console = Console()


def get_api_key() -> str:
    """Get API key from environment or prompt user."""
    api_key = os.getenv("FIGMA_TOKEN")
    if not api_key:
        api_key = Prompt.ask("Enter your Figma API token", password=True)
        if not api_key:
            raise typer.Exit("API token is required")
    return api_key


def create_sdk(api_key: Optional[str] = None) -> FigmaComponentsSDK:
    """Create SDK instance with API key."""
    if not api_key:
        api_key = get_api_key()
    return FigmaComponentsSDK(api_key)


def format_datetime(dt: Any) -> str:
    """Format datetime for display."""
    if hasattr(dt, "strftime"):
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    return str(dt)


def output_json(data: Any, file_path: Optional[str] = None) -> None:
    """Output data as JSON."""
    json_str = json.dumps(data, indent=2, default=str)
    
    if file_path:
        Path(file_path).write_text(json_str)
        console.print(f"[green]Saved to {file_path}[/green]")
    else:
        rprint(json_str)


def create_components_table(components: List[Any]) -> Table:
    """Create a rich table for components."""
    table = Table(title="Components")
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Key", style="yellow")
    table.add_column("Description", style="white")
    table.add_column("Updated", style="green")
    table.add_column("User", style="blue")
    
    for component in components:
        table.add_row(
            component.name,
            component.key[:20] + "..." if len(component.key) > 20 else component.key,
            component.description[:50] + "..." if len(component.description) > 50 else component.description,
            format_datetime(component.updated_at),
            component.user.handle,
        )
    
    return table


def create_styles_table(styles: List[Any]) -> Table:
    """Create a rich table for styles."""
    table = Table(title="Styles")
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Type", style="magenta")
    table.add_column("Key", style="yellow")
    table.add_column("Description", style="white")
    table.add_column("Updated", style="green")
    
    for style in styles:
        table.add_row(
            style.name,
            style.style_type.value,
            style.key[:20] + "..." if len(style.key) > 20 else style.key,
            style.description[:50] + "..." if len(style.description) > 50 else style.description,
            format_datetime(style.updated_at),
        )
    
    return table


# Component commands
@app.command("components")
def list_components(
    team_id: Optional[str] = typer.Option(None, "--team-id", "-t", help="Team ID"),
    file_key: Optional[str] = typer.Option(None, "--file-key", "-f", help="File key"),
    url: Optional[str] = typer.Option(None, "--url", "-u", help="Figma URL"),
    search: Optional[str] = typer.Option(None, "--search", "-s", help="Search query"),
    limit: int = typer.Option(30, "--limit", "-l", help="Maximum number of results"),
    output_format: str = typer.Option("table", "--format", help="Output format (table, json)"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """List components from a team or file."""
    async def _list_components() -> None:
        try:
            sdk = create_sdk(api_key)
            
            async with sdk:
                # Determine source
                if url:
                    team_id_from_url = extract_team_id_from_url(url)
                    file_key_from_url = extract_file_key_from_url(url)
                    
                    if team_id_from_url:
                        team_id = team_id_from_url
                    elif file_key_from_url:
                        file_key = file_key_from_url
                    else:
                        console.print("[red]Could not extract team ID or file key from URL[/red]")
                        raise typer.Exit(1)
                
                if not team_id and not file_key:
                    console.print("[red]Either --team-id, --file-key, or --url is required[/red]")
                    raise typer.Exit(1)
                
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching components...", total=None)
                    
                    if search and team_id:
                        components = await sdk.search_team_components(team_id, search, limit)
                    elif team_id:
                        components = await sdk.list_team_components(team_id, page_size=min(limit, 1000))
                    else:
                        components = await sdk.list_file_components(file_key)
                    
                    progress.remove_task(task)
                
                if not components:
                    console.print("[yellow]No components found[/yellow]")
                    return
                
                # Limit results
                components = components[:limit]
                
                if output_format == "json":
                    data = [comp.model_dump() for comp in components]
                    output_json(data, output_file)
                else:
                    table = create_components_table(components)
                    console.print(table)
                    console.print(f"[dim]Found {len(components)} components[/dim]")
                    
        except FigmaComponentsError as e:
            console.print(f"[red]API Error: {e.message}[/red]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            raise typer.Exit(1)
    
    asyncio.run(_list_components())


@app.command("component")
def get_component(
    key: str = typer.Argument(..., help="Component key"),
    output_format: str = typer.Option("table", "--format", help="Output format (table, json)"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get a specific component by key."""
    async def _get_component() -> None:
        try:
            sdk = create_sdk(api_key)
            
            async with sdk:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching component...", total=None)
                    component = await sdk.get_component(key)
                    progress.remove_task(task)
                
                if output_format == "json":
                    output_json(component.model_dump(), output_file)
                else:
                    table = create_components_table([component])
                    console.print(table)
                    
        except FigmaComponentsError as e:
            console.print(f"[red]API Error: {e.message}[/red]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            raise typer.Exit(1)
    
    asyncio.run(_get_component())


# Component Set commands
@app.command("component-sets")
def list_component_sets(
    team_id: Optional[str] = typer.Option(None, "--team-id", "-t", help="Team ID"),
    file_key: Optional[str] = typer.Option(None, "--file-key", "-f", help="File key"),
    url: Optional[str] = typer.Option(None, "--url", "-u", help="Figma URL"),
    limit: int = typer.Option(30, "--limit", "-l", help="Maximum number of results"),
    output_format: str = typer.Option("table", "--format", help="Output format (table, json)"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """List component sets from a team or file."""
    async def _list_component_sets() -> None:
        try:
            sdk = create_sdk(api_key)
            
            async with sdk:
                # Determine source
                if url:
                    team_id_from_url = extract_team_id_from_url(url)
                    file_key_from_url = extract_file_key_from_url(url)
                    
                    if team_id_from_url:
                        team_id = team_id_from_url
                    elif file_key_from_url:
                        file_key = file_key_from_url
                
                if not team_id and not file_key:
                    console.print("[red]Either --team-id, --file-key, or --url is required[/red]")
                    raise typer.Exit(1)
                
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching component sets...", total=None)
                    
                    if team_id:
                        component_sets = await sdk.list_team_component_sets(team_id, page_size=min(limit, 1000))
                    else:
                        component_sets = await sdk.list_file_component_sets(file_key)
                    
                    progress.remove_task(task)
                
                if not component_sets:
                    console.print("[yellow]No component sets found[/yellow]")
                    return
                
                # Limit results
                component_sets = component_sets[:limit]
                
                if output_format == "json":
                    data = [cs.model_dump() for cs in component_sets]
                    output_json(data, output_file)
                else:
                    table = create_components_table(component_sets)  # Same structure as components
                    table.title = "Component Sets"
                    console.print(table)
                    console.print(f"[dim]Found {len(component_sets)} component sets[/dim]")
                    
        except FigmaComponentsError as e:
            console.print(f"[red]API Error: {e.message}[/red]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            raise typer.Exit(1)
    
    asyncio.run(_list_component_sets())


# Style commands
@app.command("styles")
def list_styles(
    team_id: Optional[str] = typer.Option(None, "--team-id", "-t", help="Team ID"),
    file_key: Optional[str] = typer.Option(None, "--file-key", "-f", help="File key"),
    url: Optional[str] = typer.Option(None, "--url", "-u", help="Figma URL"),
    style_type: Optional[StyleType] = typer.Option(None, "--type", help="Filter by style type"),
    limit: int = typer.Option(30, "--limit", "-l", help="Maximum number of results"),
    output_format: str = typer.Option("table", "--format", help="Output format (table, json)"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """List styles from a team or file."""
    async def _list_styles() -> None:
        try:
            sdk = create_sdk(api_key)
            
            async with sdk:
                # Determine source
                if url:
                    team_id_from_url = extract_team_id_from_url(url)
                    file_key_from_url = extract_file_key_from_url(url)
                    
                    if team_id_from_url:
                        team_id = team_id_from_url
                    elif file_key_from_url:
                        file_key = file_key_from_url
                
                if not team_id and not file_key:
                    console.print("[red]Either --team-id, --file-key, or --url is required[/red]")
                    raise typer.Exit(1)
                
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching styles...", total=None)
                    
                    if team_id:
                        styles = await sdk.list_team_styles(
                            team_id, 
                            page_size=min(limit, 1000),
                            style_type=style_type,
                        )
                    else:
                        styles = await sdk.list_file_styles(file_key, style_type=style_type)
                    
                    progress.remove_task(task)
                
                if not styles:
                    console.print("[yellow]No styles found[/yellow]")
                    return
                
                # Limit results
                styles = styles[:limit]
                
                if output_format == "json":
                    data = [style.model_dump() for style in styles]
                    output_json(data, output_file)
                else:
                    table = create_styles_table(styles)
                    console.print(table)
                    console.print(f"[dim]Found {len(styles)} styles[/dim]")
                    
        except FigmaComponentsError as e:
            console.print(f"[red]API Error: {e.message}[/red]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            raise typer.Exit(1)
    
    asyncio.run(_list_styles())


# All assets command
@app.command("all")
def get_all_assets(
    team_id: str = typer.Argument(..., help="Team ID"),
    output_format: str = typer.Option("json", "--format", help="Output format (json only for this command)"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get all assets (components, component sets, styles) from a team."""
    async def _get_all_assets() -> None:
        try:
            sdk = create_sdk(api_key)
            
            async with sdk:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching all assets...", total=None)
                    assets = await sdk.get_all_team_assets(team_id)
                    progress.remove_task(task)
                
                # Convert to serializable format
                data = {
                    "components": [comp.model_dump() for comp in assets["components"]],
                    "component_sets": [cs.model_dump() for cs in assets["component_sets"]],
                    "styles": [style.model_dump() for style in assets["styles"]],
                }
                
                output_json(data, output_file)
                
                console.print(f"[green]Found:[/green]")
                console.print(f"  • {len(assets['components'])} components")
                console.print(f"  • {len(assets['component_sets'])} component sets")
                console.print(f"  • {len(assets['styles'])} styles")
                    
        except FigmaComponentsError as e:
            console.print(f"[red]API Error: {e.message}[/red]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            raise typer.Exit(1)
    
    asyncio.run(_get_all_assets())


# Server command
@app.command("serve")
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to serve on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to serve on"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Start the FastAPI server."""
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    console.print(f"[green]Starting server on {host}:{port}[/green]")
    console.print(f"[blue]API docs available at: http://{host}:{port}/docs[/blue]")
    
    uvicorn.run(
        "figma_components.server:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )


if __name__ == "__main__":
    app()