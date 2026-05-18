"""Tests for the update_bulb MCP tool.

Covers:
- Happy path (mocked light-manager response, login env set, valid slot + RGB).
- Slot validation — slot ∈ {1, 2, 3} accepted; 0 / 4 / -1 rejected before HTTP call.
- RGB validation — boundary 0/255 accepted; -1 / 256 rejected by Pydantic.
- Fail-closed posture when WORKSHOP_PARTICIPANT_LOGIN is unset.

The tool no longer accepts a `user=` argument — the pinned login is sourced
from the env var directly per NFR-012.
"""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from tools.update_bulb import update_bulb  # noqa: E402


def _ok_response(slot: int, r: int, g: int, b: int) -> dict:
    return {
        "slot": slot,
        "r": r,
        "g": g,
        "b": b,
        "updated_at": "2026-05-08T12:00:00+00:00",
    }


class TestUpdateBulbHappyPath:
    @pytest.mark.parametrize("slot", [1, 2, 3])
    def test_slot_in_valid_set(self, monkeypatch: pytest.MonkeyPatch, slot: int) -> None:
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-01")
        monkeypatch.setenv("LIGHT_MANAGER_URL", "http://light-manager:8000")
        with patch(
            "core.lightmanager_client.put_bulb",
            return_value=_ok_response(slot, 10, 20, 30),
        ) as m:
            out = update_bulb(slot=slot, r=10, g=20, b=30)
        m.assert_called_once_with(
            user="operator-01", slot=slot, payload={"r": 10, "g": 20, "b": 30}
        )
        assert out.slot == slot
        assert out.r == 10 and out.g == 20 and out.b == 30


class TestUpdateBulbSlotValidation:
    @pytest.mark.parametrize("slot", [0, 4, -1, 999])
    def test_invalid_slot_rejected(
        self, monkeypatch: pytest.MonkeyPatch, slot: int
    ) -> None:
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-01")
        with patch("core.lightmanager_client.put_bulb") as m:
            with pytest.raises(ValueError, match="Invalid slot"):
                update_bulb(slot=slot, r=0, g=0, b=0)
        m.assert_not_called()


class TestUpdateBulbRgbValidation:
    @pytest.mark.parametrize(
        "channel,value",
        [("r", 0), ("r", 255), ("g", 0), ("g", 255), ("b", 0), ("b", 255)],
    )
    def test_rgb_boundary_accepted(
        self, monkeypatch: pytest.MonkeyPatch, channel: str, value: int
    ) -> None:
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-01")
        monkeypatch.setenv("LIGHT_MANAGER_URL", "http://light-manager:8000")
        kwargs = {"r": 100, "g": 100, "b": 100, channel: value}
        with patch(
            "core.lightmanager_client.put_bulb",
            return_value=_ok_response(1, kwargs["r"], kwargs["g"], kwargs["b"]),
        ):
            update_bulb(slot=1, **kwargs)

    @pytest.mark.parametrize(
        "channel,value",
        [("r", -1), ("r", 256), ("g", -1), ("g", 256), ("b", -1), ("b", 256)],
    )
    def test_rgb_out_of_range_rejected(
        self, monkeypatch: pytest.MonkeyPatch, channel: str, value: int
    ) -> None:
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-01")
        kwargs = {"r": 0, "g": 0, "b": 0, channel: value}
        with patch("core.lightmanager_client.put_bulb") as m:
            with pytest.raises(ValidationError):
                update_bulb(slot=1, **kwargs)
        m.assert_not_called()


class TestUpdateBulbTenancy:
    def test_unset_env_fails_closed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("WORKSHOP_PARTICIPANT_LOGIN", raising=False)
        with patch("core.lightmanager_client.put_bulb") as m:
            with pytest.raises(RuntimeError):
                update_bulb(slot=1, r=10, g=20, b=30)
        m.assert_not_called()
