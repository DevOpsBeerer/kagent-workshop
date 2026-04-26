import { useState } from "react";

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
      description: "Lister tes 3 ampoules et leur état RGB courant.",
      curl: `curl '${origin}/api/bulbs?user=${u}'`,
    },
    {
      method: "PUT",
      path: `/api/bulbs/1?user=${login}`,
      description: "Allumer le slot 1 en rouge.",
      curl: `curl -X PUT -H 'Content-Type: application/json' \\\n  -d '{"r":255,"g":0,"b":0}' \\\n  '${origin}/api/bulbs/1?user=${u}'`,
    },
    {
      method: "PUT",
      path: `/api/bulbs/2?user=${login}`,
      description: "Allumer le slot 2 en vert.",
      curl: `curl -X PUT -H 'Content-Type: application/json' \\\n  -d '{"r":0,"g":255,"b":0}' \\\n  '${origin}/api/bulbs/2?user=${u}'`,
    },
    {
      method: "PUT",
      path: `/api/bulbs/3?user=${login}`,
      description: "Allumer le slot 3 en bleu.",
      curl: `curl -X PUT -H 'Content-Type: application/json' \\\n  -d '{"r":0,"g":0,"b":255}' \\\n  '${origin}/api/bulbs/3?user=${u}'`,
    },
  ];
}

export default function EndpointHelp({ login }: { login: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const endpoints = buildEndpoints(login, origin);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
      <h2 className="text-lg font-semibold mb-1">Endpoints utiles</h2>
      <p className="text-sm text-slate-400 mb-4">
        Ces commandes te permettent de piloter tes 3 ampoules depuis ton serveur MCP. Clique sur « Copier » et colle dans ton terminal.
      </p>
      <ul className="space-y-3">
        {endpoints.map((ep) => (
          <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} />
        ))}
      </ul>
    </section>
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
      ? "bg-emerald-900/60 text-emerald-300 border-emerald-800"
      : "bg-amber-900/60 text-amber-200 border-amber-800";

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-800">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${methodColor}`}>
          {ep.method}
        </span>
        <code className="font-mono text-sm text-slate-200 break-all">{ep.path}</code>
        <span className="text-xs text-slate-400 sm:ml-auto">{ep.description}</span>
      </header>
      <div className="relative bg-slate-950">
        <pre className="overflow-x-auto p-4 text-xs sm:text-sm text-slate-200">
          <code>{ep.curl}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copier la commande curl"
          className="absolute top-2 right-2 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>
    </li>
  );
}
