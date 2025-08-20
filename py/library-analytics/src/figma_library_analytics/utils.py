"""
Utility functions for Figma Library Analytics.
"""

import re
from datetime import date, datetime
from typing import Optional, Tuple
from urllib.parse import urlparse


def extract_file_key_from_url(url: str) -> Optional[str]:
    """
    Extract the file key from a Figma URL.
    
    Args:
        url: Figma file URL (e.g., "https://www.figma.com/file/ABC123/My-Design")
        
    Returns:
        File key if found, None otherwise
        
    Examples:
        >>> extract_file_key_from_url("https://www.figma.com/file/ABC123/My-Design")
        "ABC123"
    """
    pattern = r'https://www\.figma\.com/file/([a-zA-Z0-9]+)'
    match = re.search(pattern, url)
    return match.group(1) if match else None


def validate_file_key(file_key: str) -> bool:
    """
    Validate that a file key has the correct format.
    
    Args:
        file_key: The file key to validate
        
    Returns:
        True if valid, False otherwise
    """
    # Figma file keys are typically alphanumeric strings
    pattern = r'^[a-zA-Z0-9]+$'
    return bool(re.match(pattern, file_key)) and len(file_key) > 5


def format_date_for_api(date_obj: date) -> str:
    """
    Format a date object for use in API parameters.
    
    Args:
        date_obj: Date to format
        
    Returns:
        ISO 8601 formatted date string (YYYY-MM-DD)
    """
    return date_obj.isoformat()


def parse_date_from_api(date_str: str) -> date:
    """
    Parse a date string from the API response.
    
    Args:
        date_str: Date string from API (ISO 8601 format)
        
    Returns:
        Date object
    """
    return datetime.fromisoformat(date_str).date()


def validate_date_range(start_date: Optional[date], end_date: Optional[date]) -> Tuple[bool, str]:
    """
    Validate a date range for analytics queries.
    
    Args:
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if start_date and end_date:
        if start_date > end_date:
            return False, "Start date must be before or equal to end date"
        
        # Check if date range is too large (more than 1 year)
        delta = end_date - start_date
        if delta.days > 365:
            return False, "Date range cannot exceed 365 days"
    
    # Check if dates are in the future
    today = date.today()
    if start_date and start_date > today:
        return False, "Start date cannot be in the future"
    if end_date and end_date > today:
        return False, "End date cannot be in the future"
    
    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename for use in file operations.
    
    Args:
        filename: The filename to sanitize
        
    Returns:
        Sanitized filename
    """
    # Remove or replace invalid characters
    sanitized = re.sub(r'[^\w\-_.]', '_', filename)
    # Remove multiple consecutive underscores
    sanitized = re.sub(r'_+', '_', sanitized)
    # Remove leading/trailing underscores
    sanitized = sanitized.strip('_')
    return sanitized


def build_query_params(**kwargs) -> dict:
    """
    Build query parameters dict, excluding None values.
    
    Args:
        **kwargs: Query parameters
        
    Returns:
        Dictionary with non-None values
    """
    return {k: v for k, v in kwargs.items() if v is not None}