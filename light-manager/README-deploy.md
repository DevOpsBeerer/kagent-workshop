# Light Manager — Déploiement Kubernetes

Procédure complète pour publier l'image et déployer Light Manager sur un cluster Kubernetes pour le workshop du **2026-05-20**.

L'app est packagée dans une **seule image** (FastAPI sert `/api/*` et la SPA React via `StaticFiles`). Un seul pod, persistance via SQLite sur PVC. C'est volontairement simple : pas d'auth, pas de rate-limit, pas de HPA.

---

## Pré-requis cluster

- **Kubernetes 1.27+** (toute distribution : k3s, EKS, GKE, AKS, Qiminfo internal, kind/minikube en local).
- **NGINX Ingress Controller** déployé dans le cluster.
- **cert-manager** + un `ClusterIssuer` Let's Encrypt (ou équivalent) si on veut TLS automatique. À défaut, retirer le bloc `tls:` de `ingress.yaml` ou utiliser un `Secret` TLS pré-créé.
- **Une StorageClass par défaut** pour le PVC SQLite. Sinon → mode `emptyDir` (cf. [Plan B](#plan-b--sans-pvc-emptydir)).
- **Un registry Docker accessible** par le cluster (Docker Hub, GHCR, GitLab, registry interne…).
- **Un domaine + DNS** pointant vers l'Ingress controller (`light-manager.example.com` à remplacer).

---

## Vue d'ensemble

```
client ──HTTPS──▶ Ingress (nginx + TLS)
                        │
                        ▼
                 Service (ClusterIP :80)
                        │
                        ▼
                 Deployment (1 réplique)
                        │
                        ├─ /api/*  (FastAPI)
                        └─ /*      (React SPA)
                        │
                        ▼
                 PVC → SQLite /data/light-manager.db
```

Manifests dans `k8s/` :

| Fichier | Ressource | Rôle |
|---|---|---|
| `namespace.yaml` | `Namespace light-manager` | Isolation |
| `pvc.yaml` | `PersistentVolumeClaim` 1 Gi RWO | Persistance SQLite |
| `deployment.yaml` | `Deployment` 1 réplique, probes `/health` | App |
| `service.yaml` | `Service ClusterIP` 80 → 8000 | Routing interne |
| `ingress.yaml` | `Ingress nginx + TLS` | Exposition HTTPS |
| `kustomization.yaml` | Kustomize | Override image facilement |

---

## 1. Construire et publier l'image

Depuis la racine `light-manager/` :

```bash
# Build multi-stage (frontend Vite + backend FastAPI dans la même image)
docker build -t light-manager:dev .

# Tag pour le registry cible (adapter à ton registry)
docker tag light-manager:dev registry.example.com/light-manager:v0.1.0

# Push (login préalable au registry si besoin : docker login registry.example.com)
docker push registry.example.com/light-manager:v0.1.0
```

> Pour tester avec **kind** sans registry public :
> ```bash
> kind load docker-image light-manager:dev --name <nom-cluster-kind>
> ```

---

## 2. Adapter les manifests au cluster cible

Trois choses à personnaliser :

### 2.a — Image

Avec **kustomize** (recommandé, ne touche pas le YAML versionné) :

```bash
cd k8s
kustomize edit set image light-manager=registry.example.com/light-manager:v0.1.0
```

…ou en éditant directement `deployment.yaml` ligne `image:`.

### 2.b — Hôte Ingress

Remplacer `light-manager.example.com` par ton vrai DNS dans `k8s/ingress.yaml` (à la fois sous `tls.hosts` et `rules.host`).

```bash
sed -i '' 's|light-manager.example.com|light-manager.qiminfo.ch|g' k8s/ingress.yaml
```

### 2.c — Issuer TLS

Vérifier l'annotation `cert-manager.io/cluster-issuer:` dans `k8s/ingress.yaml`. Adapter à ce qui existe dans le cluster (`letsencrypt-prod`, `letsencrypt-staging`, `internal-ca`…).

---

## 3. Déployer

```bash
# Méthode 1 — kustomize (recommandé)
kubectl apply -k k8s/

# Méthode 2 — applier individuellement (sans kustomize)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

Vérifier que tout est `Ready` :

```bash
kubectl -n light-manager get all,pvc,ingress
kubectl -n light-manager rollout status deployment/light-manager --timeout=120s
```

Sortie attendue (extrait) :

```
pod/light-manager-xxxxxxxxx-xxxxx   1/1   Running
service/light-manager               ClusterIP   10.x.x.x   80/TCP
ingress.networking.k8s.io/light-manager   nginx   light-manager.qiminfo.ch
persistentvolumeclaim/light-manager-data   Bound   pvc-...   1Gi   RWO
```

---

## 4. Vérifier l'app

```bash
# Sonde directe via le service (port-forward)
kubectl -n light-manager port-forward svc/light-manager 8000:80 &
curl -s http://localhost:8000/health   # → {"status":"ok"}
curl -s http://localhost:8000/api/users | jq 'length'   # → 40
fg ; # Ctrl+C pour kill le port-forward

# Sonde via l'Ingress (une fois le DNS et le cert prêts)
curl -s https://light-manager.qiminfo.ch/health
```

L'app doit retourner les **40 participants seedés** au premier boot.

---

## 5. Persistance après redémarrage

```bash
# Provoquer un redémarrage
kubectl -n light-manager delete pod -l app.kubernetes.io/name=light-manager
kubectl -n light-manager rollout status deployment/light-manager

# Les users et l'état des ampoules doivent être préservés
curl -s http://localhost:8000/api/users | jq 'length'   # toujours 40 (ou plus si tu as ajouté manuellement)
```

Si la persistance échoue, vérifier que le PVC est bien `Bound` :

```bash
kubectl -n light-manager get pvc light-manager-data
```

---

## 6. Rollback / Update

### Update : nouvelle image

```bash
cd k8s
kustomize edit set image light-manager=registry.example.com/light-manager:v0.1.1
kubectl apply -k .
kubectl -n light-manager rollout status deployment/light-manager
```

### Rollback rapide

```bash
kubectl -n light-manager rollout undo deployment/light-manager
```

---

## Plan B — Sans PVC (`emptyDir`)

Si le cluster cible n'a pas de StorageClass utilisable et qu'on accepte que **les données disparaissent à chaque redémarrage du pod** (le seeding recrée les 40 participants au boot, donc c'est tenable pour un workshop d'une journée) :

1. Dans `k8s/deployment.yaml`, remplacer le bloc `volumes:` par :

```yaml
      volumes:
      - name: data
        emptyDir: {}
```

2. Supprimer `k8s/pvc.yaml` du `kustomization.yaml` (ou ne pas l'apply-er).
3. Ré-`apply`. Le boot recréera la base et seedera 40 participants.

---

## Troubleshooting

```bash
# Logs FastAPI
kubectl -n light-manager logs deploy/light-manager --tail=200

# Statut de la sonde liveness/readiness (probes failures)
kubectl -n light-manager describe pod -l app.kubernetes.io/name=light-manager | grep -A 5 -i probe

# PVC ne se bind pas → cluster sans StorageClass adaptée → fallback emptyDir
kubectl -n light-manager describe pvc light-manager-data

# Cert TLS ne se génère pas → vérifier cert-manager + ClusterIssuer
kubectl -n light-manager describe certificate light-manager-tls

# Tester la SPA directement depuis le pod (sans passer par Ingress)
kubectl -n light-manager exec deploy/light-manager -- \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read())"
```

---

## Checklist jour J (workshop)

- [ ] Image taguée et publiée sur le registry du cluster
- [ ] Manifests appliqués sur le cluster (`kubectl get all -n light-manager` propre)
- [ ] DNS `light-manager.qiminfo.ch` (ou autre) résolvant vers l'Ingress
- [ ] Certificat TLS valide (`curl -I https://...` → `HTTP/2 200`)
- [ ] `https://.../health` → `{"status":"ok"}`
- [ ] `https://.../docs` accessible (Swagger UI)
- [ ] `https://.../global` lisible sur le projecteur du formateur
- [ ] Test pilote : `PUT /api/bulbs/1?user=participant-01 -d '{"r":255,"g":0,"b":0}'` → la cellule devient rouge dans la vue globale en < 2 s
- [ ] Test persistance : `kubectl delete pod -l app=light-manager` puis revérifier que les 40 users sont toujours là
