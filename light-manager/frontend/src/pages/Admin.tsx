import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { createUser, deleteUser, fetchUsers } from "../api/client";

type Feedback = { kind: "success" | "error" | "info"; message: string };

export default function Admin() {
  const [logins, setLogins] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newLogin, setNewLogin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function flash(message: string, kind: Feedback["kind"] = "info") {
    setFeedback({ kind, message });
    window.setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current));
    }, 3000);
  }

  async function refresh() {
    const result = await fetchUsers();
    if (result.kind === "ok") {
      setLogins(result.logins);
      setLoadError(null);
    } else if (result.kind === "error") {
      setLoadError(result.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const login = newLogin.trim().toLowerCase();
    if (!login) {
      flash("Le login ne peut pas être vide.", "error");
      return;
    }
    if (logins?.includes(login)) {
      flash(`Le login « ${login} » existe déjà.`, "error");
      return;
    }
    setSubmitting(true);
    const result = await createUser(login);
    setSubmitting(false);

    if (result.kind === "ok") {
      flash(`« ${login} » créé avec 3 ampoules par défaut.`, "success");
      setNewLogin("");
      await refresh();
    } else if (result.kind === "duplicate") {
      flash(`Le login « ${login} » existe déjà côté serveur.`, "error");
      await refresh();
    } else if (result.kind === "invalid") {
      flash(result.message, "error");
    } else {
      flash(`Erreur : ${result.message}`, "error");
    }
  }

  async function handleDelete(login: string) {
    if (!window.confirm(`Supprimer définitivement « ${login} » et ses 3 ampoules ?`)) {
      return;
    }
    setDeleting(login);
    const result = await deleteUser(login);
    setDeleting(null);

    if (result.kind === "ok") {
      flash(`« ${login} » supprimé.`, "success");
      await refresh();
    } else if (result.kind === "not-found") {
      flash(`« ${login} » introuvable côté serveur (déjà supprimé ?)`, "error");
      await refresh();
    } else {
      flash(`Erreur : ${result.message}`, "error");
    }
  }

  const feedbackStyle =
    feedback?.kind === "success"
      ? "bg-emerald-950/70 border-emerald-700 text-emerald-200"
      : feedback?.kind === "error"
        ? "bg-rose-950/70 border-rose-700 text-rose-200"
        : "bg-slate-800 border-slate-700 text-slate-200";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <header className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">
          <span className="text-slate-500">Light Manager — </span>
          <span>Admin</span>
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-200 underline-offset-2 hover:underline">
            ← accueil
          </Link>
          <Link to="/global" className="hover:text-slate-200 underline-offset-2 hover:underline">
            vue globale →
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-1">Ajouter un participant</h2>
          <p className="text-sm text-slate-400 mb-4">
            Crée un user et ses 3 ampoules à (0, 0, 0). Le login doit être unique.
          </p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              placeholder="participant-41"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newLogin.trim()}
              className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold transition-colors"
            >
              {submitting ? "Création…" : "Créer"}
            </button>
          </form>
        </section>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border px-4 py-3 text-sm ${feedbackStyle}`}
          >
            {feedback.message}
          </div>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/50">
          <header className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-slate-800">
            <h2 className="text-lg font-semibold">Participants</h2>
            <span className="text-xs text-slate-500">
              {logins ? `${logins.length} comptes` : "—"}
            </span>
          </header>

          {loadError && (
            <p className="px-5 sm:px-6 py-4 text-sm text-amber-300">
              Impossible de charger la liste : {loadError}
            </p>
          )}

          {logins === null && !loadError && (
            <p className="px-5 sm:px-6 py-4 text-sm text-slate-500">Chargement…</p>
          )}

          {logins && logins.length === 0 && (
            <p className="px-5 sm:px-6 py-4 text-sm text-slate-500">Aucun participant pour l'instant.</p>
          )}

          {logins && logins.length > 0 && (
            <ul className="divide-y divide-slate-800">
              {logins.map((login) => (
                <li
                  key={login}
                  className="flex items-center justify-between gap-3 px-5 sm:px-6 py-2.5"
                >
                  <a
                    href={`/u/${encodeURIComponent(login)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-slate-200 hover:text-sky-300 truncate"
                    title={`Ouvrir la vue de ${login} dans un nouvel onglet`}
                  >
                    {login}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(login)}
                    disabled={deleting === login}
                    className="px-3 py-1 rounded text-xs font-semibold bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 border border-rose-800 disabled:opacity-50 transition-colors"
                  >
                    {deleting === login ? "Suppression…" : "Supprimer"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
