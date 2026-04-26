import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

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
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Light Manager</h1>
          <p className="text-slate-400 text-sm">
            Saisis ton login pour voir tes 3 ampoules et les commandes de pilotage.
          </p>
        </header>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Login participant</span>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="participant-01"
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
          Voir mes ampoules
        </button>

        <p className="text-xs text-slate-500 text-center">
          Si tu n'as pas de login, demande au formateur.
        </p>
      </form>
    </main>
  );
}
