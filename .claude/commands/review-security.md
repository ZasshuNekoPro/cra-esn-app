# Commande : audit de sécurité

## Déclencheur
Quand l'utilisateur tape : /review-security

## Ce que cette commande vérifie
1. Tous les endpoints NestJS ont-ils JwtAuthGuard + RolesGuard ?
2. ConsentGuard présent sur les routes ESN accédant aux données salarié ?
3. ResourceOwnerGuard sur les routes salarié accédant à ses ressources ?
4. Aucun accès cross-salarié dans les queries Prisma (WHERE employeeId = ?) ?
5. Audit logs présents sur les mutations sensibles ?
6. Aucun secret en dur dans le code (process.env.X direct → ConfigService) ?
7. Isolation RAG : chaque query filtrée sur employeeId ?
8. URLs présignées S3 avec expiration < 2h ?

## Format de sortie
Rapport markdown structuré :
✅ OK | ⚠️ À vérifier | ❌ Problème critique

Terminer par un résumé des actions correctives prioritaires.
