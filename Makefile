.PHONY: telegram
telegram:
	cd telegram && tsc && node worker.js

docker:
	docker compose up -d db --force-recreate --remove-orphans --renew-anon-volumes
