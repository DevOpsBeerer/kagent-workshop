import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
        <header className="text-center space-y-4">
          <img
            src={logoUrl}
            alt="APOGASA · ARTEMIS"
            className="mx-auto w-72 max-w-full brightness-0 invert"
          />
          <p className="text-slate-400 text-sm">
            Enter your operator callsign to view your 3 mission beacons
            and pilot commands.
          </p>
        </header>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Operator callsign</span>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="operator-01"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
          />
        </label>

        <button
          type="submit"
          disabled={!login.trim()}
          className="w-full px-4 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold transition-colors"
        >
          Access my beacons
        </button>

        <p className="text-xs text-slate-500 text-center">
          No callsign? Ask Mission Control.
        </p>

        <div className="pt-4 border-t border-slate-900 text-center text-xs text-slate-600 space-x-3">
          <span>Mission Control:</span>
          <Link to="/global" className="hover:text-slate-300 underline-offset-2 hover:underline">
            global view
          </Link>
          <span>·</span>
          <Link to="/admin" className="hover:text-slate-300 underline-offset-2 hover:underline">
            admin
          </Link>
        </div>

        <p className="pt-2 text-[10px] text-center text-slate-700 leading-relaxed">
          ARTEMIS Program Of Geneva Aeronautics and Space Administration
        </p>
      </form>
    </main>
  );
}
