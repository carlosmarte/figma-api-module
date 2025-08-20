"""High-level SDK for Figma Components API."""

from typing import List, Optional, AsyncIterator, Dict, Any

from .client import FigmaComponentsClient
from .models import (
    PublishedComponent,
    PublishedComponentSet,
    PublishedStyle,
    StyleType,
    ComponentsResponse,
    ComponentSetsResponse,
    StylesResponse,
    SingleComponentResponse,
    SingleComponentSetResponse,
    SingleStyleResponse,
)
from .errors import ValidationError
from .utils import (
    extract_file_key_from_url,
    extract_team_id_from_url,
    sanitize_search_query,
)


class FigmaComponentsSDK:
    """High-level SDK for Figma Components."""
    
    def __init__(
        self,
        api_key: str,
        **client_kwargs: Any,
    ) -> None:
        """
        Initialize the Figma Components SDK.
        
        Args:
            api_key: Figma API token
            **client_kwargs: Additional arguments for the underlying client
        """
        self.client = FigmaComponentsClient(api_key, **client_kwargs)
        self._started = False
    
    async def __aenter__(self) -> "FigmaComponentsSDK":
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()
    
    async def start(self) -> None:
        """Start the SDK and underlying client."""
        if not self._started:
            await self.client.start()
            self._started = True
    
    async def close(self) -> None:
        """Close the SDK and underlying client."""
        if self._started:
            await self.client.close()
            self._started = False
    
    def _ensure_started(self) -> None:
        """Ensure the SDK is started."""
        if not self._started:
            raise RuntimeError("SDK not started. Use 'async with sdk:' or call 'await sdk.start()'")
    
    # Component methods
    async def get_component(self, key: str) -> PublishedComponent:
        """
        Get a component by key.
        
        Args:
            key: The unique identifier of the component
            
        Returns:
            Published component data
        """
        self._ensure_started()
        
        response_data = await self.client.get_component(key)
        response = SingleComponentResponse(**response_data)
        return response.meta
    
    async def list_team_components(
        self,
        team_id: str,
        page_size: int = 30,
        after: Optional[int] = None,
        before: Optional[int] = None,
    ) -> List[PublishedComponent]:
        """
        List components from a team.
        
        Args:
            team_id: ID of the team
            page_size: Number of items per page (max 1000)
            after: Cursor for pagination (exclusive with before)
            before: Cursor for pagination (exclusive with after)
            
        Returns:
            List of published components
        """
        self._ensure_started()
        
        if page_size > 1000:
            raise ValidationError("page_size cannot exceed 1000")
        
        if after is not None and before is not None:
            raise ValidationError("Cannot specify both 'after' and 'before' parameters")
        
        response_data = await self.client.get_team_components(
            team_id=team_id,
            page_size=page_size,
            after=after,
            before=before,
        )
        
        # Parse response
        meta = response_data.get("meta", {})
        components_data = meta.get("components", [])
        
        return [PublishedComponent(**comp) for comp in components_data]
    
    async def list_file_components(self, file_key: str) -> List[PublishedComponent]:
        """
        List components from a file.
        
        Args:
            file_key: Key of the file
            
        Returns:
            List of published components
        """
        self._ensure_started()
        
        response_data = await self.client.get_file_components(file_key)
        
        # Parse response
        meta = response_data.get("meta", {})
        components_data = meta.get("components", [])
        
        return [PublishedComponent(**comp) for comp in components_data]
    
    async def search_team_components(
        self,
        team_id: str,
        query: str,
        limit: Optional[int] = None,
    ) -> List[PublishedComponent]:
        """
        Search components within a team.
        
        Args:
            team_id: ID of the team
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            List of matching components
        """
        self._ensure_started()
        
        sanitized_query = sanitize_search_query(query).lower()
        if not sanitized_query:
            return []
        
        all_components = []
        async for component_data in self.client.paginate(
            f"/v1/teams/{team_id}/components",
            items_key="components",
        ):
            component = PublishedComponent(**component_data)
            
            # Simple text search in name and description
            if (sanitized_query in component.name.lower() or
                sanitized_query in component.description.lower()):
                all_components.append(component)
                
                if limit and len(all_components) >= limit:
                    break
        
        return all_components
    
    async def batch_get_components(self, keys: List[str]) -> List[PublishedComponent]:
        """
        Get multiple components by their keys.
        
        Args:
            keys: List of component keys
            
        Returns:
            List of published components
        """
        self._ensure_started()
        
        import asyncio
        
        tasks = [self.get_component(key) for key in keys]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and return successful results
        components = []
        for result in results:
            if isinstance(result, PublishedComponent):
                components.append(result)
        
        return components
    
    # Component Set methods
    async def get_component_set(self, key: str) -> PublishedComponentSet:
        """
        Get a component set by key.
        
        Args:
            key: The unique identifier of the component set
            
        Returns:
            Published component set data
        """
        self._ensure_started()
        
        response_data = await self.client.get_component_set(key)
        response = SingleComponentSetResponse(**response_data)
        return response.meta
    
    async def list_team_component_sets(
        self,
        team_id: str,
        page_size: int = 30,
        after: Optional[int] = None,
        before: Optional[int] = None,
    ) -> List[PublishedComponentSet]:
        """
        List component sets from a team.
        
        Args:
            team_id: ID of the team
            page_size: Number of items per page (max 1000)
            after: Cursor for pagination
            before: Cursor for pagination
            
        Returns:
            List of published component sets
        """
        self._ensure_started()
        
        if page_size > 1000:
            raise ValidationError("page_size cannot exceed 1000")
        
        response_data = await self.client.get_team_component_sets(
            team_id=team_id,
            page_size=page_size,
            after=after,
            before=before,
        )
        
        meta = response_data.get("meta", {})
        component_sets_data = meta.get("component_sets", [])
        
        return [PublishedComponentSet(**cs) for cs in component_sets_data]
    
    async def list_file_component_sets(self, file_key: str) -> List[PublishedComponentSet]:
        """
        List component sets from a file.
        
        Args:
            file_key: Key of the file
            
        Returns:
            List of published component sets
        """
        self._ensure_started()
        
        response_data = await self.client.get_file_component_sets(file_key)
        
        meta = response_data.get("meta", {})
        component_sets_data = meta.get("component_sets", [])
        
        return [PublishedComponentSet(**cs) for cs in component_sets_data]
    
    # Style methods
    async def get_style(self, key: str) -> PublishedStyle:
        """
        Get a style by key.
        
        Args:
            key: The unique identifier of the style
            
        Returns:
            Published style data
        """
        self._ensure_started()
        
        response_data = await self.client.get_style(key)
        response = SingleStyleResponse(**response_data)
        return response.meta
    
    async def list_team_styles(
        self,
        team_id: str,
        page_size: int = 30,
        after: Optional[int] = None,
        before: Optional[int] = None,
        style_type: Optional[StyleType] = None,
    ) -> List[PublishedStyle]:
        """
        List styles from a team.
        
        Args:
            team_id: ID of the team
            page_size: Number of items per page
            after: Cursor for pagination
            before: Cursor for pagination
            style_type: Filter by style type
            
        Returns:
            List of published styles
        """
        self._ensure_started()
        
        if page_size > 1000:
            raise ValidationError("page_size cannot exceed 1000")
        
        response_data = await self.client.get_team_styles(
            team_id=team_id,
            page_size=page_size,
            after=after,
            before=before,
        )
        
        meta = response_data.get("meta", {})
        styles_data = meta.get("styles", [])
        
        styles = [PublishedStyle(**style) for style in styles_data]
        
        # Filter by style type if specified
        if style_type:
            styles = [s for s in styles if s.style_type == style_type]
        
        return styles
    
    async def list_file_styles(
        self,
        file_key: str,
        style_type: Optional[StyleType] = None,
    ) -> List[PublishedStyle]:
        """
        List styles from a file.
        
        Args:
            file_key: Key of the file
            style_type: Filter by style type
            
        Returns:
            List of published styles
        """
        self._ensure_started()
        
        response_data = await self.client.get_file_styles(file_key)
        
        meta = response_data.get("meta", {})
        styles_data = meta.get("styles", [])
        
        styles = [PublishedStyle(**style) for style in styles_data]
        
        # Filter by style type if specified
        if style_type:
            styles = [s for s in styles if s.style_type == style_type]
        
        return styles
    
    # Convenience methods
    async def get_components_from_url(self, figma_url: str) -> List[PublishedComponent]:
        """
        Get components from a Figma URL.
        
        Args:
            figma_url: Figma file or team URL
            
        Returns:
            List of components
        """
        # Try to extract team ID first
        team_id = extract_team_id_from_url(figma_url)
        if team_id:
            all_components = []
            async for component_data in self.client.paginate(
                f"/v1/teams/{team_id}/components",
                items_key="components",
            ):
                all_components.append(PublishedComponent(**component_data))
            return all_components
        
        # Try to extract file key
        file_key = extract_file_key_from_url(figma_url)
        if file_key:
            return await self.list_file_components(file_key)
        
        raise ValidationError(f"Unable to extract team ID or file key from URL: {figma_url}")
    
    async def get_all_team_assets(
        self,
        team_id: str,
    ) -> Dict[str, List[Any]]:
        """
        Get all assets (components, component sets, styles) from a team.
        
        Args:
            team_id: ID of the team
            
        Returns:
            Dictionary with components, component_sets, and styles
        """
        import asyncio
        
        # Fetch all asset types concurrently
        tasks = [
            self._get_all_team_components(team_id),
            self._get_all_team_component_sets(team_id),
            self._get_all_team_styles(team_id),
        ]
        
        components, component_sets, styles = await asyncio.gather(*tasks)
        
        return {
            "components": components,
            "component_sets": component_sets,
            "styles": styles,
        }
    
    async def _get_all_team_components(self, team_id: str) -> List[PublishedComponent]:
        """Get all components from a team using pagination."""
        components = []
        async for component_data in self.client.paginate(
            f"/v1/teams/{team_id}/components",
            items_key="components",
        ):
            components.append(PublishedComponent(**component_data))
        return components
    
    async def _get_all_team_component_sets(self, team_id: str) -> List[PublishedComponentSet]:
        """Get all component sets from a team using pagination."""
        component_sets = []
        async for cs_data in self.client.paginate(
            f"/v1/teams/{team_id}/component_sets",
            items_key="component_sets",
        ):
            component_sets.append(PublishedComponentSet(**cs_data))
        return component_sets
    
    async def _get_all_team_styles(self, team_id: str) -> List[PublishedStyle]:
        """Get all styles from a team using pagination."""
        styles = []
        async for style_data in self.client.paginate(
            f"/v1/teams/{team_id}/styles",
            items_key="styles",
        ):
            styles.append(PublishedStyle(**style_data))
        return styles