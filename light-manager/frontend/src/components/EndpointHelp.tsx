import { useState } from "react";

import Panel from "./Panel";

type Endpoint = {
  method: "GET" | "PUT";
  path: string;
  description: string;
  curl: string;
};

function buildEndpoints(login: string, origin: string): Endpoint[] {
  const u = encodeURIComponent(login);
  return [
    {
      method: "GET",
      path: `/api/bulbs?user=${login}`,
      description: "Read your 3 mission beacons and their current RGB state.",
      curl: `curl '${origin}/api/bulbs?user=${u}'`,
    },
    {
      method: "PUT",
      path: `/api/bulbs/1?user=${login}`,
      description: "Light beacon 1 in red.",
      curl: `curl -X PUT -H 'Content-Type: application/json' \\\n  -d '{"r":255,"g":0,"b":0}' \\\n  '${origin}/api/bulbs/1?user=${u}'`,
    },
    {
      method: "PUT",
      path: `/api/bulbs/2?user=${login}`,
      description: "Light beacon 2 in green.",
      curl: `curl -X PUT -H 'Content-Type: application/json' \\\n  -d '{"r":0,"g":255,"b":0}' \\\n  '${origin}/api/bulbs/2?user=${u}'`,
    },
    {
      method: "PUT",
      path: `/api/bulbs/3?user=${login}`,
      description: "Light beacon 3 in blue.",
      curl: `curl -X PUT -H 'Content-Type: application/json' \\\n  -d '{"r":0,"g":0,"b":255}' \\\n  '${origin}/api/bulbs/3?user=${u}'`,
    },
  ];
}

export default function EndpointHelp({ login }: { login: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const endpoints = buildEndpoints(login, origin);

  return (
    <Panel title="Pilot endpoints" icon={<TerminalIcon />}>
      <div className="p-5 sm:p-6 space-y-3">
        <p className="text-xs text-[var(--color-ink-dim)]">
          Use these commands to pilot your three mission beacons from your MCP server. Click "Copy" and paste in your terminal.
        </p>
        <ul className="space-y-3">
          {endpoints.map((ep) => (
            <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} />
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function EndpointRow({ ep }: { ep: Endpoint }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ep.curl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API blocked: silently ignore */
    }
  }

  const methodColor =
    ep.method === "GET"
      ? "text-[var(--color-ok)] border-[var(--color-ok-deep)]"
      : "text-[var(--color-amber)] border-[var(--color-amber-deep)]";

  return (
    <li className="border border-[var(--color-edge)] bg-[var(--color-void)] overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-[var(--color-edge)] bg-[var(--color-panel-2)]">
        <span
          className={`px-2 py-0.5 font-display text-[10px] tracking-[0.22em] border ${methodColor}`}
        >
          {ep.method}
        </span>
        <code className="font-mono text-xs text-[var(--color-ink)] break-all">
          {ep.path}
        </code>
        <span className="text-[10px] text-[var(--color-ink-dim)] sm:ml-auto">
          {ep.description}
        </span>
      </header>
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-xs text-[var(--color-ink)] font-mono">
          <code>{ep.curl}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy curl command"
          className="absolute top-2 right-2 px-2.5 py-1 font-display text-[10px] tracking-[0.2em] uppercase border border-[var(--color-edge)] bg-[var(--color-panel-2)] text-[var(--color-ink-dim)] hover:text-[var(--color-accent-bright)] hover:border-[var(--color-accent)] transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </li>
  );
}

function TerminalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" />
      <path d="M6 10l3 2-3 2M11 14h6" />
    </svg>
  );
}
