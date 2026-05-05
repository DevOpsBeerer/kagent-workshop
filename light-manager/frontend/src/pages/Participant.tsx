import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Bulb from "../components/Bulb";
import EndpointHelp from "../components/EndpointHelp";
import Panel from "../components/Panel";
import TopBar from "../components/TopBar";
import { fetchBulbs, resetBulbs, type FetchBulbsResult } from "../api/client";
import type { BulbDto } from "../types";

const POLL_INTERVAL_MS = 1500;

type State =
  | { kind: "loading" }
  | { kind: "ok"; bulbs: BulbDto[] }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export default function Participant() {
  const { login = "" } = useParams<{ login: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [resetting, setResetting] = useState(false);

  async function handleResetMe() {
    if (!login) return;
    if (!window.confirm("Reset your 3 beacons to (0, 0, 0)?")) return;
    setResetting(true);
    const result = await resetBulbs(login);
    setResetting(false);
    if (result.kind === "error") {
      window.alert(`Failed to reset: ${result.message}`);
    }
  }

  useEffect(() => {
    if (!login) return;

    const controller = new AbortController();
    let stopped = false;
    let timeoutId: number | null = null;

    function applyResult(result: FetchBulbsResult) {
      if (stopped) return;
      if (result.kind === "ok") {
        setState({ kind: "ok", bulbs: result.bulbs });
      } else if (result.kind === "not-found") {
        setState({ kind: "not-found" });
      } else if (result.kind === "error") {
        setState((prev) =>
          prev.kind === "ok" ? prev : { kind: "error", message: result.message },
        );
      }
    }

    async function tick() {
      if (stopped) return;
      if (document.visibilityState === "hidden") {
        timeoutId = window.setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      const result = await fetchBulbs(login, controller.signal);
      applyResult(result);
      if (!stopped) {
        timeoutId = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    tick();

    return () => {
      stopped = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [login]);

  return (
    <main className="min-h-screen bg-grid">
      <TopBar
        subtitle="Operator console"
        right={
          <div className="flex items-center gap-4">
            {state.kind === "ok" && (
              <button
                type="button"
                onClick={handleResetMe}
                disabled={resetting}
                className="btn-danger"
              >
                {resetting ? "Resetting…" : "Reset beacons"}
              </button>
            )}
            <Link
              to="/"
              className="font-display text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-dim)] hover:text-[var(--color-accent-bright)]"
            >
              ← Switch callsign
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        <Panel title="Operator identifier" icon={<TagIcon />}>
          <div className="px-6 py-5 flex items-center gap-4">
            <span className="font-display text-[10px] tracking-[0.28em] text-[var(--color-ink-dim)] uppercase">
              Callsign
            </span>
            <code className="font-mono text-xl sm:text-2xl text-[var(--color-accent-bright)] tracking-[0.18em]">
              {login}
            </code>
            <span className="ml-auto inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink-dim)] font-display">
              <span
                className={`size-2 ${
                  state.kind === "ok"
                    ? "bg-[var(--color-ok)] animate-pulse"
                    : state.kind === "not-found"
                      ? "bg-[var(--color-danger)]"
                      : "bg-[var(--color-ink-faint)]"
                }`}
                aria-hidden="true"
              />
              {state.kind === "ok"
                ? "Linked · 1.5s"
                : state.kind === "not-found"
                  ? "Unknown"
                  : "Sync"}
            </span>
          </div>
        </Panel>

        {state.kind === "loading" && (
          <p className="text-center text-[var(--color-ink-dim)] py-12 font-display tracking-[0.22em] text-xs uppercase">
            Establishing link…
          </p>
        )}

        {state.kind === "not-found" && (
          <Panel
            title="Link refused"
            icon={<AlertIcon />}
            className="border-[var(--color-danger-deep)]"
          >
            <div className="p-6 text-center space-y-3">
              <p className="text-[var(--color-danger)] font-display tracking-[0.18em] uppercase text-sm">
                Unknown callsign
              </p>
              <p className="text-xs text-[var(--color-ink-dim)]">
                Callsign used:{" "}
                <code className="font-mono text-[var(--color-ink)]">{login}</code>
              </p>
              <Link
                to="/"
                className="inline-block mt-2 font-display text-[11px] tracking-[0.2em] uppercase text-[var(--color-accent-bright)] hover:text-[var(--color-accent)]"
              >
                ← Back to authentication
              </Link>
            </div>
          </Panel>
        )}

        {state.kind === "error" && (
          <p className="text-center text-[var(--color-amber)] py-6 font-display text-xs tracking-[0.2em] uppercase">
            Network error: {state.message}
          </p>
        )}

        {state.kind === "ok" && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {state.bulbs.map((bulb) => (
                <BeaconPanel key={bulb.slot} bulb={bulb} />
              ))}
            </section>

            <EndpointHelp login={login} />
          </>
        )}
      </div>
    </main>
  );
}

function BeaconPanel({ bulb }: { bulb: BulbDto }) {
  const isOff = bulb.r === 0 && bulb.g === 0 && bulb.b === 0;
  const slotLabel = String(bulb.slot).padStart(2, "0");
  return (
    <Panel
      title={`Beacon ${slotLabel}`}
      icon={<BulbIcon />}
      right={
        <span
          className={`text-[9px] tracking-[0.22em] ${
            isOff ? "text-[var(--color-ink-faint)]" : "text-[var(--color-ok)]"
          }`}
        >
          {isOff ? "OFF" : "ON"}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4 p-6">
        <Bulb slot={bulb.slot} r={bulb.r} g={bulb.g} b={bulb.b} size={140} />
        <div className="w-full grid grid-cols-3 gap-2 text-center">
          <Channel label="R" value={bulb.r} color="text-[var(--color-danger)]" />
          <Channel label="G" value={bulb.g} color="text-[var(--color-ok)]" />
          <Channel label="B" value={bulb.b} color="text-[var(--color-accent-bright)]" />
        </div>
      </div>
    </Panel>
  );
}

function Channel({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="border border-[var(--color-edge)] bg-[var(--color-void)] py-2">
      <div className="font-display text-[9px] tracking-[0.3em] text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className={`font-mono text-base tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function TagIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 12l9-9h9v9l-9 9z" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5V16H8v-2.5A6 6 0 0 1 12 3z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.5" />
    </svg>
  );
}
