"""CLI interface for Figma Projects using Typer."""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional, List

import typer
import uvicorn
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.json import JSON

from .sdk import FigmaProjectsSDK
from .models import ExportFormat
from .utils import sanitize_filename
from .errors import FigmaProjectsError


app = typer.Typer(
    name="figma-projects",
    help="A comprehensive CLI for Figma Projects API",
    add_completion=False,
)
console = Console()


def get_api_token() -> str:
    """Get API token from environment or prompt user."""
    token = os.getenv("FIGMA_TOKEN")
    if not token:
        token = typer.prompt("Figma API Token", hide_input=True)
    return token


def handle_async_command(coro):
    """Handle async command execution."""
    try:
        return asyncio.run(coro)
    except FigmaProjectsError as e:
        console.print(f"[red]Error:[/red] {e.message}", err=True)
        if e.context:
            console.print(f"[dim]Context: {e.context}[/dim]", err=True)
        sys.exit(1)
    except KeyboardInterrupt:
        console.print("\n[yellow]Operation cancelled by user[/yellow]", err=True)
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]Unexpected error:[/red] {str(e)}", err=True)
        sys.exit(1)


@app.command()
def list_projects(
    team_id: str = typer.Argument(..., help="Team ID"),
    format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
):
    """List all projects in a team."""
    async def _list_projects():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching projects...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                response = await sdk.get_team_projects(team_id)
                progress.update(task, description="✅ Projects fetched")
        
        if format == "json":
            output_data = {
                "team_name": response.name,
                "projects": [
                    {"id": p.id, "name": p.name} for p in response.projects
                ]
            }
            json_output = json.dumps(output_data, indent=2)
            
            if output:
                Path(output).write_text(json_output)
                console.print(f"[green]Saved to {output}[/green]")
            else:
                console.print(JSON(json_output))
        else:
            table = Table(title=f"Projects in {response.name}")
            table.add_column("ID", style="cyan")
            table.add_column("Name", style="green")
            
            for project in response.projects:
                table.add_row(project.id, project.name)
            
            console.print(table)
            
            if output:
                # Save table as text
                with console.capture() as capture:
                    console.print(table)
                Path(output).write_text(capture.get())
                console.print(f"[green]Saved to {output}[/green]")
    
    handle_async_command(_list_projects())


@app.command()
def list_files(
    project_id: str = typer.Argument(..., help="Project ID"),
    format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    branch_data: bool = typer.Option(False, "--branch-data", help="Include branch metadata"),
):
    """List all files in a project."""
    async def _list_files():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching files...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                response = await sdk.get_project_files(project_id, branch_data)
                progress.update(task, description="✅ Files fetched")
        
        if format == "json":
            output_data = {
                "project_name": response.name,
                "files": [
                    {
                        "key": f.key,
                        "name": f.name,
                        "thumbnail_url": f.thumbnail_url,
                        "last_modified": f.last_modified.isoformat(),
                    }
                    for f in response.files
                ]
            }
            json_output = json.dumps(output_data, indent=2)
            
            if output:
                Path(output).write_text(json_output)
                console.print(f"[green]Saved to {output}[/green]")
            else:
                console.print(JSON(json_output))
        else:
            table = Table(title=f"Files in {response.name}")
            table.add_column("Key", style="cyan")
            table.add_column("Name", style="green")
            table.add_column("Last Modified", style="yellow")
            
            for file in response.files:
                table.add_row(
                    file.key,
                    file.name,
                    file.last_modified.strftime("%Y-%m-%d %H:%M:%S"),
                )
            
            console.print(table)
            
            if output:
                with console.capture() as capture:
                    console.print(table)
                Path(output).write_text(capture.get())
                console.print(f"[green]Saved to {output}[/green]")
    
    handle_async_command(_list_files())


@app.command()
def get_tree(
    team_id: str = typer.Argument(..., help="Team ID"),
    format: str = typer.Option("json", "--format", "-f", help="Output format: json"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
):
    """Get hierarchical project and file structure."""
    async def _get_tree():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Building project tree...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                tree = await sdk.get_project_tree(team_id)
                progress.update(task, description="✅ Project tree built")
        
        output_data = {
            "team_name": tree.team_name,
            "total_projects": len(tree.projects),
            "projects": tree.projects,
        }
        
        json_output = json.dumps(output_data, indent=2, default=str)
        
        if output:
            Path(output).write_text(json_output)
            console.print(f"[green]Saved to {output}[/green]")
        else:
            console.print(JSON(json_output))
    
    handle_async_command(_get_tree())


@app.command()
def search(
    team_id: str = typer.Argument(..., help="Team ID"),
    query: str = typer.Argument(..., help="Search query"),
    format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
):
    """Search projects by name."""
    async def _search():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Searching projects...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                projects = await sdk.search_projects(team_id, query)
                progress.update(task, description="✅ Search completed")
        
        if format == "json":
            output_data = [{"id": p.id, "name": p.name} for p in projects]
            console.print(JSON(json.dumps(output_data, indent=2)))
        else:
            table = Table(title=f"Projects matching '{query}'")
            table.add_column("ID", style="cyan")
            table.add_column("Name", style="green")
            
            for project in projects:
                table.add_row(project.id, project.name)
            
            console.print(table)
            console.print(f"\n[dim]Found {len(projects)} matching projects[/dim]")
    
    handle_async_command(_search())


@app.command()
def stats(
    project_id: str = typer.Argument(..., help="Project ID"),
    format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
):
    """Get project statistics."""
    async def _stats():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Calculating statistics...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                stats = await sdk.get_project_statistics(project_id)
                progress.update(task, description="✅ Statistics calculated")
        
        if format == "json":
            output_data = {
                "project_id": stats.project_id,
                "project_name": stats.project_name,
                "total_files": stats.total_files,
                "recent_files": stats.recent_files,
                "last_activity": stats.last_activity.isoformat() if stats.last_activity else None,
            }
            console.print(JSON(json.dumps(output_data, indent=2)))
        else:
            table = Table(title=f"Statistics for {stats.project_name}")
            table.add_column("Metric", style="cyan")
            table.add_column("Value", style="green")
            
            table.add_row("Project ID", stats.project_id)
            table.add_row("Total Files", str(stats.total_files))
            table.add_row("Recent Files (30 days)", str(stats.recent_files))
            
            if stats.last_activity:
                table.add_row("Last Activity", stats.last_activity.strftime("%Y-%m-%d %H:%M:%S"))
            else:
                table.add_row("Last Activity", "No activity")
            
            console.print(table)
    
    handle_async_command(_stats())


@app.command()
def export(
    team_id: str = typer.Argument(..., help="Team ID"),
    format: str = typer.Option("json", "--format", "-f", help="Export format: json, csv"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    include_files: bool = typer.Option(True, "--include-files/--no-files", help="Include file data"),
):
    """Export project structure."""
    async def _export():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Exporting project structure...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                if format == "json":
                    export_format = ExportFormat.JSON
                elif format == "csv":
                    export_format = ExportFormat.CSV
                else:
                    raise typer.BadParameter(f"Unsupported format: {format}")
                
                exported_data = await sdk.export_project_structure(
                    team_id, export_format, include_files
                )
                progress.update(task, description="✅ Export completed")
        
        if output:
            Path(output).write_text(exported_data)
            console.print(f"[green]Exported to {output}[/green]")
        else:
            console.print(exported_data)
    
    handle_async_command(_export())


@app.command()
def health():
    """Check API connectivity and rate limits."""
    async def _health():
        token = get_api_token()
        
        try:
            async with FigmaProjectsSDK(token) as sdk:
                rate_limit = sdk.get_rate_limit_info()
                stats = sdk.get_client_stats()
                
                health_info = Table(title="Health Check")
                health_info.add_column("Component", style="cyan")
                health_info.add_column("Status", style="green")
                health_info.add_column("Details", style="yellow")
                
                health_info.add_row("API Connection", "✅ OK", "Successfully connected")
                health_info.add_row("Rate Limit", f"{rate_limit.remaining}/{rate_limit.limit}", "Requests per minute")
                health_info.add_row("Requests Made", str(stats["requests_made"]), "Total requests")
                health_info.add_row("Requests Failed", str(stats["requests_failed"]), "Failed requests")
                
                console.print(health_info)
                
        except Exception as e:
            console.print(f"[red]Health check failed:[/red] {str(e)}", err=True)
            sys.exit(1)
    
    handle_async_command(_health())


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to serve on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to serve on"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API key"),
):
    """Start the FastAPI server."""
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    console.print(Panel(
        f"[bold green]Starting Figma Projects API Server[/bold green]\n"
        f"[cyan]Host:[/cyan] {host}\n"
        f"[cyan]Port:[/cyan] {port}\n"
        f"[cyan]Reload:[/cyan] {reload}\n\n"
        f"[yellow]API Documentation:[/yellow]\n"
        f"• Swagger UI: http://{host}:{port}/docs\n"
        f"• ReDoc: http://{host}:{port}/redoc\n"
        f"• OpenAPI: http://{host}:{port}/openapi.json",
        title="Server Starting",
        border_style="blue"
    ))
    
    try:
        uvicorn.run(
            "figma_projects.server:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info",
        )
    except KeyboardInterrupt:
        console.print("\n[yellow]Server stopped by user[/yellow]")
    except Exception as e:
        console.print(f"[red]Server error:[/red] {str(e)}", err=True)
        sys.exit(1)


@app.command()
def recent(
    project_id: str = typer.Argument(..., help="Project ID"),
    limit: int = typer.Option(10, "--limit", "-l", help="Maximum number of files"),
    days: int = typer.Option(30, "--days", "-d", help="Number of days to consider recent"),
    format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
):
    """Get recently modified files in a project."""
    async def _recent():
        token = get_api_token()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching recent files...", total=None)
            
            async with FigmaProjectsSDK(token) as sdk:
                files = await sdk.get_recent_files(project_id, limit, days)
                progress.update(task, description="✅ Recent files fetched")
        
        if format == "json":
            output_data = [
                {
                    "key": f.key,
                    "name": f.name,
                    "last_modified": f.last_modified.isoformat(),
                }
                for f in files
            ]
            console.print(JSON(json.dumps(output_data, indent=2)))
        else:
            table = Table(title=f"Recent Files (last {days} days)")
            table.add_column("Name", style="green")
            table.add_column("Key", style="cyan")
            table.add_column("Last Modified", style="yellow")
            
            for file in files:
                table.add_row(
                    file.name,
                    file.key,
                    file.last_modified.strftime("%Y-%m-%d %H:%M:%S"),
                )
            
            console.print(table)
            console.print(f"\n[dim]Showing {len(files)} recent files[/dim]")
    
    handle_async_command(_recent())


if __name__ == "__main__":
    app()