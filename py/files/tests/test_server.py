"""Tests for the FastAPI server with token validation."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from figma_files.server import app, get_figma_token
from figma_files.errors import AuthenticationError, ApiError


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_sdk():
    """Create mock SDK."""
    with patch("figma_files.server.FigmaFileSDK") as mock:
        sdk_instance = AsyncMock()
        mock.return_value = sdk_instance
        yield sdk_instance


class TestTokenValidation:
    """Test token validation middleware."""
    
    def test_health_check_no_auth_required(self, client):
        """Test health check endpoint doesn't require authentication."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_missing_token_returns_401(self, client):
        """Test that missing token returns 401."""
        response = client.get("/v1/files/test-file-key")
        assert response.status_code == 401
        assert "X-Figma-Token header is required" in response.json()["detail"]
    
    def test_token_from_header(self, client, mock_sdk):
        """Test token validation from X-Figma-Token header."""
        with patch("figma_files.server.FigmaFileSDK") as mock_sdk_class:
            mock_instance = AsyncMock()
            mock_sdk_class.return_value = mock_instance
            
            # Mock the async context manager
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            
            # Mock the get_file method
            mock_file_data = AsyncMock()
            mock_file_data.model_dump.return_value = {"name": "Test File"}
            mock_instance.get_file.return_value = mock_file_data
            
            response = client.get(
                "/v1/files/test-file-key",
                headers={"X-Figma-Token": "test-token"}
            )
            
            assert response.status_code == 200
            mock_sdk_class.assert_called_once_with(api_key="test-token")
    
    def test_token_from_query_param(self, client):
        """Test token validation from query parameter."""
        with patch("figma_files.server.FigmaFileSDK") as mock_sdk_class:
            mock_instance = AsyncMock()
            mock_sdk_class.return_value = mock_instance
            
            # Mock the async context manager
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            
            # Mock the get_file method
            mock_file_data = AsyncMock()
            mock_file_data.model_dump.return_value = {"name": "Test File"}
            mock_instance.get_file.return_value = mock_file_data
            
            response = client.get("/v1/files/test-file-key?token=test-token")
            
            assert response.status_code == 200
            mock_sdk_class.assert_called_once_with(api_key="test-token")
    
    @patch.dict("os.environ", {"FIGMA_TOKEN": "env-token"})
    def test_token_from_environment(self, client):
        """Test token validation from environment variable."""
        with patch("figma_files.server.FigmaFileSDK") as mock_sdk_class:
            mock_instance = AsyncMock()
            mock_sdk_class.return_value = mock_instance
            
            # Mock the async context manager
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            
            # Mock the get_file method
            mock_file_data = AsyncMock()
            mock_file_data.model_dump.return_value = {"name": "Test File"}
            mock_instance.get_file.return_value = mock_file_data
            
            response = client.get("/v1/files/test-file-key")
            
            assert response.status_code == 200
            mock_sdk_class.assert_called_once_with(api_key="env-token")
    
    def test_token_priority_header_over_query(self, client):
        """Test that header token takes priority over query param."""
        with patch("figma_files.server.FigmaFileSDK") as mock_sdk_class:
            mock_instance = AsyncMock()
            mock_sdk_class.return_value = mock_instance
            
            # Mock the async context manager
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            
            # Mock the get_file method
            mock_file_data = AsyncMock()
            mock_file_data.model_dump.return_value = {"name": "Test File"}
            mock_instance.get_file.return_value = mock_file_data
            
            response = client.get(
                "/v1/files/test-file-key?token=query-token",
                headers={"X-Figma-Token": "header-token"}
            )
            
            assert response.status_code == 200
            mock_sdk_class.assert_called_once_with(api_key="header-token")


class TestErrorHandling:
    """Test error handling."""
    
    def test_authentication_error_returns_401(self, client):
        """Test that AuthenticationError returns 401."""
        with patch("figma_files.server.FigmaFileSDK") as mock_sdk_class:
            mock_instance = AsyncMock()
            mock_sdk_class.return_value = mock_instance
            
            # Mock the async context manager
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            
            # Mock the get_file method to raise AuthenticationError
            mock_instance.get_file.side_effect = AuthenticationError("Invalid token")
            
            response = client.get(
                "/v1/files/test-file-key",
                headers={"X-Figma-Token": "invalid-token"}
            )
            
            assert response.status_code == 401
            assert "Invalid token" in response.json()["detail"]
    
    def test_api_error_returns_400(self, client):
        """Test that ApiError returns 400."""
        with patch("figma_files.server.FigmaFileSDK") as mock_sdk_class:
            mock_instance = AsyncMock()
            mock_sdk_class.return_value = mock_instance
            
            # Mock the async context manager
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            
            # Mock the get_file method to raise ApiError
            mock_instance.get_file.side_effect = ApiError("File not found")
            
            response = client.get(
                "/v1/files/test-file-key",
                headers={"X-Figma-Token": "valid-token"}
            )
            
            assert response.status_code == 400
            assert "File not found" in response.json()["detail"]


class TestEndpoints:
    """Test API endpoints with token validation."""
    
    def test_get_file_requires_token(self, client):
        """Test GET /v1/files/{file_key} requires token."""
        response = client.get("/v1/files/test-key")
        assert response.status_code == 401
    
    def test_get_file_nodes_requires_token(self, client):
        """Test GET /v1/files/{file_key}/nodes requires token."""
        response = client.get("/v1/files/test-key/nodes?ids=1:2")
        assert response.status_code == 401
    
    def test_render_images_requires_token(self, client):
        """Test GET /v1/images/{file_key} requires token."""
        response = client.get("/v1/images/test-key?ids=1:2")
        assert response.status_code == 401
    
    def test_render_images_post_requires_token(self, client):
        """Test POST /v1/images/{file_key} requires token."""
        response = client.post(
            "/v1/images/test-key",
            json={"node_ids": ["1:2", "3:4"]}
        )
        assert response.status_code == 401
    
    def test_get_image_fills_requires_token(self, client):
        """Test GET /v1/files/{file_key}/images requires token."""
        response = client.get("/v1/files/test-key/images")
        assert response.status_code == 401
    
    def test_get_metadata_requires_token(self, client):
        """Test GET /v1/files/{file_key}/meta requires token."""
        response = client.get("/v1/files/test-key/meta")
        assert response.status_code == 401
    
    def test_get_versions_requires_token(self, client):
        """Test GET /v1/files/{file_key}/versions requires token."""
        response = client.get("/v1/files/test-key/versions")
        assert response.status_code == 401
    
    def test_search_nodes_requires_token(self, client):
        """Test POST /v1/files/{file_key}/search requires token."""
        response = client.post(
            "/v1/files/test-key/search",
            json={"name_pattern": "Button"}
        )
        assert response.status_code == 401
    
    def test_list_components_requires_token(self, client):
        """Test GET /v1/files/{file_key}/components requires token."""
        response = client.get("/v1/files/test-key/components")
        assert response.status_code == 401


class TestOpenAPI:
    """Test OpenAPI documentation."""
    
    def test_openapi_schema_available(self, client):
        """Test that OpenAPI schema is available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert schema["info"]["title"] == "Figma Files API"
        assert "paths" in schema
        assert "/v1/files/{file_key}" in schema["paths"]
    
    def test_docs_available(self, client):
        """Test that Swagger UI docs are available."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "swagger-ui" in response.text.lower()
    
    def test_redoc_available(self, client):
        """Test that ReDoc is available."""
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "redoc" in response.text.lower()