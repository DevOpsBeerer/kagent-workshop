import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Bulb from "../components/Bulb";
import EndpointHelp from "../components/EndpointHelp";
import { fetchBulbs, resetBulbs, type FetchBulbsResult } from "../api/client";
import type { BulbDto } from "../types";
import logoUrl from "../images/LOGO.svg";

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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <header className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="flex items-center gap-3 text-xl sm:text-2xl font-semibold">
          <img src={logoUrl} alt="APOGASA · ARTEMIS" className="h-7 brightness-0 invert" />
          <span className="text-slate-500">— </span>
          <span className="font-mono text-sky-300">{login}</span>
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          {state.kind === "ok" && (
            <button
              type="button"
              onClick={handleResetMe}
              disabled={resetting}
              className="px-3 py-1 rounded text-xs font-semibold bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 border border-rose-800 disabled:opacity-50 transition-colors"
            >
              {resetting ? "Resetting…" : "Reset beacons"}
            </button>
          )}
          <Link to="/" className="hover:text-slate-200 underline-offset-2 hover:underline">
            ← change callsign
          </Link>
        </div>
      </header>

      {state.kind === "loading" && (
        <p className="text-center text-slate-500">Loading…</p>
      )}

      {state.kind === "not-found" && (
        <div className="max-w-xl mx-auto text-center bg-rose-950/60 border border-rose-800 rounded-xl p-6 mt-6">
          <p className="text-rose-100 font-semibold text-lg">
            Unknown callsign — contact Mission Control.
          </p>
          <p className="text-rose-300/80 text-sm mt-2">
            Callsign used: <code className="font-mono">{login}</code>
          </p>
          <Link
            to="/"
            className="inline-block mt-4 text-sm text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
          >
            Back to home
          </Link>
        </div>
      )}

      {state.kind === "error" && (
        <p className="max-w-xl mx-auto text-center text-amber-300 mt-6">
          Network error: {state.message}
        </p>
      )}

      {state.kind === "ok" && (
        <>
          <section className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {state.bulbs.map((bulb) => (
              <article
                key={bulb.slot}
                className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-800"
              >
                <Bulb slot={bulb.slot} r={bulb.r} g={bulb.g} b={bulb.b} size={140} />
                <div className="text-center space-y-1">
                  <div className="text-xs sm:text-sm text-slate-400">Beacon {bulb.slot}</div>
                  <code className="font-mono text-sm sm:text-base text-slate-100 tabular-nums">
                    RGB({bulb.r}, {bulb.g}, {bulb.b})
                  </code>
                </div>
              </article>
            ))}
          </section>

          <div className="max-w-4xl mx-auto">
            <EndpointHelp login={login} />
          </div>
        </>
      )}
    </main>
  );
}
