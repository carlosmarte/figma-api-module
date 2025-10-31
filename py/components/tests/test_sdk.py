"""Tests for the FigmaComponentsSDK."""

import pytest
from unittest.mock import AsyncMock, Mock
from typing import Dict, Any

from figma_components.sdk import FigmaComponentsSDK
from figma_components.models import PublishedComponent, PublishedComponentSet, PublishedStyle, StyleType
from figma_components.errors import ValidationError


class TestFigmaComponentsSDK:
    """Tests for the FigmaComponentsSDK class."""
    
    def test_sdk_initialization(self, mock_api_key: str):
        """Test SDK initialization."""
        sdk = FigmaComponentsSDK(mock_api_key)
        assert sdk.client.api_key == mock_api_key
        assert not sdk._started
    
    @pytest.mark.asyncio
    async def test_sdk_context_manager(self, mock_api_key: str):
        """Test SDK as async context manager."""
        sdk = FigmaComponentsSDK(mock_api_key)
        sdk.client.start = AsyncMock()
        sdk.client.close = AsyncMock()
        
        async with sdk:
            assert sdk._started
            sdk.client.start.assert_called_once()
        
        sdk.client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_sdk_manual_start_close(self, mock_api_key: str):
        """Test manual start and close of SDK."""
        sdk = FigmaComponentsSDK(mock_api_key)
        sdk.client.start = AsyncMock()
        sdk.client.close = AsyncMock()
        
        await sdk.start()
        assert sdk._started
        sdk.client.start.assert_called_once()
        
        await sdk.close()
        assert not sdk._started
        sdk.client.close.assert_called_once()
    
    def test_ensure_started_raises_when_not_started(self, mock_api_key: str):
        """Test that methods raise error when SDK not started."""
        sdk = FigmaComponentsSDK(mock_api_key)
        
        with pytest.raises(RuntimeError):
            sdk._ensure_started()
    
    # Component tests
    @pytest.mark.asyncio
    async def test_get_component(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_single_component_response: Dict[str, Any],
        sample_component: Dict[str, Any],
    ):
        """Test getting a single component."""
        mock_sdk.client.get_component.return_value = mock_single_component_response
        
        component = await mock_sdk.get_component("test_key")
        
        assert isinstance(component, PublishedComponent)
        assert component.key == sample_component["key"]
        assert component.name == sample_component["name"]
        mock_sdk.client.get_component.assert_called_once_with("test_key")
    
    @pytest.mark.asyncio
    async def test_list_team_components(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_components_response: Dict[str, Any],
        sample_component: Dict[str, Any],
    ):
        """Test listing team components."""
        mock_sdk.client.get_team_components.return_value = mock_components_response
        
        components = await mock_sdk.list_team_components("team123")
        
        assert len(components) == 1
        assert isinstance(components[0], PublishedComponent)
        assert components[0].key == sample_component["key"]
        mock_sdk.client.get_team_components.assert_called_once_with(
            team_id="team123",
            page_size=30,
            after=None,
            before=None,
        )
    
    @pytest.mark.asyncio
    async def test_list_team_components_with_pagination(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_components_response: Dict[str, Any],
    ):
        """Test listing team components with pagination parameters."""
        mock_sdk.client.get_team_components.return_value = mock_components_response
        
        await mock_sdk.list_team_components(
            "team123",
            page_size=50,
            after=100,
        )
        
        mock_sdk.client.get_team_components.assert_called_once_with(
            team_id="team123",
            page_size=50,
            after=100,
            before=None,
        )
    
    @pytest.mark.asyncio
    async def test_list_team_components_validation_errors(self, mock_sdk: FigmaComponentsSDK):
        """Test validation errors for team components."""
        # Test page_size too large
        with pytest.raises(ValidationError):
            await mock_sdk.list_team_components("team123", page_size=1001)
        
        # Test both after and before specified
        with pytest.raises(ValidationError):
            await mock_sdk.list_team_components("team123", after=100, before=200)
    
    @pytest.mark.asyncio
    async def test_list_file_components(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_components_response: Dict[str, Any],
        sample_component: Dict[str, Any],
    ):
        """Test listing file components."""
        mock_sdk.client.get_file_components.return_value = mock_components_response
        
        components = await mock_sdk.list_file_components("file123")
        
        assert len(components) == 1
        assert isinstance(components[0], PublishedComponent)
        assert components[0].key == sample_component["key"]
        mock_sdk.client.get_file_components.assert_called_once_with("file123")
    
    @pytest.mark.asyncio
    async def test_search_team_components(self, mock_sdk: FigmaComponentsSDK, sample_component: Dict[str, Any]):
        """Test searching team components."""
        # Mock paginate to yield matching components
        async def mock_paginate(*args, **kwargs):
            yield sample_component
        
        mock_sdk.client.paginate = mock_paginate
        
        components = await mock_sdk.search_team_components("team123", "button")
        
        assert len(components) == 1
        assert isinstance(components[0], PublishedComponent)
        assert components[0].name == "Button Component"
    
    @pytest.mark.asyncio
    async def test_search_team_components_with_limit(self, mock_sdk: FigmaComponentsSDK, sample_component: Dict[str, Any]):
        """Test searching team components with limit."""
        # Mock paginate to yield multiple components
        async def mock_paginate(*args, **kwargs):
            for i in range(5):
                component_data = sample_component.copy()
                component_data["key"] = f"key{i}"
                component_data["name"] = f"Button Component {i}"
                yield component_data
        
        mock_sdk.client.paginate = mock_paginate
        
        components = await mock_sdk.search_team_components("team123", "button", limit=3)
        
        assert len(components) == 3
    
    @pytest.mark.asyncio
    async def test_search_team_components_empty_query(self, mock_sdk: FigmaComponentsSDK):
        """Test searching with empty query."""
        components = await mock_sdk.search_team_components("team123", "   ")
        assert len(components) == 0
    
    @pytest.mark.asyncio
    async def test_batch_get_components(self, mock_sdk: FigmaComponentsSDK, sample_component: Dict[str, Any]):
        """Test batch getting components."""
        # Mock get_component to return a component
        mock_sdk.get_component = AsyncMock(return_value=PublishedComponent(**sample_component))
        
        keys = ["key1", "key2", "key3"]
        components = await mock_sdk.batch_get_components(keys)
        
        assert len(components) == 3
        assert mock_sdk.get_component.call_count == 3
    
    # Component Set tests
    @pytest.mark.asyncio
    async def test_get_component_set(
        self,
        mock_sdk: FigmaComponentsSDK,
        sample_component_set: Dict[str, Any],
    ):
        """Test getting a single component set."""
        response = {
            "status": 200,
            "error": False,
            "meta": sample_component_set
        }
        mock_sdk.client.get_component_set.return_value = response
        
        component_set = await mock_sdk.get_component_set("test_key")
        
        assert isinstance(component_set, PublishedComponentSet)
        assert component_set.key == sample_component_set["key"]
        assert component_set.name == sample_component_set["name"]
    
    @pytest.mark.asyncio
    async def test_list_team_component_sets(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_component_sets_response: Dict[str, Any],
        sample_component_set: Dict[str, Any],
    ):
        """Test listing team component sets."""
        mock_sdk.client.get_team_component_sets.return_value = mock_component_sets_response
        
        component_sets = await mock_sdk.list_team_component_sets("team123")
        
        assert len(component_sets) == 1
        assert isinstance(component_sets[0], PublishedComponentSet)
        assert component_sets[0].key == sample_component_set["key"]
    
    @pytest.mark.asyncio
    async def test_list_file_component_sets(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_component_sets_response: Dict[str, Any],
        sample_component_set: Dict[str, Any],
    ):
        """Test listing file component sets."""
        mock_sdk.client.get_file_component_sets.return_value = mock_component_sets_response
        
        component_sets = await mock_sdk.list_file_component_sets("file123")
        
        assert len(component_sets) == 1
        assert isinstance(component_sets[0], PublishedComponentSet)
        assert component_sets[0].key == sample_component_set["key"]
    
    # Style tests
    @pytest.mark.asyncio
    async def test_get_style(
        self,
        mock_sdk: FigmaComponentsSDK,
        sample_style: Dict[str, Any],
    ):
        """Test getting a single style."""
        response = {
            "status": 200,
            "error": False,
            "meta": sample_style
        }
        mock_sdk.client.get_style.return_value = response
        
        style = await mock_sdk.get_style("test_key")
        
        assert isinstance(style, PublishedStyle)
        assert style.key == sample_style["key"]
        assert style.name == sample_style["name"]
        assert style.style_type == StyleType.FILL
    
    @pytest.mark.asyncio
    async def test_list_team_styles(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_styles_response: Dict[str, Any],
        sample_style: Dict[str, Any],
    ):
        """Test listing team styles."""
        mock_sdk.client.get_team_styles.return_value = mock_styles_response
        
        styles = await mock_sdk.list_team_styles("team123")
        
        assert len(styles) == 1
        assert isinstance(styles[0], PublishedStyle)
        assert styles[0].key == sample_style["key"]
    
    @pytest.mark.asyncio
    async def test_list_team_styles_with_filter(
        self,
        mock_sdk: FigmaComponentsSDK,
        sample_style: Dict[str, Any],
    ):
        """Test listing team styles with style type filter."""
        # Create styles with different types
        fill_style = sample_style.copy()
        fill_style["style_type"] = "FILL"
        
        text_style = sample_style.copy()
        text_style["key"] = "text_style_key"
        text_style["style_type"] = "TEXT"
        
        response = {
            "status": 200,
            "error": False,
            "meta": {
                "styles": [fill_style, text_style],
                "cursor": None
            }
        }
        mock_sdk.client.get_team_styles.return_value = response
        
        # Filter for FILL styles only
        styles = await mock_sdk.list_team_styles("team123", style_type=StyleType.FILL)
        
        assert len(styles) == 1
        assert styles[0].style_type == StyleType.FILL
    
    @pytest.mark.asyncio
    async def test_list_file_styles(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_styles_response: Dict[str, Any],
        sample_style: Dict[str, Any],
    ):
        """Test listing file styles."""
        mock_sdk.client.get_file_styles.return_value = mock_styles_response
        
        styles = await mock_sdk.list_file_styles("file123")
        
        assert len(styles) == 1
        assert isinstance(styles[0], PublishedStyle)
        assert styles[0].key == sample_style["key"]
    
    # Convenience methods tests
    @pytest.mark.asyncio
    async def test_get_components_from_team_url(self, mock_sdk: FigmaComponentsSDK, sample_component: Dict[str, Any]):
        """Test getting components from team URL."""
        # Mock paginate to yield components
        async def mock_paginate(*args, **kwargs):
            yield sample_component
        
        mock_sdk.client.paginate = mock_paginate
        
        url = "https://www.figma.com/team/123456"
        components = await mock_sdk.get_components_from_url(url)
        
        assert len(components) == 1
        assert isinstance(components[0], PublishedComponent)
    
    @pytest.mark.asyncio
    async def test_get_components_from_file_url(
        self,
        mock_sdk: FigmaComponentsSDK,
        mock_components_response: Dict[str, Any],
    ):
        """Test getting components from file URL."""
        mock_sdk.client.get_file_components.return_value = mock_components_response
        
        url = "https://www.figma.com/file/abc123def456/My-Design"
        components = await mock_sdk.get_components_from_url(url)
        
        assert len(components) == 1
        mock_sdk.client.get_file_components.assert_called_once_with("abc123def456")
    
    @pytest.mark.asyncio
    async def test_get_components_from_invalid_url(self, mock_sdk: FigmaComponentsSDK):
        """Test getting components from invalid URL."""
        url = "https://example.com/invalid"
        
        with pytest.raises(ValidationError):
            await mock_sdk.get_components_from_url(url)
    
    @pytest.mark.asyncio
    async def test_get_all_team_assets(self, mock_sdk: FigmaComponentsSDK, sample_component: Dict[str, Any]):
        """Test getting all team assets."""
        # Mock the private methods
        mock_sdk._get_all_team_components = AsyncMock(return_value=[PublishedComponent(**sample_component)])
        mock_sdk._get_all_team_component_sets = AsyncMock(return_value=[])
        mock_sdk._get_all_team_styles = AsyncMock(return_value=[])
        
        assets = await mock_sdk.get_all_team_assets("team123")
        
        assert "components" in assets
        assert "component_sets" in assets
        assert "styles" in assets
        assert len(assets["components"]) == 1
        assert len(assets["component_sets"]) == 0
        assert len(assets["styles"]) == 0