# kagent-workshop-scenarios — author/CI Make targets
# Per BMAD M1 conventions. Targets here back the AC of STORY-002 onwards.

SHELL := /bin/bash

# ── Schema validation (STORY-002) ──
TOUR_SCHEMA := schemas/workshop-tour.schema.json
TOUR_FILES  := $(wildcard uc*/tour.json)
AJV         := npx --yes ajv-cli@5

# ── Author dev loop (STORY-005, FR-004) ──
KIND_CLUSTER     := kagent-workshop
KIND_CONFIG      := scripts/kind-config.yaml
KAGENT_VERSION   := 0.9.0
KAGENT_NAMESPACE := kagent
KAGENT_REPO_NAME := kagent
KAGENT_REPO_URL  := https://kagent-dev.github.io/kagent
UCS              := 1 2 3 4

.PHONY: help validate-tours preflight kind-up kind-down kagent-install \
        $(addprefix uc,$(addsuffix -up,$(UCS))) \
        $(addprefix uc,$(addsuffix -down,$(UCS)))

help:
	@echo "Lint targets:"
	@echo "  validate-tours    Validate every uc*/tour.json against $(TOUR_SCHEMA)"
	@echo ""
	@echo "Author dev-loop targets (FR-004):"
	@echo "  preflight         Validate Docker / kubectl / kind / helm / kagent CRDs"
	@echo "  kind-up           Create the local kind cluster '$(KIND_CLUSTER)' (idempotent)"
	@echo "  kind-down         Delete the local kind cluster"
	@echo "  kagent-install    Helm-install kagent v$(KAGENT_VERSION) into the current cluster"
	@echo "  uc<N>-up          kind-up + kagent-install + apply uc<N>/manifests + uc<N>/agents"
	@echo "  uc<N>-down        Delete UC<N> resources (cluster stays up; use kind-down to nuke)"

# ── Schema validation ──

validate-tours:
	@if [ -z "$(TOUR_FILES)" ]; then \
		echo "validate-tours: no uc*/tour.json files yet — nothing to validate."; \
		exit 0; \
	fi; \
	echo "validate-tours: validating $(words $(TOUR_FILES)) tour file(s) against $(TOUR_SCHEMA)"; \
	$(AJV) validate --spec=draft7 -s $(TOUR_SCHEMA) $(foreach f,$(TOUR_FILES),-d $(f))

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

kagent-install:
	@echo "kagent-install: ensuring helm repo '$(KAGENT_REPO_NAME)' → $(KAGENT_REPO_URL)"
	@helm install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
    --namespace kagent \
    --create-namespace \
	--wait

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
