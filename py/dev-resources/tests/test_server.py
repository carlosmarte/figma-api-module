"""Tests for the FastAPI server with token validation."""

import pytest
import os
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from figma_dev_resources.server import app, get_figma_token, get_sdk
from figma_dev_resources.models import DevResource, DevResourceCreate


class TestTokenValidation:
    """Test token validation middleware."""

    def test_missing_token_returns_401(self):
        """Test that missing token returns 401."""
        with TestClient(app) as client:
            # Clear environment
            with patch.dict(os.environ, {}, clear=True):
                response = client.get("/v1/files/test/dev_resources")
                assert response.status_code == 401
                assert "X-Figma-Token header is required" in response.json()["detail"]

    def test_header_token_priority(self):
        """Test that header token takes priority."""
        with TestClient(app) as client:
            with patch.dict(os.environ, {"FIGMA_TOKEN": "env_token"}):
                with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
                    mock_instance = AsyncMock()
                    mock_instance.__aenter__.return_value = mock_instance
                    mock_instance.get_dev_resources.return_value = []
                    mock_sdk.return_value = mock_instance
                    
                    response = client.get(
                        "/v1/files/test/dev_resources",
                        headers={"X-Figma-Token": "header_token"}
                    )
                    
                    assert response.status_code == 200
                    # Verify the header token was used
                    mock_sdk.assert_called_with(api_key="header_token")

    def test_query_token_fallback(self):
        """Test that query parameter token is used as fallback."""
        with TestClient(app) as client:
            with patch.dict(os.environ, {}, clear=True):
                with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
                    mock_instance = AsyncMock()
                    mock_instance.__aenter__.return_value = mock_instance
                    mock_instance.get_dev_resources.return_value = []
                    mock_sdk.return_value = mock_instance
                    
                    response = client.get(
                        "/v1/files/test/dev_resources?token=query_token"
                    )
                    
                    assert response.status_code == 200
                    mock_sdk.assert_called_with(api_key="query_token")

    def test_env_token_fallback(self):
        """Test that environment token is used as last fallback."""
        with TestClient(app) as client:
            with patch.dict(os.environ, {"FIGMA_TOKEN": "env_token"}):
                with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
                    mock_instance = AsyncMock()
                    mock_instance.__aenter__.return_value = mock_instance
                    mock_instance.get_dev_resources.return_value = []
                    mock_sdk.return_value = mock_instance
                    
                    response = client.get("/v1/files/test/dev_resources")
                    
                    assert response.status_code == 200
                    mock_sdk.assert_called_with(api_key="env_token")


class TestServerEndpoints:
    """Test server endpoints."""

    @pytest.fixture
    def client(self):
        """Test client."""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self):
        """Authentication headers."""
        return {"X-Figma-Token": "test_token"}

    def test_health_check_no_auth(self, client):
        """Test health check endpoint doesn't require auth."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_get_dev_resources_requires_auth(self, client):
        """Test that get dev resources requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/v1/files/test/dev_resources")
            assert response.status_code == 401

    def test_get_dev_resources_success(self, client, auth_headers, dev_resource):
        """Test successful get dev resources."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            response = client.get(
                "/v1/files/test_file/dev_resources",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["id"] == dev_resource.id

    def test_get_dev_resources_with_node_ids(self, client, auth_headers, dev_resource):
        """Test get dev resources with node IDs filter."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            response = client.get(
                "/v1/files/test_file/dev_resources?node_ids=1:2,1:3",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            mock_instance.get_dev_resources.assert_called_with(
                "test_file", ["1:2", "1:3"]
            )

    def test_create_dev_resources_requires_auth(self, client):
        """Test that create dev resources requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.post(
                "/v1/dev_resources",
                json={"dev_resources": []}
            )
            assert response.status_code == 401

    def test_create_dev_resources_success(self, client, auth_headers, dev_resource):
        """Test successful create dev resources."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            mock_response = AsyncMock()
            mock_response.links_created = [dev_resource]
            mock_response.errors = []
            mock_instance.create_dev_resources.return_value = mock_response
            
            mock_sdk.return_value = mock_instance
            
            request_data = {
                "dev_resources": [{
                    "name": "Test Resource",
                    "url": "https://example.com",
                    "file_key": "test_file",
                    "node_id": "1:2"
                }]
            }
            
            response = client.post(
                "/v1/dev_resources",
                json=request_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "links_created" in data
            assert "errors" in data

    def test_update_dev_resources_requires_auth(self, client):
        """Test that update dev resources requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.put(
                "/v1/dev_resources",
                json={"dev_resources": []}
            )
            assert response.status_code == 401

    def test_update_dev_resources_success(self, client, auth_headers, dev_resource):
        """Test successful update dev resources."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            mock_response = AsyncMock()
            mock_response.links_updated = [dev_resource]
            mock_response.errors = []
            mock_instance.update_dev_resources.return_value = mock_response
            
            mock_sdk.return_value = mock_instance
            
            request_data = {
                "dev_resources": [{
                    "id": "resource_123",
                    "name": "Updated Resource"
                }]
            }
            
            response = client.put(
                "/v1/dev_resources",
                json=request_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "links_updated" in data

    def test_delete_dev_resource_requires_auth(self, client):
        """Test that delete dev resource requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.delete("/v1/files/test/dev_resources/resource123")
            assert response.status_code == 401

    def test_delete_dev_resource_success(self, client, auth_headers):
        """Test successful delete dev resource."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.error = False
            mock_instance.delete_dev_resource.return_value = mock_response
            
            mock_sdk.return_value = mock_instance
            
            response = client.delete(
                "/v1/files/test_file/dev_resources/resource123",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == 200
            assert data["error"] is False

    def test_search_dev_resources_requires_auth(self, client):
        """Test that search dev resources requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/v1/files/test/dev_resources/search?q=test")
            assert response.status_code == 401

    def test_search_dev_resources_success(self, client, auth_headers, dev_resource):
        """Test successful search dev resources."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.search_dev_resources.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            response = client.get(
                "/v1/files/test_file/dev_resources/search?q=storybook",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1

    def test_get_dev_resources_by_node_requires_auth(self, client):
        """Test that get dev resources by node requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/v1/files/test/nodes/1:2/dev_resources")
            assert response.status_code == 401

    def test_get_dev_resources_by_node_success(self, client, auth_headers, dev_resource):
        """Test successful get dev resources by node."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources_by_node.return_value = [dev_resource]
            mock_sdk.return_value = mock_instance
            
            response = client.get(
                "/v1/files/test_file/nodes/1:2/dev_resources",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1

    def test_batch_create_requires_auth(self, client):
        """Test that batch create requires authentication."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.post(
                "/v1/dev_resources/batch",
                json={"dev_resources": []}
            )
            assert response.status_code == 401

    def test_error_handling(self, client, auth_headers):
        """Test error handling in server endpoints."""
        with patch('figma_dev_resources.server.FigmaDevResourcesSDK') as mock_sdk:
            from figma_dev_resources.errors import NotFoundError
            
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.get_dev_resources.side_effect = NotFoundError("File not found")
            mock_sdk.return_value = mock_instance
            
            response = client.get(
                "/v1/files/nonexistent/dev_resources",
                headers=auth_headers
            )
            
            assert response.status_code == 404
            data = response.json()
            assert data["error"] is True
            assert "File not found" in data["message"]

    def test_openapi_schema_available(self, client):
        """Test that OpenAPI schema is available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "paths" in schema

    def test_docs_available(self, client):
        """Test that API docs are available."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_available(self, client):
        """Test that ReDoc docs are available."""
        response = client.get("/redoc")
        assert response.status_code == 200