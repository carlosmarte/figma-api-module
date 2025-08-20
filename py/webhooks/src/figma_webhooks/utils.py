"""
Utility functions for the Figma Webhooks library.
"""

import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse


def extract_figma_file_key(url: str) -> Optional[str]:
    """
    Extract the file key from a Figma file URL.
    
    Args:
        url: Figma file URL (e.g., "https://www.figma.com/file/ABC123/My-File")
        
    Returns:
        File key if found, None otherwise
    """
    # Pattern for Figma file URLs
    pattern = r'https://(?:www\.)?figma\.com/file/([a-zA-Z0-9]+)'
    match = re.search(pattern, url)
    return match.group(1) if match else None


def extract_figma_team_id(url: str) -> Optional[str]:
    """
    Extract the team ID from a Figma team URL.
    
    Args:
        url: Figma team URL (e.g., "https://www.figma.com/team/123456/Team-Name")
        
    Returns:
        Team ID if found, None otherwise
    """
    pattern = r'https://(?:www\.)?figma\.com/team/([a-zA-Z0-9]+)'
    match = re.search(pattern, url)
    return match.group(1) if match else None


def extract_figma_project_id(url: str) -> Optional[str]:
    """
    Extract the project ID from a Figma project URL.
    
    Args:
        url: Figma project URL (e.g., "https://www.figma.com/project/123456/Project-Name")
        
    Returns:
        Project ID if found, None otherwise
    """
    pattern = r'https://(?:www\.)?figma\.com/project/([a-zA-Z0-9]+)'
    match = re.search(pattern, url)
    return match.group(1) if match else None


def validate_webhook_endpoint(endpoint: str) -> bool:
    """
    Validate that a webhook endpoint URL is valid.
    
    Args:
        endpoint: The webhook endpoint URL
        
    Returns:
        True if valid, False otherwise
    """
    if not endpoint or len(endpoint) > 2048:
        return False
        
    try:
        parsed = urlparse(endpoint)
        return all([
            parsed.scheme in ('http', 'https'),
            parsed.netloc,
            not parsed.fragment,  # Fragments not allowed
        ])
    except Exception:
        return False


def validate_passcode(passcode: str) -> bool:
    """
    Validate that a webhook passcode is valid.
    
    Args:
        passcode: The webhook passcode
        
    Returns:
        True if valid, False otherwise
    """
    return bool(passcode and len(passcode) <= 100)


def validate_description(description: Optional[str]) -> bool:
    """
    Validate that a webhook description is valid.
    
    Args:
        description: The webhook description
        
    Returns:
        True if valid, False otherwise
    """
    if description is None:
        return True
    return len(description) <= 150


def clean_webhook_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean webhook data by removing None values and empty strings.
    
    Args:
        data: Raw webhook data
        
    Returns:
        Cleaned webhook data
    """
    cleaned = {}
    for key, value in data.items():
        if value is not None and value != "":
            cleaned[key] = value
    return cleaned


def format_context_display(context: str, context_id: str) -> str:
    """
    Format context information for display.
    
    Args:
        context: Context type (TEAM, PROJECT, FILE)
        context_id: Context ID
        
    Returns:
        Formatted display string
    """
    return f"{context.title()}: {context_id}"


def is_valid_figma_id(id_value: str) -> bool:
    """
    Check if a string is a valid Figma ID format.
    
    Args:
        id_value: The ID to validate
        
    Returns:
        True if valid format, False otherwise
    """
    if not id_value:
        return False
    
    # Figma IDs are typically alphanumeric with some special characters
    pattern = r'^[a-zA-Z0-9_-]+$'
    return bool(re.match(pattern, id_value)) and len(id_value) > 0