import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Bulb from "../components/Bulb";
import EndpointHelp from "../components/EndpointHelp";
import { fetchBulbs, type FetchBulbsResult } from "../api/client";
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
        <h1 className="text-xl sm:text-2xl font-semibold">
          <span className="text-slate-500">Light Manager — </span>
          <span className="font-mono text-sky-300">{login}</span>
        </h1>
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline">
          ← changer de login
        </Link>
      </header>

      {state.kind === "loading" && (
        <p className="text-center text-slate-500">Chargement…</p>
      )}

      {state.kind === "not-found" && (
        <div className="max-w-xl mx-auto text-center bg-rose-950/60 border border-rose-800 rounded-xl p-6 mt-6">
          <p className="text-rose-100 font-semibold text-lg">
            Login inconnu, demande au formateur.
          </p>
          <p className="text-rose-300/80 text-sm mt-2">
            Login utilisé : <code className="font-mono">{login}</code>
          </p>
          <Link
            to="/"
            className="inline-block mt-4 text-sm text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
          >
            Retour à l'accueil
          </Link>
        </div>
      )}

      {state.kind === "error" && (
        <p className="max-w-xl mx-auto text-center text-amber-300 mt-6">
          Erreur réseau : {state.message}
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
                  <div className="text-xs sm:text-sm text-slate-400">Slot {bulb.slot}</div>
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
