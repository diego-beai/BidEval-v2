#!/bin/bash

echo "🚀 Iniciando n8n..."

# Verificar si npx está disponible
if ! command -v npx &> /dev/null; then
    echo "❌ npx no está disponible. Instala Node.js primero."
    exit 1
fi

# Verificar la versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js versión $NODE_VERSION detectada. n8n requiere Node.js >= 20.19"
    echo "💡 Recomendación: Actualiza Node.js usando nvm o fnm"
fi

echo "📦 Ejecutando n8n con npx..."
echo "🌐 n8n estará disponible en: http://localhost:5678"
echo "🛑 Presiona Ctrl+C para detener"

# Ejecutar n8n con configuración básica
npx n8n@latest \
    --tunnel=false \
    --webhookUrl=http://localhost:5678/ \
    --port=5678





