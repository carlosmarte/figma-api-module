"""Pydantic models for figma_files."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class EditorType(str, Enum):
    """Editor type enumeration."""
    FIGMA = "figma"
    FIGJAM = "figjam"
    SLIDES = "slides"
    BUZZ = "buzz"
    SITES = "sites"
    MAKE = "make"


class Role(str, Enum):
    """User role enumeration."""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class LinkAccess(str, Enum):
    """Link access enumeration."""
    VIEW = "view"
    EDIT = "edit"
    ORG_VIEW = "org_view"
    ORG_EDIT = "org_edit"
    INHERIT = "inherit"


class ImageFormat(str, Enum):
    """Image format enumeration."""
    JPG = "jpg"
    PNG = "png"
    SVG = "svg"
    PDF = "pdf"


class User(BaseModel):
    """User model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(..., description="User ID")
    handle: str = Field(..., description="User handle")
    img_url: str = Field(..., description="User avatar URL")
    email: Optional[str] = Field(None, description="User email")


class Branch(BaseModel):
    """Branch model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    key: str = Field(..., description="Branch key")
    name: str = Field(..., description="Branch name")
    thumbnail_url: str = Field(..., description="Branch thumbnail URL")
    last_modified: datetime = Field(..., description="Last modified timestamp")


class Component(BaseModel):
    """Component model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    key: str = Field(..., description="Component key")
    name: str = Field(..., description="Component name")
    description: str = Field(..., description="Component description")
    document_id: str = Field(..., description="Document ID")
    containing_frame: Dict[str, Any] = Field(default_factory=dict, description="Containing frame")


class ComponentSet(BaseModel):
    """Component set model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    key: str = Field(..., description="Component set key")
    name: str = Field(..., description="Component set name")
    description: str = Field(..., description="Component set description")


class Style(BaseModel):
    """Style model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    key: str = Field(..., description="Style key")
    name: str = Field(..., description="Style name")
    style_type: str = Field(..., description="Style type")
    description: str = Field(..., description="Style description")


class Node(BaseModel):
    """Node model."""
    
    model_config = ConfigDict(str_strip_whitespace=True, extra="allow")

    id: str = Field(..., description="Node ID")
    name: str = Field(..., description="Node name")
    type: str = Field(..., description="Node type")
    visible: Optional[bool] = Field(True, description="Node visibility")
    locked: Optional[bool] = Field(False, description="Node locked state")
    children: Optional[List[Node]] = Field(None, description="Child nodes")
    # Additional fields will be captured in extra due to ConfigDict


class DocumentNode(Node):
    """Document node model."""
    
    children: List[Node] = Field(..., description="Document children")


class Version(BaseModel):
    """Version model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(..., description="Version ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    label: str = Field(..., description="Version label")
    description: str = Field(..., description="Version description")
    user: User = Field(..., description="User who created the version")
    thumbnail_url: str = Field(..., description="Version thumbnail URL")


class ResponsePagination(BaseModel):
    """Pagination model."""
    
    next_page: Optional[str] = Field(None, description="Next page cursor")
    previous_page: Optional[str] = Field(None, description="Previous page cursor")


class FileResponse(BaseModel):
    """File response model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., description="File name")
    role: Role = Field(..., description="User role")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    editor_type: EditorType = Field(..., description="Editor type")
    thumbnail_url: str = Field(..., description="Thumbnail URL")
    version: str = Field(..., description="File version")
    document: DocumentNode = Field(..., description="Document tree")
    components: Dict[str, Component] = Field(default_factory=dict, description="Components")
    component_sets: Dict[str, ComponentSet] = Field(default_factory=dict, description="Component sets")
    schema_version: int = Field(0, description="Schema version")
    styles: Dict[str, Style] = Field(default_factory=dict, description="Styles")
    link_access: Optional[LinkAccess] = Field(None, description="Link access")
    main_file_key: Optional[str] = Field(None, description="Main file key")
    branches: Optional[List[Branch]] = Field(None, description="Branches")


class FileNodeData(BaseModel):
    """File node data model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    document: Node = Field(..., description="Node document")
    components: Dict[str, Component] = Field(default_factory=dict, description="Components")
    component_sets: Dict[str, ComponentSet] = Field(default_factory=dict, description="Component sets")
    schema_version: int = Field(0, description="Schema version")
    styles: Dict[str, Style] = Field(default_factory=dict, description="Styles")


class FileNodesResponse(BaseModel):
    """File nodes response model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., description="File name")
    role: Role = Field(..., description="User role")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    editor_type: EditorType = Field(..., description="Editor type")
    thumbnail_url: str = Field(..., description="Thumbnail URL")
    version: str = Field(..., description="File version")
    nodes: Dict[str, Optional[FileNodeData]] = Field(..., description="Node data")


class ImageRenderResponse(BaseModel):
    """Image render response model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    err: Optional[str] = Field(None, description="Error message")
    images: Dict[str, Optional[str]] = Field(..., description="Image URLs by node ID")


class ImageFillsMeta(BaseModel):
    """Image fills metadata."""
    
    images: Dict[str, str] = Field(..., description="Image fill URLs by reference")


class ImageFillsResponse(BaseModel):
    """Image fills response model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    error: bool = Field(False, description="Error flag")
    status: int = Field(200, description="Status code")
    meta: ImageFillsMeta = Field(..., description="Response metadata")


class FileMetaResponse(BaseModel):
    """File metadata response model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., description="File name")
    folder_name: Optional[str] = Field(None, description="Project name")
    last_touched_at: datetime = Field(..., description="Last touched timestamp")
    creator: User = Field(..., description="File creator")
    last_touched_by: Optional[User] = Field(None, description="Last touched by user")
    thumbnail_url: str = Field(..., description="Thumbnail URL")
    editor_type: EditorType = Field(..., description="Editor type")
    role: Role = Field(..., description="User role")
    link_access: Optional[LinkAccess] = Field(None, description="Link access")
    url: Optional[str] = Field(None, description="File URL")
    version: str = Field(..., description="File version")


class FileVersionsResponse(BaseModel):
    """File versions response model."""
    
    model_config = ConfigDict(str_strip_whitespace=True)

    versions: List[Version] = Field(..., description="File versions")
    pagination: ResponsePagination = Field(..., description="Pagination info")


# Update the Node model to allow self-referencing
Node.model_rebuild()