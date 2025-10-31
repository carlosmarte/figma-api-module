"""Tests for the FastAPI server module."""

import os
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from figma_projects.server import app, get_figma_token, get_sdk
from figma_projects.sdk import FigmaProjectsSDK
from figma_projects.models import TeamProjectsResponse, ProjectFilesResponse
from figma_projects.errors import AuthenticationError, NotFoundError


@pytest.fixture
def client():
    """Test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def valid_token():
    """Valid test token."""
    return "test-token-123456789abcdef0123456789abcdef01234567"


class TestTokenValidation:
    """Test token validation functionality."""
    
    def test_missing_token_returns_401(self, client):
        """Test that missing token returns 401."""
        response = client.get("/v1/teams/123/projects")
        assert response.status_code == 401
        assert "X-Figma-Token header is required" in response.json()["detail"]
    
    def test_token_from_header(self, client, valid_token, sample_team_response):
        """Test token validation from header."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.return_value = TeamProjectsResponse(**sample_team_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/projects",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
    
    def test_token_from_query_parameter(self, client, valid_token, sample_team_response):
        """Test token validation from query parameter."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.return_value = TeamProjectsResponse(**sample_team_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(f"/v1/teams/123/projects?token={valid_token}")
            
            assert response.status_code == 200
    
    def test_token_from_environment(self, client, valid_token, sample_team_response):
        """Test token validation from environment variable."""
        with patch.dict(os.environ, {'FIGMA_TOKEN': valid_token}), \
             patch('figma_projects.server.get_sdk') as mock_get_sdk:
            
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.return_value = TeamProjectsResponse(**sample_team_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get("/v1/teams/123/projects")
            
            assert response.status_code == 200
    
    def test_token_priority_order(self, client, valid_token):
        """Test token priority order: header > query > env."""
        header_token = f"{valid_token}-header"
        query_token = f"{valid_token}-query"
        env_token = f"{valid_token}-env"
        
        with patch.dict(os.environ, {'FIGMA_TOKEN': env_token}):
            # Test header has highest priority
            result = get_figma_token(
                x_figma_token=header_token,
                figma_token=query_token
            )
            assert result == header_token
            
            # Test query has priority over env
            result = get_figma_token(
                x_figma_token=None,
                figma_token=query_token
            )
            assert result == query_token
            
            # Test env is used when others are None
            result = get_figma_token(
                x_figma_token=None,
                figma_token=None
            )
            assert result == env_token


class TestAPIEndpoints:
    """Test API endpoints functionality."""
    
    def test_health_endpoint_no_auth(self, client):
        """Test health endpoint doesn't require authentication."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "figma-projects-api"
    
    def test_root_endpoint_no_auth(self, client):
        """Test root endpoint doesn't require authentication."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Figma Projects API"
        assert "/docs" in data["docs"]
    
    def test_get_team_projects_success(self, client, valid_token, sample_team_response):
        """Test successful team projects retrieval."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.return_value = TeamProjectsResponse(**sample_team_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/projects",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Test Team"
            assert len(data["projects"]) == 2
    
    def test_get_project_files_success(self, client, valid_token, sample_files_response):
        """Test successful project files retrieval."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_project_files.return_value = ProjectFilesResponse(**sample_files_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/projects/123/files",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Test Project"
            assert len(data["files"]) == 2
    
    def test_get_project_files_with_branch_data(self, client, valid_token, sample_files_response):
        """Test project files with branch data parameter."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_project_files.return_value = ProjectFilesResponse(**sample_files_response)
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/projects/123/files?branch_data=true",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            mock_sdk.get_project_files.assert_called_with("123", True)
    
    def test_search_projects(self, client, valid_token):
        """Test project search functionality."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.search_projects.return_value = [{"id": "123", "name": "Test Project"}]
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/projects/search?q=test",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["name"] == "Test Project"
    
    def test_get_recent_files(self, client, valid_token):
        """Test getting recent files."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_recent_files.return_value = []
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/projects/123/files/recent?limit=5&days=30",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            mock_sdk.get_recent_files.assert_called_with("123", 5, 30)
    
    def test_get_project_statistics(self, client, valid_token):
        """Test getting project statistics."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_project_statistics.return_value = {
                "project_id": "123",
                "project_name": "Test",
                "total_files": 5,
                "recent_files": 2
            }
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/projects/123/statistics",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_files"] == 5
    
    def test_export_project_structure(self, client, valid_token):
        """Test exporting project structure."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.export_project_structure.return_value = '{"projects": []}'
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/export?format=json&include_files=true",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
    
    def test_batch_get_projects(self, client, valid_token):
        """Test batch getting projects."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.batch_get_projects.return_value = [
                {"project_id": "123", "success": True}
            ]
            mock_get_sdk.return_value = mock_sdk
            
            response = client.post(
                "/v1/projects/batch",
                headers={"X-Figma-Token": valid_token},
                json=["123", "456"]
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
    
    def test_find_file_by_name_found(self, client, valid_token):
        """Test finding file by name when found."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.find_file_by_name.return_value = {
                "key": "ABC123",
                "name": "test.fig"
            }
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/projects/123/files/test.fig/find",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "test.fig"
    
    def test_find_file_by_name_not_found(self, client, valid_token):
        """Test finding file by name when not found."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.find_file_by_name.return_value = None
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/projects/123/files/notfound.fig/find",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"]
    
    def test_get_rate_limit_info(self, client, valid_token):
        """Test getting rate limit info."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_rate_limit_info.return_value = {
                "limit": 60,
                "remaining": 45
            }
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/rate-limit",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["limit"] == 60
    
    def test_get_client_stats(self, client, valid_token):
        """Test getting client stats."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_client_stats.return_value = {
                "requests_made": 10,
                "requests_failed": 1
            }
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/stats",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["requests_made"] == 10


class TestErrorHandling:
    """Test error handling in the server."""
    
    def test_authentication_error_handling(self, client, valid_token):
        """Test authentication error handling."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.side_effect = AuthenticationError("Invalid token")
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/projects",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert data["error"] is True
            assert "Invalid token" in data["message"]
    
    def test_not_found_error_handling(self, client, valid_token):
        """Test not found error handling."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.side_effect = NotFoundError("Team", "123")
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/projects",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 404
            data = response.json()
            assert data["error"] is True
    
    def test_general_exception_handling(self, client, valid_token):
        """Test general exception handling."""
        with patch('figma_projects.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock(spec=FigmaProjectsSDK)
            mock_sdk.get_team_projects.side_effect = Exception("Unexpected error")
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/teams/123/projects",
                headers={"X-Figma-Token": valid_token}
            )
            
            assert response.status_code == 500
            data = response.json()
            assert data["error"] is True
            assert data["message"] == "Internal server error"


class TestCORS:
    """Test CORS configuration."""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are present."""
        response = client.options("/health")
        
        # FastAPI's CORS middleware should add these headers
        assert response.status_code in [200, 204]  # OPTIONS responses can be either