"""
Pydantic models for Figma Variables API.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, ConfigDict


class VariableScope(str, Enum):
    """Variable scope enumeration."""
    ALL_SCOPES = "ALL_SCOPES"
    TEXT_CONTENT = "TEXT_CONTENT"
    CORNER_RADIUS = "CORNER_RADIUS"
    WIDTH_HEIGHT = "WIDTH_HEIGHT"
    GAP = "GAP"
    ALL_FILLS = "ALL_FILLS"
    FRAME_FILL = "FRAME_FILL"
    SHAPE_FILL = "SHAPE_FILL"
    TEXT_FILL = "TEXT_FILL"
    STROKE_COLOR = "STROKE_COLOR"
    STROKE_FLOAT = "STROKE_FLOAT"
    EFFECT_FLOAT = "EFFECT_FLOAT"
    EFFECT_COLOR = "EFFECT_COLOR"
    OPACITY = "OPACITY"
    FONT_FAMILY = "FONT_FAMILY"
    FONT_STYLE = "FONT_STYLE"
    FONT_WEIGHT = "FONT_WEIGHT"
    FONT_SIZE = "FONT_SIZE"
    LINE_HEIGHT = "LINE_HEIGHT"
    LETTER_SPACING = "LETTER_SPACING"
    PARAGRAPH_SPACING = "PARAGRAPH_SPACING"
    PARAGRAPH_INDENT = "PARAGRAPH_INDENT"
    FONT_VARIATIONS = "FONT_VARIATIONS"


class VariableResolvedDataType(str, Enum):
    """Variable data type enumeration."""
    BOOLEAN = "BOOLEAN"
    FLOAT = "FLOAT"
    STRING = "STRING"
    COLOR = "COLOR"


class VariableAction(str, Enum):
    """Variable action enumeration."""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class VariableCodeSyntax(BaseModel):
    """Platform-specific code syntax definitions for a variable."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    WEB: Optional[str] = Field(None, description="Web platform code syntax")
    ANDROID: Optional[str] = Field(None, description="Android platform code syntax")
    iOS: Optional[str] = Field(None, description="iOS platform code syntax")


class RGB(BaseModel):
    """RGB color representation."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    r: float = Field(..., ge=0, le=1, description="Red component (0-1)")
    g: float = Field(..., ge=0, le=1, description="Green component (0-1)")
    b: float = Field(..., ge=0, le=1, description="Blue component (0-1)")


class RGBA(RGB):
    """RGBA color representation."""
    a: float = Field(..., ge=0, le=1, description="Alpha component (0-1)")


class VariableAlias(BaseModel):
    """Variable alias reference."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    type: str = Field("VARIABLE_ALIAS", description="Type identifier")
    id: str = Field(..., description="Variable ID being referenced")


class VariableMode(BaseModel):
    """Variable mode within a collection."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    modeId: str = Field(..., description="Unique identifier of this mode")
    name: str = Field(..., description="Name of this mode")


class LocalVariableCollection(BaseModel):
    """A grouping of related Variable objects each with the same modes."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique identifier of this variable collection")
    name: str = Field(..., description="Name of this variable collection")
    key: str = Field(..., description="Key of this variable collection")
    modes: List[VariableMode] = Field(..., description="Modes of this variable collection")
    defaultModeId: str = Field(..., description="ID of the default mode")
    remote: bool = Field(..., description="Whether this variable collection is remote")
    hiddenFromPublishing: bool = Field(
        False, description="Whether hidden when publishing as a library"
    )
    variableIds: List[str] = Field(..., description="IDs of variables in the collection")


class LocalVariable(BaseModel):
    """A Variable defining values for each mode in its VariableCollection."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique identifier of this variable")
    name: str = Field(..., description="Name of this variable")
    key: str = Field(..., description="Key of this variable")
    variableCollectionId: str = Field(
        ..., description="ID of the variable collection containing this variable"
    )
    resolvedType: VariableResolvedDataType = Field(
        ..., description="Resolved type of the variable"
    )
    valuesByMode: Dict[str, Union[bool, float, str, RGBA, VariableAlias]] = Field(
        ..., description="Values for each mode of this variable"
    )
    remote: bool = Field(..., description="Whether this variable is remote")
    description: str = Field("", description="Description of this variable")
    hiddenFromPublishing: bool = Field(
        False, description="Whether hidden when publishing as a library"
    )
    scopes: List[VariableScope] = Field(
        [], description="UI scopes where this variable is shown"
    )
    codeSyntax: Optional[VariableCodeSyntax] = Field(
        None, description="Platform-specific code syntax"
    )
    deletedButReferenced: bool = Field(
        False, description="Whether deleted but still referenced"
    )


class PublishedVariableCollection(BaseModel):
    """A published variable collection."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique identifier of this variable collection")
    subscribed_id: str = Field(
        ..., description="ID used by subscribing files (changes on publish)"
    )
    name: str = Field(..., description="Name of this variable collection")
    key: str = Field(..., description="Key of this variable collection")
    updatedAt: datetime = Field(
        ..., description="UTC timestamp when collection was last updated"
    )


class PublishedVariable(BaseModel):
    """A published variable."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: str = Field(..., description="Unique identifier of this variable")
    subscribed_id: str = Field(
        ..., description="ID used by subscribing files (changes on publish)"
    )
    name: str = Field(..., description="Name of this variable")
    key: str = Field(..., description="Key of this variable")
    variableCollectionId: str = Field(
        ..., description="ID of the variable collection containing this variable"
    )
    resolvedDataType: VariableResolvedDataType = Field(
        ..., description="Resolved type of the variable"
    )
    updatedAt: datetime = Field(
        ..., description="UTC timestamp when variable was last updated"
    )


# Variable Change Models for POST operations

class VariableCollectionCreate(BaseModel):
    """Create variable collection request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.CREATE, description="Action to perform")
    id: Optional[str] = Field(None, description="Temporary ID for this collection")
    name: str = Field(..., description="Name of this variable collection")
    initialModeId: Optional[str] = Field(
        None, description="Temporary ID for the initial mode"
    )
    hiddenFromPublishing: bool = Field(
        False, description="Whether hidden when publishing as a library"
    )


class VariableCollectionUpdate(BaseModel):
    """Update variable collection request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.UPDATE, description="Action to perform")
    id: str = Field(..., description="ID of the variable collection to update")
    name: Optional[str] = Field(None, description="Name of this variable collection")
    hiddenFromPublishing: Optional[bool] = Field(
        None, description="Whether hidden when publishing as a library"
    )


class VariableCollectionDelete(BaseModel):
    """Delete variable collection request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.DELETE, description="Action to perform")
    id: str = Field(..., description="ID of the variable collection to delete")


VariableCollectionChange = Union[
    VariableCollectionCreate, VariableCollectionUpdate, VariableCollectionDelete
]


class VariableModeCreate(BaseModel):
    """Create variable mode request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.CREATE, description="Action to perform")
    id: Optional[str] = Field(None, description="Temporary ID for this mode")
    name: str = Field(..., description="Name of this variable mode")
    variableCollectionId: str = Field(
        ..., description="Variable collection that will contain the mode"
    )


class VariableModeUpdate(BaseModel):
    """Update variable mode request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.UPDATE, description="Action to perform")
    id: str = Field(..., description="ID of the variable mode to update")
    name: str = Field(..., description="Name of this variable mode")
    variableCollectionId: str = Field(
        ..., description="Variable collection that contains the mode"
    )


class VariableModeDelete(BaseModel):
    """Delete variable mode request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.DELETE, description="Action to perform")
    id: str = Field(..., description="ID of the variable mode to delete")


VariableModeChange = Union[VariableModeCreate, VariableModeUpdate, VariableModeDelete]


class VariableCreate(BaseModel):
    """Create variable request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.CREATE, description="Action to perform")
    id: Optional[str] = Field(None, description="Temporary ID for this variable")
    name: str = Field(..., description="Name of this variable")
    variableCollectionId: str = Field(
        ..., description="Variable collection that will contain the variable"
    )
    resolvedType: VariableResolvedDataType = Field(
        ..., description="Resolved type of the variable"
    )
    description: Optional[str] = Field("", description="Description of this variable")
    hiddenFromPublishing: bool = Field(
        False, description="Whether hidden when publishing as a library"
    )
    scopes: Optional[List[VariableScope]] = Field(
        None, description="UI scopes where this variable is shown"
    )
    codeSyntax: Optional[VariableCodeSyntax] = Field(
        None, description="Platform-specific code syntax"
    )


class VariableUpdate(BaseModel):
    """Update variable request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.UPDATE, description="Action to perform")
    id: str = Field(..., description="ID of the variable to update")
    name: Optional[str] = Field(None, description="Name of this variable")
    description: Optional[str] = Field(None, description="Description of this variable")
    hiddenFromPublishing: Optional[bool] = Field(
        None, description="Whether hidden when publishing as a library"
    )
    scopes: Optional[List[VariableScope]] = Field(
        None, description="UI scopes where this variable is shown"
    )
    codeSyntax: Optional[VariableCodeSyntax] = Field(
        None, description="Platform-specific code syntax"
    )


class VariableDelete(BaseModel):
    """Delete variable request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    action: VariableAction = Field(VariableAction.DELETE, description="Action to perform")
    id: str = Field(..., description="ID of the variable to delete")


VariableChange = Union[VariableCreate, VariableUpdate, VariableDelete]


class VariableModeValue(BaseModel):
    """A value for a given mode of a variable."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    variableId: str = Field(..., description="Target variable ID")
    modeId: str = Field(..., description="Mode ID in the variable collection")
    value: Union[bool, float, str, RGB, RGBA, VariableAlias] = Field(
        ..., description="Value for the variable"
    )


class VariablesRequest(BaseModel):
    """Request body for POST /v1/files/{file_key}/variables endpoint."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    variableCollections: Optional[List[VariableCollectionChange]] = Field(
        None, description="Variable collection changes"
    )
    variableModes: Optional[List[VariableModeChange]] = Field(
        None, description="Variable mode changes"
    )
    variables: Optional[List[VariableChange]] = Field(
        None, description="Variable changes"
    )
    variableModeValues: Optional[List[VariableModeValue]] = Field(
        None, description="Variable mode value changes"
    )


class LocalVariablesResponse(BaseModel):
    """Response from GET /v1/files/{file_key}/variables/local."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(..., description="HTTP status code")
    error: bool = Field(..., description="Whether an error occurred")
    meta: Dict[str, Any] = Field(..., description="Response metadata")
    
    @property
    def variables(self) -> Dict[str, LocalVariable]:
        """Get variables from response."""
        return {
            var_id: LocalVariable(**var_data)
            for var_id, var_data in self.meta.get("variables", {}).items()
        }
    
    @property
    def variable_collections(self) -> Dict[str, LocalVariableCollection]:
        """Get variable collections from response."""
        return {
            coll_id: LocalVariableCollection(**coll_data)
            for coll_id, coll_data in self.meta.get("variableCollections", {}).items()
        }


class PublishedVariablesResponse(BaseModel):
    """Response from GET /v1/files/{file_key}/variables/published."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(..., description="HTTP status code")
    error: bool = Field(..., description="Whether an error occurred")
    meta: Dict[str, Any] = Field(..., description="Response metadata")
    
    @property
    def variables(self) -> Dict[str, PublishedVariable]:
        """Get variables from response."""
        return {
            var_id: PublishedVariable(**var_data)
            for var_id, var_data in self.meta.get("variables", {}).items()
        }
    
    @property
    def variable_collections(self) -> Dict[str, PublishedVariableCollection]:
        """Get variable collections from response."""
        return {
            coll_id: PublishedVariableCollection(**coll_data)
            for coll_id, coll_data in self.meta.get("variableCollections", {}).items()
        }


class VariablesModifyResponse(BaseModel):
    """Response from POST /v1/files/{file_key}/variables."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    status: int = Field(..., description="HTTP status code")
    error: bool = Field(..., description="Whether an error occurred")
    meta: Dict[str, Any] = Field(..., description="Response metadata")
    
    @property
    def temp_id_to_real_id(self) -> Dict[str, str]:
        """Get mapping of temporary IDs to real IDs."""
        return self.meta.get("tempIdToRealId", {})