"""Utility functions for Figma Projects."""

import re
import csv
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from urllib.parse import urlparse, parse_qs

from .models import Project, ProjectFile, ExportFormat


logger = logging.getLogger(__name__)


def extract_team_id_from_url(url: str) -> Optional[str]:
    """Extract team ID from a Figma team URL.
    
    Args:
        url: Figma team URL like 'https://www.figma.com/team/123456789/TeamName'
        
    Returns:
        Team ID if found, None otherwise
    """
    pattern = r"https://www\.figma\.com/team/(\w+)"
    match = re.search(pattern, url)
    return match.group(1) if match else None


def extract_project_id_from_url(url: str) -> Optional[str]:
    """Extract project ID from a Figma project URL.
    
    Args:
        url: Figma project URL like 'https://www.figma.com/project/123456789/ProjectName'
        
    Returns:
        Project ID if found, None otherwise
    """
    pattern = r"https://www\.figma\.com/project/(\w+)"
    match = re.search(pattern, url)
    return match.group(1) if match else None


def extract_file_key_from_url(url: str) -> Optional[str]:
    """Extract file key from a Figma file URL.
    
    Args:
        url: Figma file URL like 'https://www.figma.com/file/ABC123/FileName'
        
    Returns:
        File key if found, None otherwise
    """
    pattern = r"https://www\.figma\.com/file/([A-Za-z0-9]+)"
    match = re.search(pattern, url)
    return match.group(1) if match else None


def validate_team_id(team_id: str) -> bool:
    """Validate team ID format.
    
    Args:
        team_id: Team ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not team_id:
        return False
    # Team IDs are typically alphanumeric strings
    return bool(re.match(r"^[A-Za-z0-9]+$", team_id))


def validate_project_id(project_id: str) -> bool:
    """Validate project ID format.
    
    Args:
        project_id: Project ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not project_id:
        return False
    # Project IDs are typically numeric strings
    return bool(re.match(r"^\d+$", project_id))


def validate_api_token(token: str) -> bool:
    """Validate API token format.
    
    Args:
        token: API token to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not token:
        return False
    # Figma tokens are typically 40+ character hex strings
    return len(token) >= 40 and bool(re.match(r"^[a-fA-F0-9-]+$", token))


def format_datetime_for_api(dt: datetime) -> str:
    """Format datetime for API requests.
    
    Args:
        dt: Datetime to format
        
    Returns:
        ISO format string
    """
    return dt.isoformat()


def parse_datetime_from_api(dt_str: str) -> datetime:
    """Parse datetime from API response.
    
    Args:
        dt_str: ISO format datetime string
        
    Returns:
        Parsed datetime object
    """
    try:
        # Handle various ISO formats
        if dt_str.endswith('Z'):
            dt_str = dt_str[:-1] + '+00:00'
        return datetime.fromisoformat(dt_str)
    except ValueError:
        logger.warning(f"Failed to parse datetime: {dt_str}")
        return datetime.now()


def is_recent_file(file: ProjectFile, days: int = 30) -> bool:
    """Check if a file was modified recently.
    
    Args:
        file: Project file to check
        days: Number of days to consider recent
        
    Returns:
        True if file was modified within the specified days
    """
    cutoff = datetime.now() - timedelta(days=days)
    return file.last_modified > cutoff


def filter_files_by_name(files: List[ProjectFile], pattern: str, case_sensitive: bool = False) -> List[ProjectFile]:
    """Filter files by name pattern.
    
    Args:
        files: List of files to filter
        pattern: Search pattern (supports regex)
        case_sensitive: Whether search should be case sensitive
        
    Returns:
        Filtered list of files
    """
    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        regex = re.compile(pattern, flags)
        return [file for file in files if regex.search(file.name)]
    except re.error:
        logger.warning(f"Invalid regex pattern: {pattern}")
        # Fallback to simple string matching
        if case_sensitive:
            return [file for file in files if pattern in file.name]
        else:
            pattern_lower = pattern.lower()
            return [file for file in files if pattern_lower in file.name.lower()]


def sort_files_by_last_modified(files: List[ProjectFile], ascending: bool = False) -> List[ProjectFile]:
    """Sort files by last modified date.
    
    Args:
        files: List of files to sort
        ascending: Sort in ascending order if True, descending if False
        
    Returns:
        Sorted list of files
    """
    return sorted(files, key=lambda f: f.last_modified, reverse=not ascending)


def group_files_by_extension(files: List[ProjectFile]) -> Dict[str, List[ProjectFile]]:
    """Group files by their file extension.
    
    Args:
        files: List of files to group
        
    Returns:
        Dictionary mapping extensions to lists of files
    """
    groups: Dict[str, List[ProjectFile]] = {}
    for file in files:
        # Extract extension from name (Figma files don't have traditional extensions)
        # We'll use the file type or a default
        ext = "figma"  # Default for Figma files
        if ext not in groups:
            groups[ext] = []
        groups[ext].append(file)
    return groups


def calculate_file_statistics(files: List[ProjectFile]) -> Dict[str, Any]:
    """Calculate statistics for a list of files.
    
    Args:
        files: List of files to analyze
        
    Returns:
        Dictionary containing file statistics
    """
    if not files:
        return {
            "total_files": 0,
            "recent_files": 0,
            "oldest_file": None,
            "newest_file": None,
            "avg_age_days": 0
        }
    
    recent_files = [f for f in files if is_recent_file(f)]
    sorted_files = sort_files_by_last_modified(files, ascending=True)
    
    now = datetime.now()
    total_age = sum((now - f.last_modified).days for f in files)
    avg_age = total_age / len(files) if files else 0
    
    return {
        "total_files": len(files),
        "recent_files": len(recent_files),
        "oldest_file": sorted_files[0].name if sorted_files else None,
        "newest_file": sorted_files[-1].name if sorted_files else None,
        "avg_age_days": round(avg_age, 1)
    }


def export_projects_to_json(projects: List[Dict[str, Any]], include_files: bool = True) -> str:
    """Export projects data to JSON format.
    
    Args:
        projects: List of project data dictionaries
        include_files: Whether to include file data
        
    Returns:
        JSON string
    """
    data = {
        "export_date": datetime.now().isoformat(),
        "total_projects": len(projects),
        "projects": projects
    }
    
    if not include_files:
        # Remove file data from projects
        for project in data["projects"]:
            project.pop("files", None)
    
    return json.dumps(data, indent=2, default=str)


def export_projects_to_csv(projects: List[Dict[str, Any]]) -> str:
    """Export projects data to CSV format.
    
    Args:
        projects: List of project data dictionaries
        
    Returns:
        CSV string
    """
    if not projects:
        return "project_id,project_name,file_count\n"
    
    output = []
    output.append("project_id,project_name,file_count,last_activity")
    
    for project in projects:
        files = project.get("files", [])
        file_count = len(files)
        
        # Find most recent file modification
        last_activity = ""
        if files:
            most_recent = max(files, key=lambda f: f.get("last_modified", ""))
            last_activity = most_recent.get("last_modified", "")
        
        row = [
            project.get("id", ""),
            project.get("name", "").replace(",", ";"),  # Escape commas
            str(file_count),
            last_activity
        ]
        output.append(",".join(row))
    
    return "\n".join(output)


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename for safe file system usage.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip(' .')
    # Ensure it's not empty
    if not sanitized:
        sanitized = "untitled"
    return sanitized


def create_pagination_info(total: int, page_size: int, current_page: int) -> Dict[str, Any]:
    """Create pagination information.
    
    Args:
        total: Total number of items
        page_size: Items per page
        current_page: Current page number (0-based)
        
    Returns:
        Pagination information dictionary
    """
    total_pages = (total + page_size - 1) // page_size
    has_next = current_page < total_pages - 1
    has_prev = current_page > 0
    
    return {
        "total": total,
        "page_size": page_size,
        "current_page": current_page,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev,
        "start_index": current_page * page_size,
        "end_index": min((current_page + 1) * page_size, total)
    }