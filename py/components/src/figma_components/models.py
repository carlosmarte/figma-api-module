"""Pydantic models for Figma Components API."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class StyleType(str, Enum):
    """The type of style."""
    FILL = "FILL"
    TEXT = "TEXT"
    EFFECT = "EFFECT"
    GRID = "GRID"


class User(BaseModel):
    """A description of a user."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique stable id of the user")
    handle: str = Field(..., description="Name of the user")
    img_url: str = Field(..., description="URL link to the user's profile image")


class FrameInfo(BaseModel):
    """Data on the frame a component resides in."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    node_id: str = Field(..., description="The ID of the frame node within the file")
    name: str = Field(..., description="The name of the frame node")
    background_color: str = Field(..., description="The background color of the frame node")
    page_id: str = Field(..., description="The ID of the page containing the frame node")
    page_name: str = Field(..., description="The name of the page containing the frame node")
    containing_component_set: Optional[dict] = Field(
        None, 
        description="The component set node that contains the frame node"
    )


class PublishedComponent(BaseModel):
    """An arrangement of published UI elements that can be instantiated across figma files."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    key: str = Field(..., description="The unique identifier for the component")
    file_key: str = Field(..., description="The unique identifier of the Figma file that contains the component")
    node_id: str = Field(..., description="The unique identifier of the component node within the Figma file")
    thumbnail_url: Optional[str] = Field(None, description="A URL to a thumbnail image of the component")
    name: str = Field(..., description="The name of the component")
    description: str = Field(..., description="The description of the component as entered by the publisher")
    created_at: datetime = Field(..., description="The UTC ISO 8601 time when the component was created")
    updated_at: datetime = Field(..., description="The UTC ISO 8601 time when the component was last updated")
    user: User = Field(..., description="The user who last updated the component")
    containing_frame: Optional[FrameInfo] = Field(None, description="The containing frame of the component")


class PublishedComponentSet(BaseModel):
    """A node containing a set of variants of a component."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    key: str = Field(..., description="The unique identifier for the component set")
    file_key: str = Field(..., description="The unique identifier of the Figma file that contains the component set")
    node_id: str = Field(..., description="The unique identifier of the component set node within the Figma file")
    thumbnail_url: Optional[str] = Field(None, description="A URL to a thumbnail image of the component set")
    name: str = Field(..., description="The name of the component set")
    description: str = Field(..., description="The description of the component set as entered by the publisher")
    created_at: datetime = Field(..., description="The UTC ISO 8601 time when the component set was created")
    updated_at: datetime = Field(..., description="The UTC ISO 8601 time when the component set was last updated")
    user: User = Field(..., description="The user who last updated the component set")
    containing_frame: Optional[FrameInfo] = Field(None, description="The containing frame of the component set")


class PublishedStyle(BaseModel):
    """A set of published properties that can be applied to nodes."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    key: str = Field(..., description="The unique identifier for the style")
    file_key: str = Field(..., description="The unique identifier of the Figma file that contains the style")
    node_id: str = Field(..., description="ID of the style node within the figma file")
    style_type: StyleType = Field(..., description="The type of style")
    thumbnail_url: Optional[str] = Field(None, description="A URL to a thumbnail image of the style")
    name: str = Field(..., description="The name of the style")
    description: str = Field(..., description="The description of the style as entered by the publisher")
    created_at: datetime = Field(..., description="The UTC ISO 8601 time when the style was created")
    updated_at: datetime = Field(..., description="The UTC ISO 8601 time when the style was last updated")
    user: User = Field(..., description="The user who last updated the style")
    sort_position: str = Field(..., description="A user specified order number by which the style can be sorted")


class ResponseCursor(BaseModel):
    """Cursor information for pagination."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    before: Optional[int] = Field(None, description="Cursor for previous page")
    after: Optional[int] = Field(None, description="Cursor for next page")


# Response models
class ComponentsResponse(BaseModel):
    """Response model for components endpoints."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(200, description="The status of the request")
    error: bool = Field(False, description="For successful requests, this value is always false")
    components: list[PublishedComponent] = Field(..., description="List of components")
    cursor: Optional[ResponseCursor] = Field(None, description="Pagination cursor")


class ComponentSetsResponse(BaseModel):
    """Response model for component sets endpoints."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(200, description="The status of the request")
    error: bool = Field(False, description="For successful requests, this value is always false")
    component_sets: list[PublishedComponentSet] = Field(..., description="List of component sets")
    cursor: Optional[ResponseCursor] = Field(None, description="Pagination cursor")


class StylesResponse(BaseModel):
    """Response model for styles endpoints."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(200, description="The status of the request")
    error: bool = Field(False, description="For successful requests, this value is always false")
    styles: list[PublishedStyle] = Field(..., description="List of styles")
    cursor: Optional[ResponseCursor] = Field(None, description="Pagination cursor")


class SingleComponentResponse(BaseModel):
    """Response model for single component endpoint."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(200, description="The status of the request")
    error: bool = Field(False, description="For successful requests, this value is always false")
    meta: PublishedComponent = Field(..., description="Component data")


class SingleComponentSetResponse(BaseModel):
    """Response model for single component set endpoint."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(200, description="The status of the request")
    error: bool = Field(False, description="For successful requests, this value is always false")
    meta: PublishedComponentSet = Field(..., description="Component set data")


class SingleStyleResponse(BaseModel):
    """Response model for single style endpoint."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(200, description="The status of the request")
    error: bool = Field(False, description="For successful requests, this value is always false")
    meta: PublishedStyle = Field(..., description="Style data")