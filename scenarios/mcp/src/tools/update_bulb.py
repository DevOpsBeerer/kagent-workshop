"""update_bulb MCP tool — proxies light-manager PUT /api/bulbs/{slot}.

Sets one mission beacon's RGB colour. Tenancy guard runs first (NFR-012);
slot is checked against VALID_SLOTS; r/g/b are validated by Pydantic to be
in [0, 255]. The HTTP call to light-manager only happens after all three
validations pass.
"""

from mcp.types import ToolAnnotations

from core import lightmanager_client, tenancy
from core.models import VALID_SLOTS, BulbRead, BulbUpdate
from core.server import mcp


@mcp.tool(
    annotations=ToolAnnotations(
        title="Update bulb",
    ),
)
def update_bulb(user: str, slot: int, r: int, g: int, b: int) -> BulbRead:
    """Set one mission beacon's RGB colour.

    Args:
        user: ARTEMIS operator login. Must match WORKSHOP_PARTICIPANT_LOGIN
            (the MCP rejects any other value per NFR-012).
        slot: Beacon index, must be 1, 2, or 3 (per light-manager VALID_SLOTS).
        r: Red channel, 0–255.
        g: Green channel, 0–255.
        b: Blue channel, 0–255.

    Returns:
        The updated BulbRead.

    Raises:
        TenancyMismatchError: if `user` does not match the pinned login.
        ValueError: if `slot` is not in (1, 2, 3).
        pydantic.ValidationError: if any of r/g/b is outside [0, 255].
    """
    tenancy.enforce_tenancy(user)
    if slot not in VALID_SLOTS:
        raise ValueError(
            f"Invalid slot {slot}; must be one of {list(VALID_SLOTS)}."
        )
    payload = BulbUpdate(r=r, g=g, b=b)
    raw = lightmanager_client.put_bulb(user=user, slot=slot, payload=payload.model_dump())
    return BulbRead.model_validate(raw)
