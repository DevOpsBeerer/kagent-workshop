# Light Manager — APOGASA · ARTEMIS

Console des balises de mission du programme **ARTEMIS** (APOGASA — *ARTEMIS Program Of Geneva Aeronautics and Space Administration*). 40 opérateurs × 3 balises RGB pilotées par API. Support du workshop MCP du **2026-05-20**.

Stack : **FastAPI** + SQLite côté back, **React + Vite + Tailwind** côté front.

> Note : « light-manager » reste le nom technique (image, package, manifests Kubernetes). La marque APOGASA · ARTEMIS est purement narrative — c'est l'habillage workshop autour du même service.

---

## Lancer en local

Prérequis : **Python 3.12**, **Node 20+**, **pnpm**.

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

→ API sur <http://localhost:8000>, Swagger sur <http://localhost:8000/docs>.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

→ UI sur <http://localhost:5173> (proxy `/api` vers `:8000`).

### Tests

```bash
cd backend
.venv/bin/pytest
```

---

## Lancer en Docker

```bash
docker build -t light-manager .
docker run --rm -p 8000:8000 light-manager
```

→ API + UI sur <http://localhost:8000>.

---

## Routes UI

- `/` — saisie indicatif opérateur
- `/u/<login>` — vue opérateur (3 balises de mission + commandes curl)
- `/global` — vue contrôle mission (mosaïque 40 × 3)
- `/admin` — enrôlement / désaffectation d'opérateurs

## Endpoints API

```
GET    /health
GET    /api/users
POST   /api/users               { "login": "..." }
DELETE /api/users/{login}
GET    /api/bulbs?user=<login>
PUT    /api/bulbs/{slot}?user=<login>   { "r": 0-255, "g": 0-255, "b": 0-255 }
GET    /api/state
```

## Déploiement Kubernetes

Voir [`README-deploy.md`](README-deploy.md).
