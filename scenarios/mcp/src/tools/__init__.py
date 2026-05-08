"""Tools package for artemis-bulb-mcp MCP server.

The dynamic loader (src/core/server.py) imports each *.py file in this
directory at boot and triggers any @mcp.tool()-decorated function. This
__init__ is kept minimal because the runtime doesn't rely on it; static
imports are listed for editor / IDE convenience only.
"""

from .list_bulbs import list_bulbs
from .update_bulb import update_bulb

__all__ = ["list_bulbs", "update_bulb"]
