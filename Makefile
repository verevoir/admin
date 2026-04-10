.PHONY: build test lint run help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Compile TypeScript to dist/
	npm run build

test: ## Run tests
	npm test

lint: ## Lint and check formatting
	npm run lint

run: ## No-op (library)
	@echo "Library package — nothing to run."
