#!/usr/bin/env bash
echo "🛑 Arrêt de l'environnement de développement..."
docker compose -f infra/docker/docker-compose.dev.yml down
echo "✅ Services arrêtés (données conservées dans les volumes Docker)"
