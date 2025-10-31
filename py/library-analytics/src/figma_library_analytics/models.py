"""
Pydantic models for Figma Library Analytics API responses.
"""

from datetime import date
from enum import Enum
from typing import Generic, List, Optional, TypeVar, Union

from pydantic import BaseModel, ConfigDict, Field


class GroupBy(str, Enum):
    """Valid group_by values for analytics endpoints."""
    
    # Component endpoints
    COMPONENT = "component"
    
    # Style endpoints  
    STYLE = "style"
    
    # Variable endpoints
    VARIABLE = "variable"
    
    # Common groupings
    TEAM = "team"
    FILE = "file"


class LibraryAnalyticsComponentActionsByAsset(BaseModel):
    """Library analytics component actions data broken down by asset."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    week: str = Field(..., description="The date in ISO 8601 format. e.g. 2023-12-13")
    component_key: str = Field(..., description="Unique, stable id of the component.")
    component_name: str = Field(..., description="Name of the component.")
    component_set_key: Optional[str] = Field(None, description="Unique, stable id of the component set that this component belongs to.")
    component_set_name: Optional[str] = Field(None, description="Name of the component set that this component belongs to.")
    detachments: int = Field(..., description="The number of detach events for this period.")
    insertions: int = Field(..., description="The number of insertion events for this period.")


class LibraryAnalyticsComponentActionsByTeam(BaseModel):
    """Library analytics component action data broken down by team."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    week: str = Field(..., description="The date in ISO 8601 format. e.g. 2023-12-13")
    team_name: str = Field(..., description="The name of the team using the library.")
    workspace_name: Optional[str] = Field(None, description="The name of the workspace that the team belongs to.")
    detachments: int = Field(..., description="The number of detach events for this period.")
    insertions: int = Field(..., description="The number of insertion events for this period.")


class LibraryAnalyticsComponentUsagesByAsset(BaseModel):
    """Library analytics component usage data broken down by component."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    component_key: str = Field(..., description="Unique, stable id of the component.")
    component_name: str = Field(..., description="Name of the component.")
    component_set_key: Optional[str] = Field(None, description="Unique, stable id of the component set that this component belongs to.")
    component_set_name: Optional[str] = Field(None, description="Name of the component set that this component belongs to.")
    usages: int = Field(..., description="The number of instances of the component within the organization.")
    teams_using: int = Field(..., description="The number of teams using the component within the organization.")
    files_using: int = Field(..., description="The number of files using the component within the organization.")


class LibraryAnalyticsComponentUsagesByFile(BaseModel):
    """Library analytics component usage data broken down by file."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    file_name: str = Field(..., description="The name of the file using the library.")
    team_name: str = Field(..., description="The name of the team the file belongs to.")
    workspace_name: Optional[str] = Field(None, description="The name of the workspace that the file belongs to.")
    usages: int = Field(..., description="The number of component instances from the library used within the file.")


class LibraryAnalyticsStyleActionsByAsset(BaseModel):
    """Library analytics style actions data broken down by asset."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    week: str = Field(..., description="The date in ISO 8601 format. e.g. 2023-12-13")
    style_key: str = Field(..., description="Unique, stable id of the style.")
    style_name: str = Field(..., description="The name of the style.")
    style_type: str = Field(..., description="The type of the style.")
    detachments: int = Field(..., description="The number of detach events for this period.")
    insertions: int = Field(..., description="The number of insertion events for this period.")


class LibraryAnalyticsStyleActionsByTeam(BaseModel):
    """Library analytics style action data broken down by team."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    week: str = Field(..., description="The date in ISO 8601 format. e.g. 2023-12-13")
    team_name: str = Field(..., description="The name of the team using the library.")
    workspace_name: Optional[str] = Field(None, description="The name of the workspace that the team belongs to.")
    detachments: int = Field(..., description="The number of detach events for this period.")
    insertions: int = Field(..., description="The number of insertion events for this period.")


class LibraryAnalyticsStyleUsagesByAsset(BaseModel):
    """Library analytics style usage data broken down by component."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    style_key: str = Field(..., description="Unique, stable id of the style.")
    style_name: str = Field(..., description="The name of the style.")
    style_type: str = Field(..., description="The type of the style.")
    usages: int = Field(..., description="The number of usages of the style within the organization.")
    teams_using: int = Field(..., description="The number of teams using the style within the organization.")
    files_using: int = Field(..., description="The number of files using the style within the organization.")


class LibraryAnalyticsStyleUsagesByFile(BaseModel):
    """Library analytics style usage data broken down by file."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    file_name: str = Field(..., description="The name of the file using the library.")
    team_name: str = Field(..., description="The name of the team the file belongs to.")
    workspace_name: Optional[str] = Field(None, description="The name of the workspace that the file belongs to.")
    usages: int = Field(..., description="The number of times styles from this library are used within the file.")


class LibraryAnalyticsVariableActionsByAsset(BaseModel):
    """Library analytics variable actions data broken down by asset."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    week: str = Field(..., description="The date in ISO 8601 format. e.g. 2023-12-13")
    variable_key: str = Field(..., description="Unique, stable id of the variable.")
    variable_name: str = Field(..., description="The name of the variable.")
    variable_type: str = Field(..., description="The type of the variable.")
    collection_key: str = Field(..., description="Unique, stable id of the collection the variable belongs to.")
    collection_name: str = Field(..., description="The name of the collection the variable belongs to.")
    detachments: int = Field(..., description="The number of detach events for this period.")
    insertions: int = Field(..., description="The number of insertion events for this period.")


class LibraryAnalyticsVariableActionsByTeam(BaseModel):
    """Library analytics variable action data broken down by team."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    week: str = Field(..., description="The date in ISO 8601 format. e.g. 2023-12-13")
    team_name: str = Field(..., description="The name of the team using the library.")
    workspace_name: Optional[str] = Field(None, description="The name of the workspace that the team belongs to.")
    detachments: int = Field(..., description="The number of detach events for this period.")
    insertions: int = Field(..., description="The number of insertion events for this period.")


class LibraryAnalyticsVariableUsagesByAsset(BaseModel):
    """Library analytics variable usage data broken down by component."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    variable_key: str = Field(..., description="Unique, stable id of the variable.")
    variable_name: str = Field(..., description="The name of the variable.")
    variable_type: str = Field(..., description="The type of the variable.")
    collection_key: str = Field(..., description="Unique, stable id of the collection the variable belongs to.")
    collection_name: str = Field(..., description="The name of the collection the variable belongs to.")
    usages: int = Field(..., description="The number of usages of the variable within the organization.")
    teams_using: int = Field(..., description="The number of teams using the variable within the organization.")
    files_using: int = Field(..., description="The number of files using the variable within the organization.")


class LibraryAnalyticsVariableUsagesByFile(BaseModel):
    """Library analytics variable usage data broken down by file."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    file_name: str = Field(..., description="The name of the file using the library.")
    team_name: str = Field(..., description="The name of the team the file belongs to.")
    workspace_name: Optional[str] = Field(None, description="The name of the workspace that the file belongs to.")
    usages: int = Field(..., description="The number of times variables from this library are used within the file.")


# Type variable for generic analytics response
T = TypeVar('T')


class AnalyticsResponse(BaseModel, Generic[T]):
    """Generic response model for analytics endpoints."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    rows: List[T] = Field(..., description="An array of analytics data.")
    next_page: bool = Field(..., description="Whether there is a next page of data that can be fetched.")
    cursor: Optional[str] = Field(None, description="The cursor to use to fetch the next page of data. Not present if next_page is false.")


# Type aliases for specific response types
ComponentActionsResponse = AnalyticsResponse[
    Union[LibraryAnalyticsComponentActionsByAsset, LibraryAnalyticsComponentActionsByTeam]
]

ComponentUsagesResponse = AnalyticsResponse[
    Union[LibraryAnalyticsComponentUsagesByAsset, LibraryAnalyticsComponentUsagesByFile]
]

StyleActionsResponse = AnalyticsResponse[
    Union[LibraryAnalyticsStyleActionsByAsset, LibraryAnalyticsStyleActionsByTeam]
]

StyleUsagesResponse = AnalyticsResponse[
    Union[LibraryAnalyticsStyleUsagesByAsset, LibraryAnalyticsStyleUsagesByFile]
]

VariableActionsResponse = AnalyticsResponse[
    Union[LibraryAnalyticsVariableActionsByAsset, LibraryAnalyticsVariableActionsByTeam]
]

VariableUsagesResponse = AnalyticsResponse[
    Union[LibraryAnalyticsVariableUsagesByAsset, LibraryAnalyticsVariableUsagesByFile]
]