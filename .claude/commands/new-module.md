# Commande : nouveau module NestJS

## Déclencheur
Quand l'utilisateur tape : /new-module <nom>

## Protocole à suivre
1. Lire docs/specs/<nom>.md pour comprendre les entités et règles métier
2. Créer une branche : git checkout -b feat/<nom>/scaffold
3. Scaffolding NestJS : <nom>.module.ts / controller / service / dto/ / entities/
4. Ajouter les entités Prisma correspondantes dans schema.prisma
5. Mettre à jour packages/shared-types/src avec les nouveaux types
6. Créer les fichiers de test unit dans apps/backend/test/unit/<nom>/
7. Mettre à jour docs/tasks/CURRENT_TASK.md
8. Commit : "feat(<nom>): scaffold module structure and Prisma entities"

## Avant de commencer
- Vérifier que la spec existe dans docs/specs/
- Vérifier que le schéma Prisma n'a pas de conflit avec les entités existantes
