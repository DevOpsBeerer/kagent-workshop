"""Per-participant tenancy guard (NFR-012).

The MCP is deployed per-vCluster, with WORKSHOP_PARTICIPANT_LOGIN injected at
deploy time by workshop-infrastructure (per architecture §C6). Every MCP tool
call's `user` value is **sourced from this env var directly** — agents do NOT
pass a `user=` argument, so a misprompted coordinator literally cannot target
a different participant. The tenancy guard collapses to: "what login is this
MCP pinned to?", and every tool call uses that.

Fail-closed posture: if WORKSHOP_PARTICIPANT_LOGIN is unset or empty, every
call fails with RuntimeError. NFR-012 is non-negotiable; an unset login means
the MCP cannot identify its tenant, so it refuses to serve.
"""

import os

WORKSHOP_PARTICIPANT_LOGIN_ENV = "WORKSHOP_PARTICIPANT_LOGIN"


def pinned_login() -> str:
    """Return the WORKSHOP_PARTICIPANT_LOGIN this MCP instance is pinned to.

    Raises:
        RuntimeError: if WORKSHOP_PARTICIPANT_LOGIN is unset / empty
            (fail-closed per NFR-012).
    """
    login = os.environ.get(WORKSHOP_PARTICIPANT_LOGIN_ENV, "").strip()
    if not login:
        raise RuntimeError(
            f"Fail-closed: {WORKSHOP_PARTICIPANT_LOGIN_ENV} must be set at "
            "deploy time per NFR-012; check the MCPServer's `--env` flags."
        )
    return login
