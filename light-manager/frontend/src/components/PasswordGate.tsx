import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import logoUrl from "../images/LOGO.svg";

const ADMIN_PASSWORD = "qiminfocexp";
const UNLOCK_KEY = "lm_admin_unlocked";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(UNLOCK_KEY) === "1",
  );

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <Lock
      onUnlock={() => {
        window.sessionStorage.setItem(UNLOCK_KEY, "1");
        setUnlocked(true);
      }}
    />
  );
}

function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onUnlock();
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <header className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="flex items-center gap-3 text-xl sm:text-2xl font-semibold">
          <img src={logoUrl} alt="APOGASA · ARTEMIS" className="h-7 brightness-0 invert" />
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-200 underline-offset-2 hover:underline">
            ← home
          </Link>
        </div>
      </header>

      <section className="max-w-md mx-auto rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 mt-12">
        <h2 className="text-lg font-semibold mb-1">Restricted access</h2>
        <p className="text-sm text-slate-400 mb-4">
          Enter the operations password to continue.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••••••"
            autoComplete="off"
            autoFocus
            className="px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
          />
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!password}
            className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold transition-colors"
          >
            Unlock
          </button>
        </form>
      </section>
    </main>
  );
}
