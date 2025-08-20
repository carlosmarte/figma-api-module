"""
Utility functions for the Figma Variables API client.
"""

import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs


def extract_file_key_from_url(url: str) -> Optional[str]:
    """
    Extract file key from a Figma file URL.
    
    Args:
        url: Figma file URL (e.g., https://www.figma.com/file/ABC123/My-File)
        
    Returns:
        File key if found, None otherwise
        
    Examples:
        >>> extract_file_key_from_url("https://www.figma.com/file/ABC123/My-File")
        "ABC123"
    """
    pattern = r"figma\.com/file/([a-zA-Z0-9]+)"
    match = re.search(pattern, url)
    return match.group(1) if match else None


def validate_file_key(file_key: str) -> bool:
    """
    Validate a Figma file key format.
    
    Args:
        file_key: File key to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not file_key:
        return False
    
    # Figma file keys are typically alphanumeric with specific length
    pattern = r"^[a-zA-Z0-9]+$"
    return bool(re.match(pattern, file_key)) and len(file_key) > 10


def build_query_params(**kwargs) -> Dict[str, str]:
    """
    Build query parameters, filtering out None values.
    
    Args:
        **kwargs: Key-value pairs for query parameters
        
    Returns:
        Dictionary of non-None query parameters
    """
    return {k: str(v) for k, v in kwargs.items() if v is not None}


def format_variable_name(name: str) -> str:
    """
    Format a variable name according to Figma conventions.
    
    Args:
        name: Raw variable name
        
    Returns:
        Formatted variable name
    """
    # Remove special characters except hyphens, underscores, and spaces
    cleaned = re.sub(r"[^a-zA-Z0-9\-_\s]", "", name)
    
    # Replace spaces with hyphens
    formatted = re.sub(r"\s+", "-", cleaned.strip())
    
    return formatted


def validate_variable_name(name: str) -> bool:
    """
    Validate a variable name according to Figma rules.
    
    Args:
        name: Variable name to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not name or len(name.strip()) == 0:
        return False
    
    # Variable names cannot contain certain special characters
    invalid_chars = r"[\.{}]"
    return not re.search(invalid_chars, name)


def generate_temp_id(prefix: str = "temp") -> str:
    """
    Generate a temporary ID for use in API requests.
    
    Args:
        prefix: Prefix for the temporary ID
        
    Returns:
        Temporary ID string
    """
    import uuid
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def convert_rgb_to_figma_color(r: int, g: int, b: int, a: int = 255) -> Dict[str, float]:
    """
    Convert RGB values (0-255) to Figma color format (0-1).
    
    Args:
        r: Red component (0-255)
        g: Green component (0-255) 
        b: Blue component (0-255)
        a: Alpha component (0-255)
        
    Returns:
        Dictionary with r, g, b, a values in 0-1 range
    """
    return {
        "r": r / 255.0,
        "g": g / 255.0,
        "b": b / 255.0,
        "a": a / 255.0
    }


def convert_figma_color_to_rgb(color: Dict[str, float]) -> Dict[str, int]:
    """
    Convert Figma color format (0-1) to RGB values (0-255).
    
    Args:
        color: Dictionary with r, g, b, a values in 0-1 range
        
    Returns:
        Dictionary with r, g, b, a values in 0-255 range
    """
    return {
        "r": int(color.get("r", 0) * 255),
        "g": int(color.get("g", 0) * 255),
        "b": int(color.get("b", 0) * 255),
        "a": int(color.get("a", 1) * 255)
    }


def format_error_message(error_data: Dict[str, Any]) -> str:
    """
    Format error message from API response.
    
    Args:
        error_data: Error data from API response
        
    Returns:
        Formatted error message
    """
    if isinstance(error_data, dict):
        message = error_data.get("message", "Unknown error")
        details = error_data.get("details", "")
        if details:
            return f"{message}: {details}"
        return message
    
    return str(error_data)