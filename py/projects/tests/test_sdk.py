"""Tests for the SDK module."""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime

from figma_projects.sdk import FigmaProjectsSDK
from figma_projects.models import (
    Project,
    ProjectFile,
    TeamProjectsResponse,
    ProjectFilesResponse,
    ExportFormat,
)
from figma_projects.errors import ValidationError


class TestFigmaProjectsSDK:
    """Test SDK functionality."""
    
    def test_sdk_initialization(self, api_token):
        """Test SDK initialization."""
        sdk = FigmaProjectsSDK(api_token)
        
        assert sdk.client.api_token == api_token
        assert sdk.client.base_url == "https://api.figma.com"
    
    def test_sdk_custom_settings(self, api_token):
        """Test SDK with custom settings."""
        sdk = FigmaProjectsSDK(
            api_token=api_token,
            base_url="https://custom.api.com",
            requests_per_minute=120,
            timeout=60.0,
            max_retries=5,
        )
        
        assert sdk.client.base_url == "https://custom.api.com"
        assert sdk.client.timeout == 60.0
    
    @pytest.mark.asyncio
    async def test_sdk_context_manager(self, api_token):
        """Test SDK as async context manager."""
        with patch.object(FigmaProjectsSDK, '__aenter__', new_callable=AsyncMock) as mock_enter, \
             patch.object(FigmaProjectsSDK, '__aexit__', new_callable=AsyncMock) as mock_exit:
            
            async with FigmaProjectsSDK(api_token) as sdk:
                assert sdk is not None
            
            mock_enter.assert_called_once()
            mock_exit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_team_projects_success(self, api_token, sample_team_response):
        """Test successful team projects retrieval."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_team_response
            
            result = await sdk.get_team_projects("123456789")
            
            assert isinstance(result, TeamProjectsResponse)
            assert result.name == "Test Team"
            assert len(result.projects) == 2
            mock_get.assert_called_once_with("/v1/teams/123456789/projects")
    
    @pytest.mark.asyncio
    async def test_get_team_projects_invalid_id(self, api_token):
        """Test team projects with invalid team ID."""
        sdk = FigmaProjectsSDK(api_token)
        
        with pytest.raises(ValidationError) as exc_info:
            await sdk.get_team_projects("invalid-id!")
        
        assert "Invalid team ID format" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_project_files_success(self, api_token, sample_files_response):
        """Test successful project files retrieval."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_files_response
            
            result = await sdk.get_project_files("987654321")
            
            assert isinstance(result, ProjectFilesResponse)
            assert result.name == "Test Project"
            assert len(result.files) == 2
            mock_get.assert_called_once_with("/v1/projects/987654321/files", params={})
    
    @pytest.mark.asyncio
    async def test_get_project_files_with_branch_data(self, api_token, sample_files_response):
        """Test project files with branch data."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk.client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_files_response
            
            await sdk.get_project_files("987654321", include_branch_data=True)
            
            mock_get.assert_called_once_with(
                "/v1/projects/987654321/files", 
                params={"branch_data": "true"}
            )
    
    @pytest.mark.asyncio
    async def test_get_project_files_invalid_id(self, api_token):
        """Test project files with invalid project ID."""
        sdk = FigmaProjectsSDK(api_token)
        
        with pytest.raises(ValidationError) as exc_info:
            await sdk.get_project_files("invalid-id")
        
        assert "Invalid project ID format" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_list_all_team_projects(self, api_token, sample_team_response):
        """Test listing all team projects."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_team_projects', new_callable=AsyncMock) as mock_get:
            mock_response = TeamProjectsResponse(**sample_team_response)
            mock_get.return_value = mock_response
            
            projects = await sdk.list_all_team_projects("123456789")
            
            assert len(projects) == 2
            assert all(isinstance(p, Project) for p in projects)
    
    @pytest.mark.asyncio
    async def test_list_all_project_files(self, api_token, sample_files_response):
        """Test listing all project files."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_project_files', new_callable=AsyncMock) as mock_get:
            mock_response = ProjectFilesResponse(**sample_files_response)
            mock_get.return_value = mock_response
            
            files = await sdk.list_all_project_files("987654321")
            
            assert len(files) == 2
            assert all(isinstance(f, ProjectFile) for f in files)
    
    @pytest.mark.asyncio
    async def test_find_file_by_name_exact_match(self, api_token, sample_files_response):
        """Test finding file by exact name match."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'list_all_project_files', new_callable=AsyncMock) as mock_list:
            files_response = ProjectFilesResponse(**sample_files_response)
            mock_list.return_value = files_response.files
            
            file = await sdk.find_file_by_name("987654321", "Design File 1", exact_match=True)
            
            assert file is not None
            assert file.name == "Design File 1"
    
    @pytest.mark.asyncio
    async def test_find_file_by_name_partial_match(self, api_token, sample_files_response):
        """Test finding file by partial name match."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'list_all_project_files', new_callable=AsyncMock) as mock_list:
            files_response = ProjectFilesResponse(**sample_files_response)
            mock_list.return_value = files_response.files
            
            file = await sdk.find_file_by_name("987654321", "Design", exact_match=False)
            
            assert file is not None
            assert "Design" in file.name
    
    @pytest.mark.asyncio
    async def test_find_file_by_name_not_found(self, api_token, sample_files_response):
        """Test finding file that doesn't exist."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'list_all_project_files', new_callable=AsyncMock) as mock_list:
            files_response = ProjectFilesResponse(**sample_files_response)
            mock_list.return_value = files_response.files
            
            file = await sdk.find_file_by_name("987654321", "NonExistent", exact_match=True)
            
            assert file is None
    
    @pytest.mark.asyncio
    async def test_get_recent_files(self, api_token, sample_files_response):
        """Test getting recent files."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'list_all_project_files', new_callable=AsyncMock) as mock_list:
            files_response = ProjectFilesResponse(**sample_files_response)
            # Update files to be recent
            for file in files_response.files:
                file.last_modified = datetime.now()
            mock_list.return_value = files_response.files
            
            recent_files = await sdk.get_recent_files("987654321", limit=5, days=30)
            
            assert len(recent_files) <= 5
            assert len(recent_files) >= 0
    
    @pytest.mark.asyncio
    async def test_search_projects(self, api_token, sample_team_response):
        """Test searching projects."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'list_all_team_projects', new_callable=AsyncMock) as mock_list:
            team_response = TeamProjectsResponse(**sample_team_response)
            mock_list.return_value = team_response.projects
            
            results = await sdk.search_projects("123456789", "Project 1")
            
            assert len(results) == 1
            assert results[0].name == "Project 1"
    
    @pytest.mark.asyncio
    async def test_search_files_in_project(self, api_token, sample_files_response):
        """Test searching files in project."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_project_files', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = ProjectFilesResponse(**sample_files_response)
            
            results = await sdk.search_files_in_project("987654321", "Design")
            
            assert len(results) == 2  # Both files contain "Design"
            assert all(result.match_score > 0 for result in results)
    
    @pytest.mark.asyncio
    async def test_get_project_statistics(self, api_token, sample_files_response):
        """Test getting project statistics."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_project_files', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = ProjectFilesResponse(**sample_files_response)
            
            stats = await sdk.get_project_statistics("987654321")
            
            assert stats.project_id == "987654321"
            assert stats.project_name == "Test Project"
            assert stats.total_files == 2
    
    @pytest.mark.asyncio
    async def test_batch_get_projects(self, api_token, sample_files_response):
        """Test batch getting projects."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_project_files', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = ProjectFilesResponse(**sample_files_response)
            
            results = await sdk.batch_get_projects(["123", "456"])
            
            assert len(results) == 2
            assert all(result.success for result in results)
    
    @pytest.mark.asyncio
    async def test_export_project_structure_json(self, api_token):
        """Test exporting project structure as JSON."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_project_tree', new_callable=AsyncMock) as mock_tree:
            mock_tree.return_value.projects = [{"id": "123", "name": "Test"}]
            
            result = await sdk.export_project_structure("123456789", ExportFormat.JSON)
            
            assert isinstance(result, str)
            assert "Test" in result
    
    @pytest.mark.asyncio
    async def test_export_project_structure_csv(self, api_token):
        """Test exporting project structure as CSV."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk, 'get_project_tree', new_callable=AsyncMock) as mock_tree:
            mock_tree.return_value.projects = [{"id": "123", "name": "Test", "files": []}]
            
            result = await sdk.export_project_structure("123456789", ExportFormat.CSV)
            
            assert isinstance(result, str)
            assert "project_id" in result  # CSV header
    
    @pytest.mark.asyncio
    async def test_export_unsupported_format(self, api_token):
        """Test exporting with unsupported format."""
        sdk = FigmaProjectsSDK(api_token)
        
        with pytest.raises(ValidationError):
            await sdk.export_project_structure("123456789", "xml")
    
    def test_get_rate_limit_info(self, api_token):
        """Test getting rate limit info."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk.client, 'get_rate_limit_info') as mock_get:
            sdk.get_rate_limit_info()
            mock_get.assert_called_once()
    
    def test_get_client_stats(self, api_token):
        """Test getting client stats."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk.client, 'get_stats') as mock_get:
            sdk.get_client_stats()
            mock_get.assert_called_once()
    
    def test_reset_client_stats(self, api_token):
        """Test resetting client stats."""
        sdk = FigmaProjectsSDK(api_token)
        
        with patch.object(sdk.client, 'reset_stats') as mock_reset:
            sdk.reset_client_stats()
            mock_reset.assert_called_once()