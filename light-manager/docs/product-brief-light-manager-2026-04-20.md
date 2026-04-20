# Product Brief : Light Manager

**Date :** 2026-04-20
**Auteur :** Clément Raussin
**Version :** 1.0
**Type de projet :** web-app
**Niveau de projet :** 1 (Small — 1 à 10 stories)

---

## Résumé exécutif

Light Manager est une application web de simulation d'ampoules RGB pilotées par API, conçue comme support pédagogique pour un workshop d'une journée sur la construction et l'usage de serveurs MCP (Model Context Protocol). Chaque participant dispose d'un compte (login) auquel sont attachées 3 ampoules virtuelles ; il pilote la couleur de ses ampoules via une API HTTP que son serveur MCP appelle pendant l'exercice. L'interface web sert uniquement à **visualiser** les ampoules (par participant et en vue globale formateur) et à **gérer** les comptes — elle ne modifie jamais les couleurs elle-même.

---

## Problem Statement

### Le problème

Former des développeurs / profils Ops à MCP nécessite un cas d'usage **concret, visuel et non trivial** : ils doivent voir leur code MCP produire un effet observable immédiat. Il manque aujourd'hui une API « jouet » prête à l'emploi, adaptée à un workshop, qui soit suffisamment réaliste pour apprendre et suffisamment simple pour ne pas distraire du sujet principal (MCP).

### Pourquoi maintenant ?

Un workshop Qiminfo est planifié autour du **2026-05-20** (≈ 4 semaines), destiné à ~40 participants développeurs confirmés et profils Ops/sysadmin, débutants sur MCP. Le workshop dépend d'un bac-à-sable fiable et visuel pour fonctionner.

### Impact si non résolu

Sans cette app : pas de support pédagogique reproductible, les participants devraient bricoler contre une API publique tierce (variable, peu adaptée, difficile à debugger côté formateur) — le workshop perdrait en lisibilité et en valeur. Deadline ferme : sans Light Manager, le workshop ne peut pas se tenir dans les conditions prévues.

---

## Cible utilisateurs

### Utilisateurs primaires

- **Participants (~40)** : développeurs confirmés ou profils Ops / administration système, débutants sur MCP. Utilisent l'interface pour vérifier que leur serveur MCP appelle correctement l'API et pour voir en direct l'effet de leurs requêtes sur **leurs** 3 ampoules.
- **Formateurs (2 devs Qiminfo, aussi concepteurs du projet)** : utilisent la vue globale pour suivre l'avancement collectif pendant la session et l'interface admin pour gérer les comptes participants.

### Utilisateurs secondaires

Aucun en V1. Potentiellement : autres formateurs Qiminfo qui réutiliseraient l'outil pour de futurs workshops MCP.

### Besoins utilisateurs

- **Participant — voir** ses ampoules en temps réel, avec la couleur rendue visuellement + le code RGB affiché.
- **Participant — comprendre** comment appeler l'API : endpoints, méthode, payload d'exemple, disponibles sans quitter la page.
- **Formateur — superviser** l'ensemble des participants (40 users × 3 ampoules = 120 ampoules) d'un coup d'œil pour détecter qui avance / qui est bloqué.
- **Formateur — administrer** : créer, lister et supprimer des comptes utilisateurs avant et pendant la session.

---

## Vue d'ensemble de la solution

### Solution proposée

Une application web (React + FastAPI) exposant :
- Une **API HTTP** simple (authentification par paramètre `user=login`, sans secret — tout est public et pédagogique) permettant de lister les 3 ampoules d'un utilisateur et de modifier la couleur RGB d'une ampoule.
- Une **interface web** en trois vues : vue participant (ses ampoules + endpoints auto-documentés), vue globale formateur (tous les participants), vue admin (CRUD des comptes).
- Rafraîchissement **temps réel par polling** (~1–2 s) pour voir l'effet des appels API sans action utilisateur.

Déploiement cible : **Kubernetes** (cohérent avec le repo parent `kagent-workshop`).

### Fonctionnalités clés (V1)

- **API** : `GET /bulbs?user=<login>` (liste des 3 ampoules de l'utilisateur) ; `PUT /bulbs/<id>?user=<login>` (modification couleur RGB).
- **Auth** : paramètre `user=` dans l'URL — pas de mot de passe, pas de token. Option A retenue pour simplicité pédagogique.
- **Vue participant** : accès par simple saisie de son login ; affichage visuel des 3 ampoules (rendu couleur + code RGB) **et encart « endpoints utiles »** avec URL, méthode, payload exemple copiables en un clic.
- **Vue globale formateur** : mosaïque des 40 participants × 3 ampoules, états mis à jour en temps réel.
- **Vue admin** : créer / lister / supprimer des comptes utilisateur.
- **Temps réel** via polling (~1–2 s).

### Proposition de valeur

Fournir le **cas d'usage le plus simple et visuel possible** pour apprendre MCP : un participant appelle l'API depuis son serveur MCP et voit **immédiatement** sa couleur apparaître à l'écran. Pas de données abstraites, pas de complexité métier, pas de friction d'auth — focus total sur MCP.

---

## Objectifs business

### Objectifs

- **G1** — Livrer Light Manager V1 déployée et stable sur Kubernetes **avant le 2026-05-20**.
- **G2** — Supporter **40 participants simultanés** pendant le workshop sans dégradation perceptible.
- **G3** — Permettre à un participant débutant MCP de **connecter son MCP et voir ses ampoules changer en moins de 15 minutes**, sans accompagnement individuel.

### Métriques de succès

- 100 % des 40 participants réussissent au moins un appel API modifiant une ampoule pendant la session.
- 0 incident bloquant côté plateforme Light Manager pendant le workshop.
- Temps médian « arrivée sur la vue participant → premier changement réussi » ≤ 15 min.

### Valeur business

Positionner Qiminfo comme acteur crédible pour former sur MCP / agents IA, et se doter d'un bac-à-sable **réutilisable** pour futurs workshops, démos internes et démos clients.

---

## Scope

### In Scope (V1)

- API : lister les 3 ampoules d'un utilisateur ; modifier la couleur RGB d'une ampoule (paramètre `user=`).
- Vue participant (par login) : rendu visuel des 3 ampoules + code RGB + encart endpoints auto-documentés.
- Vue globale formateur : tous les utilisateurs × 3 ampoules, mise à jour temps réel (polling).
- Vue admin (= formateur) : créer, lister, supprimer des utilisateurs.
- Rafraîchissement quasi temps réel via polling (~1–2 s).
- Déploiement Kubernetes accessible aux 40 participants le jour du workshop.

### Out of Scope (V1)

- Serveur MCP — construit par les participants eux-mêmes pendant le workshop.
- Pilotage de vraies ampoules physiques.
- Mot de passe, token, clé d'authentification (volontairement : tout est public).
- Changement de couleur depuis l'UI (seulement via l'API — c'est le point pédagogique).
- Historique des changements de couleur.
- Multi-sessions / isolation par workshop.

### Évolutions futures (V2+)

- Redirection d'un utilisateur vers de **vraies ampoules physiques** (hardware) — pour démos avancées.
- Mode multi-workshops (isolation des jeux d'utilisateurs).
- Auth optionnelle si l'outil sert ailleurs qu'en workshop contrôlé.

---

## Parties prenantes

- **Clément Raussin (Dev + Formateur, Qiminfo)** — Influence : **Haute**. Porteur du projet, dev, co-animateur du workshop.
- **Second dev / formateur (Qiminfo)** — Influence : **Haute**. Co-dev et co-animateur du workshop.
- **Participants (~40 devs / Ops)** — Influence : **Moyenne**. Utilisateurs finaux le jour J ; retours post-workshop orientent la V2.
- **Qiminfo (sponsor / management)** — Influence : **Moyenne-Haute**. Supporte l'initiative comme vitrine de formation MCP.

---

## Contraintes et hypothèses

### Contraintes

- **Deadline ferme** : ~2026-05-20 (workshop).
- **Équipe** : 2 devs, probablement à temps partiel sur les 4 semaines.
- **Pas de budget infra lourd** — un petit déploiement K8s suffit.
- **Stack imposée** : React (front) + FastAPI (back).
- **Hébergement** : Kubernetes.

### Hypothèses

- 40 participants simultanés → charge faible (~30 req/s en polling 1–2 s) ; un petit pod suffit.
- Les participants apportent leur laptop et disposent d'une connexion réseau fiable le jour J.
- Aucune donnée personnelle / sensible → pas d'enjeu RGPD.
- L'app n'a pas besoin d'être hautement disponible en dehors des journées de workshop.
- Les logins participants sont des identifiants fictifs (ex : `participant-01` … `participant-40`).

---

## Critères de succès

- Le jour J : chaque participant arrive sur sa vue en < 1 min en saisissant son login.
- Chaque participant réussit au moins une modification d'ampoule via son serveur MCP pendant la session.
- La vue globale formateur reste fluide (pas de lag perceptible) avec les 40 participants actifs.
- Aucun crash / reboot du service Light Manager pendant la session.
- Retour qualitatif des participants : « j'ai compris comment un MCP appelle une API ».
- L'application est réutilisable pour un second workshop sans refonte.

---

## Timeline et jalons

### Date cible

Workshop **~2026-05-20**.

### Jalons

- **S1 (2026-04-20 → 04-26)** — Tech-spec, setup projet, modèle user/bulb, API FastAPI en place.
- **S2 (2026-04-27 → 05-03)** — Front React : vue participant + vue globale, polling temps réel.
- **S3 (2026-05-04 → 05-10)** — Vue admin (CRUD users), packaging Kubernetes, premier déploiement.
- **S4 (2026-05-11 → 05-17)** — Tests bout-en-bout avec un MCP pilote, polish UI/UX, répétition du workshop.
- **Jour J ≈ 2026-05-20** — Workshop.

---

## Risques et mitigation

- **Risque : UX insuffisamment visuelle / simple — les participants se perdent.**
  - Likelihood : **Haute**
  - Mitigation : design très visuel (ampoules joliment rendues aux bonnes couleurs) + encart endpoints auto-documentés à côté des ampoules ; exemples de payload copiables en un clic ; une seule vue suffit pour comprendre ce qu'il faut appeler.

- **Risque : Deadline serrée (4 semaines, 2 devs à temps partiel).**
  - Likelihood : **Moyenne**
  - Mitigation : scope strict (section Out of Scope tenue), couper le polish UI avant les features, aucune feature « nice-to-have » avant le jour J.

- **Risque : Participants bloqués par un détail d'API pendant le workshop.**
  - Likelihood : **Haute**
  - Mitigation : documentation d'API claire + exemples `curl` prêts ; formateur en hot-standby pour débugger ; endpoints auto-documentés dans l'UI.

- **Risque : Charge K8s sous-dimensionnée (40 users × polling ~1,5 s ≈ 30 req/s).**
  - Likelihood : **Faible**
  - Mitigation : load-test avant le jour J ; fallback polling 3–5 s si besoin.

- **Risque : Conflits sur un même user (participants qui se trompent de login).**
  - Likelihood : **Moyenne**
  - Mitigation : logins explicites et numérotés (`participant-01` … `participant-40`) ; vue admin pour détecter et rétablir.

- **Risque : Indisponibilité de l'infra Qiminfo le jour J.**
  - Likelihood : **Faible**
  - Mitigation : déploiement en avance sur K8s + plan B (exécution locale du formateur, exposée via tunnel).

---

## Prochaines étapes

1. Rédiger la **tech-spec** — lancer `/tech-spec` (requis pour un projet de niveau 1).
2. Optionnel : créer une **PRD** plus détaillée — `/prd` (recommandé pour niveau 1 mais non bloquant).
3. Optionnel : design UX dédié — `/create-ux-design` (l'UX étant critique ici, à considérer).

---

**Document créé avec BMAD Method v6 — Phase 1 (Analyse).**

*Pour continuer : lancer `/workflow-status` pour voir la progression et le prochain workflow recommandé.*
