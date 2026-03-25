# Commande : démarrer l'application complète

## Déclencheur
Quand l'utilisateur tape : /startapp

## Ce que fait cette commande
Lance l'intégralité de l'environnement de développement :
- Services Docker (PostgreSQL, MinIO, Redis)
- Migration + seed de la base de données (si nécessaire)
- Backend NestJS (port 3101)
- Frontend Next.js (port 3100)

## Protocole

### Étape 1 — Vérifier que .env existe
```bash
test -f .env || cp .env.example .env
```
Si le fichier a été copié, prévenir l'utilisateur de vérifier les clés API
(ANTHROPIC_API_KEY, OPENAI_API_KEY) avant de continuer.

### Étape 2 — Builder les packages workspace
Les packages partagés doivent être compilés avant le démarrage :
```bash
cd packages/shared-types && npx tsc -p tsconfig.build.json && cd ../..
cd packages/shared-utils && npx tsc -p tsconfig.build.json && cd ../..
cd packages/pdf-generator && npx tsc -p tsconfig.build.json && cd ../..
cd packages/rag-engine && npx tsc -p tsconfig.build.json && cd ../..
```

### Étape 3 — Démarrer les services Docker
```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d --wait
```
Services lancés :
- PostgreSQL 15 + pgvector (port 5433)
- MinIO (port 9000 / UI 9001)
- Redis (port 6380)

### Étape 4 — Appliquer les migrations et le seed
```bash
cd apps/backend && pnpm prisma migrate deploy && pnpm prisma db seed && cd ../..
```

### Étape 5 — Lancer l'application en arrière-plan
```bash
pnpm dev > /tmp/esn-cra-app.log 2>&1 &
echo $! > /tmp/esn-cra-app.pid
```

### Étape 6 — Attendre que les serveurs soient prêts
```bash
sleep 15 && curl -s http://localhost:3101/api/auth/me | head -c 50
```

### Étape 7 — Afficher le récapitulatif
```
✅ Application ESN CRA App démarrée !

Service       URL                        Identifiants (seed)
───────────────────────────────────────────────────────────────────
Frontend      http://localhost:3100      alice@example.com / password123
Backend API   http://localhost:3101/api  admin@esn-corp.fr / password123
MinIO UI      http://localhost:9001      minioadmin / minioadmin

Logs : tail -f /tmp/esn-cra-app.log
Arrêt : /stopapp
```

## En cas d'erreur Docker
Si Docker n'est pas démarré :
```bash
sudo systemctl start docker
```
puis relancer `/startapp`.

Si un port est déjà utilisé, afficher quel process l'occupe :
```bash
ss -tlnp | grep -E '3100|3101|5433|9000|9001|6380'
```
