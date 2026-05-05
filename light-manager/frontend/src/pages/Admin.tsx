import { useEffect, useState, type FormEvent } from "react";

import Panel from "../components/Panel";
import PasswordGate from "../components/PasswordGate";
import TopBar from "../components/TopBar";
import { createUser, deleteUser, fetchUsers } from "../api/client";

type Feedback = { kind: "success" | "error" | "info"; message: string };

export default function Admin() {
  return (
    <PasswordGate>
      <AdminPanel />
    </PasswordGate>
  );
}

function AdminPanel() {
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
      flash("Callsign cannot be empty.", "error");
      return;
    }
    if (logins?.includes(login)) {
      flash(`Callsign "${login}" already exists.`, "error");
      return;
    }
    setSubmitting(true);
    const result = await createUser(login);
    setSubmitting(false);

    if (result.kind === "ok") {
      flash(`"${login}" enrolled with 3 default mission beacons.`, "success");
      setNewLogin("");
      await refresh();
    } else if (result.kind === "duplicate") {
      flash(`Callsign "${login}" already exists on the server.`, "error");
      await refresh();
    } else if (result.kind === "invalid") {
      flash(result.message, "error");
    } else {
      flash(`Error: ${result.message}`, "error");
    }
  }

  async function handleDelete(login: string) {
    if (!window.confirm(`Permanently decommission "${login}" and their 3 beacons?`)) {
      return;
    }
    setDeleting(login);
    const result = await deleteUser(login);
    setDeleting(null);

    if (result.kind === "ok") {
      flash(`"${login}" decommissioned.`, "success");
      await refresh();
    } else if (result.kind === "not-found") {
      flash(`"${login}" not found on the server (already decommissioned?)`, "error");
      await refresh();
    } else {
      flash(`Error: ${result.message}`, "error");
    }
  }

  const feedbackColor =
    feedback?.kind === "success"
      ? "border-[var(--color-ok-deep)] text-[var(--color-ok)]"
      : feedback?.kind === "error"
        ? "border-[var(--color-danger-deep)] text-[var(--color-danger)]"
        : "border-[var(--color-edge)] text-[var(--color-ink)]";

  return (
    <main className="min-h-screen bg-grid">
      <TopBar subtitle="Operations center" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
        <Panel title="Enrol operator" icon={<PlusIcon />}>
          <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
            <p className="text-xs text-[var(--color-ink-dim)]">
              Creates an operator and their 3 mission beacons at (0, 0, 0). The
              callsign must be unique.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]" />
                <input
                  type="text"
                  value={newLogin}
                  onChange={(e) => setNewLogin(e.target.value)}
                  placeholder="operator-41"
                  autoComplete="off"
                  spellCheck={false}
                  className="input-fld"
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !newLogin.trim()}
                className="btn-primary sm:w-40"
              >
                {submitting ? "Enrolling…" : "Enrol"}
              </button>
            </div>
          </form>
        </Panel>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`border bg-[var(--color-panel)] px-4 py-3 text-xs font-mono ${feedbackColor}`}
          >
            {feedback.message}
          </div>
        )}

        <Panel
          title="ARTEMIS Operators"
          icon={<UsersIcon />}
          right={
            <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
              {logins ? `${logins.length} on duty` : "—"}
            </span>
          }
        >
          {loadError && (
            <p className="px-5 sm:px-6 py-4 text-xs text-[var(--color-amber)] font-mono">
              Failed to load list: {loadError}
            </p>
          )}

          {logins === null && !loadError && (
            <p className="px-5 sm:px-6 py-4 text-xs text-[var(--color-ink-dim)] font-display tracking-[0.22em] uppercase">
              Loading…
            </p>
          )}

          {logins && logins.length === 0 && (
            <p className="px-5 sm:px-6 py-4 text-xs text-[var(--color-ink-dim)] font-display tracking-[0.22em] uppercase">
              No operators on duty yet.
            </p>
          )}

          {logins && logins.length > 0 && (
            <ul className="divide-y divide-[var(--color-edge)]">
              {logins.map((login, idx) => (
                <li
                  key={login}
                  className="flex items-center justify-between gap-3 px-5 sm:px-6 py-2.5 hover:bg-[var(--color-panel-2)]/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-[var(--color-ink-faint)] tabular-nums w-6 shrink-0">
                      {String(idx + 1).padStart(3, "0")}
                    </span>
                    <a
                      href={`/u/${encodeURIComponent(login)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-[var(--color-ink)] hover:text-[var(--color-accent-bright)] truncate"
                      title={`Open ${login}'s view in a new tab`}
                    >
                      {login}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(login)}
                    disabled={deleting === login}
                    className="btn-danger"
                  >
                    {deleting === login ? "Decommissioning…" : "Decommission"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
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

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 18c0-2.5-2-4.5-5-4.5" />
    </svg>
  );
}
