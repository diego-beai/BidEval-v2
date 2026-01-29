# 🚀 Guía de Deployment - BidEval

## ✅ Cambios Realizados

### 1. **nginx.conf actualizado**
- ✅ Agregado proxy `/api/n8n/*` que redirige a `https://n8n.beaienergy.com/webhook/*`
- ✅ Headers CORS configurados correctamente
- ✅ Timeouts de 30 minutos para procesamiento de PDFs
- ✅ Manejo de preflight OPTIONS requests

### 2. **.env.production creado**
- ✅ URLs de n8n ahora son relativas (`/api/n8n/*`)
- ✅ Esto evita problemas CORS al usar el proxy

---

## 📋 Paso 1: Aplicar Optimización de Base de Datos

**IMPORTANTE:** Debes aplicar el script SQL antes de deployar el frontend.

### En Supabase Dashboard:

1. Ve a: https://supabase.beaienergy.com
2. Navega a **SQL Editor** en el menú lateral
3. Abre el archivo `database_optimization.sql` en tu local
4. Copia TODO el contenido
5. Pégalo en el SQL Editor
6. Click en **Run** (botón verde arriba a la derecha)
7. Espera ~30 segundos (verás "Success" cuando termine)

### Verificar que funcionó:

Ejecuta esto en SQL Editor:

```sql
-- Ver índices creados
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'document_metadata'
ORDER BY indexname;
```

Deberías ver varios índices que empiezan con `idx_document_metadata_*`

---

## 📋 Paso 2: Reconstruir Frontend

Ahora que tienes `.env.production`, el build usará las URLs relativas:

```bash
cd front-rfq
npm run build
```

Esto creará el directorio `dist/` con el frontend optimizado.

---

## 📋 Paso 3: Rebuild del Container Docker

Con los nuevos archivos (nginx.conf, .env.production), reconstruye el contenedor:

```bash
# Desde el directorio raíz del proyecto
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Nota:** `--no-cache` asegura que use los archivos nuevos.

---

## 📋 Paso 4: Verificar que Funciona

### 4.1 Verificar que el contenedor está corriendo:

```bash
docker-compose ps
```

Deberías ver:
```
NAME     IMAGE           STATUS
bideval  bideval-bideval Up
```

### 4.2 Verificar logs:

```bash
docker-compose logs -f bideval
```

No deberías ver errores de nginx.

### 4.3 Probar el proxy:

```bash
# Desde tu máquina local o servidor
curl -v http://localhost:9102/api/n8n/tabla

# Deberías ver headers CORS en la respuesta:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 4.4 Probar el frontend:

1. Abre el navegador en: http://localhost:9102 (o tu dominio de producción)
2. Abre DevTools (F12)
3. Ve a la pestaña **Network**
4. Recarga la página
5. Busca requests a `/api/n8n/*`
6. **NO** deberías ver errores CORS

---

## 🎯 URLs Antes y Después

### Antes (causaba CORS):
```
Frontend: https://portalia.ignisenergia.es
Request:  https://n8n.beaienergy.com/webhook/tabla
❌ CORS Error (dominios diferentes)
```

### Después (sin CORS):
```
Frontend: https://portalia.ignisenergia.es
Request:  https://portalia.ignisenergia.es/api/n8n/tabla
Nginx:    Redirige a https://n8n.beaienergy.com/webhook/tabla
✅ Sin CORS (mismo dominio desde perspectiva del navegador)
```

---

## 🐛 Troubleshooting

### Error: "502 Bad Gateway" en /api/n8n/*

**Causa:** nginx no puede conectarse a n8n.beaienergy.com

**Solución:**
```bash
# Verifica que n8n está accesible
curl -I https://n8n.beaienergy.com/webhook/tabla

# Si no responde, verifica que n8n esté corriendo
docker ps | grep n8n
```

---

### Error: Sigue apareciendo CORS

**Causa 1:** El build del frontend todavía usa URLs antiguas

**Solución:**
```bash
cd front-rfq
rm -rf dist/
npm run build
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Causa 2:** Caché del navegador

**Solución:**
- Abre DevTools (F12)
- Click derecho en el botón de recargar
- Selecciona "Empty Cache and Hard Reload"

---

### Error: "Cannot GET /api/n8n/tabla"

**Causa:** nginx no tiene la configuración del proxy

**Solución:**
```bash
# Verifica que el nginx.conf tiene la configuración
docker exec bideval cat /etc/nginx/nginx.conf | grep "location /api/n8n/"

# Si no aparece, necesitas rebuildar el container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Dashboard sigue lento después de aplicar SQL

**Causa:** Los índices no se crearon o necesitan actualizarse

**Solución:**
```sql
-- En Supabase SQL Editor
-- Verificar índices
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'document_metadata';

-- Forzar refresh de stats
VACUUM ANALYZE public.document_metadata;
VACUUM ANALYZE public.projects;

-- Refrescar vista materializada
SELECT refresh_projects_stats();
```

---

## 📊 Verificación de Performance

Después de aplicar todo:

### Dashboard debería:
- ✅ Cargar en <500ms (antes: 2-5 segundos)
- ✅ Sin errores CORS en consola
- ✅ Sin "Failed to fetch" en red

### Queries de Supabase:
```sql
-- Esta query debería tardar <10ms
EXPLAIN ANALYZE
SELECT * FROM document_metadata
WHERE project_id = 'algún-uuid'
  AND document_type = 'PROPOSAL';

-- Debería mostrar "Index Scan" (no "Seq Scan")
```

---

## 🎉 Checklist Final

Antes de marcar como terminado, verifica:

- [ ] Script SQL ejecutado en Supabase
- [ ] Índices verificados con query de verificación
- [ ] Frontend reconstruido con `npm run build`
- [ ] Container Docker rebuildeado con `--no-cache`
- [ ] Container corriendo: `docker-compose ps`
- [ ] Proxy funcionando: `curl localhost:9102/api/n8n/tabla`
- [ ] Frontend sin errores CORS en DevTools
- [ ] Dashboard carga rápido (<500ms)

---

## 🔄 Deshacer Cambios (Rollback)

Si algo sale mal:

```bash
# 1. Restaurar nginx.conf anterior
git checkout nginx.conf

# 2. Eliminar .env.production
rm front-rfq/.env.production

# 3. Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📞 Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. Revisa los logs:
   ```bash
   docker-compose logs -f bideval
   ```

2. Verifica nginx:
   ```bash
   docker exec bideval nginx -t
   ```

3. Verifica variables de entorno:
   ```bash
   docker exec bideval env | grep VITE
   ```

---

**Última actualización:** 2026-01-29
**Versión:** 1.0
