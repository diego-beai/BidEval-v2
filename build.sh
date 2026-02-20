#!/bin/bash
# ============================================================
# BidEval - Build & Deploy
# Compila Vite en local (usa .env.production) y reconstruye Docker
# Uso: ./build.sh
# ============================================================

set -e

echo "🔨 Compilando frontend..."

cd front-rfq

# Usar .env.production (no .env.local que apunta a schema desarrollo)
# Guardamos .env.local temporalmente si existe
if [ -f .env.local ]; then
  mv .env.local .env.local.bak
fi

# Compilar con vars de producción
npm run build

# Restaurar .env.local
if [ -f .env.local.bak ]; then
  mv .env.local.bak .env.local
fi

cd ..

echo "🐳 Construyendo imagen Docker..."
docker compose build

echo "🚀 Reiniciando contenedor..."
docker compose up -d --force-recreate

echo "✅ Deploy completado en http://localhost:9102"
