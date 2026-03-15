#!/usr/bin/env bash
# Bloque les commandes destructives ou git risqués sans confirmation explicite.
# Exit 2 = bloque + affiche le message. Exit 0 = laisse passer.
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" \
  2>/dev/null || echo "")

# Patterns destructifs base de données
DB_PATTERNS=("DROP TABLE" "DROP DATABASE" "TRUNCATE" "DROP SCHEMA" "pg_drop_replication_slot")
# Commandes système risquées
SYS_PATTERNS=("rm -rf /" "rm -rf \$HOME" "chmod -R 777 /")
# Git dangereux sur main
GIT_PATTERNS=("git push.*--force.*main" "git push.*-f.*main" "git reset.*--hard.*main")

for p in "${DB_PATTERNS[@]}" "${SYS_PATTERNS[@]}" "${GIT_PATTERNS[@]}"; do
  if echo "$CMD" | grep -iE "$p" > /dev/null 2>&1; then
    echo "🚫 Commande bloquée — pattern dangereux détecté : [$p]"
    echo "   Si intentionnel, exécutez-la manuellement hors de Claude Code."
    exit 2
  fi
done
exit 0
