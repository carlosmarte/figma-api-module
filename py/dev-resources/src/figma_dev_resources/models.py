"""Pydantic models for Figma Dev Resources API."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class DevResource(BaseModel):
    """A dev resource in a Figma file."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(..., description="Unique identifier of the dev resource")
    name: str = Field(..., description="The name of the dev resource")
    url: str = Field(..., description="The URL of the dev resource")
    file_key: str = Field(..., description="The file key where the dev resource belongs")
    node_id: str = Field(..., description="The target node to attach the dev resource to")


class DevResourceCreate(BaseModel):
    """Model for creating a new dev resource."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., description="The name of the dev resource", min_length=1)
    url: str = Field(..., description="The URL of the dev resource", min_length=1)
    file_key: str = Field(..., description="The file key where the dev resource belongs", min_length=1)
    node_id: str = Field(..., description="The target node to attach the dev resource to", min_length=1)


class DevResourceUpdate(BaseModel):
    """Model for updating an existing dev resource."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(..., description="Unique identifier of the dev resource to update", min_length=1)
    name: Optional[str] = Field(None, description="The name of the dev resource", min_length=1)
    url: Optional[str] = Field(None, description="The URL of the dev resource", min_length=1)


class DevResourceError(BaseModel):
    """Error details for dev resource operations."""

    model_config = ConfigDict(str_strip_whitespace=True)

    file_key: Optional[str] = Field(None, description="The file key")
    node_id: Optional[str] = Field(None, description="The node id")
    id: Optional[str] = Field(None, description="The dev resource id")
    error: str = Field(..., description="The error message")


class GetDevResourcesResponse(BaseModel):
    """Response from the GET dev resources endpoint."""

    model_config = ConfigDict(str_strip_whitespace=True)

    dev_resources: List[DevResource] = Field(..., description="An array of dev resources")


class CreateDevResourcesResponse(BaseModel):
    """Response from the POST dev resources endpoint."""

    model_config = ConfigDict(str_strip_whitespace=True)

    links_created: List[DevResource] = Field(..., description="An array of links created")
    errors: List[DevResourceError] = Field(default_factory=list, description="An array of errors")


class UpdateDevResourcesResponse(BaseModel):
    """Response from the PUT dev resources endpoint."""

    model_config = ConfigDict(str_strip_whitespace=True)

    links_updated: List[DevResource] = Field(..., description="An array of links updated")
    errors: List[DevResourceError] = Field(default_factory=list, description="An array of errors")


class DeleteDevResourceResponse(BaseModel):
    """Response from the DELETE dev resource endpoint."""

    model_config = ConfigDict(str_strip_whitespace=True)

    status: int = Field(..., description="The status of the request")
    error: bool = Field(..., description="Whether an error occurred")
    message: Optional[str] = Field(None, description="Response message")


class CreateDevResourcesRequest(BaseModel):
    """Request body for creating dev resources."""

    model_config = ConfigDict(str_strip_whitespace=True)

    dev_resources: List[DevResourceCreate] = Field(..., description="An array of dev resources to create")


class UpdateDevResourcesRequest(BaseModel):
    """Request body for updating dev resources."""

    model_config = ConfigDict(str_strip_whitespace=True)

    dev_resources: List[DevResourceUpdate] = Field(..., description="An array of dev resources to update")