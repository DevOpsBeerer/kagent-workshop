"""list_bulbs MCP tool — proxies light-manager GET /api/bulbs.

Returns the three Artemis mission beacons of the pinned operator. The `user`
arg is NOT exposed to the caller — it is sourced from the MCP's pinned
WORKSHOP_PARTICIPANT_LOGIN env var (NFR-012), so a misprompted agent cannot
target a different participant.
"""

from mcp.types import ToolAnnotations

from core import lightmanager_client
from core.models import BulbRead
from core.server import mcp
from core.tenancy import pinned_login


@mcp.tool(
    annotations=ToolAnnotations(
        title="List bulbs",
        readOnlyHint=True,
    ),
)
def list_bulbs() -> list[BulbRead]:
    """List the 3 mission beacons of this MCP's pinned Artemis operator.

    No arguments — the user is fixed at deploy time via
    WORKSHOP_PARTICIPANT_LOGIN.

    Returns:
        A list of three BulbRead objects, one per slot (1, 2, 3).
    """
    raw = lightmanager_client.get_bulbs(pinned_login())
    return [BulbRead.model_validate(item) for item in raw]
