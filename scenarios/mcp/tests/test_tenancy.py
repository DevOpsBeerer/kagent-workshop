"""Tests for the per-participant tenancy guard (NFR-012).

Guard contract:
- WORKSHOP_PARTICIPANT_LOGIN unset/empty → RuntimeError (fail-closed).
- user matches WORKSHOP_PARTICIPANT_LOGIN → returns None (allowed).
- user differs from WORKSHOP_PARTICIPANT_LOGIN → TenancyMismatchError.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.tenancy import (  # noqa: E402
    WORKSHOP_PARTICIPANT_LOGIN_ENV,
    TenancyMismatchError,
    enforce_tenancy,
)


class TestEnforceTenancy:
    def test_match_allowed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "operator-01")
        # No exception means the call is allowed through.
        enforce_tenancy("operator-01")

    def test_mismatch_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "operator-01")
        with pytest.raises(TenancyMismatchError) as exc_info:
            enforce_tenancy("operator-02")
        # Error names both the offending user and the pinned login (debuggability).
        assert exc_info.value.user == "operator-02"
        assert exc_info.value.expected == "operator-01"

    def test_unset_env_fails_closed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, raising=False)
        with pytest.raises(RuntimeError, match="WORKSHOP_PARTICIPANT_LOGIN"):
            enforce_tenancy("operator-01")

    def test_empty_env_fails_closed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Whitespace-only also counts as unset (the guard strips before checking).
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "   ")
        with pytest.raises(RuntimeError, match="WORKSHOP_PARTICIPANT_LOGIN"):
            enforce_tenancy("operator-01")

    def test_tenancy_mismatch_inherits_permission_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Custom subclass of PermissionError so callers can catch either type.
        monkeypatch.setenv(WORKSHOP_PARTICIPANT_LOGIN_ENV, "operator-01")
        with pytest.raises(PermissionError):
            enforce_tenancy("operator-02")
