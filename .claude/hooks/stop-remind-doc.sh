#!/usr/bin/env bash
# Rappel de fin de session Claude Code
# - PM : mettre à jour la tâche en cours (hors Diátaxis, dans pm/)
# - Doc : signaler si des fichiers code ont été touchés sans MAJ doc associée

set -u

cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0

# --- 1. Rappel PM (tâche en cours) ---
TASK_FILE="pm/CURRENT_TASK.md"
if [[ -f "$TASK_FILE" ]]; then
  echo ""
  echo "📋 Fin de session Claude Code"
  echo "   → Mettre à jour : $TASK_FILE"
  echo "   → Documenter l'état avant /clear (pattern Document & Clear)"
  echo "   → Vérifier que le dernier commit est propre : git status"
fi

# --- 2. Rappel doc : modifications code sans MAJ doc associée ---
# Détecte les commits sur la branche courante qui touchent apps/backend/src/ ou
# apps/frontend/src/ SANS toucher docs/ — suggère /refresh-docs --since <base>.

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [[ -n "$BRANCH" && "$BRANCH" != "main" && "$BRANCH" != "preprod" ]]; then
  # base = preprod (convention craESN) ou main
  if git rev-parse --verify preprod >/dev/null 2>&1; then
    BASE="preprod"
  else
    BASE="main"
  fi

  CHANGED=$(git diff --name-only "$BASE"..HEAD 2>/dev/null || echo "")

  if [[ -n "$CHANGED" ]]; then
    HAS_CODE=$(echo "$CHANGED" | grep -E '^(apps/(backend|frontend)/src/|packages/)' | head -1)
    HAS_DOC=$(echo "$CHANGED" | grep -E '^docs/' | head -1)
    HAS_SCHEMA=$(echo "$CHANGED" | grep -E '^apps/backend/prisma/schema\.prisma$' | head -1)

    if [[ -n "$HAS_CODE" && -z "$HAS_DOC" ]]; then
      echo ""
      echo "📝 Doc — des modifs code sont présentes sur '$BRANCH' sans MAJ doc :"
      echo "   → Lancer : /refresh-docs --since $BASE"
      echo "   → Ou cibler : /refresh-docs --module <module>"
      echo "   → Réf : docs/README.md (index Diátaxis)"
    fi

    if [[ -n "$HAS_SCHEMA" ]]; then
      DB_DOC_TOUCHED=$(echo "$CHANGED" | grep -E '^docs/reference/database\.md$' | head -1)
      if [[ -z "$DB_DOC_TOUCHED" ]]; then
        echo ""
        echo "🗄️  Schema Prisma modifié sans MAJ docs/reference/database.md :"
        echo "   → Mettre à jour le diagramme erDiagram et les tableaux d'entités"
      fi
    fi
  fi
fi

exit 0
