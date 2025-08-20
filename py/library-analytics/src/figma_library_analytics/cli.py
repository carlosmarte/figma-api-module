"""
Command-line interface for Figma Library Analytics.
"""

import asyncio
import json
import os
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import typer
import uvicorn
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from .models import GroupBy
from .sdk import FigmaAnalyticsSDK
from .utils import extract_file_key_from_url, sanitize_filename

app = typer.Typer(
    name="figma-analytics",
    help="Figma Library Analytics CLI - Access analytics data for your published libraries.",
    add_completion=False,
)

console = Console()


def get_api_key() -> str:
    """Get API key from environment or prompt user."""
    api_key = os.getenv("FIGMA_TOKEN")
    if not api_key:
        api_key = typer.prompt("Enter your Figma API token", hide_input=True)
    return api_key


def parse_file_key(file_key_or_url: str) -> str:
    """Parse file key from URL or return as-is if already a key."""
    if file_key_or_url.startswith("https://"):
        extracted = extract_file_key_from_url(file_key_or_url)
        if not extracted:
            raise typer.BadParameter("Invalid Figma URL format")
        return extracted
    return file_key_or_url


def parse_date(date_str: str) -> date:
    """Parse date string in YYYY-MM-DD format."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise typer.BadParameter("Date must be in YYYY-MM-DD format")


def format_table_data(rows, title: str) -> Table:
    """Format analytics data as a rich table."""
    table = Table(title=title, show_header=True, header_style="bold magenta")
    
    if not rows:
        table.add_column("Message")
        table.add_row("No data found")
        return table
    
    # Get columns from first row
    first_row = rows[0]
    if hasattr(first_row, 'model_fields'):
        columns = list(first_row.model_fields.keys())
    else:
        columns = list(first_row.__dict__.keys())
    
    # Add columns to table
    for col in columns:
        table.add_column(col.replace('_', ' ').title())
    
    # Add rows
    for row in rows[:50]:  # Limit to first 50 rows for display
        values = []
        for col in columns:
            value = getattr(row, col, "")
            values.append(str(value))
        table.add_row(*values)
    
    if len(rows) > 50:
        table.add_row(*["..." for _ in columns])
        table.add_row(*[f"Showing first 50 of {len(rows)} rows" if i == 0 else "" for i in range(len(columns))])
    
    return table


@app.command()
def component_actions(
    file_key_or_url: str = typer.Argument(..., help="Figma file key or URL"),
    group_by: GroupBy = typer.Option(GroupBy.COMPONENT, "--group-by", "-g", help="Group data by component or team"),
    start_date: Optional[str] = typer.Option(None, "--start-date", "-s", help="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = typer.Option(None, "--end-date", "-e", help="End date (YYYY-MM-DD)"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get component action analytics data."""
    
    async def _run():
        # Parse inputs
        file_key = parse_file_key(file_key_or_url)
        start_dt = parse_date(start_date) if start_date else None
        end_dt = parse_date(end_date) if end_date else None
        token = api_key or get_api_key()
        
        # Get data
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching component actions...", total=None)
            
            async with FigmaAnalyticsSDK(token) as sdk:
                if group_by not in [GroupBy.COMPONENT, GroupBy.TEAM]:
                    raise typer.BadParameter("group_by must be 'component' or 'team'")
                
                all_data = await sdk.get_all_component_actions(file_key, group_by, start_dt, end_dt)
            
            progress.update(task, description=f"Fetched {len(all_data)} records")
        
        # Format output
        if output_format == "json":
            data = [row.model_dump() for row in all_data]
            output_text = json.dumps(data, indent=2, default=str)
        else:
            table = format_table_data(all_data, f"Component Actions - {group_by.value.title()}")
            console.print(table)
            return
        
        # Save or print
        if output_file:
            output_file.write_text(output_text)
            console.print(f"✅ Saved {len(all_data)} records to {output_file}")
        else:
            console.print(output_text)
    
    asyncio.run(_run())


@app.command()
def component_usages(
    file_key_or_url: str = typer.Argument(..., help="Figma file key or URL"),
    group_by: GroupBy = typer.Option(GroupBy.COMPONENT, "--group-by", "-g", help="Group data by component or file"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get component usage analytics data."""
    
    async def _run():
        file_key = parse_file_key(file_key_or_url)
        token = api_key or get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching component usages...", total=None)
            
            async with FigmaAnalyticsSDK(token) as sdk:
                if group_by not in [GroupBy.COMPONENT, GroupBy.FILE]:
                    raise typer.BadParameter("group_by must be 'component' or 'file'")
                
                response = await sdk.get_component_usages(file_key, group_by)
                all_data = response.rows
            
            progress.update(task, description=f"Fetched {len(all_data)} records")
        
        if output_format == "json":
            data = [row.model_dump() for row in all_data]
            output_text = json.dumps(data, indent=2, default=str)
        else:
            table = format_table_data(all_data, f"Component Usages - {group_by.value.title()}")
            console.print(table)
            return
        
        if output_file:
            output_file.write_text(output_text)
            console.print(f"✅ Saved {len(all_data)} records to {output_file}")
        else:
            console.print(output_text)
    
    asyncio.run(_run())


@app.command()
def style_actions(
    file_key_or_url: str = typer.Argument(..., help="Figma file key or URL"),
    group_by: GroupBy = typer.Option(GroupBy.STYLE, "--group-by", "-g", help="Group data by style or team"),
    start_date: Optional[str] = typer.Option(None, "--start-date", "-s", help="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = typer.Option(None, "--end-date", "-e", help="End date (YYYY-MM-DD)"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get style action analytics data."""
    
    async def _run():
        file_key = parse_file_key(file_key_or_url)
        start_dt = parse_date(start_date) if start_date else None
        end_dt = parse_date(end_date) if end_date else None
        token = api_key or get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching style actions...", total=None)
            
            async with FigmaAnalyticsSDK(token) as sdk:
                if group_by not in [GroupBy.STYLE, GroupBy.TEAM]:
                    raise typer.BadParameter("group_by must be 'style' or 'team'")
                
                response = await sdk.get_style_actions(file_key, group_by, start_dt, end_dt)
                all_data = response.rows
            
            progress.update(task, description=f"Fetched {len(all_data)} records")
        
        if output_format == "json":
            data = [row.model_dump() for row in all_data]
            output_text = json.dumps(data, indent=2, default=str)
        else:
            table = format_table_data(all_data, f"Style Actions - {group_by.value.title()}")
            console.print(table)
            return
        
        if output_file:
            output_file.write_text(output_text)
            console.print(f"✅ Saved {len(all_data)} records to {output_file}")
        else:
            console.print(output_text)
    
    asyncio.run(_run())


@app.command()
def style_usages(
    file_key_or_url: str = typer.Argument(..., help="Figma file key or URL"),
    group_by: GroupBy = typer.Option(GroupBy.STYLE, "--group-by", "-g", help="Group data by style or file"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get style usage analytics data."""
    
    async def _run():
        file_key = parse_file_key(file_key_or_url)
        token = api_key or get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching style usages...", total=None)
            
            async with FigmaAnalyticsSDK(token) as sdk:
                if group_by not in [GroupBy.STYLE, GroupBy.FILE]:
                    raise typer.BadParameter("group_by must be 'style' or 'file'")
                
                response = await sdk.get_style_usages(file_key, group_by)
                all_data = response.rows
            
            progress.update(task, description=f"Fetched {len(all_data)} records")
        
        if output_format == "json":
            data = [row.model_dump() for row in all_data]
            output_text = json.dumps(data, indent=2, default=str)
        else:
            table = format_table_data(all_data, f"Style Usages - {group_by.value.title()}")
            console.print(table)
            return
        
        if output_file:
            output_file.write_text(output_text)
            console.print(f"✅ Saved {len(all_data)} records to {output_file}")
        else:
            console.print(output_text)
    
    asyncio.run(_run())


@app.command()
def variable_actions(
    file_key_or_url: str = typer.Argument(..., help="Figma file key or URL"),
    group_by: GroupBy = typer.Option(GroupBy.VARIABLE, "--group-by", "-g", help="Group data by variable or team"),
    start_date: Optional[str] = typer.Option(None, "--start-date", "-s", help="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = typer.Option(None, "--end-date", "-e", help="End date (YYYY-MM-DD)"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get variable action analytics data."""
    
    async def _run():
        file_key = parse_file_key(file_key_or_url)
        start_dt = parse_date(start_date) if start_date else None
        end_dt = parse_date(end_date) if end_date else None
        token = api_key or get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching variable actions...", total=None)
            
            async with FigmaAnalyticsSDK(token) as sdk:
                if group_by not in [GroupBy.VARIABLE, GroupBy.TEAM]:
                    raise typer.BadParameter("group_by must be 'variable' or 'team'")
                
                response = await sdk.get_variable_actions(file_key, group_by, start_dt, end_dt)
                all_data = response.rows
            
            progress.update(task, description=f"Fetched {len(all_data)} records")
        
        if output_format == "json":
            data = [row.model_dump() for row in all_data]
            output_text = json.dumps(data, indent=2, default=str)
        else:
            table = format_table_data(all_data, f"Variable Actions - {group_by.value.title()}")
            console.print(table)
            return
        
        if output_file:
            output_file.write_text(output_text)
            console.print(f"✅ Saved {len(all_data)} records to {output_file}")
        else:
            console.print(output_text)
    
    asyncio.run(_run())


@app.command()
def variable_usages(
    file_key_or_url: str = typer.Argument(..., help="Figma file key or URL"),
    group_by: GroupBy = typer.Option(GroupBy.VARIABLE, "--group-by", "-g", help="Group data by variable or file"),
    output_format: str = typer.Option("table", "--format", "-f", help="Output format: table, json"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Get variable usage analytics data."""
    
    async def _run():
        file_key = parse_file_key(file_key_or_url)
        token = api_key or get_api_key()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Fetching variable usages...", total=None)
            
            async with FigmaAnalyticsSDK(token) as sdk:
                if group_by not in [GroupBy.VARIABLE, GroupBy.FILE]:
                    raise typer.BadParameter("group_by must be 'variable' or 'file'")
                
                response = await sdk.get_variable_usages(file_key, group_by)
                all_data = response.rows
            
            progress.update(task, description=f"Fetched {len(all_data)} records")
        
        if output_format == "json":
            data = [row.model_dump() for row in all_data]
            output_text = json.dumps(data, indent=2, default=str)
        else:
            table = format_table_data(all_data, f"Variable Usages - {group_by.value.title()}")
            console.print(table)
            return
        
        if output_file:
            output_file.write_text(output_text)
            console.print(f"✅ Saved {len(all_data)} records to {output_file}")
        else:
            console.print(output_text)
    
    asyncio.run(_run())


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run the server on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind the server to"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Figma API token"),
) -> None:
    """Start the FastAPI server."""
    if api_key:
        os.environ["FIGMA_TOKEN"] = api_key
    
    console.print(f"🚀 Starting Figma Analytics API server on {host}:{port}")
    console.print(f"📚 API Documentation: http://{host}:{port}/docs")
    console.print(f"🔍 ReDoc: http://{host}:{port}/redoc")
    
    uvicorn.run(
        "figma_library_analytics.server:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    app()