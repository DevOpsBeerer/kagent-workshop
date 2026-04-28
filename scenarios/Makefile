# kagent-workshop-scenarios — author/CI Make targets
# Per BMAD M1 conventions. Targets here back the AC of STORY-002 onwards.

SHELL := /bin/bash

TOUR_SCHEMA := schemas/workshop-tour.schema.json
TOUR_FILES  := $(wildcard uc*/tour.json)

AJV := npx --yes ajv-cli@5

.PHONY: help validate-tours

help:
	@echo "Targets:"
	@echo "  validate-tours   Validate every uc*/tour.json against $(TOUR_SCHEMA)"

validate-tours:
	@if [ -z "$(TOUR_FILES)" ]; then \
		echo "validate-tours: no uc*/tour.json files yet — nothing to validate."; \
		exit 0; \
	fi; \
	echo "validate-tours: validating $(words $(TOUR_FILES)) tour file(s) against $(TOUR_SCHEMA)"; \
	$(AJV) validate --spec=draft7 -s $(TOUR_SCHEMA) $(foreach f,$(TOUR_FILES),-d $(f))
