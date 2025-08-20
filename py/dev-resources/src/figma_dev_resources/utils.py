"""Utility functions for Figma Dev Resources SDK."""

import re
from typing import List, Optional
from urllib.parse import urlparse


def extract_file_key_from_url(url: str) -> Optional[str]:
    """Extract file key from a Figma URL.
    
    Args:
        url: A Figma file URL
        
    Returns:
        The file key if found, otherwise None
        
    Example:
        >>> extract_file_key_from_url("https://www.figma.com/file/abc123/My-Design")
        "abc123"
    """
    # Pattern for Figma file URLs
    pattern = r"figma\.com/file/([a-zA-Z0-9]+)"
    match = re.search(pattern, url)
    return match.group(1) if match else None


def extract_node_id_from_url(url: str) -> Optional[str]:
    """Extract node ID from a Figma URL.
    
    Args:
        url: A Figma file URL with node ID
        
    Returns:
        The node ID if found, otherwise None
        
    Example:
        >>> extract_node_id_from_url("https://www.figma.com/file/abc123/My-Design?node-id=1%3A2")
        "1:2"
    """
    parsed = urlparse(url)
    if "node-id" in parsed.fragment:
        # Handle fragment-based node IDs
        node_match = re.search(r"node-id=([^&]+)", parsed.fragment)
        if node_match:
            return node_match.group(1).replace("%3A", ":")
    
    if "node-id" in parsed.query:
        # Handle query-based node IDs
        node_match = re.search(r"node-id=([^&]+)", parsed.query)
        if node_match:
            return node_match.group(1).replace("%3A", ":")
    
    return None


def validate_url(url: str) -> bool:
    """Validate if a string is a valid URL.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if valid URL, False otherwise
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def format_node_ids(node_ids: Optional[List[str]]) -> Optional[str]:
    """Format a list of node IDs for API requests.
    
    Args:
        node_ids: List of node IDs
        
    Returns:
        Comma-separated string of node IDs, or None if empty
    """
    if not node_ids:
        return None
    return ",".join(node_ids)


def chunk_list(items: List, chunk_size: int = 100) -> List[List]:
    """Chunk a list into smaller lists of specified size.
    
    Args:
        items: List to chunk
        chunk_size: Maximum size of each chunk
        
    Returns:
        List of chunked lists
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename by removing invalid characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename safe for filesystem use
    """
    # Remove or replace invalid characters
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, "_", filename)
    
    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip(". ")
    
    # Ensure it's not empty
    if not sanitized:
        sanitized = "unnamed"
        
    return sanitized