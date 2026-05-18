"""list_bulbs MCP tool — proxies light-manager GET /api/bulbs.

Returns the three Artemis mission beacons of the pinned operator. Tenancy guard
runs first (NFR-012); the HTTP call to light-manager only happens if the call's
`user=` arg matches WORKSHOP_PARTICIPANT_LOGIN.
"""

from mcp.types import ToolAnnotations

from core import lightmanager_client, tenancy
from core.models import BulbRead
from core.server import mcp


@mcp.tool(
    annotations=ToolAnnotations(
        title="List bulbs",
        readOnlyHint=True,
    ),
)
def list_bulbs(user: str) -> list[BulbRead]:
    """List the 3 mission beacons of an Artemis operator.

    Args:
        user: ARTEMIS operator login. Must match WORKSHOP_PARTICIPANT_LOGIN
            (the MCP rejects any other value per NFR-012).

    Returns:
        A list of three BulbRead objects, one per slot (1, 2, 3).
    """
    raw = lightmanager_client.get_bulbs(user)
    return [BulbRead.model_validate(item) for item in raw]
