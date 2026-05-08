"""Tests for mcp MCP server core functionality."""

import sys
from pathlib import Path
from unittest.mock import mock_open, patch, MagicMock
import pytest

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.server import DynamicMCPServer  # noqa: E402
from core.utils import get_tool_config, load_config  # noqa: E402


class TestDynamicMCPServer:
    """Test the dynamic MCP server functionality."""

    def test_server_initialization(self) -> None:
        """Test server initialization."""
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")
        assert server.name == "Test Server"
        assert server.tools_dir == Path("src/tools")

    def test_server_with_nonexistent_tools_dir(self) -> None:
        """Test server behavior with non-existent tools directory."""
        server = DynamicMCPServer(name="Test Server", tools_dir="nonexistent")

        # Should not raise exception, just print message
        server.load_tools()
        assert len(server.loaded_tools) == 0

    def test_load_config(self) -> None:
        """Test configuration loading."""
        config_data = """
        server:
          name: "Test Server"
        tools:
          echo:
            prefix: "[TEST] "
        """

        with patch("builtins.open", mock_open(read_data=config_data)):
            config = load_config("test.yaml")
            assert config["server"]["name"] == "Test Server"
            assert config["tools"]["echo"]["prefix"] == "[TEST] "

    def test_get_tool_config(self) -> None:
        """Test tool-specific configuration retrieval."""
        with patch("core.utils.load_config") as mock_load:
            mock_load.return_value = {
                "tools": {
                    "list_bulbs": {"timeout_s": 5},
                    "update_bulb": {"timeout_s": 5},
                }
            }

            list_cfg = get_tool_config("list_bulbs")
            assert list_cfg["timeout_s"] == 5

            update_cfg = get_tool_config("update_bulb")
            assert update_cfg["timeout_s"] == 5

            # Test non-existent tool
            empty_config = get_tool_config("nonexistent")
            assert empty_config == {}

    def test_run_method_default_mode(self) -> None:
        """Test that run method defaults to stdio mode."""
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")

        with patch.object(server.mcp, 'run') as mock_run:
            server.run()
            mock_run.assert_called_once()

    def test_run_method_http_mode(self) -> None:
        """Test that run method can switch to HTTP mode."""
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")

        with patch.object(server.mcp, 'run') as mock_run:
            server.run(transport_mode="http", host="0.0.0.0", port=8080)
            mock_run.assert_called_once_with(transport="http", host="0.0.0.0", port=8080, path="/mcp")

    def test_http_transport_configuration(self) -> None:
        """Test HTTP transport configuration is passed to FastMCP."""
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")
        with patch.object(server.mcp, 'run') as mock_run:
            server.run(transport_mode="http", host="localhost", port=3000)
            mock_run.assert_called_once_with(transport="http", host="localhost", port=3000, path="/mcp")
            kwargs = mock_run.call_args.kwargs
            assert kwargs["transport"] == "http"
            assert kwargs["host"] == "localhost"
            assert kwargs["port"] == 3000
            assert kwargs["path"] == "/mcp"

    def test_http_server_missing_dependencies(self) -> None:
        """Test that HTTP server raises ImportError from FastMCP run."""
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")

        with patch.object(server.mcp, 'run') as mock_run:
            mock_run.side_effect = ImportError("No module named 'uvicorn'")
            with pytest.raises(ImportError, match="No module named 'uvicorn'"):
                server.run(transport_mode="http", host="localhost", port=3000)


class TestToolLoading:
    """Test the tool loading mechanism."""

    def test_tool_function_detection(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that tool functions are properly detected."""
        # Tool modules import core.tenancy, which doesn't error at import time
        # (the env check is per-call), but we pin a safe value so the loader
        # is never blocked by host env state.
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-test")

        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")

        # This should load actual tools from the tools directory
        server.load_tools()

        # The bulb tool surface (list_bulbs + update_bulb) lands here.
        assert len(server.loaded_tools) >= 2
        assert "list_bulbs" in server.loaded_tools
        assert "update_bulb" in server.loaded_tools
