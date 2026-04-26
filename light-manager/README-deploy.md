# Déploiement Kubernetes

Manifests dans `k8s/` : Namespace, PVC, Deployment, Service, Ingress.

## Pré-requis cluster

- **NGINX Ingress Controller** installé.
- **cert-manager** + un `ClusterIssuer` (pour le TLS automatique).
- Une **StorageClass par défaut** (pour le PVC SQLite).
- Un **registry Docker** accessible par le cluster.
- Un **domaine + DNS** pointant vers l'Ingress.

## 1. Build et push de l'image

```bash
docker build -t registry.example.com/light-manager:v0.1.0 .
docker push registry.example.com/light-manager:v0.1.0
```

## 2. Adapter les manifests

Éditer **`k8s/ingress.yaml`** : remplacer `light-manager.example.com` par ton domaine.

Pointer **l'image** :

```bash
cd k8s
kustomize edit set image light-manager=registry.example.com/light-manager:v0.1.0
```

## 3. Déployer

```bash
kubectl apply -k k8s/
kubectl -n light-manager rollout status deployment/light-manager
```

## 4. Vérifier

```bash
curl https://<ton-domaine>/health
```

Attendu : `{"status":"ok"}`.

## Update

```bash
cd k8s
kustomize edit set image light-manager=registry.example.com/light-manager:v0.1.1
kubectl apply -k k8s/
```

## Rollback

```bash
kubectl -n light-manager rollout undo deployment/light-manager
```
