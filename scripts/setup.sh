#!/bin/bash

# ========================================
# BidEval - Script de Configuración
# ========================================
#
# Este script prepara el proyecto para ejecutarse
# en un nuevo dispositivo.
#
# USO:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
#
# ========================================

set -e

echo "=========================================="
echo "   BidEval - Setup Script"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Docker
echo -n "Verificando Docker... "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NO ENCONTRADO${NC}"
    echo "Por favor, instala Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar Docker Compose
echo -n "Verificando Docker Compose... "
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NO ENCONTRADO${NC}"
    echo "Por favor, instala Docker Compose"
    exit 1
fi

echo ""

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Archivo .env no encontrado.${NC}"
    echo "Creando .env desde .env.example..."
    cp .env.example .env
    echo -e "${GREEN}Archivo .env creado.${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANTE: Edita el archivo .env con tus credenciales:${NC}"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    echo "  - VITE_N8N_WEBHOOK_URL"
    echo ""
    read -p "Presiona Enter cuando hayas configurado .env..."
fi

# Verificar que las variables estén configuradas
source .env 2>/dev/null || true

if [ -z "$VITE_SUPABASE_URL" ] || [ "$VITE_SUPABASE_URL" = "https://tu-proyecto.supabase.co" ]; then
    echo -e "${RED}Error: VITE_SUPABASE_URL no está configurado correctamente.${NC}"
    echo "Edita el archivo .env y vuelve a ejecutar este script."
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ] || [ "$VITE_SUPABASE_ANON_KEY" = "tu_clave_anonima_aqui" ]; then
    echo -e "${RED}Error: VITE_SUPABASE_ANON_KEY no está configurado correctamente.${NC}"
    echo "Edita el archivo .env y vuelve a ejecutar este script."
    exit 1
fi

echo -e "${GREEN}Variables de entorno configuradas correctamente.${NC}"
echo ""

# Construir imagen Docker
echo "Construyendo imagen Docker..."
docker-compose build --no-cache

echo ""
echo -e "${GREEN}=========================================="
echo "   Setup completado exitosamente!"
echo "==========================================${NC}"
echo ""
echo "Para iniciar BidEval:"
echo "  docker-compose up -d"
echo ""
echo "Para ver los logs:"
echo "  docker-compose logs -f"
echo ""
echo "Acceder a la aplicación:"
echo "  http://localhost:3002"
echo ""
