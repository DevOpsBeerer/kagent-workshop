# Product Brief: kagent-workshop-scenarios

**Date:** 2026-04-27
**Author:** clement.raussin
**Version:** 1.0
**Project Type:** api
**Project Level:** 2

---

## Executive Summary

`kagent-workshop-scenarios` est un ensemble de scénarios pédagogiques utilisés lors d'un workshop pour apprendre à des équipes ops à diagnostiquer et agir sur des problèmes Kubernetes courants à l'aide d'agents kagent — y compris en mode multi-agents. Chaque scénario fournit, dans un dossier dédié, une application volontairement cassée, une configuration d'agent kagent (CRDs Agent + Tools) capable d'aider au diagnostic, et un fichier JSON décrivant pas-à-pas le tutoriel que le participant suit sur son propre cluster Kubernetes.

Les participants en ressortent avec une compréhension concrète des types de problèmes K8s diagnosticables via des agents IA, du moment où l'agent apporte plus de valeur qu'une CLI, et de la manière de configurer un agent kagent (et un système multi-agents) pour un cas d'usage donné. Un fil rouge thématique **Artemis / spatial** humanise les scénarios.

---

## Problem Statement

### The Problem

Les équipes ops gèrent leurs clusters Kubernetes majoritairement via la CLI (`kubectl`). La plupart méconnaissent l'usage d'agents IA (et a fortiori de systèmes multi-agents) pour diagnostiquer et agir sur le cluster. Le workshop vise à montrer concrètement comment des agents kagent — capables d'orchestrer plusieurs tools, de corréler des sources et de discuter entre eux (a2a) — peuvent prendre en charge des diagnostics que la CLI rend laborieux.

### Why Now?

La technologie kagent (et plus largement les agents Kubernetes-aware) est récente et encore peu connue dans la communauté ops en 2026. Le workshop saisit cette fenêtre d'opportunité de formation avant que le sujet ne devienne saturé.

### Impact if Unsolved

Engagement de livraison ferme du workshop : le brief part du principe qu'il faut absolument livrer dans la fenêtre cible.

---

## Target Audience

### Primary Users

Ops en exercice (SRE, plateforme, DevOps), tous profils confondus. À l'aise avec Kubernetes en CLI, mais peu d'expérience avec les LLM, agents IA et systèmes multi-agents.

### Secondary Users

Administrateurs / co-formateurs (en pratique : Clément Raussin et Quentin Rodic eux-mêmes) qui animent et maintiendront le workshop pour de futures sessions.

### User Needs

1. **Diagnostiquer plus vite les problèmes K8s récurrents** (CrashLoopBackOff, OOMKilled, ImagePullBackOff, scheduling, DNS, probes, PVC…) sans devoir orchestrer manuellement une suite de commandes `kubectl`.
2. **Comprendre concrètement ce qu'un agent kagent (et un setup multi-agents) apporte vs. la CLI** — quand l'utiliser, quand pas, sur quels signaux il prend le dessus.
3. **Repartir avec des configurations CRD kagent réutilisables** et un schéma mental des patterns de debug agentique applicables à leur propre cluster.

---

## Solution Overview

### Proposed Solution

Un repo de scénarios pédagogiques organisé en **un dossier par use case** (UC1 à UC4), du plus basique au plus complexe. Chaque dossier contient :

1. Les **manifests Kubernetes d'une application volontairement cassée** (problème K8s classique reproduit), prêts à déployer sur le cluster du participant.
2. La **configuration kagent (CRDs Agent + Tools)** scopée précisément au diagnostic du use case — sélection rigoureuse des agents et tools, sans excès.
3. Un **fichier JSON de tutoriel** (schéma commun à tous les UC) décrivant les étapes pas-à-pas que le participant suit.

La progression pédagogique est :

- **UC1 — Basique** : 1 agent, 1 source (Kube API). Cas d'usage typique : ImagePullBackOff. Lecture d'events / `describe pod`.
- **UC2 — Intermédiaire** : 1 agent, multi-tools, corrélation. Cas typique : Pod Pending / scheduling (corrélation pod × nodes × taints × resources).
- **UC3 — Avancé** : outils externes. Cas typique : OOMKilled diagnostiqué via Kube API + Prometheus, avec dashboard Grafana généré à la volée par l'agent (capacité native kagent).
- **UC4 — Multi-agent + MCP custom** : agent-coordinateur a2a appelant les sous-agents UC1-3 sur un cluster aux symptômes multiples, puis remontée d'une conclusion via un **MCP custom** généré par **KMCP Tools** et exposant le projet `light-manager` (livrable voisin déjà existant). Détail à raffiner en architecture.

### Key Features

- Structure homogène **un dossier = un UC**, pour permettre à 2 développeurs de travailler en parallèle sans collision.
- **Schéma JSON commun** pour tous les tutoriels, parsable par un éventuel runner externe.
- Applications cassées **autonomes et déterministes** : le bug se reproduit à coup sûr au déploiement, sans dépendance temporelle ni externe.
- Apps **petites, légères, démarrage rapide** — images publiques renommées par défaut, et si une app custom est nécessaire (probe failure, crash conditionnel) : Python ou Node minimaliste.
- **CRDs kagent minimales et focalisées** : 1 use case → 1 agent ou petit système multi-agents avec un set de tools strictement nécessaire.
- **Réutilisation prioritaire des agents kagent pré-packagés** (notamment ceux qui interagissent nativement avec Prometheus/Grafana et savent créer des dashboards). On configure / assemble — on ne réinvente pas.
- **Fil rouge Artemis / spatial** : naming des applications, lore léger, cohérence narrative entre les 4 UC.
- Documentation par scénario : prérequis, ce qu'il faut observer, ce que l'agent va faire, résultat attendu.
- 4 scénarios initiaux ; structure pensée pour ajouter d'autres scénarios sans rework.

### Value Proposition

Au lieu d'un cours théorique, chaque ops repart avec une **expérience vécue** sur son propre cluster : il a vu un agent kagent diagnostiquer 4 vrais problèmes, et il dispose des artefacts (apps + CRDs + tutos) pour rejouer ou adapter à son contexte.

---

## Business Objectives

### Goals

1. **Livraison à temps** pour le workshop (cible : ~2026-05-20) : 4 scénarios fonctionnels et déployables.
2. **Simplicité d'usage** : un participant ops doit pouvoir exécuter un scénario de bout en bout en suivant uniquement le tuto JSON, sans assistance formateur sur la mécanique.
3. **Démonstration de valeur agent IA vs CLI** : chaque scénario doit rendre **manifeste** le gain par rapport à l'approche CLI manuelle (rapidité, corrélation, ou réduction de charge cognitive).
4. **Réutilisabilité** : le repo doit pouvoir resservir pour un second workshop sans rework majeur.

### Success Metrics

- **Simplicité d'usage** : taux de scénarios complétés en autonomie par les participants pendant le workshop.
- **Intérêt IA vs CLI démontré** : feedback qualitatif post-workshop ("ai-je vu un cas où l'agent fait mieux qu'un kubectl ?") + capacité du participant à citer ≥1 cas où il utiliserait kagent en prod.

### Business Value

Démontrer la valeur des agents kagent comme outil d'ops Kubernetes auprès d'un public ops, et fournir un support de formation réutilisable pour de futures sessions.

---

## Scope

### In Scope

- Repo `kagent-workshop-scenarios` avec **un dossier par use case** (UC1 à UC4).
- Pour chaque UC :
  - Manifests K8s d'une application volontairement cassée, déterministe et reproductible.
  - Configurations CRD kagent (Agent + Tools) scopées au use case, en réutilisant les agents pré-packagés kagent autant que possible.
  - Fichier JSON de tutoriel suivant un schéma commun.
  - README court : prérequis, ce qu'il faut observer, résultat attendu.
- **Schéma JSON** documenté pour les fichiers de tutoriel.
- **Doc racine** : prérequis cluster, install kagent, ordre suggéré des UC.
- **Install Prometheus/Grafana minimal** pour UC3 (manifest fourni dans le repo, simplicité d'usage prioritaire).
- **UC3** : utilisation de la **création de dashboard Grafana à la volée** par l'agent (capacité native kagent).
- **UC4** : configuration agent-coordinateur a2a + wiring vers les sous-agents UC1-3 + **MCP custom généré via KMCP Tools** ciblant `light-manager`.
- **Fil rouge Artemis** : nommage cohérent des applications et lore spatial sur les 4 UC.

### Out of Scope

- **Pas de runner / app de workshop** qui exécute le JSON de tutoriel (le JSON est consommé par un éventuel outil tiers ou lu manuellement par le participant).
- **Pas de provisioning de cluster** : chaque participant arrive avec son cluster (par défaut : kind).
- **Pas le développement de `light-manager`** lui-même (livrable séparé déjà existant).
- **Pas de gestion fine d'identité/secrets** au-delà du minimum requis pour faire tourner les démos.
- **Pas le scénario "Evicted pods"** — exclu explicitement.
- **Pas de réinvention** des agents que kagent fournit déjà nativement (Prometheus/Grafana, dashboards).

### Future Considerations

- Scénarios additionnels au-delà des 4 initiaux (DNS, HPA, Probes, PVC, TLS expirés…) si demande post-workshop.
- Traduction du tuto JSON en autres langues.
- Runner de workshop dédié.
- Intégration plus fine avec d'autres outils observabilité (logs, traces).

---

## Key Stakeholders

- **Clément Raussin (Co-créateur, formateur, développeur)** — Influence : Haute. Conçoit, code, anime.
- **Quentin Rodic (Co-créateur, formateur, développeur)** — Influence : Haute. Conçoit, code, anime. Travaillera **en parallèle** de Clément sur des use cases distincts.
- **Participants ops du workshop** — Influence : Moyenne. Consommateurs ; leur feedback définit la réussite pédagogique.
- **Équipe `kagent` (upstream open-source, kagent-dev/kagent)** — Influence : Faible. Dépendance technique ; on suit leur API mais sans interaction directe.

---

## Constraints and Assumptions

### Constraints

- **Deadline workshop ~2026-05-20** (≈3 semaines à partir du 2026-04-27).
- **Équipe : 2 développeurs** (Clément + Quentin), travail en parallèle, exigence de non-collision sur les artefacts partagés.
- **Stack imposée** : kagent **v0.9.0** (figé), KMCP Tools (CLI pour MCP custom), Kubernetes côté participants, Prometheus/Grafana pour UC3.
- **Pas de réinvention** : tout ce que kagent fournit nativement (agents pré-packagés Prom/Grafana, dashboards à la volée) doit être réutilisé.
- **Cluster cible : celui de chaque participant** — artefacts portables, pas de dépendance à un cloud spécifique au-delà des prérequis documentés.
- **Apps de démo légères** : Python ou Node minimaliste si app custom ; sinon images publiques renommées Artemis.
- **Fil rouge Artemis obligatoire** : nommage et lore cohérents sur les 4 UC.

### Assumptions

- Chaque participant arrive avec un cluster Kubernetes opérationnel — par défaut **kind** (Kubernetes-in-Docker).
- Chaque participant peut installer kagent sur son cluster (ou kagent est pré-installé en début de workshop par les formateurs).
- `light-manager` est livré et stable d'ici la deadline (livrable séparé déjà engagé).
- Les participants ont accès à un LLM (provider à trancher en phase architecture).
- L'API kagent v0.9.0 reste rétro-compatible jusqu'au 2026-05-20 (pas de breaking change upstream sur cette ligne).

---

## Success Criteria

- Un participant ops, **seul devant son cluster avec son JSON de tutoriel**, complète un scénario sans intervention formateur.
- À la fin de UC1, le participant a vu l'agent **synthétiser un diagnostic là où la CLI demandait plusieurs commandes** — l'effet "ah ok, je vois l'intérêt" est obtenu.
- À la fin de UC4, le participant a observé **plusieurs agents collaborer (a2a)** et un **MCP custom remonter une conclusion globale** — la pédagogie multi-agents est démontrée concrètement.
- Les **4 dossiers UC sont autonomes** : un participant peut les exécuter dans l'ordre ou en piochant indépendamment (sauf UC4 qui réutilise les sous-agents).
- Le repo est **rejouable sans rework** par Clément ou Quentin pour un futur workshop.
- Le **fil rouge Artemis** est lisible : chaque UC raconte un morceau d'histoire, pas juste un test technique.
- **Aucun crash bloquant pendant le workshop** dû à un défaut de scénario (les apps cassées le sont **de manière contrôlée**, pas accidentelle).

---

## Timeline and Milestones

### Target Launch

Workshop : **~2026-05-20** (date exacte à confirmer).

### Key Milestones

| Milestone | Cible | Livrables |
|-----------|-------|-----------|
| **M1 — PRD + Architecture** | ~2026-05-01 | PRD validé, architecture des 4 UC + schéma JSON tuto figés, structure repo arrêtée |
| **M2 — UC1 + UC2 livrés** | ~2026-05-08 | Apps cassées + CRDs kagent + tuto JSON, testés sur cluster kind |
| **M3 — UC3 livré** | ~2026-05-13 | UC3 avec Prometheus/Grafana fonctionnel, dashboard à la volée |
| **M4 — UC4 + MCP custom livrés** | ~2026-05-17 | Agent-coordinateur a2a + MCP custom (KMCP Tools) → light-manager opérationnel |
| **M5 — Dry-run complet + freeze** | ~2026-05-19 | Workshop joué de bout en bout par les 2 formateurs ; corrections de dernière minute |
| **Workshop** | **2026-05-20** | Live. |

Découpage parallèle Clément ↔ Quentin : par défaut **1 UC par dev** (par ex. Clément UC1+UC3, Quentin UC2 ; UC4 à 2 puisqu'il agrège tout). À ajuster en sprint planning.

---

## Risks and Mitigation

- **Risk:** UC4 trop ambitieux (multi-agent a2a + MCP custom + light-manager) — sous-évalué, retard sur la livraison.
  - **Likelihood:** High
  - **Mitigation:** Architecture détaillée d'UC4 dès M1 ; UC4 réutilise les agents UC1-3 (donc si UC1-3 sont solides, UC4 = essentiellement de l'orchestration) ; fallback : version dégradée avec moins de sous-agents si serré.

- **Risk:** `light-manager` pas prêt à temps.
  - **Likelihood:** Medium
  - **Mitigation:** Confirmer la deadline interne `light-manager` avant le 2026-05-15 ; à défaut, MCP custom mock pour démontrer UC4 sans light-manager fonctionnel.

- **Risk:** Breaking change kagent upstream pendant le développement.
  - **Likelihood:** Medium
  - **Mitigation:** Version figée v0.9.0 ; vendoring local des manifests ; pas d'auto-update.

- **Risk:** Apps cassées non reproductibles (le bug ne se déclenche pas chez certains participants → workshop bloque).
  - **Likelihood:** Medium
  - **Mitigation:** Tests croisés Clément ↔ Quentin sur chaque UC ; dry-run complet en M5 ; bugs déterministes (manifests qui forcent l'erreur, pas de race conditions ni timing-dépendant).

- **Risk:** Collisions Clément ↔ Quentin sur artefacts partagés (schéma JSON, doc racine, install Prom/Grafana).
  - **Likelihood:** Medium
  - **Mitigation:** Figer ces artefacts en M1 avant le travail parallèle ; PR review croisée obligatoire ; convention de propriété claire par fichier dans le repo.

- **Risk:** Provider LLM down / quota épuisé pendant le workshop.
  - **Likelihood:** Low-Medium
  - **Mitigation:** Test de charge la veille (M5) ; clé / provider de secours ; si choix Ollama local : vérifier que les laptops participants supportent.

- **Risk:** Cluster participant (kind) non fonctionnel (Docker pas installé, port conflicts, ressources insuffisantes).
  - **Likelihood:** Medium
  - **Mitigation:** Prérequis machine documentés en amont (RAM, Docker, kubectl) ; script `bootstrap.sh` qui valide l'environnement avant de commencer le workshop.

---

## Next Steps

1. Create Product Requirements Document (PRD) - `/prd`
2. Conduct user research (optional) - `/research`
3. Create UX design (if UI-heavy) - `/create-ux-design`

---

**This document was created using BMAD Method v6 - Phase 1 (Analysis)**

*To continue: Run `/workflow-status` to see your progress and next recommended workflow.*
