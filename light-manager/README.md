# Light Manager

Application web de simulation d'ampoules RGB pilotées par API, support du workshop MCP du **2026-05-20**. 40 participants × 3 ampoules visualisées en temps réel ; chaque participant pilote ses ampoules depuis son propre serveur MCP via une API HTTP minimaliste.

Stack : **FastAPI** + SQLModel (SQLite) côté back, **React + Vite + TypeScript + Tailwind** côté front, packagé en image Docker multi-stage et déployé sur Kubernetes.

> Documents de référence : `docs/product-brief-light-manager-2026-04-20.md`, `docs/tech-spec-light-manager-2026-04-20.md`, `docs/sprint-plan-light-manager-2026-04-20.md`.

---

## Arborescence

```
light-manager/
├── backend/             FastAPI (app/) + tests pytest
│   ├── app/
│   │   ├── main.py      App FastAPI + lifespan (init_db + seed)
│   │   ├── db.py        Engine SQLite (mode WAL), init_db, get_session
│   │   ├── models.py    SQLModel User & Bulb (+ contrainte unique slot)
│   │   ├── seed.py      Seeding idempotent participant-01..40
│   │   └── spa.py       Mount StaticFiles + fallback SPA (prod uniquement)
│   ├── tests/           pytest (health, seed, modèles)
│   └── pyproject.toml
├── frontend/            React + Vite + Tailwind v4
│   ├── src/             main.tsx, App.tsx, index.css
│   └── package.json
├── Dockerfile           Multi-stage : Vite build → image Python servant front + back
└── docs/                BMAD planning artifacts
```

---

## Démarrage en local

### Backend

Python 3.12+ requis.

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

uvicorn app.main:app --reload --port 8000
```

Vérification : `curl http://localhost:8000/health` → `{"status":"ok"}`

OpenAPI auto-générée : <http://localhost:8000/docs>

### Frontend

Node 20+ et `pnpm` requis.

```bash
cd frontend
pnpm install
pnpm dev
```

Le front tourne sur <http://localhost:5173>. Vite proxie automatiquement `/api/*` et `/health` vers `http://localhost:8000`, donc le back doit aussi tourner pour que les appels HTTP fonctionnent.

### Tests

```bash
cd backend
.venv/bin/pytest
```

---

## Build de production

### Front (statique)

```bash
cd frontend
pnpm build      # produit frontend/dist/
```

### Image Docker (front + back en une seule image)

Depuis la racine `light-manager/` :

```bash
docker build -t light-manager:dev .
docker run --rm -p 8000:8000 -v light-manager-data:/data light-manager:dev
```

L'image écoute sur `:8000` et sert :

- `GET /api/*` — l'API JSON
- `GET /health` — la sonde liveness/readiness
- `GET /*` — la SPA React (build Vite servi via `StaticFiles`, fallback `index.html` pour le routing client-side)

Variables d'environnement clés :

| Variable | Défaut (image) | Usage |
|---|---|---|
| `LIGHT_MANAGER_STATIC_DIR` | `/app/static` | Active le mount du SPA si défini et pointe vers un répertoire existant. Désactivé en dev (variable absente). |
| `LIGHT_MANAGER_DB_PATH` | `/data/light-manager.db` | Chemin du fichier SQLite. En local, défaut `./light-manager.db`. |

---

## Modèle de données

| Entité | Champs | Notes |
|---|---|---|
| `users` | `login` (PK), `created_at` | login = identifiant humain (`participant-01` …). |
| `bulbs` | `id` (PK), `user_login` (FK→users, ON DELETE CASCADE), `slot` (1–3), `r/g/b` (0–255), `updated_at` | Contrainte unique `(user_login, slot)`. |

SQLite est passé en mode **WAL** au démarrage pour tolérer les écritures concurrentes des 40 MCP. Au premier boot, si `users` est vide, l'app crée `participant-01` … `participant-40` chacun avec 3 ampoules à `(0,0,0)`.

---

## Roadmap

Voir `docs/sprint-plan-light-manager-2026-04-20.md`. Sprint 1 livre l'expérience cœur (vue participant + API bulbs). Sprint 2 livre la supervision (vue globale + admin) et le déploiement Kubernetes.
