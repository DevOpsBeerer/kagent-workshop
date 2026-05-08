"""Tests for tool loading + the bulb-tool surface.

The kmcp scaffold generates this file with echo-tool assertions; STORY-022
deletes the echo example and replaces them with assertions over the actual
bulb tools the MCP ships (list_bulbs, update_bulb).
"""

import os
import sys
from pathlib import Path

import pytest

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.server import DynamicMCPServer  # noqa: E402


# All tool-loading paths invoke the tools' module-level imports, which include
# the @mcp.tool decorator running. The decorator itself does not need the env
# var, but the dynamic loader runs each tool's import statements; we set a
# safe default here so the suite never depends on host env state.
@pytest.fixture(autouse=True)
def _pin_tenancy_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-test")


class TestToolLoading:
    """Test that the bulb tools can be loaded by the dynamic loader."""

    def test_server_initialization(self) -> None:
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")
        assert server is not None
        assert server.name == "Test Server"

    def test_tool_discovery_does_not_exit(self) -> None:
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")
        try:
            server.load_tools()
        except SystemExit:
            pytest.fail("Tool loading failed - server exited")

    def test_both_bulb_tools_loaded(self) -> None:
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")
        server.load_tools()
        assert "list_bulbs" in server.loaded_tools
        assert "update_bulb" in server.loaded_tools

    def test_tool_functions_callable(self) -> None:
        server = DynamicMCPServer(name="Test Server", tools_dir="src/tools")
        server.load_tools()
        tools = server.get_tools_sync()
        for tool_name, tool in tools.items():
            assert hasattr(tool, "fn"), f"Tool {tool_name} has no fn attribute"
            assert callable(tool.fn), f"Tool {tool_name} is not callable"
