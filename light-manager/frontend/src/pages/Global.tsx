import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Bulb from "../components/Bulb";
import { fetchState, type FetchStateResult } from "../api/client";
import type { UserStateDto } from "../types";
import logoUrl from "../images/LOGO.svg";

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
  const [state, setState] = useState<State>({ kind: "loading" });
  const [now, setNow] = useState<number>(() => Date.now());
  const lastActivityRef = useRef<Map<string, number>>(new Map());
  const previousSigRef = useRef<Map<string, string> | null>(null);

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-5">
      <header className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="flex items-center gap-3 text-lg sm:text-xl font-semibold">
          <img src={logoUrl} alt="APOGASA · ARTEMIS" className="h-6 brightness-0 invert" />
          <span className="text-slate-500">—</span>
          <span>Mission Control · Global view</span>
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {state.kind === "ok" && <span>{state.users.length} operators · telemetry 1.5s</span>}
          <Link to="/" className="hover:text-slate-200 underline-offset-2 hover:underline">
            ← home
          </Link>
          <Link to="/admin" className="hover:text-slate-200 underline-offset-2 hover:underline">
            admin →
          </Link>
        </div>
      </header>

      {state.kind === "loading" && (
        <p className="text-center text-slate-500 mt-10">Loading…</p>
      )}

      {state.kind === "error" && (
        <p className="max-w-xl mx-auto text-center text-amber-300 mt-6">
          Network error: {state.message}
        </p>
      )}

      {state.kind === "ok" && (
        <section
          className="mx-auto grid gap-2 max-w-[1800px]"
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
                className={`flex flex-col gap-1.5 p-2.5 rounded-lg border transition-colors ${
                  isActive
                    ? "border-emerald-500/70 bg-emerald-950/30"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                <header className="flex items-center justify-between gap-2">
                  <a
                    href={`/u/${encodeURIComponent(user.login)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-slate-300 hover:text-sky-300 truncate"
                    title={`Open ${user.login}'s view in a new tab`}
                  >
                    {user.login}
                  </a>
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full shrink-0 ${
                      isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-700"
                    }`}
                  />
                </header>
                <div className="flex items-center justify-around gap-1">
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
    </main>
  );
}
