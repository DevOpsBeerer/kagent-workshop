# Tech Spec : Light Manager

**Date :** 2026-04-20
**Auteur :** Clément Raussin
**Version :** 1.0
**Type de projet :** web-app
**Niveau de projet :** 1
**Statut :** Draft

---

## Vue d'ensemble

Spécification technique ciblée pour Light Manager — application web de simulation d'ampoules RGB pilotées par API, pour un workshop MCP ~2026-05-20. Document léger (niveau 1), sans PRD distincte.

**Documents liés :**
- Product Brief : `docs/product-brief-light-manager-2026-04-20.md`

---

## Problème & solution

### Problème

Former ~40 devs / Ops débutants MCP nécessite un cas d'usage **concret, visuel, très simple**. Aucune API « jouet » prête à l'emploi ne remplit ce rôle. Sans ce support, le workshop du ~2026-05-20 ne peut pas se tenir dans de bonnes conditions.

### Solution

App web **React + FastAPI** exposant :
- Une API HTTP minimaliste (aucune auth — seul le paramètre `user=<login>` identifie le participant).
- Trois vues UI : participant (ses 3 ampoules + endpoints auto-documentés), globale (tous les participants × 3 ampoules en temps réel), admin (CRUD utilisateurs).
- Polling ~1–2 s pour le rafraîchissement temps réel.
- Déploiement **Kubernetes** en un seul pod (FastAPI sert aussi les assets du build React), avec SQLite sur volume persistant.

---

## Requirements

### Ce qui doit être construit

- **R1 — API Bulbs** : `GET /api/bulbs?user=<login>` (les 3 ampoules de l'utilisateur) et `PUT /api/bulbs/{slot}?user=<login>` avec body `{r,g,b}`. Erreur 404 si `user` inconnu ou `slot ∉ {1,2,3}`, 400 si RGB invalide.
- **R2 — API Admin Users** : `GET /api/users` (liste), `POST /api/users` (body `{login}`, crée l'utilisateur + ses 3 ampoules à `(0,0,0)`), `DELETE /api/users/{login}` (supprime user + ampoules en cascade).
- **R3 — API Globale** : `GET /api/state` renvoie `[{login, bulbs: [...]}, …]` pour alimenter la vue globale en un appel.
- **R4 — Vue Participant** : saisie login → redirection `/u/<login>`, affichage visuel des 3 ampoules (cercle coloré au RGB courant) + code RGB + **encart « endpoints utiles »** (`curl`-style, avec bouton « copier »).
- **R5 — Vue Globale** : mosaïque des 40 participants × 3 ampoules, polling toutes les 1–2 s, lecture seule.
- **R6 — Vue Admin** : création / suppression de logins, visible aussi lors du workshop pour reset rapide.
- **R7 — Seeding** : au premier démarrage, création automatique de `participant-01` … `participant-40` si la base est vide. L'UI admin peut ensuite ajouter/retirer à la volée.
- **R8 — Packaging K8s** : manifests `Deployment` + `Service` + `Ingress` + `PersistentVolumeClaim` (SQLite). Image Docker multi-stage (build React → bundle servi par FastAPI).

### Ce qui est explicitement hors scope

- Serveur MCP (construit par les participants).
- Pilotage de vraies ampoules physiques (V2).
- Toute forme d'authentification (mot de passe, token, clé API).
- Changement de couleur depuis l'UI (volontairement : seulement via l'API).
- Historique des changements, audit log, multi-workshops, i18n.

---

## Approche technique

### Stack

- **Back-end :** Python 3.12 + **FastAPI** + SQLModel (ORM léger au-dessus de SQLAlchemy + Pydantic) + Uvicorn.
- **Persistance :** **SQLite** dans un fichier sur `PersistentVolumeClaim` Kubernetes. Migrations non nécessaires en V1 (schéma stable, on crée les tables au boot si absentes).
- **Front-end :** **React 18** + Vite + TypeScript + Tailwind CSS (rendu visuel rapide des ampoules). Client HTTP : `fetch` natif ou `ky` (léger).
- **Packaging :** Dockerfile multi-stage. Stage 1 = build Vite. Stage 2 = image Python, FastAPI sert l'API sous `/api/*` et les assets du build via `StaticFiles` + fallback SPA vers `index.html`.
- **Déploiement :** Kubernetes. Manifests YAML directs (pas de Helm — projet trop petit). Ingress → Service (`ClusterIP`) → Deployment (1 réplique suffit).
- **Observabilité minimale :** logs structurés FastAPI, route `/health`.
- **Tests :** pytest côté API (tests d'intégration sur les endpoints clés). Front : tests manuels + répétition workshop.

### Architecture

```
  ┌──────────────┐         HTTPS        ┌───────────────────────┐
  │ Participants │ ───────────────────▶ │ Ingress (K8s)         │
  │ + Formateur  │                      └──────────┬────────────┘
  └──────────────┘                                 │
                                                   ▼
                                      ┌─────────────────────────┐
                                      │ Service (ClusterIP)     │
                                      └──────────┬──────────────┘
                                                 ▼
                                      ┌─────────────────────────┐
                                      │ Pod FastAPI (1 replica) │
                                      │  ├── /api/*  (API)      │
                                      │  └── /*     (React SPA) │
                                      └──────────┬──────────────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────────┐
                                      │ PVC → SQLite file       │
                                      └─────────────────────────┘
```

Flux type :
1. Participant ouvre l'URL → React SPA chargée.
2. Saisie login → navigation `/u/<login>` → polling `GET /api/bulbs?user=<login>` toutes les 1,5 s.
3. Le serveur MCP du participant appelle `PUT /api/bulbs/{slot}?user=<login>` avec `{r,g,b}`.
4. L'état en base change → polling suivant rafraîchit la vue.
5. Vue globale : polling `GET /api/state` (1 appel pour les 40 × 3 ampoules).

### Modèle de données

| Entité | Champs | Notes |
|---|---|---|
| `users` | `login` (PK, string), `created_at` (datetime) | login = identifiant humain (ex : `participant-01`). |
| `bulbs` | `id` (PK, int auto), `user_login` (FK→users.login, ON DELETE CASCADE), `slot` (int, 1–3), `r` (int 0–255), `g` (int 0–255), `b` (int 0–255), `updated_at` (datetime) | Contrainte unique `(user_login, slot)`. Valeurs par défaut `r=g=b=0` (ampoule éteinte). |

Seeding initial (si `users` est vide au démarrage) : `participant-01` … `participant-40`, chacun avec 3 ampoules à `(0,0,0)`.

### API

Toutes les routes sous `/api`. Réponses JSON. Pas d'auth.

| Méthode | Chemin | Description | Body / Query |
|---|---|---|---|
| `GET`  | `/api/users` | Liste des logins. | — |
| `POST` | `/api/users` | Crée un utilisateur + ses 3 ampoules. | `{ "login": "alice" }` |
| `DELETE` | `/api/users/{login}` | Supprime un utilisateur et ses ampoules. | — |
| `GET` | `/api/bulbs` | Les 3 ampoules d'un utilisateur. | `?user=<login>` |
| `PUT` | `/api/bulbs/{slot}` | Modifie la couleur d'une ampoule (`slot` ∈ {1,2,3}). | `?user=<login>`, body `{ "r": 0-255, "g": 0-255, "b": 0-255 }` |
| `GET` | `/api/state` | Snapshot de tous les utilisateurs + leurs ampoules (vue globale). | — |
| `GET` | `/health` | Liveness / readiness probe. | — |

Erreurs : 400 (payload/RGB invalide), 404 (user / slot inconnu), 409 (login déjà existant sur POST). Pas de rate-limiting en V1.

---

## Plan d'implémentation

### Stories (8)

1. **Squelette projet** — repo, `pyproject.toml` (FastAPI, SQLModel, uvicorn, pytest), app Vite+React+TS+Tailwind, `Dockerfile` multi-stage, route `/health`, lancement local OK.
2. **Data layer & seeding** — modèles `User` / `Bulb`, création auto des tables au boot, seeding `participant-01…40` si base vide.
3. **API bulbs** — `GET /api/bulbs?user=`, `PUT /api/bulbs/{slot}?user=` + validation RGB + tests pytest des cas nominaux et d'erreur.
4. **API users & state** — `GET/POST/DELETE /api/users`, `GET /api/state`, tests pytest.
5. **Vue participant** — route `/u/:login`, 3 ampoules visuelles (SVG/cercle avec glow), code RGB affiché, **encart endpoints auto-documentés** avec bouton « copier », polling 1,5 s.
6. **Vue globale** — route `/global`, mosaïque 40 × 3 ampoules, polling `GET /api/state`, layout compact et lisible.
7. **Vue admin** — route `/admin`, liste + formulaire création + suppression avec confirmation ; liens vers vue participant/vue globale.
8. **Packaging & déploiement K8s** — `Deployment`, `Service`, `Ingress`, `PVC` pour SQLite, image publiée, test de bout-en-bout sur le cluster cible.

### Phases / ordre

- **S1 (04-20 → 04-26)** : Stories 1–2 (squelette + data).
- **S2 (04-27 → 05-03)** : Stories 3–5 (API complètes + vue participant).
- **S3 (05-04 → 05-10)** : Stories 6–8 (vues globale/admin + K8s).
- **S4 (05-11 → 05-17)** : Polish UX, tests charge, répétition workshop avec un MCP pilote.
- **Jour J ≈ 2026-05-20**.

---

## Critères d'acceptation

- [ ] Un participant saisit son login → voit ses 3 ampoules en < 1 s.
- [ ] Un appel `PUT /api/bulbs/1?user=participant-01` avec `{r:255,g:0,b:0}` se reflète à l'écran en ≤ 2 s.
- [ ] La vue globale affiche les 40 × 3 ampoules et reste fluide pendant ≥ 15 min de polling.
- [ ] Le formateur crée un nouvel utilisateur via l'UI admin → il apparaît immédiatement dans la vue globale.
- [ ] Un `kubectl apply -f k8s/` sur un cluster vierge déploie l'app et la rend accessible via l'Ingress.
- [ ] Après restart du pod, les utilisateurs et l'état des ampoules sont préservés (SQLite sur PVC).
- [ ] L'encart « endpoints utiles » affiche une commande `curl` copiable pour chaque endpoint.
- [ ] Tous les tests pytest passent ; `/health` renvoie 200.

---

## Exigences non fonctionnelles

### Performance

- 40 clients en polling 1,5 s = ~30 req/s sur `GET /api/state` et `GET /api/bulbs`. FastAPI avec SQLite read-only traite cela sans effort (bien < 1 ms/requête).
- Fallback prévu : si dégradation observée, passer le polling global à 3–5 s.

### Sécurité

- App volontairement publique (workshop contrôlé). Aucune donnée personnelle. Pas d'auth.
- Mitigations pragmatiques : validation stricte des payloads Pydantic ; pas de XSS côté React (rendu React par défaut sûr) ; pas d'exécution de code utilisateur ; ingress derrière HTTPS.
- Rate-limiting hors scope V1 ; peut être ajouté via annotations Ingress si abus observé.

### Autres

- **Accessibilité** : contrastes texte/fond suffisants ; rendu des couleurs doublé par l'affichage du code RGB (utilisateurs daltoniens).
- **Navigateurs** : Chromium/Firefox récents uniquement (public workshop dev).
- **i18n** : UI en français, vocabulaire technique en anglais (cohérent avec la culture dev).

---

## Dépendances

- **Cluster Kubernetes** accessible aux 40 participants le jour J (interne Qiminfo ou cloud).
- **Registry d'images Docker** pour publier l'image de l'app.
- **Domaine / DNS / certificat TLS** pour l'Ingress (Let's Encrypt suffit).
- **Un MCP de référence** côté formateur pour les répétitions (pas produit par ce projet).

---

## Risques & mitigation

- **Risque : UX insuffisamment visuelle/simple.** — Likelihood : Haute. *Mitigation :* itérer tôt sur la vue participant (dès la story 5) ; tester auprès d'un utilisateur externe à S3 ; endpoints auto-documentés dans l'UI.
- **Risque : Deadline serrée (2 devs, temps partiel).** — Likelihood : Moyenne. *Mitigation :* scope verrouillé ; couper le polish avant les features ; aucune feature « nice-to-have » ajoutée en cours de route.
- **Risque : Conflit de write SQLite (40 PUT concurrents).** — Likelihood : Faible. *Mitigation :* SQLite en mode WAL ; écritures très courtes ; si problème, migration trivale vers Postgres (SQLModel compatible).
- **Risque : PVC non disponible sur le cluster cible.** — Likelihood : Faible. *Mitigation :* fallback `emptyDir` (perte à chaque redémarrage, acceptable le jour J) + seeding qui recrée les 40 participants.
- **Risque : Participant qui se trompe de login / écrase celui d'un autre.** — Likelihood : Moyenne. *Mitigation :* logins numérotés et attribués nominativement ; vue admin pour détecter et corriger rapidement.
- **Risque : Indispo infra Qiminfo le jour J.** — Likelihood : Faible. *Mitigation :* déploiement validé dès S3 ; plan B = `docker run` sur le laptop formateur + tunnel (`cloudflared` / `ngrok`).

---

## Timeline

**Cible :** ~2026-05-20 (jour du workshop).

**Jalons :**
- **2026-04-26** : Stories 1–2 terminées (app démarre localement, base seedée).
- **2026-05-03** : Stories 3–5 terminées (API complètes, vue participant utilisable).
- **2026-05-10** : Stories 6–8 terminées, première version déployée sur K8s.
- **2026-05-17** : Répétition complète avec un MCP pilote ; polish UX.
- **2026-05-20** : Workshop.

---

## Approbation

**Relu par :**
- [ ] Clément Raussin (auteur)
- [ ] Second dev / formateur Qiminfo
- [ ] (optionnel) relecteur technique Qiminfo

---

## Prochaines étapes

1. `/sprint-planning` — organiser les 8 stories en sprints / ordre d'exécution.
2. `/create-story` pour chaque story → `/dev-story` pour implémenter.

---

**Document créé avec BMAD Method v6 — Phase 2 (Planning).**

*Pour continuer : lancer `/workflow-status`.*
