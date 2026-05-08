"""Per-participant tenancy guard (NFR-012).

The MCP is deployed per-vCluster, with WORKSHOP_PARTICIPANT_LOGIN injected at
deploy time by workshop-infrastructure (per architecture §C6). Every MCP tool
call's `user=` argument is checked against that env var before any HTTP call to
light-manager. A misprompted coordinator in vCluster A literally cannot mutate
participant B's bulbs because vCluster A's MCP doesn't know B's login.

Fail-closed posture: if WORKSHOP_PARTICIPANT_LOGIN is unset or empty, every call
fails with RuntimeError. NFR-012 is non-negotiable; an unset login means the MCP
cannot enforce anything, so it refuses to serve.
"""

import os

WORKSHOP_PARTICIPANT_LOGIN_ENV = "WORKSHOP_PARTICIPANT_LOGIN"


class TenancyMismatchError(PermissionError):
    """Raised when an MCP tool call's `user=` arg differs from the pinned login."""

    def __init__(self, user: str, expected: str) -> None:
        super().__init__(
            f"Tenancy mismatch: this MCP is pinned to '{expected}' but the call "
            f"requested user='{user}'. NFR-012 hard-prohibits cross-participant "
            f"writes; the call is rejected."
        )
        self.user = user
        self.expected = expected


def enforce_tenancy(user: str) -> None:
    """Reject any tool call where `user` differs from the pinned login.

    Raises:
        RuntimeError: if WORKSHOP_PARTICIPANT_LOGIN is unset / empty (fail-closed).
        TenancyMismatchError: if the call's `user` arg does not match the pinned login.
    """
    expected = os.environ.get(WORKSHOP_PARTICIPANT_LOGIN_ENV, "").strip()
    if not expected:
        raise RuntimeError(
            f"STORY-022 fail-closed: {WORKSHOP_PARTICIPANT_LOGIN_ENV} must be set "
            "at deploy time per NFR-012; check the Deployment's env: section."
        )
    if user != expected:
        raise TenancyMismatchError(user=user, expected=expected)
