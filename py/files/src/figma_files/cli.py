"""Command-line interface for figma_files."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import List, Optional

import typer
from rich import print
from rich.console import Console
from rich.table import Table
from rich.progress import track, Progress, SpinnerColumn, TextColumn

from .sdk import FigmaFileSDK
from .models import ImageFormat
from .errors import ApiError, AuthenticationError
from .utils import extract_file_key_from_url, extract_node_id_from_url

app = typer.Typer(
    name="figma-files",
    help="Figma Files CLI - Interact with Figma files from the command line",
    add_completion=True,
)
console = Console()


def get_sdk(api_key: Optional[str] = None) -> FigmaFileSDK:
    """Get SDK instance with API key from env or argument."""
    import os

    key = api_key or os.getenv("FIGMA_API_KEY")
    if not key:
        console.print(
            "[red]Error:[/red] API key required. "
            "Set FIGMA_API_KEY environment variable or use --api-key flag."
        )
        raise typer.Exit(1)

    return FigmaFileSDK(api_key=key)


@app.command()
def get_file(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
    version: Optional[str] = typer.Option(None, "--version", "-v", help="Specific version ID"),
    include_geometry: bool = typer.Option(False, "--geometry", "-g", help="Include vector geometry"),
    depth: Optional[int] = typer.Option(None, "--depth", "-d", help="Tree traversal depth"),
    save_to: Optional[Path] = typer.Option(None, "--save", "-s", help="Save JSON to file"),
) -> None:
    """Get file information and structure."""
    async def _get_file() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Fetching file..."):
                    file_data = await sdk.get_file(
                        file_key_or_url,
                        version=version,
                        depth=depth,
                        include_geometry=include_geometry,
                    )

                if save_to:
                    # Save raw JSON data
                    json_data = file_data.model_dump(mode="json")
                    with open(save_to, "w") as f:
                        json.dump(json_data, f, indent=2, default=str)
                    console.print(f"[green]✓[/green] Saved file data to {save_to}")

                if output == "json":
                    print(json.dumps(file_data.model_dump(), indent=2, default=str))
                else:
                    table = Table(title=f"File: {file_data.name}")
                    table.add_column("Property", style="cyan")
                    table.add_column("Value", style="green")

                    table.add_row("Name", file_data.name)
                    table.add_row("Role", file_data.role.value)
                    table.add_row("Editor Type", file_data.editor_type.value)
                    table.add_row("Version", file_data.version)
                    table.add_row("Last Modified", str(file_data.last_modified))
                    table.add_row("Components", str(len(file_data.components)))
                    table.add_row("Styles", str(len(file_data.styles)))
                    
                    if file_data.branches:
                        table.add_row("Branches", str(len(file_data.branches)))

                    console.print(table)

            except AuthenticationError as e:
                console.print(f"[red]Authentication Error:[/red] {e}")
                raise typer.Exit(1)
            except ApiError as e:
                console.print(f"[red]API Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_get_file())


@app.command()
def get_nodes(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    node_ids: str = typer.Argument(..., help="Comma-separated node IDs"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
    version: Optional[str] = typer.Option(None, "--version", "-v", help="Specific version ID"),
    depth: Optional[int] = typer.Option(None, "--depth", "-d", help="Tree traversal depth"),
    include_geometry: bool = typer.Option(False, "--geometry", "-g", help="Include vector geometry"),
    save_to: Optional[Path] = typer.Option(None, "--save", "-s", help="Save JSON to file"),
) -> None:
    """Get specific nodes from a file."""
    async def _get_nodes() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                node_id_list = [nid.strip() for nid in node_ids.split(",")]
                
                with console.status("[bold green]Fetching nodes..."):
                    nodes_data = await sdk.get_file_nodes(
                        file_key_or_url,
                        node_id_list,
                        version=version,
                        depth=depth,
                        include_geometry=include_geometry,
                    )

                if save_to:
                    json_data = nodes_data.model_dump(mode="json")
                    with open(save_to, "w") as f:
                        json.dump(json_data, f, indent=2, default=str)
                    console.print(f"[green]✓[/green] Saved nodes data to {save_to}")

                if output == "json":
                    print(json.dumps(nodes_data.model_dump(), indent=2, default=str))
                else:
                    table = Table(title=f"Nodes from {nodes_data.name}")
                    table.add_column("Node ID", style="cyan")
                    table.add_column("Type", style="yellow")
                    table.add_column("Status", style="green")

                    for node_id, node_data in nodes_data.nodes.items():
                        if node_data:
                            table.add_row(node_id, "Found", "✓")
                        else:
                            table.add_row(node_id, "Not Found", "✗")

                    console.print(table)

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_get_nodes())


@app.command()
def get_node(
    figma_url: str = typer.Argument(..., help="Full Figma URL with node ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
    version: Optional[str] = typer.Option(None, "--version", "-v", help="Specific version ID"),
    depth: Optional[int] = typer.Option(None, "--depth", "-d", help="Tree traversal depth"),
    include_geometry: bool = typer.Option(False, "--geometry", "-g", help="Include vector geometry"),
    save_to: Optional[Path] = typer.Option(None, "--save", "-s", help="Save JSON to file"),
) -> None:
    """Get a specific node from a Figma URL."""
    async def _get_node() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Fetching node..."):
                    node_data = await sdk.get_node_from_url(
                        figma_url,
                        version=version,
                        depth=depth,
                        include_geometry=include_geometry,
                    )

                if save_to:
                    json_data = node_data.model_dump(mode="json")
                    with open(save_to, "w") as f:
                        json.dump(json_data, f, indent=2, default=str)
                    console.print(f"[green]✓[/green] Saved node data to {save_to}")

                if output == "json":
                    print(json.dumps(node_data.model_dump(), indent=2, default=str))
                else:
                    console.print(f"[green]✓[/green] Retrieved node from {node_data.name}")

            except ValueError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)
            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_get_node())


@app.command()
def render_images(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    node_ids: str = typer.Argument(..., help="Comma-separated node IDs"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    format: ImageFormat = typer.Option(ImageFormat.PNG, "--format", "-f", help="Image format"),
    scale: float = typer.Option(1.0, "--scale", "-s", help="Image scale (0.01-4)"),
    version: Optional[str] = typer.Option(None, "--version", "-v", help="Specific version ID"),
    output_dir: Optional[Path] = typer.Option(None, "--output-dir", "-o", help="Download images to directory"),
    show_urls: bool = typer.Option(True, "--show-urls/--no-urls", help="Show image URLs"),
) -> None:
    """Render images of file nodes."""
    async def _render_images() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                node_id_list = [nid.strip() for nid in node_ids.split(",")]
                
                with console.status("[bold green]Rendering images..."):
                    images_data = await sdk.render_images(
                        file_key_or_url,
                        node_id_list,
                        version=version,
                        scale=scale,
                        format=format,
                    )

                if images_data.err:
                    console.print(f"[red]Error:[/red] {images_data.err}")
                    raise typer.Exit(1)

                if show_urls:
                    table = Table(title="Rendered Images")
                    table.add_column("Node ID", style="cyan")
                    table.add_column("Status", style="yellow")
                    table.add_column("URL", style="green")

                    for node_id, url in images_data.images.items():
                        if url:
                            table.add_row(node_id, "✓", url)
                        else:
                            table.add_row(node_id, "Failed", "—")

                    console.print(table)

                # Download images if output directory specified
                if output_dir:
                    output_dir.mkdir(parents=True, exist_ok=True)
                    
                    import httpx
                    async with httpx.AsyncClient() as client:
                        for node_id, url in images_data.images.items():
                            if url:
                                try:
                                    response = await client.get(url)
                                    response.raise_for_status()
                                    
                                    filename = f"{node_id}.{format.value}"
                                    filepath = output_dir / filename
                                    
                                    with open(filepath, "wb") as f:
                                        f.write(response.content)
                                    
                                    console.print(f"[green]✓[/green] Downloaded {filename}")
                                    
                                except Exception as e:
                                    console.print(f"[red]✗[/red] Failed to download {node_id}: {e}")

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_render_images())


@app.command()
def render_node(
    figma_url: str = typer.Argument(..., help="Full Figma URL with node ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    format: ImageFormat = typer.Option(ImageFormat.PNG, "--format", "-f", help="Image format"),
    scale: float = typer.Option(1.0, "--scale", "-s", help="Image scale (0.01-4)"),
    version: Optional[str] = typer.Option(None, "--version", "-v", help="Specific version ID"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Save image to file"),
) -> None:
    """Render an image of a node from a Figma URL."""
    async def _render_node() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Rendering image..."):
                    image_data = await sdk.render_node_from_url(
                        figma_url,
                        version=version,
                        scale=scale,
                        format=format,
                    )

                if image_data.err:
                    console.print(f"[red]Error:[/red] {image_data.err}")
                    raise typer.Exit(1)

                # Get the first (and only) image URL
                node_id = extract_node_id_from_url(figma_url)
                url = image_data.images.get(node_id) if node_id else None
                
                if not url:
                    console.print("[red]Error:[/red] No image generated")
                    raise typer.Exit(1)

                console.print(f"[green]✓[/green] Image URL: {url}")

                # Download image if output file specified
                if output_file:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        try:
                            response = await client.get(url)
                            response.raise_for_status()
                            
                            with open(output_file, "wb") as f:
                                f.write(response.content)
                            
                            console.print(f"[green]✓[/green] Downloaded to {output_file}")
                            
                        except Exception as e:
                            console.print(f"[red]✗[/red] Failed to download: {e}")

            except ValueError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)
            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_render_node())


@app.command()
def get_image_fills(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
    save_to: Optional[Path] = typer.Option(None, "--save", "-s", help="Save JSON to file"),
) -> None:
    """Get image fills from a file."""
    async def _get_fills() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Fetching image fills..."):
                    fills_data = await sdk.get_image_fills(file_key_or_url)

                if save_to:
                    json_data = fills_data.model_dump(mode="json")
                    with open(save_to, "w") as f:
                        json.dump(json_data, f, indent=2, default=str)
                    console.print(f"[green]✓[/green] Saved image fills to {save_to}")

                if output == "json":
                    print(json.dumps(fills_data.model_dump(), indent=2, default=str))
                else:
                    table = Table(title="Image Fills")
                    table.add_column("Reference", style="cyan")
                    table.add_column("URL", style="green")

                    for ref, url in fills_data.meta.images.items():
                        table.add_row(ref, url)

                    console.print(table)

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_get_fills())


@app.command()
def get_metadata(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
) -> None:
    """Get file metadata."""
    async def _get_metadata() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Fetching metadata..."):
                    meta_data = await sdk.get_file_metadata(file_key_or_url)

                if output == "json":
                    print(json.dumps(meta_data.model_dump(), indent=2, default=str))
                else:
                    table = Table(title="File Metadata")
                    table.add_column("Property", style="cyan")
                    table.add_column("Value", style="green")

                    table.add_row("Name", meta_data.name)
                    table.add_row("Creator", meta_data.creator.handle)
                    table.add_row("Editor Type", meta_data.editor_type.value)
                    table.add_row("Role", meta_data.role.value)
                    table.add_row("Version", meta_data.version)
                    table.add_row("Last Touched", str(meta_data.last_touched_at))
                    
                    if meta_data.folder_name:
                        table.add_row("Project", meta_data.folder_name)
                    if meta_data.last_touched_by:
                        table.add_row("Last Touched By", meta_data.last_touched_by.handle)

                    console.print(table)

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_get_metadata())


@app.command()
def get_versions(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
    page_size: int = typer.Option(10, "--page-size", "-p", help="Number of versions per page"),
) -> None:
    """Get file version history."""
    async def _get_versions() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Fetching versions..."):
                    versions_data = await sdk.get_file_versions(
                        file_key_or_url,
                        page_size=page_size,
                    )

                if output == "json":
                    print(json.dumps(versions_data.model_dump(), indent=2, default=str))
                else:
                    table = Table(title="File Versions")
                    table.add_column("ID", style="cyan")
                    table.add_column("Label", style="yellow")
                    table.add_column("Created By", style="green")
                    table.add_column("Created At", style="blue")

                    for version in versions_data.versions:
                        table.add_row(
                            version.id,
                            version.label,
                            version.user.handle,
                            str(version.created_at),
                        )

                    console.print(table)

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_get_versions())


@app.command()
def search_nodes(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    name_pattern: str = typer.Argument(..., help="Name pattern to search for"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    case_sensitive: bool = typer.Option(False, "--case-sensitive", "-c", help="Case sensitive search"),
    limit: int = typer.Option(20, "--limit", "-l", help="Maximum results to show"),
) -> None:
    """Search for nodes by name pattern."""
    async def _search_nodes() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Searching nodes..."):
                    matches = await sdk.search_nodes_by_name(
                        file_key_or_url,
                        name_pattern,
                        case_sensitive=case_sensitive,
                    )

                if not matches:
                    console.print(f"No nodes found matching '{name_pattern}'")
                    return

                table = Table(title=f"Search Results for '{name_pattern}'")
                table.add_column("Node ID", style="cyan")
                table.add_column("Name", style="green")
                table.add_column("Type", style="yellow")

                for i, match in enumerate(matches[:limit]):
                    table.add_row(
                        match["id"],
                        match["name"],
                        match["type"],
                    )

                console.print(table)
                
                if len(matches) > limit:
                    console.print(f"[yellow]Note:[/yellow] Showing {limit} of {len(matches)} results")

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_search_nodes())


@app.command()
def list_components(
    file_key_or_url: str = typer.Argument(..., help="File key or Figma URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
    output: Optional[str] = typer.Option("table", "--output", "-o", help="Output format (json|table)"),
) -> None:
    """List all components in a file."""
    async def _list_components() -> None:
        async with get_sdk(api_key) as sdk:
            try:
                with console.status("[bold green]Fetching components..."):
                    components = await sdk.get_components_in_file(file_key_or_url)

                if output == "json":
                    print(json.dumps(components, indent=2, default=str))
                else:
                    if not components:
                        console.print("No components found in file")
                        return

                    table = Table(title="File Components")
                    table.add_column("ID", style="cyan")
                    table.add_column("Name", style="green")
                    table.add_column("Key", style="yellow")
                    table.add_column("Description", style="blue")

                    for component in components:
                        table.add_row(
                            component["id"],
                            component["name"],
                            component["key"],
                            component.get("description", "")[:50] + "..." if len(component.get("description", "")) > 50 else component.get("description", ""),
                        )

                    console.print(table)

            except ApiError as e:
                console.print(f"[red]Error:[/red] {e}")
                raise typer.Exit(1)

    asyncio.run(_list_components())


@app.command()
def extract_url_info(
    figma_url: str = typer.Argument(..., help="Figma URL"),
) -> None:
    """Extract file key and node ID from a Figma URL."""
    file_key = extract_file_key_from_url(figma_url)
    node_id = extract_node_id_from_url(figma_url)
    
    table = Table(title="URL Information")
    table.add_column("Component", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("File Key", file_key or "Not found")
    table.add_row("Node ID", node_id or "Not found")
    
    console.print(table)


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run server on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind to"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Default Figma API key"),
) -> None:
    """Start the FastAPI server for Figma Files API."""
    import os
    import sys
    
    # Set API key in environment if provided
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    # Check if uvicorn is installed
    try:
        import uvicorn
    except ImportError:
        console.print(
            "[red]Error:[/red] uvicorn is not installed. "
            "Install it with: pip install uvicorn[standard]"
        )
        raise typer.Exit(1)
    
    console.print(f"[green]Starting Figma Files API server on {host}:{port}[/green]")
    console.print("[yellow]Token validation enabled - X-Figma-Token header required[/yellow]")
    
    if api_key:
        console.print("[blue]Default token set from --api-key flag[/blue]")
    elif os.getenv("FIGMA_TOKEN"):
        console.print("[blue]Default token loaded from FIGMA_TOKEN environment variable[/blue]")
    else:
        console.print(
            "[yellow]Warning:[/yellow] No default token set. "
            "Clients must provide X-Figma-Token header for all requests."
        )
    
    console.print("\n[bold]API Documentation:[/bold] http://localhost:{}/docs".format(port))
    console.print("[bold]OpenAPI Schema:[/bold] http://localhost:{}/openapi.json\n".format(port))
    
    try:
        uvicorn.run(
            "figma_files.server:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info",
        )
    except KeyboardInterrupt:
        console.print("\n[yellow]Server stopped by user[/yellow]")
        raise typer.Exit(0)


if __name__ == "__main__":
    app()