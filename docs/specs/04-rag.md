# Spécification — Module RAG

## Stack technique
- Stockage vecteurs : pgvector (extension PostgreSQL 15)
- Orchestration : LangChain.js
- Modèle embedding : text-embedding-3-small (OpenAI)
- Chunking : 512 tokens, overlap 50 tokens
- Similarité : cosine distance

## Sources indexées (par salarié — isolation stricte)
- CraMonth.activitySummary + notes journalières des CraEntry
- ProjectComment.content (commentaires dont visibility inclut EMPLOYEE)
- WeatherEntry.comment (historique avec contexte)
- Document (texte extrait si PDF/txt, métadonnées sinon)
- Milestone (titre, dates, statut, commentaire de décision)

## Table de vecteurs
```sql
CREATE TABLE embeddings (
  id          UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES users(id),
  source_type VARCHAR(50) NOT NULL,  -- 'cra' | 'project_comment' | 'document' | ...
  source_id   UUID NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

## Isolation des données
- Chaque embedding stocké avec employee_id
- Toute requête filtrée : WHERE employee_id = $session.userId
- Interdit : accès cross-salarié, même pour ESN_ADMIN via ce canal
- Le RAG est un outil personnel du salarié, pas un outil de supervision

## Exemples de requêtes attendues
- "Combien de jours de CP me reste-t-il cette année ?"
- "Résume mes activités du mois de février"
- "Quels projets ont eu des blocages ce trimestre ?"
- "Quelles validations sont en attente sur mes projets ?"
- "Aide-moi à rédiger le résumé d'activité de mon CRA"
- "Quel était l'état du projet X la semaine dernière ?"
