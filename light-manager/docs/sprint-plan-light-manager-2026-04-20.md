# Sprint Plan : Light Manager

**Date :** 2026-04-20
**Scrum Master :** Clément Raussin
**Niveau de projet :** 1
**Total stories :** 8
**Total points :** 30
**Sprints planifiés :** 2 × 2 semaines
**Workshop cible :** 2026-05-20

---

## Résumé exécutif

Light Manager se construit en **2 sprints de 2 semaines** avec 2 devs Qiminfo à 50 % chacun (~1 FTE effectif, ~20 points / sprint). Sprint 1 livre l'expérience cœur (API + vue participant pilotable). Sprint 2 livre la supervision (vue globale + admin) et le déploiement Kubernetes, avec une semaine tampon avant le workshop pour répétition et polish.

**Indicateurs clés :**
- Stories : 8 (toutes niveau 1, 3–5 points chacune)
- Points engagés : 16 Sprint 1 + 14 Sprint 2 = 30 points (75 % de la capacité de 40)
- Capacité : 20 points / sprint (2 devs × 50 % × 10 j × 6 h ÷ ~3 h/pt)
- Buffer : ~25 % par sprint + 3 jours entre fin Sprint 2 et workshop

---

## Capacité équipe

| Paramètre | Valeur |
|---|---|
| Taille équipe | 2 devs |
| Disponibilité | ~50 % chacun |
| FTE effectif | ~1 |
| Durée sprint | 2 semaines (10 jours ouvrés) |
| Heures productives / jour | 6 |
| Heures / sprint | 2 × 10 × 0,5 × 6 = **60 h** |
| Ratio pts / heure | ~3 h / point (équipe mid-senior) |
| **Vélocité cible** | **~20 points / sprint** |

---

## Inventaire des stories

### STORY-001 — Squelette projet
**Priorité :** Must Have · **Points : 5**

**User story :**
En tant que dev, je veux un squelette de projet prêt à l'emploi (React+Vite+TS+Tailwind, FastAPI, Dockerfile multi-stage), afin de pouvoir démarrer les features sans frottement d'outillage.

**Critères d'acceptation :**
- [ ] `pnpm dev` lance le front local sur `http://localhost:5173`.
- [ ] `uvicorn app.main:app --reload` lance le back sur `http://localhost:8000`.
- [ ] `GET /health` renvoie `{"status":"ok"}`.
- [ ] `docker build` produit une image qui sert front + back.
- [ ] `README.md` documente les commandes `dev`, `build`, `docker`.

**Notes techniques :** Vite proxy `/api` → FastAPI en dev ; en prod FastAPI sert les assets via `StaticFiles`.

**Dépendances :** aucune.

---

### STORY-002 — Data layer & seeding
**Priorité :** Must Have · **Points : 3**

**User story :**
En tant que formateur, je veux que les 40 comptes participants soient créés automatiquement au premier démarrage, afin de ne pas avoir à les créer un par un.

**Critères d'acceptation :**
- [ ] Modèles SQLModel `User` (`login` PK, `created_at`) et `Bulb` (`id`, `user_login` FK cascade, `slot` 1–3, `r`, `g`, `b`, `updated_at`).
- [ ] Tables créées automatiquement au boot si absentes.
- [ ] Si `users` vide : seeding `participant-01` … `participant-40`, chacun avec 3 ampoules à `(0,0,0)`.
- [ ] SQLite en mode WAL.
- [ ] Tests pytest : seeding n'est exécuté qu'une fois ; contrainte unique `(user_login, slot)`.

**Notes techniques :** SQLite file sur volume mount `/data/light-manager.db`. Pas d'Alembic (schéma stable V1).

**Dépendances :** STORY-001.

---

### STORY-003 — API bulbs
**Priorité :** Must Have · **Points : 3**

**User story :**
En tant que participant (via mon MCP), je veux pouvoir lister mes 3 ampoules et modifier leur couleur RGB, afin de voir l'effet à l'écran.

**Critères d'acceptation :**
- [ ] `GET /api/bulbs?user=<login>` retourne `[{slot, r, g, b, updated_at}, …]` (3 éléments).
- [ ] `PUT /api/bulbs/{slot}?user=<login>` avec body `{r,g,b}` met à jour l'ampoule.
- [ ] Validation Pydantic : `r,g,b ∈ [0,255]`, `slot ∈ {1,2,3}`.
- [ ] 404 si user inconnu ou slot hors plage ; 400 si payload invalide ; 200 + payload mis à jour sinon.
- [ ] Tests pytest cas nominaux et erreurs.

**Notes techniques :** OpenAPI auto (`/docs`) disponible pour les participants.

**Dépendances :** STORY-002.

---

### STORY-004 — API users & state
**Priorité :** Must Have · **Points : 3**

**User story :**
En tant que formateur, je veux pouvoir gérer les comptes par API et récupérer un snapshot global en un appel, afin d'alimenter la vue globale et l'admin.

**Critères d'acceptation :**
- [ ] `GET /api/users` liste les logins.
- [ ] `POST /api/users` crée un user + ses 3 ampoules par défaut ; 409 si login déjà existant.
- [ ] `DELETE /api/users/{login}` cascade delete ; 404 si inconnu.
- [ ] `GET /api/state` retourne `[{login, bulbs: [...]}, …]` en un seul appel.
- [ ] Tests pytest cas nominaux et erreurs.

**Notes techniques :** `/api/state` optimisé en un `SELECT JOIN` ou eager-load pour rester < 100 ms avec 40 users.

**Dépendances :** STORY-002.

---

### STORY-005 — Vue participant
**Priorité :** Must Have · **Points : 5**

**User story :**
En tant que participant, je veux saisir mon login et voir mes 3 ampoules joliment rendues ainsi que les endpoints à appeler, afin de comprendre comment piloter depuis mon MCP sans documentation externe.

**Critères d'acceptation :**
- [ ] Page d'accueil `/` : saisie `login` → redirection `/u/<login>`.
- [ ] `/u/:login` : 3 ampoules visuelles (SVG avec glow couleur) + code RGB affiché sous chacune.
- [ ] Encart « Endpoints utiles » : pour chaque endpoint, méthode, URL absolue, payload d'exemple en `curl`, bouton « copier » qui met en presse-papier.
- [ ] Polling `GET /api/bulbs?user=<login>` toutes les 1,5 s.
- [ ] Si `login` inconnu : message clair « Login inconnu, demande au formateur ».
- [ ] Responsive mobile (le workshop a des laptops mais sait-on jamais).

**Notes techniques :** composant `Bulb.tsx` réutilisable (consommé aussi par la vue globale). Tailwind pour rendu rapide.

**Dépendances :** STORY-003.

---

### STORY-006 — Vue globale formateur
**Priorité :** Must Have · **Points : 3**

**User story :**
En tant que formateur, je veux voir d'un coup d'œil l'état des 40 participants × 3 ampoules, afin de détecter qui est bloqué pendant la session.

**Critères d'acceptation :**
- [ ] Route `/global` : grille 40 × 3 ampoules, compacte, lisible sur un écran 1920×1080.
- [ ] Chaque cellule affiche le login + ses 3 ampoules mini-format.
- [ ] Polling `GET /api/state` toutes les 1,5 s.
- [ ] Clic sur un login ouvre sa vue participant dans un nouvel onglet.
- [ ] Indicateur « dernière modif < 5 s » ou similaire pour signaler l'activité.

**Notes techniques :** réutiliser `Bulb.tsx` en mode compact.

**Dépendances :** STORY-004, STORY-005.

---

### STORY-007 — Vue admin
**Priorité :** Must Have · **Points : 3**

**User story :**
En tant que formateur/admin, je veux créer et supprimer des comptes participants depuis l'UI, afin d'ajuster à la volée pendant le workshop.

**Critères d'acceptation :**
- [ ] Route `/admin` : liste des logins avec bouton « Supprimer » (+ confirmation).
- [ ] Formulaire d'ajout avec validation (login non vide, unique).
- [ ] Liens vers `/u/<login>` et `/global`.
- [ ] Feedback visuel succès/échec.

**Dépendances :** STORY-004.

---

### STORY-008 — Packaging & déploiement Kubernetes
**Priorité :** Must Have · **Points : 5**

**User story :**
En tant qu'équipe, nous voulons un déploiement Kubernetes reproductible de l'app, afin de la rendre accessible aux 40 participants le jour du workshop.

**Critères d'acceptation :**
- [ ] Image Docker construite, taguée, poussée sur un registry accessible au cluster.
- [ ] Manifests `k8s/` : `Deployment` (1 réplique), `Service` (ClusterIP), `Ingress` (TLS), `PersistentVolumeClaim` (SQLite).
- [ ] `kubectl apply -f k8s/` sur un cluster vierge déploie l'app et elle devient accessible via l'URL.
- [ ] `readinessProbe` et `livenessProbe` sur `/health`.
- [ ] Après `kubectl delete pod`, les données des users et ampoules sont préservées.
- [ ] Documentation `README-deploy.md` : commandes exactes pour re-déployer.

**Notes techniques :** fallback `emptyDir` documenté si PVC indispo.

**Dépendances :** STORY-001 (image Docker).

---

## Allocation par sprint

### Sprint 1 — Fondation & expérience cœur
**Dates :** 2026-04-20 → 2026-05-03 (2 semaines)
**Engagement :** 16 / 20 points (80 %)

**Objectif du sprint :**
> *Un participant peut ouvrir sa vue, voir ses 3 ampoules, et observer en temps réel les changements de couleur déclenchés via l'API.*

| ID | Titre | Points | Priorité |
|---|---|---|---|
| STORY-001 | Squelette projet | 5 | Must |
| STORY-002 | Data layer & seeding | 3 | Must |
| STORY-003 | API bulbs | 3 | Must |
| STORY-005 | Vue participant | 5 | Must |

**Démo fin de sprint :** appel `curl` sur `PUT /api/bulbs/1?user=participant-01 -d '{"r":255,"g":0,"b":0}'` → ampoule rouge apparaît à l'écran en < 2 s.

**Risques sprint :**
- STORY-005 est visuelle et pédagogique → ne pas sous-estimer le temps d'UX.

**Dépendances :** aucune externe.

---

### Sprint 2 — Supervision, admin & déploiement
**Dates :** 2026-05-04 → 2026-05-17 (2 semaines)
**Engagement :** 14 / 20 points (70 %, ~6 pts de buffer pour polish + répétition)

**Objectif du sprint :**
> *L'application est déployée sur Kubernetes avec vue globale formateur et admin CRUD, répétée avec un MCP pilote, prête pour le workshop du 2026-05-20.*

| ID | Titre | Points | Priorité |
|---|---|---|---|
| STORY-004 | API users & state | 3 | Must |
| STORY-006 | Vue globale formateur | 3 | Must |
| STORY-007 | Vue admin | 3 | Must |
| STORY-008 | Packaging & déploiement K8s | 5 | Must |

**Démo fin de sprint :** répétition complète avec un MCP pilote ; 40 comptes créés, vue globale alimentée, app déployée sur K8s.

**Activités buffer (6 pts) :**
- Polish UX vue participant (anim glow, micro-interactions « copier »).
- Load-test 40 clients simultanés.
- Fix de bugs remontés en répétition.
- Documentation workshop (mini-guide pour les participants).

**Risques sprint :**
- STORY-008 dépend de l'accès à un cluster + registry — à débloquer dès le début de Sprint 2.

---

## Traçabilité requirements → stories

| Req. | Intitulé | Story | Sprint |
|---|---|---|---|
| R1 | API Bulbs (GET + PUT) | STORY-003 | 1 |
| R2 | API Admin Users | STORY-004 | 2 |
| R3 | API Globale (`/api/state`) | STORY-004 | 2 |
| R4 | Vue Participant | STORY-005 | 1 |
| R5 | Vue Globale | STORY-006 | 2 |
| R6 | Vue Admin | STORY-007 | 2 |
| R7 | Seeding auto | STORY-002 | 1 |
| R8 | Packaging K8s | STORY-008 | 2 |

Tous les requirements R1–R8 de la tech-spec sont couverts par au moins une story.

---

## Risques globaux & mitigation

**Haute :**
- **UX vue participant insuffisamment pédagogique** → itérer dès fin Sprint 1 ; tester avec un collègue externe au projet.

**Moyenne :**
- **Glissement Sprint 1 sur STORY-005** (feature la plus coûteuse) → couper le polish avant les features ; réduire le scope visuel à l'essentiel (cercle + glow) avant ornements.
- **Accès cluster K8s/registry manquant au début Sprint 2** → débloquer dès la fin Sprint 1 ; plan B `docker run` + tunnel.

**Faible :**
- **Écritures concurrentes SQLite** → mode WAL ; migration Postgres triviale si besoin.
- **Indispo infra Qiminfo le jour J** → déploiement validé dès mi-Sprint 2 ; plan B laptop + tunnel.

---

## Dépendances externes

- Cluster Kubernetes accessible (Qiminfo ou cloud) — confirmer avant début Sprint 2.
- Registry d'images Docker — confirmer avant début Sprint 2.
- Domaine / DNS / cert TLS — confirmer avant début Sprint 2.
- Un MCP pilote pour la répétition — à produire côté formateur (hors backlog Light Manager).

---

## Definition of Done (par story)

Une story est considérée « Done » quand :
- [ ] Code implémenté et mergé sur `main`.
- [ ] Tests pytest passants (couverture raisonnable, pas de dogme 80 % sur un projet jouet).
- [ ] Critères d'acceptation de la story tous cochés.
- [ ] Lancement local en `docker compose` ou `pnpm dev` + `uvicorn` reste fonctionnel.
- [ ] Pour les stories 6–8 : validation sur l'env de déploiement.

---

## Prochaines étapes

**Immédiat :** démarrer Sprint 1 par STORY-001.

- `/create-story STORY-001` → document de story détaillé (optionnel sur Level 1).
- `/dev-story STORY-001` → implémentation directe.
- `/workflow-status` → suivi global.

**Cadence :**
- Sprint planning : déjà fait (ce document).
- Sprint review : en fin de chaque sprint.
- Sprint retro : rapide à la fin de Sprint 1 pour ajuster la vélocité réelle avant Sprint 2.

---

**Document créé avec BMAD Method v6 — Phase 4 (Implementation Planning).**
