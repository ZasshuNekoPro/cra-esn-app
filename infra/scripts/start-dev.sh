#!/usr/bin/env bash
set -euo pipefail
echo "🚀 Démarrage de l'environnement de développement ESN CRA..."
docker compose -f infra/docker/docker-compose.dev.yml up -d --wait
echo "📦 Migration de la base de données..."
pnpm db:migrate
echo "🌱 Seed des données de test..."
pnpm db:seed
echo ""
echo "✅ Environnement prêt !"
echo "   PostgreSQL : localhost:5432"
echo "   MinIO API  : localhost:9000"
echo "   MinIO UI   : http://localhost:9001  (admin / minioadmin)"
echo "   Redis      : localhost:6379"
