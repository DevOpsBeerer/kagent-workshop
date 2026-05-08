"""Pydantic shape shadows of light-manager's BulbRead / BulbUpdate.

Vendored verbatim from
  light-manager/backend/app/routers/bulbs.py:17-30
on 2026-05-08 (STORY-022). The MCP ships as a standalone Docker image (STORY-023);
the sibling repo isn't a Python package the container can install. If light-manager
changes its shapes, the vendor needs to be re-synced — a Sprint-3 retro candidate
is to add a CI grep/diff check that catches drift at PR time. For now, manual
sync at PR time is the enforcement mechanism.

Vendored fields match light-manager's contract today:
- BulbRead:   slot, r, g, b, updated_at — what GET /api/bulbs returns per item.
- BulbUpdate: r, g, b — body of PUT /api/bulbs/{slot}, each in [0, 255] via Field.

VALID_SLOTS mirrors the upstream's tuple; the MCP's update_bulb tool re-checks slot
against this so a slot=0 / slot=4 call fails *before* hitting the wire.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

VALID_SLOTS: tuple[int, ...] = (1, 2, 3)


class BulbRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slot: int
    r: int
    g: int
    b: int
    updated_at: datetime


class BulbUpdate(BaseModel):
    r: int = Field(ge=0, le=255)
    g: int = Field(ge=0, le=255)
    b: int = Field(ge=0, le=255)
