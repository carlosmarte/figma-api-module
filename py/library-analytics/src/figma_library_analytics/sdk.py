"""
High-level SDK for Figma Library Analytics API.
"""

from datetime import date
from typing import AsyncIterator, List, Optional, Union

from .client import FigmaAnalyticsClient
from .models import (
    ComponentActionsResponse,
    ComponentUsagesResponse,
    GroupBy,
    LibraryAnalyticsComponentActionsByAsset,
    LibraryAnalyticsComponentActionsByTeam,
    LibraryAnalyticsComponentUsagesByAsset,
    LibraryAnalyticsComponentUsagesByFile,
    LibraryAnalyticsStyleActionsByAsset,
    LibraryAnalyticsStyleActionsByTeam,
    LibraryAnalyticsStyleUsagesByAsset,
    LibraryAnalyticsStyleUsagesByFile,
    LibraryAnalyticsVariableActionsByAsset,
    LibraryAnalyticsVariableActionsByTeam,
    LibraryAnalyticsVariableUsagesByAsset,
    LibraryAnalyticsVariableUsagesByFile,
    StyleActionsResponse,
    StyleUsagesResponse,
    VariableActionsResponse,
    VariableUsagesResponse,
)
from .utils import build_query_params, format_date_for_api, validate_date_range, validate_file_key


class FigmaAnalyticsSDK:
    """
    High-level SDK for Figma Library Analytics API.
    
    Provides convenient methods for accessing library analytics data with
    proper model serialization/deserialization and batch operations.
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.figma.com",
        **client_kwargs
    ):
        """
        Initialize the SDK.
        
        Args:
            api_key: Figma API token with library_analytics:read scope
            base_url: Base URL for Figma API  
            **client_kwargs: Additional arguments for the client
        """
        self.client = FigmaAnalyticsClient(api_key, base_url, **client_kwargs)
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def close(self) -> None:
        """Close the underlying client."""
        await self.client.close()
    
    def _validate_inputs(self, file_key: str, start_date: Optional[date], end_date: Optional[date]) -> None:
        """Validate common input parameters."""
        if not validate_file_key(file_key):
            raise ValueError(f"Invalid file key format: {file_key}")
        
        is_valid, error_msg = validate_date_range(start_date, end_date)
        if not is_valid:
            raise ValueError(error_msg)
    
    # Component Analytics Methods
    
    async def get_component_actions(
        self,
        file_key: str,
        group_by: GroupBy,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        cursor: Optional[str] = None,
    ) -> ComponentActionsResponse:
        """
        Get component action analytics data.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by (component or team)
            start_date: Earliest week to include (defaults to one year prior)
            end_date: Latest week to include (defaults to latest computed week)
            cursor: Pagination cursor
            
        Returns:
            Component actions response with typed data
        """
        if group_by not in [GroupBy.COMPONENT, GroupBy.TEAM]:
            raise ValueError("group_by must be 'component' or 'team' for component actions")
        
        self._validate_inputs(file_key, start_date, end_date)
        
        params = build_query_params(
            group_by=group_by.value,
            start_date=format_date_for_api(start_date) if start_date else None,
            end_date=format_date_for_api(end_date) if end_date else None,
            cursor=cursor,
        )
        
        path = f"/v1/analytics/libraries/{file_key}/component/actions"
        response_data = await self.client.get(path, **params)
        
        # Parse rows based on group_by type
        if group_by == GroupBy.COMPONENT:
            rows = [LibraryAnalyticsComponentActionsByAsset(**row) for row in response_data['rows']]
        else:  # team
            rows = [LibraryAnalyticsComponentActionsByTeam(**row) for row in response_data['rows']]
        
        return ComponentActionsResponse(
            rows=rows,
            next_page=response_data['next_page'],
            cursor=response_data.get('cursor'),
        )
    
    async def get_component_usages(
        self,
        file_key: str,
        group_by: GroupBy,
        cursor: Optional[str] = None,
    ) -> ComponentUsagesResponse:
        """
        Get component usage analytics data.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by (component or file)
            cursor: Pagination cursor
            
        Returns:
            Component usages response with typed data
        """
        if group_by not in [GroupBy.COMPONENT, GroupBy.FILE]:
            raise ValueError("group_by must be 'component' or 'file' for component usages")
        
        if not validate_file_key(file_key):
            raise ValueError(f"Invalid file key format: {file_key}")
        
        params = build_query_params(
            group_by=group_by.value,
            cursor=cursor,
        )
        
        path = f"/v1/analytics/libraries/{file_key}/component/usages"
        response_data = await self.client.get(path, **params)
        
        # Parse rows based on group_by type
        if group_by == GroupBy.COMPONENT:
            rows = [LibraryAnalyticsComponentUsagesByAsset(**row) for row in response_data['rows']]
        else:  # file
            rows = [LibraryAnalyticsComponentUsagesByFile(**row) for row in response_data['rows']]
        
        return ComponentUsagesResponse(
            rows=rows,
            next_page=response_data['next_page'],
            cursor=response_data.get('cursor'),
        )
    
    # Style Analytics Methods
    
    async def get_style_actions(
        self,
        file_key: str,
        group_by: GroupBy,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        cursor: Optional[str] = None,
    ) -> StyleActionsResponse:
        """
        Get style action analytics data.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by (style or team)
            start_date: Earliest week to include
            end_date: Latest week to include
            cursor: Pagination cursor
            
        Returns:
            Style actions response with typed data
        """
        if group_by not in [GroupBy.STYLE, GroupBy.TEAM]:
            raise ValueError("group_by must be 'style' or 'team' for style actions")
        
        self._validate_inputs(file_key, start_date, end_date)
        
        params = build_query_params(
            group_by=group_by.value,
            start_date=format_date_for_api(start_date) if start_date else None,
            end_date=format_date_for_api(end_date) if end_date else None,
            cursor=cursor,
        )
        
        path = f"/v1/analytics/libraries/{file_key}/style/actions"
        response_data = await self.client.get(path, **params)
        
        # Parse rows based on group_by type
        if group_by == GroupBy.STYLE:
            rows = [LibraryAnalyticsStyleActionsByAsset(**row) for row in response_data['rows']]
        else:  # team
            rows = [LibraryAnalyticsStyleActionsByTeam(**row) for row in response_data['rows']]
        
        return StyleActionsResponse(
            rows=rows,
            next_page=response_data['next_page'],
            cursor=response_data.get('cursor'),
        )
    
    async def get_style_usages(
        self,
        file_key: str,
        group_by: GroupBy,
        cursor: Optional[str] = None,
    ) -> StyleUsagesResponse:
        """
        Get style usage analytics data.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by (style or file)
            cursor: Pagination cursor
            
        Returns:
            Style usages response with typed data
        """
        if group_by not in [GroupBy.STYLE, GroupBy.FILE]:
            raise ValueError("group_by must be 'style' or 'file' for style usages")
        
        if not validate_file_key(file_key):
            raise ValueError(f"Invalid file key format: {file_key}")
        
        params = build_query_params(
            group_by=group_by.value,
            cursor=cursor,
        )
        
        path = f"/v1/analytics/libraries/{file_key}/style/usages"
        response_data = await self.client.get(path, **params)
        
        # Parse rows based on group_by type
        if group_by == GroupBy.STYLE:
            rows = [LibraryAnalyticsStyleUsagesByAsset(**row) for row in response_data['rows']]
        else:  # file
            rows = [LibraryAnalyticsStyleUsagesByFile(**row) for row in response_data['rows']]
        
        return StyleUsagesResponse(
            rows=rows,
            next_page=response_data['next_page'],
            cursor=response_data.get('cursor'),
        )
    
    # Variable Analytics Methods
    
    async def get_variable_actions(
        self,
        file_key: str,
        group_by: GroupBy,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        cursor: Optional[str] = None,
    ) -> VariableActionsResponse:
        """
        Get variable action analytics data.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by (variable or team)
            start_date: Earliest week to include
            end_date: Latest week to include
            cursor: Pagination cursor
            
        Returns:
            Variable actions response with typed data
        """
        if group_by not in [GroupBy.VARIABLE, GroupBy.TEAM]:
            raise ValueError("group_by must be 'variable' or 'team' for variable actions")
        
        self._validate_inputs(file_key, start_date, end_date)
        
        params = build_query_params(
            group_by=group_by.value,
            start_date=format_date_for_api(start_date) if start_date else None,
            end_date=format_date_for_api(end_date) if end_date else None,
            cursor=cursor,
        )
        
        path = f"/v1/analytics/libraries/{file_key}/variable/actions"
        response_data = await self.client.get(path, **params)
        
        # Parse rows based on group_by type
        if group_by == GroupBy.VARIABLE:
            rows = [LibraryAnalyticsVariableActionsByAsset(**row) for row in response_data['rows']]
        else:  # team
            rows = [LibraryAnalyticsVariableActionsByTeam(**row) for row in response_data['rows']]
        
        return VariableActionsResponse(
            rows=rows,
            next_page=response_data['next_page'],
            cursor=response_data.get('cursor'),
        )
    
    async def get_variable_usages(
        self,
        file_key: str,
        group_by: GroupBy,
        cursor: Optional[str] = None,
    ) -> VariableUsagesResponse:
        """
        Get variable usage analytics data.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by (variable or file)
            cursor: Pagination cursor
            
        Returns:
            Variable usages response with typed data
        """
        if group_by not in [GroupBy.VARIABLE, GroupBy.FILE]:
            raise ValueError("group_by must be 'variable' or 'file' for variable usages")
        
        if not validate_file_key(file_key):
            raise ValueError(f"Invalid file key format: {file_key}")
        
        params = build_query_params(
            group_by=group_by.value,
            cursor=cursor,
        )
        
        path = f"/v1/analytics/libraries/{file_key}/variable/usages"
        response_data = await self.client.get(path, **params)
        
        # Parse rows based on group_by type
        if group_by == GroupBy.VARIABLE:
            rows = [LibraryAnalyticsVariableUsagesByAsset(**row) for row in response_data['rows']]
        else:  # file
            rows = [LibraryAnalyticsVariableUsagesByFile(**row) for row in response_data['rows']]
        
        return VariableUsagesResponse(
            rows=rows,
            next_page=response_data['next_page'],
            cursor=response_data.get('cursor'),
        )
    
    # Batch and helper methods
    
    async def get_all_component_actions(
        self,
        file_key: str,
        group_by: GroupBy,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Union[LibraryAnalyticsComponentActionsByAsset, LibraryAnalyticsComponentActionsByTeam]]:
        """
        Get all component action data across all pages.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by
            start_date: Earliest week to include
            end_date: Latest week to include
            
        Returns:
            List of all component action records
        """
        all_rows = []
        cursor = None
        
        while True:
            response = await self.get_component_actions(
                file_key, group_by, start_date, end_date, cursor
            )
            all_rows.extend(response.rows)
            
            if not response.next_page:
                break
            cursor = response.cursor
        
        return all_rows
    
    async def stream_component_actions(
        self,
        file_key: str,
        group_by: GroupBy,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> AsyncIterator[Union[LibraryAnalyticsComponentActionsByAsset, LibraryAnalyticsComponentActionsByTeam]]:
        """
        Stream component action data one record at a time.
        
        Args:
            file_key: File key of the library
            group_by: Dimension to group data by
            start_date: Earliest week to include
            end_date: Latest week to include
            
        Yields:
            Individual component action records
        """
        cursor = None
        
        while True:
            response = await self.get_component_actions(
                file_key, group_by, start_date, end_date, cursor
            )
            
            for row in response.rows:
                yield row
            
            if not response.next_page:
                break
            cursor = response.cursor
    
    async def search_components_by_name(
        self,
        file_key: str,
        component_name: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[LibraryAnalyticsComponentActionsByAsset]:
        """
        Search for component actions by component name.
        
        Args:
            file_key: File key of the library
            component_name: Name or partial name to search for
            start_date: Earliest week to include
            end_date: Latest week to include
            
        Returns:
            List of matching component action records
        """
        all_actions = await self.get_all_component_actions(
            file_key, GroupBy.COMPONENT, start_date, end_date
        )
        
        # Filter by component name (case-insensitive partial match)
        matching_actions = [
            action for action in all_actions
            if isinstance(action, LibraryAnalyticsComponentActionsByAsset) and
            component_name.lower() in action.component_name.lower()
        ]
        
        return matching_actions