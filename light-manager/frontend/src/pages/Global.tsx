import { useEffect, useRef, useState } from "react";

import Bulb from "../components/Bulb";
import PasswordGate from "../components/PasswordGate";
import TopBar from "../components/TopBar";
import { fetchState, resetBulbs, type FetchStateResult } from "../api/client";
import type { UserStateDto } from "../types";

const POLL_INTERVAL_MS = 1500;
const ACTIVITY_HIGHLIGHT_MS = 5000;

type State =
  | { kind: "loading" }
  | { kind: "ok"; users: UserStateDto[] }
  | { kind: "error"; message: string };

function bulbSignature(users: UserStateDto[]): Map<string, string> {
  const sig = new Map<string, string>();
  for (const u of users) {
    sig.set(u.login, u.bulbs.map((b) => `${b.slot}:${b.r},${b.g},${b.b}`).join("|"));
  }
  return sig;
}

export default function Global() {
  return (
    <PasswordGate>
      <GlobalPanel />
    </PasswordGate>
  );
}

function GlobalPanel() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [now, setNow] = useState<number>(() => Date.now());
  const [resetting, setResetting] = useState(false);
  const lastActivityRef = useRef<Map<string, number>>(new Map());
  const previousSigRef = useRef<Map<string, string> | null>(null);

  async function handleResetAll() {
    if (!window.confirm("Reset every operator's beacons to (0, 0, 0)?")) return;
    setResetting(true);
    const result = await resetBulbs();
    setResetting(false);
    if (result.kind === "error") {
      window.alert(`Failed to reset: ${result.message}`);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let timeoutId: number | null = null;

    function applyResult(result: FetchStateResult) {
      if (stopped || result.kind === "aborted") return;
      if (result.kind === "error") {
        setState((prev) =>
          prev.kind === "ok" ? prev : { kind: "error", message: result.message },
        );
        return;
      }
      const newSig = bulbSignature(result.users);
      const prevSig = previousSigRef.current;
      if (prevSig) {
        const ts = Date.now();
        for (const [login, currentSig] of newSig.entries()) {
          if (prevSig.get(login) !== currentSig) {
            lastActivityRef.current.set(login, ts);
          }
        }
      }
      previousSigRef.current = newSig;
      setState({ kind: "ok", users: result.users });
    }

    async function tick() {
      if (stopped) return;
      if (document.visibilityState === "hidden") {
        timeoutId = window.setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      const result = await fetchState(controller.signal);
      applyResult(result);
      if (!stopped) timeoutId = window.setTimeout(tick, POLL_INTERVAL_MS);
    }

    tick();

    const clockId = window.setInterval(() => setNow(Date.now()), 750);

    return () => {
      stopped = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.clearInterval(clockId);
      controller.abort();
    };
  }, []);

  const activeCount =
    state.kind === "ok"
      ? state.users.filter((u) => {
          const ts = lastActivityRef.current.get(u.login);
          return ts !== undefined && now - ts < ACTIVITY_HIGHLIGHT_MS;
        }).length
      : 0;

  return (
    <main className="min-h-screen bg-grid">
      <TopBar
        subtitle="Mission control"
        right={
          <div className="flex items-center gap-4">
            {state.kind === "ok" && (
              <div className="hidden sm:flex items-center gap-4 font-display text-[10px] tracking-[0.22em] uppercase">
                <Stat label="Operators" value={state.users.length} />
                <Stat label="Active" value={activeCount} accent="ok" />
                <Stat label="Telemetry" value="1.5s" accent="dim" />
              </div>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              disabled={resetting}
              className="btn-danger"
            >
              {resetting ? "Resetting…" : "Reset all"}
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1800px] px-3 sm:px-5 py-5">
        {state.kind === "loading" && (
          <p className="text-center text-[var(--color-ink-dim)] py-12 font-display text-xs tracking-[0.22em] uppercase">
            Establishing telemetry…
          </p>
        )}

        {state.kind === "error" && (
          <p className="text-center text-[var(--color-amber)] py-6 font-display text-xs tracking-[0.2em] uppercase">
            Network error: {state.message}
          </p>
        )}

        {state.kind === "ok" && (
          <section
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
          >
            {state.users.map((user) => {
              const lastActivity = lastActivityRef.current.get(user.login);
              const isActive =
                lastActivity !== undefined && now - lastActivity < ACTIVITY_HIGHLIGHT_MS;
              return (
                <article
                  key={user.login}
                  className={`panel transition-colors ${
                    isActive
                      ? "border-[var(--color-ok)] shadow-[0_0_0_1px_var(--color-ok),_0_0_24px_rgba(107,212,161,0.2)]"
                      : ""
                  }`}
                >
                  <header className="panel-header !py-1.5 !px-2.5 !gap-1.5">
                    <span
                      className="corner !w-1.5 !h-1.5"
                      style={{
                        background: isActive
                          ? "var(--color-ok)"
                          : "var(--color-accent)",
                      }}
                      aria-hidden="true"
                    />
                    <a
                      href={`/u/${encodeURIComponent(user.login)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] tracking-normal lowercase truncate text-[var(--color-ink)] hover:text-[var(--color-accent-bright)] flex-1 normal-case"
                      title={`Open ${user.login}'s view in a new tab`}
                    >
                      {user.login}
                    </a>
                    <span
                      aria-hidden="true"
                      className={`size-1.5 shrink-0 ${
                        isActive
                          ? "bg-[var(--color-ok)] animate-pulse"
                          : "bg-[var(--color-edge-strong)]"
                      }`}
                    />
                  </header>
                  <div className="flex items-center justify-around gap-1 p-2">
                    {user.bulbs.map((b) => (
                      <Bulb
                        key={b.slot}
                        slot={b.slot}
                        r={b.r}
                        g={b.g}
                        b={b.b}
                        size={42}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string | number;
  accent?: "default" | "ok" | "dim";
}) {
  const valueColor =
    accent === "ok"
      ? "text-[var(--color-ok)]"
      : accent === "dim"
        ? "text-[var(--color-ink-dim)]"
        : "text-[var(--color-accent-bright)]";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-ink-faint)]">{label}</span>
      <span className={`font-mono text-[12px] tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
