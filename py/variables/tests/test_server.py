"""
Tests for the FastAPI server with token validation.
"""

import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from figma_variables.server import app, get_figma_token, get_sdk
from figma_variables.errors import AuthenticationError, NotFoundError


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_sdk():
    """Mock SDK for testing."""
    sdk = MagicMock()
    sdk.__aenter__ = AsyncMock(return_value=sdk)
    sdk.__aexit__ = AsyncMock(return_value=None)
    return sdk


class TestTokenValidation:
    """Test token validation functionality."""
    
    def test_missing_token_returns_401(self, client):
        """Test that missing token returns 401."""
        # Clear environment variable
        if "FIGMA_TOKEN" in os.environ:
            del os.environ["FIGMA_TOKEN"]
        
        response = client.get("/v1/files/test123/variables/local")
        assert response.status_code == 401
        assert "required" in response.json()["detail"]
    
    def test_header_token_priority(self, client):
        """Test that X-Figma-Token header has highest priority."""
        os.environ["FIGMA_TOKEN"] = "env_token"
        
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.get_local_variables = AsyncMock(return_value=MagicMock(dict=lambda: {"test": "data"}))
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/local",
                headers={"X-Figma-Token": "header_token"},
                params={"token": "query_token"}
            )
            
            # Should use header token
            mock_get_sdk.assert_called_once_with("header_token")
    
    def test_query_token_priority(self, client):
        """Test that query token is used when header is missing."""
        os.environ["FIGMA_TOKEN"] = "env_token"
        
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.get_local_variables = AsyncMock(return_value=MagicMock(dict=lambda: {"test": "data"}))
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/local",
                params={"token": "query_token"}
            )
            
            # Should use query token
            mock_get_sdk.assert_called_once_with("query_token")
    
    def test_env_token_fallback(self, client):
        """Test that environment token is used as fallback."""
        os.environ["FIGMA_TOKEN"] = "env_token"
        
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.get_local_variables = AsyncMock(return_value=MagicMock(dict=lambda: {"test": "data"}))
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get("/v1/files/test123/variables/local")
            
            # Should use environment token
            mock_get_sdk.assert_called_once_with("env_token")


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check_no_auth(self, client):
        """Test that health check doesn't require authentication."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "figma-variables-api"


class TestVariablesEndpoints:
    """Test variables API endpoints."""
    
    def test_get_local_variables_requires_auth(self, client):
        """Test that local variables endpoint requires authentication."""
        if "FIGMA_TOKEN" in os.environ:
            del os.environ["FIGMA_TOKEN"]
        
        response = client.get("/v1/files/test123/variables/local")
        assert response.status_code == 401
    
    def test_get_local_variables_success(self, client, sample_local_variables_response):
        """Test successful local variables request."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.dict.return_value = sample_local_variables_response
            mock_sdk.get_local_variables = AsyncMock(return_value=mock_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/local",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == 200
            assert not data["error"]
    
    def test_get_published_variables_requires_auth(self, client):
        """Test that published variables endpoint requires authentication."""
        if "FIGMA_TOKEN" in os.environ:
            del os.environ["FIGMA_TOKEN"]
        
        response = client.get("/v1/files/test123/variables/published")
        assert response.status_code == 401
    
    def test_get_published_variables_success(self, client, sample_published_variables_response):
        """Test successful published variables request."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.dict.return_value = sample_published_variables_response
            mock_sdk.get_published_variables = AsyncMock(return_value=mock_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/published",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == 200
            assert not data["error"]
    
    def test_modify_variables_requires_auth(self, client):
        """Test that modify variables endpoint requires authentication."""
        if "FIGMA_TOKEN" in os.environ:
            del os.environ["FIGMA_TOKEN"]
        
        response = client.post(
            "/v1/files/test123/variables",
            json={"variables": []}
        )
        assert response.status_code == 401
    
    def test_modify_variables_success(self, client, sample_modify_response):
        """Test successful variables modification."""
        request_data = {
            "variables": [{
                "action": "CREATE",
                "name": "Test Variable",
                "variableCollectionId": "collection_123",
                "resolvedType": "COLOR"
            }]
        }
        
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.dict.return_value = sample_modify_response
            mock_sdk.modify_variables = AsyncMock(return_value=mock_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.post(
                "/v1/files/test123/variables",
                json=request_data,
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == 200
            assert not data["error"]
    
    def test_get_variable_success(self, client, sample_variable_data):
        """Test successful get variable request."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_variable = MagicMock()
            mock_variable.dict.return_value = sample_variable_data
            mock_sdk.get_variable = AsyncMock(return_value=mock_variable)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/variable_123",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "variable_123"
    
    def test_get_variable_not_found(self, client):
        """Test get variable when variable doesn't exist."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.get_variable = AsyncMock(side_effect=ValueError("Variable not found"))
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/nonexistent",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 404
    
    def test_list_variables_success(self, client, sample_variable_data):
        """Test successful list variables request."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_variable = MagicMock()
            mock_variable.dict.return_value = sample_variable_data
            mock_sdk.list_variables = AsyncMock(return_value=[mock_variable])
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "variables" in data
            assert data["count"] == 1
    
    def test_list_variables_with_collection_filter(self, client, sample_variable_data):
        """Test list variables with collection filter."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_variable = MagicMock()
            mock_variable.dict.return_value = sample_variable_data
            mock_sdk.list_variables = AsyncMock(return_value=[mock_variable])
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables?collection_id=collection_456",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            # Verify collection_id was passed to SDK
            mock_sdk.list_variables.assert_called_once_with(
                "test123",
                collection_id="collection_456",
                published=False
            )
    
    def test_search_variables_success(self, client, sample_variable_data):
        """Test successful search variables request."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_variable = MagicMock()
            mock_variable.dict.return_value = sample_variable_data
            mock_sdk.search_variables = AsyncMock(return_value=[mock_variable])
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/search?q=primary",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "variables" in data
            assert data["query"] == "primary"
            assert data["count"] == 1
    
    def test_create_variable_collection_success(self, client):
        """Test successful create variable collection."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.create_variable_collection = AsyncMock(return_value="collection_123")
            mock_get_sdk.return_value = mock_sdk
            
            response = client.post(
                "/v1/files/test123/variables/collections?name=Test Collection",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["collection_id"] == "collection_123"
            assert data["name"] == "Test Collection"
    
    def test_create_variable_success(self, client):
        """Test successful create variable."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.create_variable = AsyncMock(return_value="variable_123")
            mock_get_sdk.return_value = mock_sdk
            
            response = client.post(
                "/v1/files/test123/variables/create"
                "?name=Test Variable"
                "&collection_id=collection_456"
                "&variable_type=COLOR",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["variable_id"] == "variable_123"
            assert data["name"] == "Test Variable"
            assert data["type"] == "COLOR"
    
    def test_delete_variable_success(self, client):
        """Test successful delete variable."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.delete_variable = AsyncMock(return_value=None)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.delete(
                "/v1/files/test123/variables/variable_123",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["variable_id"] == "variable_123"
            assert "deleted successfully" in data["message"]
    
    def test_batch_get_variables_success(self, client, sample_variable_data):
        """Test successful batch get variables."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_variable = MagicMock()
            mock_variable.dict.return_value = sample_variable_data
            mock_sdk.batch_get_variables = AsyncMock(return_value=[mock_variable])
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/batch?variable_ids=var1,var2,var3",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "variables" in data
            assert data["requested_ids"] == ["var1", "var2", "var3"]
            assert data["found_count"] == 1


class TestErrorHandling:
    """Test error handling."""
    
    def test_figma_variables_error_handling(self, client):
        """Test that FigmaVariablesError is properly handled."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.get_local_variables = AsyncMock(
                side_effect=AuthenticationError("Invalid token")
            )
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/local",
                headers={"X-Figma-Token": "invalid_token"}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert data["error"] is True
            assert "Invalid token" in data["message"]
    
    def test_generic_error_handling(self, client):
        """Test that generic errors return 500."""
        with patch("figma_variables.server.get_sdk") as mock_get_sdk:
            mock_sdk = MagicMock()
            mock_sdk.__aenter__ = AsyncMock(return_value=mock_sdk)
            mock_sdk.__aexit__ = AsyncMock(return_value=None)
            mock_sdk.get_local_variables = AsyncMock(
                side_effect=Exception("Unexpected error")
            )
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/files/test123/variables/local",
                headers={"X-Figma-Token": "test_token"}
            )
            
            assert response.status_code == 500


class TestOpenAPIDocumentation:
    """Test OpenAPI documentation endpoints."""
    
    def test_docs_endpoint_accessible(self, client):
        """Test that OpenAPI docs are accessible."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
    
    def test_redoc_endpoint_accessible(self, client):
        """Test that ReDoc is accessible."""
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
    
    def test_openapi_json_accessible(self, client):
        """Test that OpenAPI JSON schema is accessible."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        schema = response.json()
        assert schema["info"]["title"] == "Figma Variables API Server"
        assert "paths" in schema