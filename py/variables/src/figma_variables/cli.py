"""
Typer CLI interface for Figma Variables API.
"""

import os
import json
import asyncio
from typing import Optional, List
from pathlib import Path

import typer
import uvicorn
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.json import JSON

from .sdk import FigmaVariablesSDK
from .models import VariableResolvedDataType, VariableScope
from .utils import extract_file_key_from_url
from .errors import FigmaVariablesError

app = typer.Typer(
    name="figma-variables",
    help="Figma Variables API CLI - Enterprise-only variables management",
    rich_markup_mode="rich"
)
console = Console()


def get_api_token() -> str:
    """Get API token from environment or prompt user."""
    token = os.getenv("FIGMA_TOKEN")
    if not token:
        token = typer.prompt("Figma API Token", hide_input=True)
    return token


def format_file_key(file_key: str) -> str:
    """Extract file key from URL if needed."""
    if "figma.com" in file_key:
        extracted = extract_file_key_from_url(file_key)
        if extracted:
            return extracted
    return file_key


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run server on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind to"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Start the FastAPI server for Variables API."""
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    console.print(f"[bold green]Starting Figma Variables API server...[/bold green]")
    console.print(f"[dim]Server will be available at http://{host}:{port}[/dim]")
    console.print(f"[dim]API docs at http://{host}:{port}/docs[/dim]")
    
    try:
        uvicorn.run(
            "figma_variables.server:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info"
        )
    except ImportError:
        console.print("[red]FastAPI server dependencies not installed.[/red]")
        console.print("Install with: pip install 'figma-variables[server]'")
        raise typer.Exit(1)


@app.command()
def list_variables(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    collection_id: Optional[str] = typer.Option(None, "--collection", "-c", help="Filter by collection ID"),
    published: bool = typer.Option(False, "--published", "-p", help="List published variables"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format (table, json)"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """List variables in a file."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _list_variables():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching variables...", total=None)
                    variables = await sdk.list_variables(
                        file_key, collection_id=collection_id, published=published
                    )
                    progress.update(task, completed=True)
                
                if output_format == "json":
                    data = [
                        {
                            "id": var.id,
                            "name": var.name,
                            "type": var.resolvedType if hasattr(var, 'resolvedType') else var.resolvedDataType,
                            "collection_id": var.variableCollectionId,
                            "description": getattr(var, 'description', ''),
                        }
                        for var in variables
                    ]
                    console.print(JSON.from_data(data))
                else:
                    # Table format
                    table = Table(title=f"Variables in file {file_key}")
                    table.add_column("Name", style="cyan", no_wrap=True)
                    table.add_column("ID", style="dim")
                    table.add_column("Type", style="green")
                    table.add_column("Collection", style="yellow")
                    table.add_column("Description")
                    
                    for var in variables:
                        var_type = var.resolvedType if hasattr(var, 'resolvedType') else var.resolvedDataType
                        table.add_row(
                            var.name,
                            var.id,
                            var_type,
                            var.variableCollectionId,
                            getattr(var, 'description', '')[:50] + "..." if len(getattr(var, 'description', '')) > 50 else getattr(var, 'description', '')
                        )
                    
                    console.print(table)
                    console.print(f"\n[dim]Found {len(variables)} variables[/dim]")
                    
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_list_variables())


@app.command()
def list_collections(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    published: bool = typer.Option(False, "--published", "-p", help="List published collections"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format (table, json)"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """List variable collections in a file."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _list_collections():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching collections...", total=None)
                    collections = await sdk.list_variable_collections(file_key, published=published)
                    progress.update(task, completed=True)
                
                if output_format == "json":
                    data = [
                        {
                            "id": coll.id,
                            "name": coll.name,
                            "key": coll.key,
                            "modes": getattr(coll, 'modes', []),
                            "variable_count": len(getattr(coll, 'variableIds', [])),
                        }
                        for coll in collections
                    ]
                    console.print(JSON.from_data(data))
                else:
                    # Table format
                    table = Table(title=f"Variable Collections in file {file_key}")
                    table.add_column("Name", style="cyan", no_wrap=True)
                    table.add_column("ID", style="dim")
                    table.add_column("Key", style="yellow")
                    table.add_column("Modes", style="green")
                    table.add_column("Variables", style="blue")
                    
                    for coll in collections:
                        modes_count = len(getattr(coll, 'modes', []))
                        variables_count = len(getattr(coll, 'variableIds', []))
                        
                        table.add_row(
                            coll.name,
                            coll.id,
                            coll.key,
                            str(modes_count),
                            str(variables_count)
                        )
                    
                    console.print(table)
                    console.print(f"\n[dim]Found {len(collections)} collections[/dim]")
                    
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_list_collections())


@app.command()
def get_variable(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    variable_id: str = typer.Argument(..., help="Variable ID"),
    published: bool = typer.Option(False, "--published", "-p", help="Get published variable"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """Get details of a specific variable."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _get_variable():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching variable...", total=None)
                    variable = await sdk.get_variable(file_key, variable_id, published=published)
                    progress.update(task, completed=True)
                
                # Display variable details
                panel_content = f"""
[bold]Name:[/bold] {variable.name}
[bold]ID:[/bold] {variable.id}
[bold]Key:[/bold] {variable.key}
[bold]Type:[/bold] {variable.resolvedType if hasattr(variable, 'resolvedType') else variable.resolvedDataType}
[bold]Collection:[/bold] {variable.variableCollectionId}
"""
                
                if hasattr(variable, 'description') and variable.description:
                    panel_content += f"[bold]Description:[/bold] {variable.description}\n"
                
                if hasattr(variable, 'scopes') and variable.scopes:
                    panel_content += f"[bold]Scopes:[/bold] {', '.join(variable.scopes)}\n"
                
                if hasattr(variable, 'valuesByMode'):
                    panel_content += f"\n[bold]Values by Mode:[/bold]\n"
                    for mode_id, value in variable.valuesByMode.items():
                        panel_content += f"  {mode_id}: {value}\n"
                
                console.print(Panel(panel_content, title="Variable Details", expand=False))
                
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
            except ValueError as e:
                console.print(f"[red]Error: {e}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_get_variable())


@app.command()
def search(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    query: str = typer.Argument(..., help="Search query"),
    published: bool = typer.Option(False, "--published", "-p", help="Search published variables"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """Search for variables by name."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _search():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Searching variables...", total=None)
                    variables = await sdk.search_variables(file_key, query, published=published)
                    progress.update(task, completed=True)
                
                if not variables:
                    console.print(f"[yellow]No variables found matching '{query}'[/yellow]")
                    return
                
                table = Table(title=f"Search Results for '{query}'")
                table.add_column("Name", style="cyan", no_wrap=True)
                table.add_column("ID", style="dim")
                table.add_column("Type", style="green")
                table.add_column("Collection", style="yellow")
                
                for var in variables:
                    var_type = var.resolvedType if hasattr(var, 'resolvedType') else var.resolvedDataType
                    table.add_row(
                        var.name,
                        var.id,
                        var_type,
                        var.variableCollectionId
                    )
                
                console.print(table)
                console.print(f"\n[dim]Found {len(variables)} matching variables[/dim]")
                
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_search())


@app.command()
def create_collection(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    name: str = typer.Argument(..., help="Collection name"),
    hidden: bool = typer.Option(False, "--hidden", help="Hide from publishing"),
    mode_name: str = typer.Option("Mode 1", "--mode-name", help="Initial mode name"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """Create a new variable collection."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _create_collection():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Creating collection...", total=None)
                    collection_id = await sdk.create_variable_collection(
                        file_key,
                        name,
                        hidden_from_publishing=hidden,
                        initial_mode_name=mode_name
                    )
                    progress.update(task, completed=True)
                
                console.print(f"[green]✓ Created collection '{name}'[/green]")
                console.print(f"[dim]Collection ID: {collection_id}[/dim]")
                
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_create_collection())


@app.command()
def create_variable(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    name: str = typer.Argument(..., help="Variable name"),
    collection_id: str = typer.Argument(..., help="Collection ID"),
    var_type: VariableResolvedDataType = typer.Argument(..., help="Variable type (BOOLEAN, FLOAT, STRING, COLOR)"),
    description: str = typer.Option("", "--description", "-d", help="Variable description"),
    hidden: bool = typer.Option(False, "--hidden", help="Hide from publishing"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """Create a new variable."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _create_variable():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Creating variable...", total=None)
                    variable_id = await sdk.create_variable(
                        file_key,
                        name,
                        collection_id,
                        var_type,
                        description=description,
                        hidden_from_publishing=hidden
                    )
                    progress.update(task, completed=True)
                
                console.print(f"[green]✓ Created variable '{name}'[/green]")
                console.print(f"[dim]Variable ID: {variable_id}[/dim]")
                
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_create_variable())


@app.command()
def export(
    file_key: str = typer.Argument(..., help="Figma file key or URL"),
    output_file: Path = typer.Argument(..., help="Output JSON file path"),
    published: bool = typer.Option(False, "--published", "-p", help="Export published variables"),
    pretty: bool = typer.Option(True, "--pretty", help="Pretty print JSON"),
    api_token: Optional[str] = typer.Option(None, "--token", "-t", help="Figma API token"),
) -> None:
    """Export variables to JSON file."""
    if not api_token:
        api_token = get_api_token()
    
    file_key = format_file_key(file_key)
    
    async def _export():
        async with FigmaVariablesSDK(api_token) as sdk:
            try:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Fetching variables...", total=None)
                    
                    if published:
                        response = await sdk.get_published_variables(file_key)
                    else:
                        response = await sdk.get_local_variables(file_key)
                    
                    progress.update(task, completed=True)
                
                # Convert to serializable format
                export_data = {
                    "file_key": file_key,
                    "published": published,
                    "variables": {
                        var_id: var.dict() for var_id, var in response.variables.items()
                    },
                    "variable_collections": {
                        coll_id: coll.dict() for coll_id, coll in response.variable_collections.items()
                    }
                }
                
                # Write to file
                with open(output_file, "w", encoding="utf-8") as f:
                    if pretty:
                        json.dump(export_data, f, indent=2, default=str)
                    else:
                        json.dump(export_data, f, default=str)
                
                console.print(f"[green]✓ Exported variables to {output_file}[/green]")
                console.print(f"[dim]Variables: {len(export_data['variables'])}[/dim]")
                console.print(f"[dim]Collections: {len(export_data['variable_collections'])}[/dim]")
                
            except FigmaVariablesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_export())


if __name__ == "__main__":
    app()