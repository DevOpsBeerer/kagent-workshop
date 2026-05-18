"""Tests for the per-participant tenancy guard (NFR-012).

Guard contract:
- WORKSHOP_PARTICIPANT_LOGIN unset/empty → RuntimeError (fail-closed).
- WORKSHOP_PARTICIPANT_LOGIN set       → pinned_login() returns its value.

The MCP sources the login directly from this env var; agents do not pass a
`user=` argument anymore (NFR-012 enforced by topology, not by call-time
checks).
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.tenancy import WORKSHOP_PARTICIPANT_LOGIN_ENV, pinned_login  # noqa: E402


class TestPinnedLogin:
    def test_returns_env_value(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "operator-01")
        assert pinned_login() == "operator-01"

    def test_strips_whitespace(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "  operator-01  ")
        assert pinned_login() == "operator-01"

    def test_unset_env_fails_closed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, raising=False)
        with pytest.raises(RuntimeError, match="WORKSHOP_PARTICIPANT_LOGIN"):
            pinned_login()

    def test_empty_env_fails_closed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Whitespace-only also counts as unset (stripped before checking).
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "   ")
        with pytest.raises(RuntimeError, match="WORKSHOP_PARTICIPANT_LOGIN"):
            pinned_login()
