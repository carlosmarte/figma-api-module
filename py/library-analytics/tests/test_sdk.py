"""
Tests for FigmaAnalyticsSDK.
"""

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

from figma_library_analytics.models import (
    GroupBy,
    LibraryAnalyticsComponentActionsByAsset,
    LibraryAnalyticsComponentActionsByTeam,
)
from figma_library_analytics.sdk import FigmaAnalyticsSDK


class TestFigmaAnalyticsSDK:
    """Test FigmaAnalyticsSDK class."""
    
    def test_init(self, api_key):
        """Test SDK initialization."""
        sdk = FigmaAnalyticsSDK(api_key)
        assert sdk.client.api_key == api_key
        assert sdk.client.base_url == "https://api.figma.com"
    
    def test_init_with_custom_params(self, api_key):
        """Test SDK initialization with custom parameters."""
        sdk = FigmaAnalyticsSDK(
            api_key,
            base_url="https://custom.api.com",
            requests_per_minute=100,
        )
        assert sdk.client.base_url == "https://custom.api.com"
    
    @pytest.mark.asyncio
    async def test_context_manager(self, api_key):
        """Test async context manager."""
        async with FigmaAnalyticsSDK(api_key) as sdk:
            assert sdk.client.api_key == api_key
    
    def test_validate_inputs_valid(self, api_key):
        """Test input validation with valid inputs."""
        sdk = FigmaAnalyticsSDK(api_key)
        # Should not raise any exceptions
        sdk._validate_inputs("ABC123", date(2023, 1, 1), date(2023, 12, 31))
    
    def test_validate_inputs_invalid_file_key(self, api_key):
        """Test input validation with invalid file key."""
        sdk = FigmaAnalyticsSDK(api_key)
        with pytest.raises(ValueError, match="Invalid file key format"):
            sdk._validate_inputs("ABC", None, None)
    
    def test_validate_inputs_invalid_date_range(self, api_key):
        """Test input validation with invalid date range."""
        sdk = FigmaAnalyticsSDK(api_key)
        with pytest.raises(ValueError, match="Start date must be before"):
            sdk._validate_inputs("ABC123", date(2023, 12, 31), date(2023, 1, 1))
    
    @pytest.mark.asyncio
    async def test_get_component_actions_by_component(self, api_key, file_key, sample_analytics_response):
        """Test getting component actions grouped by component."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = sample_analytics_response
            
            result = await sdk.get_component_actions(file_key, GroupBy.COMPONENT)
            
            assert len(result.rows) == 1
            assert isinstance(result.rows[0], LibraryAnalyticsComponentActionsByAsset)
            assert result.rows[0].component_name == "Button"
            assert result.next_page is False
            
            mock_get.assert_called_once_with(
                f"/v1/analytics/libraries/{file_key}/component/actions",
                group_by="component"
            )
    
    @pytest.mark.asyncio
    async def test_get_component_actions_by_team(self, api_key, file_key):
        """Test getting component actions grouped by team."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        team_response = {
            "rows": [
                {
                    "week": "2023-12-13",
                    "team_name": "Design Team",
                    "workspace_name": "Company Workspace",
                    "detachments": 3,
                    "insertions": 8,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = team_response
            
            result = await sdk.get_component_actions(file_key, GroupBy.TEAM)
            
            assert len(result.rows) == 1
            assert isinstance(result.rows[0], LibraryAnalyticsComponentActionsByTeam)
            assert result.rows[0].team_name == "Design Team"
    
    @pytest.mark.asyncio
    async def test_get_component_actions_invalid_group_by(self, api_key, file_key):
        """Test getting component actions with invalid group_by."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        with pytest.raises(ValueError, match="group_by must be 'component' or 'team'"):
            await sdk.get_component_actions(file_key, GroupBy.STYLE)
    
    @pytest.mark.asyncio
    async def test_get_component_actions_with_dates(self, api_key, file_key, sample_analytics_response):
        """Test getting component actions with date range."""
        sdk = FigmaAnalyticsSDK(api_key)
        start_date = date(2023, 1, 1)
        end_date = date(2023, 12, 31)
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = sample_analytics_response
            
            await sdk.get_component_actions(file_key, GroupBy.COMPONENT, start_date, end_date)
            
            mock_get.assert_called_once_with(
                f"/v1/analytics/libraries/{file_key}/component/actions",
                group_by="component",
                start_date="2023-01-01",
                end_date="2023-12-31"
            )
    
    @pytest.mark.asyncio
    async def test_get_component_usages_by_component(self, api_key, file_key):
        """Test getting component usages grouped by component."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        response = {
            "rows": [
                {
                    "component_key": "comp_123",
                    "component_name": "Button",
                    "component_set_key": "set_456",
                    "component_set_name": "Button Set",
                    "usages": 50,
                    "teams_using": 5,
                    "files_using": 10,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = response
            
            result = await sdk.get_component_usages(file_key, GroupBy.COMPONENT)
            
            assert len(result.rows) == 1
            assert result.rows[0].component_name == "Button"
            assert result.rows[0].usages == 50
    
    @pytest.mark.asyncio
    async def test_get_component_usages_invalid_group_by(self, api_key, file_key):
        """Test getting component usages with invalid group_by."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        with pytest.raises(ValueError, match="group_by must be 'component' or 'file'"):
            await sdk.get_component_usages(file_key, GroupBy.TEAM)
    
    @pytest.mark.asyncio
    async def test_get_style_actions(self, api_key, file_key):
        """Test getting style actions."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        response = {
            "rows": [
                {
                    "week": "2023-12-13",
                    "style_key": "style_123",
                    "style_name": "Primary Color",
                    "style_type": "FILL",
                    "detachments": 2,
                    "insertions": 15,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = response
            
            result = await sdk.get_style_actions(file_key, GroupBy.STYLE)
            
            assert len(result.rows) == 1
            assert result.rows[0].style_name == "Primary Color"
    
    @pytest.mark.asyncio
    async def test_get_style_usages(self, api_key, file_key):
        """Test getting style usages."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        response = {
            "rows": [
                {
                    "style_key": "style_123",
                    "style_name": "Primary Color",
                    "style_type": "FILL",
                    "usages": 100,
                    "teams_using": 8,
                    "files_using": 25,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = response
            
            result = await sdk.get_style_usages(file_key, GroupBy.STYLE)
            
            assert len(result.rows) == 1
            assert result.rows[0].usages == 100
    
    @pytest.mark.asyncio
    async def test_get_variable_actions(self, api_key, file_key):
        """Test getting variable actions."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        response = {
            "rows": [
                {
                    "week": "2023-12-13",
                    "variable_key": "var_123",
                    "variable_name": "Primary Color",
                    "variable_type": "COLOR",
                    "collection_key": "col_456",
                    "collection_name": "Colors",
                    "detachments": 1,
                    "insertions": 20,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = response
            
            result = await sdk.get_variable_actions(file_key, GroupBy.VARIABLE)
            
            assert len(result.rows) == 1
            assert result.rows[0].variable_name == "Primary Color"
    
    @pytest.mark.asyncio
    async def test_get_variable_usages(self, api_key, file_key):
        """Test getting variable usages."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        response = {
            "rows": [
                {
                    "variable_key": "var_123",
                    "variable_name": "Primary Color",
                    "variable_type": "COLOR",
                    "collection_key": "col_456",
                    "collection_name": "Colors",
                    "usages": 75,
                    "teams_using": 6,
                    "files_using": 18,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk.client, 'get') as mock_get:
            mock_get.return_value = response
            
            result = await sdk.get_variable_usages(file_key, GroupBy.VARIABLE)
            
            assert len(result.rows) == 1
            assert result.rows[0].usages == 75
    
    @pytest.mark.asyncio
    async def test_get_all_component_actions(self, api_key, file_key):
        """Test getting all component actions across pages."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        # Mock paginated responses
        page1_response = {
            "rows": [
                {
                    "week": "2023-12-13",
                    "component_key": "comp_1",
                    "component_name": "Button 1",
                    "detachments": 5,
                    "insertions": 10,
                }
            ],
            "next_page": True,
            "cursor": "page2",
        }
        
        page2_response = {
            "rows": [
                {
                    "week": "2023-12-13",
                    "component_key": "comp_2",
                    "component_name": "Button 2",
                    "detachments": 3,
                    "insertions": 8,
                }
            ],
            "next_page": False,
        }
        
        with patch.object(sdk, 'get_component_actions') as mock_get:
            mock_get.side_effect = [
                type('MockResponse', (), {
                    'rows': [LibraryAnalyticsComponentActionsByAsset(**page1_response['rows'][0])],
                    'next_page': True,
                    'cursor': 'page2'
                })(),
                type('MockResponse', (), {
                    'rows': [LibraryAnalyticsComponentActionsByAsset(**page2_response['rows'][0])],
                    'next_page': False,
                    'cursor': None
                })(),
            ]
            
            all_actions = await sdk.get_all_component_actions(file_key, GroupBy.COMPONENT)
            
            assert len(all_actions) == 2
            assert all_actions[0].component_name == "Button 1"
            assert all_actions[1].component_name == "Button 2"
    
    @pytest.mark.asyncio
    async def test_stream_component_actions(self, api_key, file_key):
        """Test streaming component actions."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        # Mock responses for streaming
        response1 = type('MockResponse', (), {
            'rows': [LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_1",
                component_name="Button 1",
                detachments=5,
                insertions=10
            )],
            'next_page': True,
            'cursor': 'page2'
        })()
        
        response2 = type('MockResponse', (), {
            'rows': [LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_2", 
                component_name="Button 2",
                detachments=3,
                insertions=8
            )],
            'next_page': False,
            'cursor': None
        })()
        
        with patch.object(sdk, 'get_component_actions') as mock_get:
            mock_get.side_effect = [response1, response2]
            
            streamed_actions = []
            async for action in sdk.stream_component_actions(file_key, GroupBy.COMPONENT):
                streamed_actions.append(action)
            
            assert len(streamed_actions) == 2
            assert streamed_actions[0].component_name == "Button 1"
            assert streamed_actions[1].component_name == "Button 2"
    
    @pytest.mark.asyncio
    async def test_search_components_by_name(self, api_key, file_key):
        """Test searching components by name."""
        sdk = FigmaAnalyticsSDK(api_key)
        
        # Mock all actions
        all_actions = [
            LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_1",
                component_name="Primary Button",
                detachments=5,
                insertions=10
            ),
            LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_2",
                component_name="Secondary Button",
                detachments=3,
                insertions=8
            ),
            LibraryAnalyticsComponentActionsByAsset(
                week="2023-12-13",
                component_key="comp_3",
                component_name="Text Input",
                detachments=2,
                insertions=15
            ),
        ]
        
        with patch.object(sdk, 'get_all_component_actions') as mock_get_all:
            mock_get_all.return_value = all_actions
            
            # Search for "button"
            matching_actions = await sdk.search_components_by_name(file_key, "button")
            
            assert len(matching_actions) == 2
            assert matching_actions[0].component_name == "Primary Button"
            assert matching_actions[1].component_name == "Secondary Button"