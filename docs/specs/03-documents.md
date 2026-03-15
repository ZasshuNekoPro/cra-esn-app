# Spécification — Module Documents

## Entités
- **Document** : id, name, mimeType, s3Key, ownerId, missionId, projectId?, currentVersion
- **DocumentVersion** : documentId, version (int), s3Key, uploadedAt, uploadedById
- **DocumentShare** : documentId, sharedWithRole (ESN|CLIENT), expiresAt?, revokedAt?

## Clé S3
Format : {ownerId}/{missionId}/{projectId_or_'mission'}/{uuid}-{slug(filename)}
Chiffrement : SSE-S3 côté serveur
Taille maximale : 50 MB par fichier

## Upload et versioning
- Premier upload → Document créé + DocumentVersion v1
- Nouvel upload même nom + même scope → DocumentVersion v(n+1) créée
- Ancien s3Key conservé (jamais supprimé tant que versions existent)
- Interface : liste des versions avec date et auteur

## Partage
- Salarié choisit la visibilité : ESN | CLIENT | BOTH
- Partage créé → DocumentShare enregistré + notification au destinataire
- Révocation : revokedAt = now() → accès coupé immédiatement
- Téléchargement : URL présignée S3 (expiration 1 heure)
- Audit log sur chaque génération d'URL présignée

## Intégration ValidationRequest
Un Document peut être joint à une ValidationRequest au moment de sa création
Le destinataire de la validation voit le document dans sa demande de validation
