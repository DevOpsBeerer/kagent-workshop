# kagent-workshop-scenarios — author/CI Make targets
# Per BMAD M1 conventions. Targets here back the AC of STORY-002 onwards.

SHELL := /bin/bash

# ── Schema validation (STORY-002) ──
TOUR_SCHEMA := schemas/workshop-tour.schema.json
TOUR_FILES  := $(wildcard uc*/tour.json)
AJV         := npx --yes ajv-cli@5

# ── Manifest lint (STORY-011, NFR-006) ──
UC_MANIFEST_DIRS := $(wildcard uc*/manifests)

# ── Observability bundle (STORY-018, FR-012) ──
OBSERVABILITY_DIR := infra/observability
OBSERVABILITY_NAMESPACE := artemis-observability

# ── MCP packaging (STORY-023, FR-016) ──
MCP_DIR             := mcp
MCP_NAMESPACE       := artemis-mcp
MCP_IMAGE_REGISTRY  := rg.fr-par.scw.cloud/apogasa
MCP_IMAGE_NAME      := artemis-bulb-mcp
MCP_IMAGE_TAG       := v0.1.0
MCP_IMAGE           := $(MCP_IMAGE_REGISTRY)/$(MCP_IMAGE_NAME):$(MCP_IMAGE_TAG)

# ── Author dev loop (STORY-005, FR-004) ──
KIND_CLUSTER     := kagent-workshop
KIND_CONFIG      := scripts/kind-config.yaml
KAGENT_VERSION   := 0.9.0
KAGENT_NAMESPACE := kagent
KAGENT_REPO_NAME := kagent
KAGENT_REPO_URL  := https://kagent-dev.github.io/kagent
UCS              := 1 2 3 4

.PHONY: help validate-tours lint-manifests preflight kind-up kind-down kagent-install \
        observability-up observability-down \
        mcp-build mcp-up mcp-down \
        $(addprefix uc,$(addsuffix -up,$(UCS))) \
        $(addprefix uc,$(addsuffix -down,$(UCS)))

help:
	@echo "Lint targets:"
	@echo "  validate-tours    Validate every uc*/tour.json against $(TOUR_SCHEMA)"
	@echo "  lint-manifests    kubectl apply --dry-run=client over every uc*/manifests/"
	@echo ""
	@echo "Author dev-loop targets (FR-004):"
	@echo "  preflight         Validate Docker / kubectl / kind / helm / kagent CRDs"
	@echo "  kind-up           Create the local kind cluster '$(KIND_CLUSTER)' (idempotent)"
	@echo "  kind-down         Delete the local kind cluster"
	@echo "  kagent-install    Helm-install kagent v$(KAGENT_VERSION) into the current cluster"
	@echo "  observability-up  Apply $(OBSERVABILITY_DIR)/ (Prom + Graf) — auto-installed by uc3-up / uc4-up"
	@echo "  observability-down Delete $(OBSERVABILITY_DIR)/ resources"
	@echo "  mcp-build         Build the MCP Docker image as $(MCP_IMAGE)"
	@echo "  mcp-up            Apply $(MCP_DIR)/manifests/ (artemis-bulb-mcp Deployment + Service + RemoteMCPServer)"
	@echo "  mcp-down          Delete $(MCP_DIR)/manifests/ resources"
	@echo "  uc<N>-up          kind-up + kagent-install + apply uc<N>/manifests + uc<N>/agents"
	@echo "                    (uc3-up / uc4-up additionally bring up the observability bundle)"
	@echo "  uc<N>-down        Delete UC<N> resources (cluster stays up; use kind-down to nuke)"

# ── Schema validation ──

validate-tours:
	@if [ -z "$(TOUR_FILES)" ]; then \
		echo "validate-tours: no uc*/tour.json files yet — nothing to validate."; \
		exit 0; \
	fi; \
	echo "validate-tours: validating $(words $(TOUR_FILES)) tour file(s) against $(TOUR_SCHEMA)"; \
	$(AJV) validate --spec=draft7 -s $(TOUR_SCHEMA) $(foreach f,$(TOUR_FILES),-d $(f))

# ── Manifest lint ──

lint-manifests:
	@rc=0; \
	if [ -z "$(UC_MANIFEST_DIRS)" ]; then \
		echo "lint-manifests: no uc*/manifests/ dirs yet — skipping per-UC walk."; \
	else \
		for d in $(UC_MANIFEST_DIRS); do \
			if compgen -G "$$d/*.yaml" >/dev/null; then \
				echo "lint-manifests: kubectl apply --dry-run=client -f $$d"; \
				kubectl apply --dry-run=client -f $$d || rc=1; \
			else \
				echo "lint-manifests: $$d is empty — skipping."; \
			fi; \
		done; \
	fi; \
	if [ -f "$(OBSERVABILITY_DIR)/kustomization.yaml" ]; then \
		echo "lint-manifests: kubectl apply --dry-run=client -k $(OBSERVABILITY_DIR)/"; \
		kubectl apply --dry-run=client -k $(OBSERVABILITY_DIR)/ || rc=1; \
	else \
		echo "lint-manifests: $(OBSERVABILITY_DIR)/kustomization.yaml absent — skipping."; \
	fi; \
	if [ -f "$(OBSERVABILITY_DIR)/kagent-bridge-services.yaml" ]; then \
		echo "lint-manifests: kubectl apply --dry-run=client -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml"; \
		kubectl apply --dry-run=client -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml || rc=1; \
	fi; \
	if [ -f "$(OBSERVABILITY_DIR)/kagent-grafana-mcp-setup.yaml" ]; then \
		echo "lint-manifests: kubectl apply --dry-run=client -f $(OBSERVABILITY_DIR)/kagent-grafana-mcp-setup.yaml"; \
		kubectl apply --dry-run=client -f $(OBSERVABILITY_DIR)/kagent-grafana-mcp-setup.yaml || rc=1; \
	fi; \
	if compgen -G "$(MCP_DIR)/manifests/*.yaml" >/dev/null; then \
		echo "lint-manifests: kubectl apply --dry-run=client -f $(MCP_DIR)/manifests/"; \
		kubectl apply --dry-run=client -f $(MCP_DIR)/manifests/ || rc=1; \
	else \
		echo "lint-manifests: $(MCP_DIR)/manifests/ empty — skipping."; \
	fi; \
	exit $$rc

# ── Author dev loop ──

preflight:
	@scripts/preflight.sh

kind-up:
	@if kind get clusters 2>/dev/null | grep -qx '$(KIND_CLUSTER)'; then \
		echo "kind-up: cluster '$(KIND_CLUSTER)' already exists — skipping."; \
	else \
		echo "kind-up: creating cluster '$(KIND_CLUSTER)' from $(KIND_CONFIG)"; \
		kind create cluster --name $(KIND_CLUSTER) --config $(KIND_CONFIG); \
	fi

kind-down:
	@kind delete cluster --name $(KIND_CLUSTER)

# `helm upgrade --install` rather than plain `helm install` so the target is
# idempotent — re-running on a cluster that already has kagent is a no-op
# instead of failing with "cannot re-use a name that is still in use".
# Sprint-3 retro candidate flagged by STORY-018 + every cold-deploy iteration
# of UC3/UC4; patched here by STORY-029.
kagent-install:
	@echo "kagent-install: ensuring helm repo '$(KAGENT_REPO_NAME)' → $(KAGENT_REPO_URL)"
	@helm upgrade --install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
    --namespace kagent \
    --create-namespace \
	--wait

# Observability bundle (STORY-018) — auto-installed by uc3-up / uc4-up.
# The kagent ↔ artemis-observability namespace bridge (kagent-bridge-services.yaml,
# promoted from uc3/agents/ to infra/observability/ by STORY-025) is applied
# separately because it lives in the `kagent` namespace and the kustomization's
# root `namespace: artemis-observability` would override it.
observability-up: kagent-install
	@echo "observability-up: kubectl apply -k $(OBSERVABILITY_DIR)/"
	@kubectl apply -k $(OBSERVABILITY_DIR)/
	@echo "observability-up: kubectl apply -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml"
	@kubectl apply -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml
	@echo "observability-up: waiting for prometheus-server + grafana to become Ready"
	@kubectl rollout status -n $(OBSERVABILITY_NAMESPACE) deploy/prometheus-server --timeout=120s
	@kubectl rollout status -n $(OBSERVABILITY_NAMESPACE) deploy/grafana --timeout=120s
	@echo "observability-up: kubectl apply -f $(OBSERVABILITY_DIR)/kagent-grafana-mcp-setup.yaml"
	@kubectl delete job kagent-grafana-mcp-setup -n kagent --ignore-not-found
	@kubectl apply -f $(OBSERVABILITY_DIR)/kagent-grafana-mcp-setup.yaml
	@kubectl wait --for=condition=Complete job/kagent-grafana-mcp-setup -n kagent --timeout=180s

observability-down:
	@kubectl delete -f $(OBSERVABILITY_DIR)/kagent-grafana-mcp-setup.yaml --ignore-not-found
	@kubectl delete -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml --ignore-not-found
	@kubectl delete -k $(OBSERVABILITY_DIR)/ --ignore-not-found

# MCP packaging (STORY-023) — Dockerfile build + per-vCluster manifest apply.
# `mcp-build` produces an image tagged for the apogasa registry; CI publishes
# the image (workshop-infrastructure responsibility). For local validation,
# `kind load docker-image $(MCP_IMAGE) --name $(KIND_CLUSTER)` side-loads it.
mcp-build:
	@echo "mcp-build: docker build -t $(MCP_IMAGE) $(MCP_DIR)/"
	@docker build -t $(MCP_IMAGE) $(MCP_DIR)/

mcp-up:
	@if compgen -G "$(MCP_DIR)/manifests/*.yaml" >/dev/null; then \
		echo "mcp-up: kubectl apply -f $(MCP_DIR)/manifests/"; \
		kubectl apply -f $(MCP_DIR)/manifests/; \
	else \
		echo "mcp-up: $(MCP_DIR)/manifests/ empty — nothing to apply."; \
	fi

mcp-down:
	@if compgen -G "$(MCP_DIR)/manifests/*.yaml" >/dev/null; then \
		kubectl delete -f $(MCP_DIR)/manifests/ --ignore-not-found; \
	fi
	@echo "mcp-down: done."

# Per-UC up/down targets, generated for every N in $(UCS).
define UC_TARGETS
uc$(1)-up: kind-up kagent-install
	@if compgen -G "uc$(1)/manifests/*.yaml" >/dev/null; then \
		echo "uc$(1)-up: kubectl apply -f uc$(1)/manifests/"; \
		kubectl apply -f uc$(1)/manifests/; \
	else \
		echo "uc$(1)-up: no manifests under uc$(1)/manifests/ yet — skipping (lands in a later sprint)."; \
	fi
	@if compgen -G "uc$(1)/agents/*.yaml" >/dev/null; then \
		echo "uc$(1)-up: kubectl apply -f uc$(1)/agents/"; \
		kubectl apply -f uc$(1)/agents/; \
	else \
		echo "uc$(1)-up: no agent CRDs under uc$(1)/agents/ yet — skipping (lands in a later sprint)."; \
	fi

uc$(1)-down:
	@if compgen -G "uc$(1)/agents/*.yaml" >/dev/null; then \
		kubectl delete -f uc$(1)/agents/ --ignore-not-found; \
	fi
	@if compgen -G "uc$(1)/manifests/*.yaml" >/dev/null; then \
		kubectl delete -f uc$(1)/manifests/ --ignore-not-found; \
	fi
	@echo "uc$(1)-down: done (cluster '$(KIND_CLUSTER)' kept; run 'make kind-down' to nuke)."
endef

$(foreach n,$(UCS),$(eval $(call UC_TARGETS,$(n))))

# UC3 + UC4 additionally depend on the observability bundle (STORY-018).
# Declared outside the macro so UC1/UC2 author dev-loop cycles stay fast — they
# don't pull Prom + Graf images on every iteration.
uc3-up: observability-up
uc4-up: observability-up
