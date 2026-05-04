import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import Panel from "../components/Panel";
import logoUrl from "../images/LOGO.svg";

export default function Home() {
  const [login, setLogin] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = login.trim().toLowerCase();
    if (!trimmed) return;
    navigate(`/u/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="min-h-screen bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-3">
          <img
            src={logoUrl}
            alt="APOGASA · ARTEMIS"
            className="mx-auto w-72 max-w-full brightness-0 invert opacity-90"
          />
          <p className="font-display text-[10px] tracking-[0.5em] text-[var(--color-ink-dim)]">
            BEACON CONSOLE
          </p>
        </div>

        <Panel title="Authentication" icon={<UserIcon />}>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <p className="text-xs text-[var(--color-ink-dim)] leading-relaxed">
              Enter your operator callsign to access your three mission beacons
              and pilot commands.
            </p>

            <label className="block space-y-2">
              <span className="font-display text-[10px] tracking-[0.28em] uppercase text-[var(--color-ink-dim)]">
                Operator callsign
              </span>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="operator-01"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="input-fld"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={!login.trim()}
              className="btn-primary w-full"
            >
              Access beacons →
            </button>

            <p className="text-[10px] text-center text-[var(--color-ink-faint)]">
              No callsign? Contact Mission Control.
            </p>
          </form>
        </Panel>

        <div className="mt-6 flex justify-center gap-4 font-display text-[10px] tracking-[0.22em] uppercase">
          <Link
            to="/global"
            className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent-bright)]"
          >
            Mission control
          </Link>
          <span className="text-[var(--color-ink-faint)]">·</span>
          <Link
            to="/admin"
            className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent-bright)]"
          >
            Admin
          </Link>
        </div>

        <p className="mt-8 text-[9px] text-center text-[var(--color-ink-faint)] tracking-[0.18em]">
          ARTEMIS PROGRAM OF GENEVA AERONAUTICS AND SPACE ADMINISTRATION
        </p>
      </div>
    </main>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
