#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=== Lancement de Explorer 2 sur macOS ==="

# 1. Vérification de l'environnement virtuel Python
if [ ! -d ".venv" ]; then
    echo "[1/3] Création de l'environnement virtuel Python (.venv)..."
    python3 -m venv .venv
    ./.venv/bin/pip install -r requirements.txt
fi

# 2. Vérification des dépendances Node.js
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/electron" ]; then
    echo "[2/3] Installation des dépendances npm..."
    npm install
fi

# 3. Lancement de l'application Electron
echo "[3/3] Démarrage de l'application..."
npm start
