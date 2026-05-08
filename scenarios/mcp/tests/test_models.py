"""Tests for the vendored Pydantic shapes (BulbRead / BulbUpdate / VALID_SLOTS).

The shapes shadow light-manager/backend/app/routers/bulbs.py:17-30. The MCP
contract is "shadow these shapes" (FR-016 AC); the tests below pin both the
field set and the validation behaviour.
"""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.models import VALID_SLOTS, BulbRead, BulbUpdate  # noqa: E402


class TestBulbRead:
    """BulbRead shape — what GET /api/bulbs returns per item."""

    def test_round_trip_from_dict(self) -> None:
        payload = {
            "slot": 1,
            "r": 100,
            "g": 200,
            "b": 50,
            "updated_at": "2026-05-08T12:00:00+00:00",
        }
        b = BulbRead.model_validate(payload)
        assert b.slot == 1
        assert b.r == 100
        assert b.g == 200
        assert b.b == 50
        assert b.updated_at == datetime(2026, 5, 8, 12, 0, 0, tzinfo=timezone.utc)

    def test_missing_required_field_rejected(self) -> None:
        payload = {"slot": 1, "r": 100, "g": 200, "b": 50}  # missing updated_at
        with pytest.raises(ValidationError):
            BulbRead.model_validate(payload)


class TestBulbUpdate:
    """BulbUpdate shape — body of PUT /api/bulbs/{slot}; r/g/b ∈ [0, 255]."""

    @pytest.mark.parametrize("value", [0, 1, 127, 254, 255])
    def test_rgb_valid_boundary(self, value: int) -> None:
        BulbUpdate(r=value, g=value, b=value)

    @pytest.mark.parametrize(
        "field,value",
        [("r", -1), ("r", 256), ("g", -1), ("g", 256), ("b", -1), ("b", 256)],
    )
    def test_rgb_out_of_range_rejected(self, field: str, value: int) -> None:
        kwargs = {"r": 0, "g": 0, "b": 0, field: value}
        with pytest.raises(ValidationError):
            BulbUpdate(**kwargs)

    def test_partial_payload_rejected(self) -> None:
        # All three channels are required.
        with pytest.raises(ValidationError):
            BulbUpdate(r=10, g=20)  # type: ignore[call-arg]


class TestValidSlots:
    """VALID_SLOTS pins the slot domain at the model level."""

    def test_valid_slots_tuple(self) -> None:
        assert VALID_SLOTS == (1, 2, 3)
