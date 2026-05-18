"""update_bulb MCP tool — proxies light-manager PUT /api/bulbs/{slot}.

Sets one mission beacon's RGB colour. The `user` arg is NOT exposed to the
caller — it is sourced from the MCP's pinned WORKSHOP_PARTICIPANT_LOGIN env
var (NFR-012), so a misprompted agent cannot target a different participant.
slot is checked against VALID_SLOTS; r/g/b are validated by Pydantic to be in
[0, 255]. The HTTP call to light-manager only happens after all validations
pass.
"""

from mcp.types import ToolAnnotations

from core import lightmanager_client
from core.models import VALID_SLOTS, BulbRead, BulbUpdate
from core.server import mcp
from core.tenancy import pinned_login


@mcp.tool(
    annotations=ToolAnnotations(
        title="Update bulb",
    ),
)
def update_bulb(slot: int, r: int, g: int, b: int) -> BulbRead:
    """Set one mission beacon's RGB colour for this MCP's pinned operator.

    Args:
        slot: Beacon index, must be 1, 2, or 3 (per light-manager VALID_SLOTS).
        r: Red channel, 0–255.
        g: Green channel, 0–255.
        b: Blue channel, 0–255.

    Returns:
        The updated BulbRead.

    Raises:
        ValueError: if `slot` is not in (1, 2, 3).
        pydantic.ValidationError: if any of r/g/b is outside [0, 255].
        RuntimeError: if WORKSHOP_PARTICIPANT_LOGIN is unset (fail-closed).
    """
    if slot not in VALID_SLOTS:
        raise ValueError(
            f"Invalid slot {slot}; must be one of {list(VALID_SLOTS)}."
        )
    payload = BulbUpdate(r=r, g=g, b=b)
    raw = lightmanager_client.put_bulb(
        user=pinned_login(), slot=slot, payload=payload.model_dump()
    )
    return BulbRead.model_validate(raw)
