"""
Tests for FastAPI server with token validation.
"""

import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from figma_library_analytics.server import app


class TestServer:
    """Test FastAPI server endpoints."""
    
    def setup_method(self):
        """Setup test client."""
        self.client = TestClient(app)
    
    def test_health_check_no_auth(self):
        """Test health check endpoint without authentication."""
        response = self.client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "service": "figma-library-analytics"}
    
    def test_missing_token_returns_401(self):
        """Test that missing token returns 401."""
        response = self.client.get("/v1/analytics/libraries/ABC123/component/actions?group_by=component")
        assert response.status_code == 401
        assert "X-Figma-Token header is required" in response.json()["detail"]
    
    def test_token_from_header(self):
        """Test token validation from X-Figma-Token header."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions?group_by=component",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            # Verify SDK was initialized with the token
            mock_sdk_class.assert_called_once_with(api_key="test_token")
    
    def test_token_from_query_parameter(self):
        """Test token validation from query parameter."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions?group_by=component&token=test_token"
            )
            
            assert response.status_code == 200
            mock_sdk_class.assert_called_once_with(api_key="test_token")
    
    @patch.dict(os.environ, {'FIGMA_TOKEN': 'env_token'})
    def test_token_from_environment(self):
        """Test token validation from environment variable."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions?group_by=component"
            )
            
            assert response.status_code == 200
            mock_sdk_class.assert_called_once_with(api_key="env_token")
    
    def test_token_priority_header_over_query(self):
        """Test that header token takes priority over query parameter."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions?group_by=component&token=query_token",
                headers={"X-Figma-Token": "header_token"}
            )
            
            assert response.status_code == 200
            # Should use header token, not query token
            mock_sdk_class.assert_called_once_with(api_key="header_token")
    
    @patch.dict(os.environ, {'FIGMA_TOKEN': 'env_token'})
    def test_token_priority_query_over_env(self):
        """Test that query parameter takes priority over environment."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions?group_by=component&token=query_token"
            )
            
            assert response.status_code == 200
            # Should use query token, not env token
            mock_sdk_class.assert_called_once_with(api_key="query_token")
    
    def test_component_actions_invalid_group_by(self):
        """Test component actions with invalid group_by parameter."""
        response = self.client.get(
            "/v1/analytics/libraries/ABC123/component/actions?group_by=invalid",
            headers={"X-Figma-Token": "test_token"}
        )
        
        assert response.status_code == 400
        assert "group_by must be 'component' or 'team'" in response.json()["detail"]
    
    def test_component_usages_invalid_group_by(self):
        """Test component usages with invalid group_by parameter."""
        response = self.client.get(
            "/v1/analytics/libraries/ABC123/component/usages?group_by=invalid",
            headers={"X-Figma-Token": "test_token"}
        )
        
        assert response.status_code == 400
        assert "group_by must be 'component' or 'file'" in response.json()["detail"]
    
    def test_style_actions_invalid_group_by(self):
        """Test style actions with invalid group_by parameter."""
        response = self.client.get(
            "/v1/analytics/libraries/ABC123/style/actions?group_by=invalid",
            headers={"X-Figma-Token": "test_token"}
        )
        
        assert response.status_code == 400
        assert "group_by must be 'style' or 'team'" in response.json()["detail"]
    
    def test_style_usages_invalid_group_by(self):
        """Test style usages with invalid group_by parameter."""
        response = self.client.get(
            "/v1/analytics/libraries/ABC123/style/usages?group_by=invalid",
            headers={"X-Figma-Token": "test_token"}
        )
        
        assert response.status_code == 400
        assert "group_by must be 'style' or 'file'" in response.json()["detail"]
    
    def test_variable_actions_invalid_group_by(self):
        """Test variable actions with invalid group_by parameter."""
        response = self.client.get(
            "/v1/analytics/libraries/ABC123/variable/actions?group_by=invalid",
            headers={"X-Figma-Token": "test_token"}
        )
        
        assert response.status_code == 400
        assert "group_by must be 'variable' or 'team'" in response.json()["detail"]
    
    def test_variable_usages_invalid_group_by(self):
        """Test variable usages with invalid group_by parameter."""
        response = self.client.get(
            "/v1/analytics/libraries/ABC123/variable/usages?group_by=invalid",
            headers={"X-Figma-Token": "test_token"}
        )
        
        assert response.status_code == 400
        assert "group_by must be 'variable' or 'file'" in response.json()["detail"]
    
    def test_component_actions_with_date_parameters(self):
        """Test component actions with date parameters."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions"
                "?group_by=component&start_date=2023-01-01&end_date=2023-12-31",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            
            # Verify SDK was called with correct parameters
            call_args = mock_sdk.get_component_actions.call_args
            assert call_args[0][1].value == "component"  # group_by
            assert str(call_args[0][2]) == "2023-01-01"  # start_date
            assert str(call_args[0][3]) == "2023-12-31"  # end_date
    
    def test_component_actions_with_cursor(self):
        """Test component actions with pagination cursor."""
        with patch('figma_library_analytics.server.FigmaAnalyticsSDK') as mock_sdk_class:
            mock_sdk = AsyncMock()
            mock_sdk_class.return_value = mock_sdk
            mock_sdk.__aenter__.return_value = mock_sdk
            mock_sdk.__aexit__.return_value = None
            
            mock_response = type('MockResponse', (), {
                'rows': [],
                'next_page': False,
                'cursor': None
            })()
            mock_sdk.get_component_actions.return_value = mock_response
            
            response = self.client.get(
                "/v1/analytics/libraries/ABC123/component/actions"
                "?group_by=component&cursor=next_page_cursor",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            
            # Verify cursor was passed
            call_args = mock_sdk.get_component_actions.call_args
            assert call_args[0][4] == "next_page_cursor"  # cursor
    
    def test_all_endpoints_require_auth_except_health(self):
        """Test that all endpoints require authentication except /health."""
        endpoints = [
            "/v1/analytics/libraries/ABC123/component/actions?group_by=component",
            "/v1/analytics/libraries/ABC123/component/usages?group_by=component",
            "/v1/analytics/libraries/ABC123/style/actions?group_by=style",
            "/v1/analytics/libraries/ABC123/style/usages?group_by=style",
            "/v1/analytics/libraries/ABC123/variable/actions?group_by=variable",
            "/v1/analytics/libraries/ABC123/variable/usages?group_by=variable",
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            assert response.status_code == 401, f"Endpoint {endpoint} should require auth"
    
    def test_openapi_schema_available(self):
        """Test that OpenAPI schema is available."""
        response = self.client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert schema["info"]["title"] == "Figma Library Analytics API"
        assert schema["info"]["version"] == "0.1.0"
    
    def test_docs_available(self):
        """Test that documentation endpoints are available."""
        # Swagger UI
        response = self.client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        
        # ReDoc
        response = self.client.get("/redoc")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
    
    def test_cors_headers(self):
        """Test that CORS headers are present."""
        response = self.client.options(
            "/v1/analytics/libraries/ABC123/component/actions",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "X-Figma-Token",
            }
        )
        
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers
        assert "Access-Control-Allow-Headers" in response.headers