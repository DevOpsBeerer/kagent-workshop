"""Tests for the list_bulbs MCP tool.

Covers:
- Happy path (mocked light-manager response, tenancy match).
- Tenancy mismatch — guard fires *before* any HTTP call (mock not invoked).

The HTTP call is mocked rather than live-tested; integration with a real
light-manager is STORY-027 / STORY-028 (M5 dry-run) territory.
"""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.tenancy import TenancyMismatchError  # noqa: E402
from tools.list_bulbs import list_bulbs  # noqa: E402


class TestListBulbs:
    def test_happy_path(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-01")
        monkeypatch.setenv("LIGHT_MANAGER_URL", "http://light-manager:8000")
        fake_response = [
            {"slot": 1, "r": 0, "g": 0, "b": 0, "updated_at": "2026-05-08T12:00:00+00:00"},
            {"slot": 2, "r": 255, "g": 0, "b": 0, "updated_at": "2026-05-08T12:00:00+00:00"},
            {"slot": 3, "r": 0, "g": 255, "b": 0, "updated_at": "2026-05-08T12:00:00+00:00"},
        ]
        with patch("core.lightmanager_client.get_bulbs", return_value=fake_response) as m:
            out = list_bulbs(user="operator-01")
        m.assert_called_once_with("operator-01")
        assert len(out) == 3
        assert out[0].slot == 1 and out[0].r == 0
        assert out[1].slot == 2 and out[1].r == 255
        assert out[2].slot == 3 and out[2].g == 255

    def test_tenancy_mismatch_blocks_http_call(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("WORKSHOP_PARTICIPANT_LOGIN", "operator-01")
        with patch("core.lightmanager_client.get_bulbs") as m:
            with pytest.raises(TenancyMismatchError):
                list_bulbs(user="operator-02")
        # The guard fired before any HTTP attempt — the mock must not have been called.
        m.assert_not_called()

    def test_unset_env_fails_closed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("WORKSHOP_PARTICIPANT_LOGIN", raising=False)
        with patch("core.lightmanager_client.get_bulbs") as m:
            with pytest.raises(RuntimeError):
                list_bulbs(user="operator-01")
        m.assert_not_called()
