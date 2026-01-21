#!/bin/bash

# ========================================
# BidEval - Script de Migración
# ========================================
#
# Este script ayuda a migrar BidEval a un nuevo dispositivo.
#
# PASOS DE MIGRACIÓN:
#
# 1. En el dispositivo ORIGEN:
#    - Exportar workflows de N8N (ya están en /workflow n8n/)
#    - Exportar datos de Supabase (opcional)
#
# 2. En el dispositivo DESTINO:
#    - Clonar repositorio o copiar carpeta
#    - Ejecutar: ./scripts/migrate.sh
#
# ========================================

set -e

echo "=========================================="
echo "   BidEval - Migration Script"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}CHECKLIST DE MIGRACIÓN:${NC}"
echo ""

echo "1. REQUISITOS PREVIOS"
echo "   [ ] Docker y Docker Compose instalados"
echo "   [ ] Acceso a Supabase (URL y ANON_KEY)"
echo "   [ ] Acceso a N8N (URL de webhooks)"
echo ""

echo "2. ARCHIVOS NECESARIOS"
echo "   [ ] Código fuente (este repositorio)"
echo "   [ ] Workflows N8N (carpeta 'workflow n8n/')"
echo "   [ ] Schema de base de datos (bbdd.sql)"
echo ""

echo "3. PASOS DE MIGRACIÓN"
echo ""

echo -e "${YELLOW}Paso 1: Configurar variables de entorno${NC}"
if [ ! -f ".env" ]; then
    echo "   Creando archivo .env..."
    cp .env.example .env
    echo -e "   ${GREEN}Archivo .env creado.${NC}"
    echo ""
    echo "   EDITA .env con tus credenciales:"
    echo "   nano .env"
    echo ""
else
    echo -e "   ${GREEN}Archivo .env ya existe.${NC}"
fi

echo -e "${YELLOW}Paso 2: Importar workflows en N8N${NC}"
echo "   Los workflows están en: ./workflow n8n/"
echo ""
echo "   Archivos a importar:"
for file in "workflow n8n"/*.json; do
    if [ -f "$file" ]; then
        echo "   - $(basename "$file")"
    fi
done
echo ""
echo "   Para importar en N8N:"
echo "   1. Abre tu instancia de N8N"
echo "   2. Ve a Settings > Import"
echo "   3. Selecciona cada archivo JSON"
echo "   4. Activa los workflows"
echo ""

echo -e "${YELLOW}Paso 3: Configurar base de datos${NC}"
echo "   Si es una nueva instalación, ejecuta bbdd.sql en Supabase:"
echo "   1. Abre Supabase Dashboard"
echo "   2. Ve a SQL Editor"
echo "   3. Pega el contenido de bbdd.sql"
echo "   4. Ejecuta el script"
echo ""

echo -e "${YELLOW}Paso 4: Construir y ejecutar${NC}"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""

echo -e "${YELLOW}Paso 5: Verificar${NC}"
echo "   Abre http://localhost:3002"
echo "   Verifica que puedas:"
echo "   [ ] Ver el dashboard"
echo "   [ ] Crear un proyecto"
echo "   [ ] Subir un archivo PDF"
echo ""

echo "=========================================="
echo ""
read -p "¿Deseas ejecutar el setup ahora? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/setup.sh
fi
