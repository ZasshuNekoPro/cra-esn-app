# Commande : arrêter l'application complète

## Déclencheur
Quand l'utilisateur tape : /stopapp

## Ce que fait cette commande
Arrête proprement l'intégralité de l'environnement :
- Processus Node.js (backend NestJS + frontend Next.js)
- Services Docker (PostgreSQL, MinIO, Redis)

Les données sont **conservées** dans les volumes Docker (aucune perte).

## Protocole

### Étape 1 — Arrêter les processus Node.js
```bash
# Via le PID file si disponible
if [ -f /tmp/esn-cra-app.pid ]; then
  kill $(cat /tmp/esn-cra-app.pid) 2>/dev/null && rm /tmp/esn-cra-app.pid
fi

# Nettoyage de sécurité — tuer tous les processus Next.js / NestJS du projet
pkill -f "next dev" 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true
pkill -f "ts-node.*main" 2>/dev/null || true
```

### Étape 2 — Arrêter les services Docker
```bash
docker compose -f infra/docker/docker-compose.dev.yml down
```

### Étape 3 — Confirmer l'arrêt
```bash
docker ps --filter "name=esn_cra" --format "table {{.Names}}\t{{.Status}}"
ss -tlnp | grep -E '3100|3101|5433|9000' || echo "Tous les ports libérés"
```

### Étape 4 — Afficher le récapitulatif
```
✅ Application ESN CRA App arrêtée.

Données conservées dans les volumes Docker.
Pour relancer : /startapp
```

## Note
Si des processus persistent après l'arrêt :
```bash
ss -tlnp | grep -E '3100|3101|5433|9000'
```
Identifier et tuer manuellement si nécessaire.
