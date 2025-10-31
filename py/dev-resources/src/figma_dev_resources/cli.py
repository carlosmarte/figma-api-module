"""Command-line interface for Figma Dev Resources SDK."""

import asyncio
import json
import os
import sys
from typing import List, Optional

import typer
import uvicorn
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from .sdk import FigmaDevResourcesSDK
from .models import DevResourceCreate, DevResourceUpdate
from .errors import FigmaDevResourcesError

app = typer.Typer(help="Figma Dev Resources CLI - Manage dev resources in Figma files")
console = Console()


def get_api_key() -> str:
    """Get API key from environment or prompt user."""
    api_key = os.getenv("FIGMA_TOKEN")
    if not api_key:
        console.print("[red]Error: FIGMA_TOKEN environment variable not set[/red]")
        console.print("Set your Figma API token: export FIGMA_TOKEN=your_token_here")
        raise typer.Exit(1)
    return api_key


@app.command()
def get(
    file_key: str = typer.Argument(..., help="Figma file key"),
    node_ids: Optional[str] = typer.Option(None, "--node-ids", "-n", help="Comma-separated node IDs"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
) -> None:
    """Get dev resources from a Figma file."""
    
    async def _get_resources():
        api_key = get_api_key()
        node_id_list = node_ids.split(",") if node_ids else None
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching dev resources...", total=None)
            
            try:
                async with FigmaDevResourcesSDK(api_key) as sdk:
                    resources = await sdk.get_dev_resources(file_key, node_id_list)
                    
                progress.update(task, description=f"Found {len(resources)} resources")
                
                if output_format == "json":
                    output_data = {
                        "file_key": file_key,
                        "dev_resources": [resource.model_dump() for resource in resources]
                    }
                    
                    if output_file:
                        with open(output_file, "w") as f:
                            json.dump(output_data, f, indent=2)
                        console.print(f"[green]Results written to {output_file}[/green]")
                    else:
                        console.print_json(json.dumps(output_data, indent=2))
                
                else:  # table format
                    table = Table(title=f"Dev Resources in {file_key}")
                    table.add_column("ID", style="cyan")
                    table.add_column("Name", style="green")
                    table.add_column("URL", style="blue")
                    table.add_column("Node ID", style="yellow")
                    
                    for resource in resources:
                        table.add_row(
                            resource.id,
                            resource.name,
                            resource.url,
                            resource.node_id
                        )
                    
                    console.print(table)
                    
                    if output_file:
                        # Save table as markdown
                        with open(output_file, "w") as f:
                            f.write(f"# Dev Resources in {file_key}\n\n")
                            f.write("| ID | Name | URL | Node ID |\n")
                            f.write("|----|----|----|---------|\n")
                            for resource in resources:
                                f.write(f"| {resource.id} | {resource.name} | {resource.url} | {resource.node_id} |\n")
                        console.print(f"[green]Table written to {output_file}[/green]")
                
            except FigmaDevResourcesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_get_resources())


@app.command()
def create(
    file_key: str = typer.Argument(..., help="Figma file key"),
    node_id: str = typer.Argument(..., help="Node ID to attach resource to"),
    name: str = typer.Argument(..., help="Resource name"),
    url: str = typer.Argument(..., help="Resource URL"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
) -> None:
    """Create a new dev resource."""
    
    async def _create_resource():
        api_key = get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Creating dev resource...", total=None)
            
            try:
                async with FigmaDevResourcesSDK(api_key) as sdk:
                    resource = DevResourceCreate(
                        name=name,
                        url=url,
                        file_key=file_key,
                        node_id=node_id
                    )
                    
                    result = await sdk.create_dev_resources([resource])
                    
                progress.update(task, description="Resource created")
                
                if result.errors:
                    console.print("[red]Errors occurred:[/red]")
                    for error in result.errors:
                        console.print(f"[red]  {error.error}[/red]")
                
                if result.links_created:
                    if output_format == "json":
                        output_data = {
                            "created": [res.model_dump() for res in result.links_created],
                            "errors": [err.model_dump() for err in result.errors]
                        }
                        console.print_json(json.dumps(output_data, indent=2))
                    else:
                        console.print("[green]Successfully created:[/green]")
                        for created in result.links_created:
                            console.print(f"  ID: {created.id}")
                            console.print(f"  Name: {created.name}")
                            console.print(f"  URL: {created.url}")
                
            except FigmaDevResourcesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_create_resource())


@app.command()
def update(
    resource_id: str = typer.Argument(..., help="Dev resource ID to update"),
    name: Optional[str] = typer.Option(None, "--name", "-n", help="New name"),
    url: Optional[str] = typer.Option(None, "--url", "-u", help="New URL"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
) -> None:
    """Update an existing dev resource."""
    
    if not name and not url:
        console.print("[red]Error: Must specify at least one of --name or --url[/red]")
        raise typer.Exit(1)
    
    async def _update_resource():
        api_key = get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Updating dev resource...", total=None)
            
            try:
                async with FigmaDevResourcesSDK(api_key) as sdk:
                    update_data = DevResourceUpdate(
                        id=resource_id,
                        name=name,
                        url=url
                    )
                    
                    result = await sdk.update_dev_resources([update_data])
                    
                progress.update(task, description="Resource updated")
                
                if result.errors:
                    console.print("[red]Errors occurred:[/red]")
                    for error in result.errors:
                        console.print(f"[red]  {error.error}[/red]")
                
                if result.links_updated:
                    if output_format == "json":
                        output_data = {
                            "updated": [res.model_dump() for res in result.links_updated],
                            "errors": [err.model_dump() for err in result.errors]
                        }
                        console.print_json(json.dumps(output_data, indent=2))
                    else:
                        console.print("[green]Successfully updated:[/green]")
                        for updated in result.links_updated:
                            console.print(f"  ID: {updated.id}")
                            console.print(f"  Name: {updated.name}")
                            console.print(f"  URL: {updated.url}")
                
            except FigmaDevResourcesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_update_resource())


@app.command()
def delete(
    file_key: str = typer.Argument(..., help="Figma file key"),
    resource_id: str = typer.Argument(..., help="Dev resource ID to delete"),
    confirm: bool = typer.Option(False, "--confirm", "-y", help="Skip confirmation prompt"),
) -> None:
    """Delete a dev resource."""
    
    if not confirm:
        delete_confirm = typer.confirm(f"Delete dev resource {resource_id} from file {file_key}?")
        if not delete_confirm:
            console.print("Cancelled")
            raise typer.Exit()
    
    async def _delete_resource():
        api_key = get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Deleting dev resource...", total=None)
            
            try:
                async with FigmaDevResourcesSDK(api_key) as sdk:
                    result = await sdk.delete_dev_resource(file_key, resource_id)
                    
                progress.update(task, description="Resource deleted")
                
                if result.error:
                    console.print(f"[red]Error: Failed to delete resource[/red]")
                    if hasattr(result, 'message') and result.message:
                        console.print(f"[red]  {result.message}[/red]")
                else:
                    console.print(f"[green]Successfully deleted resource {resource_id}[/green]")
                
            except FigmaDevResourcesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_delete_resource())


@app.command()
def search(
    file_key: str = typer.Argument(..., help="Figma file key"),
    term: str = typer.Argument(..., help="Search term"),
    node_ids: Optional[str] = typer.Option(None, "--node-ids", "-n", help="Comma-separated node IDs"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
) -> None:
    """Search dev resources by name or URL."""
    
    async def _search_resources():
        api_key = get_api_key()
        node_id_list = node_ids.split(",") if node_ids else None
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Searching dev resources...", total=None)
            
            try:
                async with FigmaDevResourcesSDK(api_key) as sdk:
                    resources = await sdk.search_dev_resources(file_key, term, node_id_list)
                    
                progress.update(task, description=f"Found {len(resources)} matching resources")
                
                if output_format == "json":
                    output_data = {
                        "file_key": file_key,
                        "search_term": term,
                        "results": [resource.model_dump() for resource in resources]
                    }
                    console.print_json(json.dumps(output_data, indent=2))
                
                else:  # table format
                    table = Table(title=f"Search Results for '{term}' in {file_key}")
                    table.add_column("ID", style="cyan")
                    table.add_column("Name", style="green")
                    table.add_column("URL", style="blue")
                    table.add_column("Node ID", style="yellow")
                    
                    for resource in resources:
                        table.add_row(
                            resource.id,
                            resource.name,
                            resource.url,
                            resource.node_id
                        )
                    
                    console.print(table)
                
            except FigmaDevResourcesError as e:
                console.print(f"[red]Error: {e.message}[/red]")
                raise typer.Exit(1)
    
    asyncio.run(_search_resources())


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run server on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind server to"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
) -> None:
    """Start the FastAPI server for dev resources API."""
    
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    # Ensure API key is available
    if not os.getenv("FIGMA_TOKEN"):
        console.print("[red]Error: No API key provided[/red]")
        console.print("Use --api-key option or set FIGMA_TOKEN environment variable")
        raise typer.Exit(1)
    
    console.print(f"[green]Starting server on {host}:{port}[/green]")
    console.print(f"[blue]API docs: http://{host}:{port}/docs[/blue]")
    
    uvicorn.run(
        "figma_dev_resources.server:app",
        host=host,
        port=port,
        reload=reload
    )


if __name__ == "__main__":
    app()