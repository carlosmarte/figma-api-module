"""Pytest configuration and fixtures."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from figma_files import FigmaFileClient, FigmaFileSDK
from figma_files.models import (
    User,
    FileResponse,
    FileNodesResponse,
    ImageRenderResponse,
    ImageFillsResponse,
    FileMetaResponse,
    FileVersionsResponse,
    DocumentNode,
    Node,
    Component,
    Style,
    Version,
    ResponsePagination,
    ImageFillsMeta,
    EditorType,
    Role,
)


@pytest.fixture
def api_key() -> str:
    """Test API key."""
    return "test-api-key-12345"


@pytest.fixture
def file_key() -> str:
    """Test file key."""
    return "abc123def456"


@pytest.fixture
def node_ids() -> list[str]:
    """Test node IDs."""
    return ["1:2", "3:4", "5:6"]


@pytest.fixture
def test_user() -> User:
    """Test user model."""
    return User(
        id="user123",
        handle="testuser",
        img_url="https://example.com/avatar.jpg",
        email="test@example.com",
    )


@pytest.fixture
def test_document_node() -> DocumentNode:
    """Test document node."""
    return DocumentNode(
        id="0:0",
        name="Document",
        type="DOCUMENT",
        children=[
            Node(
                id="1:1",
                name="Page 1",
                type="CANVAS",
                children=[
                    Node(
                        id="1:2",
                        name="Frame 1",
                        type="FRAME",
                    )
                ],
            )
        ],
    )


@pytest.fixture
def test_component() -> Component:
    """Test component model."""
    return Component(
        key="comp123",
        name="Test Component",
        description="A test component",
        document_id="1:2",
        containing_frame={"nodeId": "1:1", "name": "Frame 1"},
    )


@pytest.fixture
def test_style() -> Style:
    """Test style model."""
    return Style(
        key="style123",
        name="Test Style",
        style_type="FILL",
        description="A test style",
    )


@pytest.fixture
def test_version(test_user: User) -> Version:
    """Test version model."""
    return Version(
        id="version123",
        created_at=datetime.now(),
        label="Test Version",
        description="A test version",
        user=test_user,
        thumbnail_url="https://example.com/thumb.jpg",
    )


@pytest.fixture
def test_file_response(
    test_document_node: DocumentNode,
    test_component: Component,
    test_style: Style,
) -> FileResponse:
    """Test file response model."""
    return FileResponse(
        name="Test File",
        role=Role.EDITOR,
        last_modified=datetime.now(),
        editor_type=EditorType.FIGMA,
        thumbnail_url="https://example.com/thumb.jpg",
        version="123",
        document=test_document_node,
        components={"comp123": test_component},
        styles={"style123": test_style},
    )


@pytest.fixture
def test_file_nodes_response() -> FileNodesResponse:
    """Test file nodes response model."""
    return FileNodesResponse(
        name="Test File",
        role=Role.EDITOR,
        last_modified=datetime.now(),
        editor_type=EditorType.FIGMA,
        thumbnail_url="https://example.com/thumb.jpg",
        version="123",
        nodes={
            "1:2": None,  # Node not found
            "3:4": None,  # Another node not found
        },
    )


@pytest.fixture
def test_image_response() -> ImageRenderResponse:
    """Test image render response model."""
    return ImageRenderResponse(
        err=None,
        images={
            "1:2": "https://example.com/image1.png",
            "3:4": "https://example.com/image2.png",
            "5:6": None,  # Failed to render
        },
    )


@pytest.fixture
def test_image_fills_response() -> ImageFillsResponse:
    """Test image fills response model."""
    return ImageFillsResponse(
        error=False,
        status=200,
        meta=ImageFillsMeta(
            images={
                "ref1": "https://example.com/fill1.jpg",
                "ref2": "https://example.com/fill2.jpg",
            }
        ),
    )


@pytest.fixture
def test_file_meta_response(test_user: User) -> FileMetaResponse:
    """Test file metadata response model."""
    return FileMetaResponse(
        name="Test File",
        folder_name="Test Project",
        last_touched_at=datetime.now(),
        creator=test_user,
        last_touched_by=test_user,
        thumbnail_url="https://example.com/thumb.jpg",
        editor_type=EditorType.FIGMA,
        role=Role.EDITOR,
        version="123",
        url="https://figma.com/file/abc123/Test-File",
    )


@pytest.fixture
def test_versions_response(test_version: Version) -> FileVersionsResponse:
    """Test file versions response model."""
    return FileVersionsResponse(
        versions=[test_version],
        pagination=ResponsePagination(
            next_page=None,
            previous_page=None,
        ),
    )


@pytest.fixture
def mock_httpx_response():
    """Mock httpx response."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.headers = {}
    mock_response.json.return_value = {"test": "data"}
    mock_response.raise_for_status.return_value = None
    return mock_response


@pytest.fixture
def mock_client(mock_httpx_response):
    """Mock FigmaFileClient."""
    client = MagicMock(spec=FigmaFileClient)
    
    # Mock async context manager
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    
    # Mock API methods
    client.get_file = AsyncMock(return_value={"test": "file_data"})
    client.get_file_nodes = AsyncMock(return_value={"test": "nodes_data"})
    client.render_images = AsyncMock(return_value={"images": {}})
    client.get_image_fills = AsyncMock(return_value={"meta": {"images": {}}})
    client.get_file_meta = AsyncMock(return_value={"test": "meta_data"})
    client.get_file_versions = AsyncMock(return_value={"versions": []})
    
    return client


@pytest.fixture
def sdk_with_mock_client(mock_client):
    """SDK with mock client."""
    return FigmaFileSDK(client=mock_client)


@pytest.fixture
def figma_url() -> str:
    """Test Figma URL."""
    return "https://www.figma.com/file/abc123def456/Test-File?node-id=1%3A2"


@pytest.fixture
def figma_url_no_node() -> str:
    """Test Figma URL without node ID."""
    return "https://www.figma.com/file/abc123def456/Test-File"