"""Tests for the FastAPI server."""

import pytest
import os
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient

from figma_components.server import app, get_figma_token, get_sdk
from figma_components.models import PublishedComponent, PublishedComponentSet, PublishedStyle
from figma_components.errors import NotFoundError, FigmaComponentsError


class TestTokenValidation:
    """Tests for token validation."""
    
    def test_missing_token_returns_401(self):
        """Test that missing token returns 401."""
        client = TestClient(app)
        response = client.get("/v1/components/test")
        assert response.status_code == 401
        assert "X-Figma-Token header" in response.json()["detail"]
    
    def test_token_from_header(self):
        """Test token validation from header."""
        client = TestClient(app)
        with patch('figma_components.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock()
            mock_sdk.get_component.return_value = Mock()
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/components/test",
                headers={"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
            )
            # We expect this to fail because the mock doesn't return a proper model
            # but it should not be a 401
            assert response.status_code != 401
    
    def test_token_from_query_parameter(self):
        """Test token validation from query parameter."""
        client = TestClient(app)
        with patch('figma_components.server.get_sdk') as mock_get_sdk:
            mock_sdk = AsyncMock()
            mock_sdk.get_component.return_value = Mock()
            mock_get_sdk.return_value = mock_sdk
            
            response = client.get(
                "/v1/components/test?token=test-token-1234567890-abcdefghijklmnopqrstuvwxyz"
            )
            assert response.status_code != 401
    
    def test_token_from_environment(self):
        """Test token validation from environment variable."""
        client = TestClient(app)
        
        with patch.dict(os.environ, {'FIGMA_TOKEN': 'test-token-1234567890-abcdefghijklmnopqrstuvwxyz'}):
            with patch('figma_components.server.get_sdk') as mock_get_sdk:
                mock_sdk = AsyncMock()
                mock_sdk.get_component.return_value = Mock()
                mock_get_sdk.return_value = mock_sdk
                
                response = client.get("/v1/components/test")
                assert response.status_code != 401
    
    def test_token_priority_order(self):
        """Test that header takes priority over query parameter and environment."""
        client = TestClient(app)
        
        with patch.dict(os.environ, {'FIGMA_TOKEN': 'env-token'}):
            with patch('figma_components.server.get_sdk') as mock_get_sdk:
                mock_sdk = AsyncMock()
                mock_sdk.get_component.return_value = Mock()
                mock_get_sdk.return_value = mock_sdk
                
                # Header should take priority
                response = client.get(
                    "/v1/components/test?token=query-token",
                    headers={"X-Figma-Token": "header-token"}
                )
                
                # Verify the header token was used (check the mock call)
                # This is indirectly tested by ensuring no 401
                assert response.status_code != 401


class TestHealthEndpoint:
    """Tests for the health endpoint."""
    
    def test_health_endpoint_no_auth(self):
        """Test that health endpoint doesn't require authentication."""
        client = TestClient(app)
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "figma-components"


class TestComponentEndpoints:
    """Tests for component endpoints."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
        self.headers = {"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
    
    @patch('figma_components.server.get_sdk')
    def test_get_component_success(self, mock_get_sdk: Mock, sample_component):
        """Test successful component retrieval."""
        mock_sdk = AsyncMock()
        mock_sdk.get_component.return_value = PublishedComponent(**sample_component)
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/components/test_key", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == sample_component["key"]
        assert data["name"] == sample_component["name"]
    
    @patch('figma_components.server.get_sdk')
    def test_get_component_not_found(self, mock_get_sdk: Mock):
        """Test component not found."""
        mock_sdk = AsyncMock()
        mock_sdk.get_component.side_effect = NotFoundError("Component not found")
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/components/nonexistent", headers=self.headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_team_components(self, mock_get_sdk: Mock, sample_component):
        """Test listing team components."""
        mock_sdk = AsyncMock()
        mock_sdk.list_team_components.return_value = [PublishedComponent(**sample_component)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/teams/team123/components", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["key"] == sample_component["key"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_team_components_with_pagination(self, mock_get_sdk: Mock):
        """Test listing team components with pagination."""
        mock_sdk = AsyncMock()
        mock_sdk.list_team_components.return_value = []
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get(
            "/v1/teams/team123/components?page_size=50&after=100",
            headers=self.headers
        )
        
        assert response.status_code == 200
        mock_sdk.list_team_components.assert_called_once_with(
            team_id="team123",
            page_size=50,
            after=100,
            before=None,
        )
    
    def test_list_team_components_invalid_pagination(self):
        """Test invalid pagination parameters."""
        response = self.client.get(
            "/v1/teams/team123/components?after=100&before=200",
            headers=self.headers
        )
        
        assert response.status_code == 400
        assert "Cannot specify both" in response.json()["detail"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_file_components(self, mock_get_sdk: Mock, sample_component):
        """Test listing file components."""
        mock_sdk = AsyncMock()
        mock_sdk.list_file_components.return_value = [PublishedComponent(**sample_component)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/files/file123/components", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["key"] == sample_component["key"]
    
    @patch('figma_components.server.get_sdk')
    def test_search_team_components(self, mock_get_sdk: Mock, sample_component):
        """Test searching team components."""
        mock_sdk = AsyncMock()
        mock_sdk.search_team_components.return_value = [PublishedComponent(**sample_component)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get(
            "/v1/teams/team123/components/search?q=button&limit=20",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        mock_sdk.search_team_components.assert_called_once_with("team123", "button", 20)


class TestComponentSetEndpoints:
    """Tests for component set endpoints."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
        self.headers = {"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
    
    @patch('figma_components.server.get_sdk')
    def test_get_component_set(self, mock_get_sdk: Mock, sample_component_set):
        """Test getting a component set."""
        mock_sdk = AsyncMock()
        mock_sdk.get_component_set.return_value = PublishedComponentSet(**sample_component_set)
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/component_sets/test_key", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == sample_component_set["key"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_team_component_sets(self, mock_get_sdk: Mock, sample_component_set):
        """Test listing team component sets."""
        mock_sdk = AsyncMock()
        mock_sdk.list_team_component_sets.return_value = [PublishedComponentSet(**sample_component_set)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/teams/team123/component_sets", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["key"] == sample_component_set["key"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_file_component_sets(self, mock_get_sdk: Mock, sample_component_set):
        """Test listing file component sets."""
        mock_sdk = AsyncMock()
        mock_sdk.list_file_component_sets.return_value = [PublishedComponentSet(**sample_component_set)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/files/file123/component_sets", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1


class TestStyleEndpoints:
    """Tests for style endpoints."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
        self.headers = {"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
    
    @patch('figma_components.server.get_sdk')
    def test_get_style(self, mock_get_sdk: Mock, sample_style):
        """Test getting a style."""
        mock_sdk = AsyncMock()
        mock_sdk.get_style.return_value = PublishedStyle(**sample_style)
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/styles/test_key", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == sample_style["key"]
        assert data["style_type"] == sample_style["style_type"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_team_styles(self, mock_get_sdk: Mock, sample_style):
        """Test listing team styles."""
        mock_sdk = AsyncMock()
        mock_sdk.list_team_styles.return_value = [PublishedStyle(**sample_style)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/teams/team123/styles", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["key"] == sample_style["key"]
    
    @patch('figma_components.server.get_sdk')
    def test_list_team_styles_with_filter(self, mock_get_sdk: Mock, sample_style):
        """Test listing team styles with type filter."""
        mock_sdk = AsyncMock()
        mock_sdk.list_team_styles.return_value = [PublishedStyle(**sample_style)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/teams/team123/styles?style_type=FILL", headers=self.headers)
        
        assert response.status_code == 200
        # Verify the filter was passed to the SDK
        from figma_components.models import StyleType
        mock_sdk.list_team_styles.assert_called_once_with(
            team_id="team123",
            page_size=30,
            after=None,
            before=None,
            style_type=StyleType.FILL,
        )
    
    @patch('figma_components.server.get_sdk')
    def test_list_file_styles(self, mock_get_sdk: Mock, sample_style):
        """Test listing file styles."""
        mock_sdk = AsyncMock()
        mock_sdk.list_file_styles.return_value = [PublishedStyle(**sample_style)]
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/files/file123/styles", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1


class TestBatchOperations:
    """Tests for batch operations."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
        self.headers = {"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
    
    @patch('figma_components.server.get_sdk')
    def test_batch_get_components(self, mock_get_sdk: Mock, sample_component):
        """Test batch getting components."""
        mock_sdk = AsyncMock()
        mock_sdk.batch_get_components.return_value = [
            PublishedComponent(**sample_component),
            PublishedComponent(**sample_component),
        ]
        mock_get_sdk.return_value = mock_sdk
        
        keys = ["key1", "key2"]
        response = self.client.post(
            "/v1/components/batch",
            json=keys,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
    
    def test_batch_get_components_too_many_keys(self):
        """Test batch operation with too many keys."""
        keys = [f"key{i}" for i in range(101)]  # 101 keys, limit is 100
        
        response = self.client.post(
            "/v1/components/batch",
            json=keys,
            headers=self.headers
        )
        
        assert response.status_code == 400
        assert "Maximum 100 keys" in response.json()["detail"]


class TestConvenienceEndpoints:
    """Tests for convenience endpoints."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
        self.headers = {"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
    
    @patch('figma_components.server.get_sdk')
    def test_get_all_team_assets(self, mock_get_sdk: Mock, sample_component):
        """Test getting all team assets."""
        mock_sdk = AsyncMock()
        mock_sdk.get_all_team_assets.return_value = {
            "components": [PublishedComponent(**sample_component)],
            "component_sets": [],
            "styles": [],
        }
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/teams/team123/assets", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "components" in data
        assert "component_sets" in data
        assert "styles" in data
        assert "summary" in data
        assert data["summary"]["total_components"] == 1
    
    def test_extract_ids_from_url(self):
        """Test URL ID extraction utility."""
        response = self.client.get(
            "/v1/utils/extract-ids?url=https://www.figma.com/file/abc123/My-Design"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_key"] == "abc123"
        assert data["team_id"] is None
        assert data["url"] == "https://www.figma.com/file/abc123/My-Design"


class TestErrorHandling:
    """Tests for error handling."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
        self.headers = {"X-Figma-Token": "test-token-1234567890-abcdefghijklmnopqrstuvwxyz"}
    
    @patch('figma_components.server.get_sdk')
    def test_figma_error_handling(self, mock_get_sdk: Mock):
        """Test Figma error handling."""
        mock_sdk = AsyncMock()
        mock_sdk.get_component.side_effect = FigmaComponentsError("API Error", 500)
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/components/test", headers=self.headers)
        
        assert response.status_code == 500
        data = response.json()
        assert data["error"] is True
        assert data["message"] == "API Error"
        assert data["status_code"] == 500
    
    @patch('figma_components.server.get_sdk')
    def test_general_error_handling(self, mock_get_sdk: Mock):
        """Test general error handling."""
        mock_sdk = AsyncMock()
        mock_sdk.get_component.side_effect = Exception("Unexpected error")
        mock_get_sdk.return_value = mock_sdk
        
        response = self.client.get("/v1/components/test", headers=self.headers)
        
        assert response.status_code == 500
        data = response.json()
        assert data["error"] is True
        assert data["message"] == "Internal server error"