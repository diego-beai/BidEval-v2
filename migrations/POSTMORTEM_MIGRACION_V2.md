# Postmortem: Migracion BidEval v2 a Produccion

**Fecha:** 2026-02-17
**Duracion del incidente:** ~1.5 horas

---

## Resumen

Durante la migracion del schema `desarrollo` a `public` en Supabase self-hosted, se produjeron varios errores que afectaron a BidEval y temporalmente al BeAI Dashboard.

---

## Errores y Soluciones

### 1. RAISE NOTICE fuera de bloque PL/pgSQL

**Error:**
```
ERROR: 42601: syntax error at or near "RAISE"
```

**Causa:** `RAISE NOTICE` es una instruccion PL/pgSQL que solo puede usarse dentro de un bloque `DO $$ ... END $$`, no directamente en SQL.

**Solucion:** Reemplazar los `RAISE NOTICE` sueltos por comentarios SQL (`-- ...`).

---

### 2. No se puede cambiar return type de funcion existente

**Error:**
```
ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION soft_delete_project(uuid) first.
```

**Causa:** Las funciones de v1 en `public` tenian tipos de retorno diferentes a las de v2. `CREATE OR REPLACE FUNCTION` no permite cambiar el return type.

**Solucion:** Anadir `DROP FUNCTION IF EXISTS ... CASCADE` antes de cada `CREATE OR REPLACE FUNCTION`.

**Efecto secundario:** El `CASCADE` en los drops de funciones elimino triggers en otros schemas que dependian de funciones de `public` (como `update_updated_at()`). No afecto tablas ni datos.

---

### 3. PostgREST devuelve 406 (Not Acceptable)

**Error:**
```
Failed to load resource: the server responded with a status of 406
```

**Causa:** PostgREST tenia configurado `pgrst.db_schemas` a nivel de rol en la base de datos (rol `authenticator`), limitado a `public, uc70`. Esta configuracion in-database **sobreescribe** la variable de entorno `PGRST_DB_SCHEMAS` del `.env`.

**Diagnostico:**
```sql
SELECT setdatabase, setrole, setconfig
FROM pg_db_role_setting
WHERE setconfig::text LIKE '%pgrst%';
```

Resultado: `pgrst.db_schemas=public, uc70` (faltaban `beai`, `desarrollo`, `uc50`, etc.)

**Solucion:**
```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public,storage,graphql_public,desarrollo,uc50,uc70,beai';
```

Luego recargar PostgREST:
```bash
docker kill -s SIGUSR1 supabase-rest
```

**Leccion:** En PostgREST v14, la prioridad de configuracion es:
1. In-database (ALTER ROLE) - **maxima prioridad**
2. Variables de entorno (.env)
3. Archivo de configuracion

Siempre verificar con la query de `pg_db_role_setting`.

---

### 4. PostgREST pierde conexion a la base de datos al recrear contenedor

**Error:**
```
connection to server at "db" (172.22.0.12), port 5432 failed: Network unreachable
```

**Causa:** Al recrear el contenedor PostgREST con `docker run`, el comando `docker network disconnect` cortaba la red antes de que `docker network connect --alias rest` la restableciera.

**Solucion:** Usar `--network-alias` directamente en `docker run`:
```bash
docker run -d \
  --name supabase-rest \
  --restart unless-stopped \
  --network supabase-project_default \
  --network-alias rest \
  --env-file ~/supabase-project/.env \
  -v /tmp/passwd:/etc/passwd:ro \
  postgrest/postgrest:v14.1 postgrest
```

**Leccion:** No usar disconnect+connect. Usar `--network-alias` en el `docker run`.

---

### 5. Kong no alcanza PostgREST (503)

**Error:**
```
Failed to load resource: the server responded with a status of 503
```

**Causa:** Kong busca el hostname `rest` (nombre del servicio en docker-compose). Si el contenedor PostgREST se recrea sin el alias `rest`, Kong no puede encontrarlo.

**Solucion:** Asegurar que el contenedor tiene el alias `rest` en la red (ver solucion del punto 4).

---

## Procedimiento correcto para recrear PostgREST

```bash
# 1. Crear passwd (necesario para PostgREST)
echo "root:x:0:0:root:/root:/bin/sh" > /tmp/passwd
echo "postgrest:x:1000:1000::/tmp:/bin/sh" >> /tmp/passwd

# 2. Parar y eliminar
docker stop supabase-rest 2>/dev/null; docker rm supabase-rest 2>/dev/null

# 3. Levantar con alias de red
docker run -d \
  --name supabase-rest \
  --restart unless-stopped \
  --network supabase-project_default \
  --network-alias rest \
  --env-file ~/supabase-project/.env \
  -v /tmp/passwd:/etc/passwd:ro \
  postgrest/postgrest:v14.1 postgrest

# 4. Verificar
sleep 3 && docker logs supabase-rest --tail 5
```

---

## Verificaciones post-migracion

```bash
# PostgREST carga suficientes Relations (>80)
docker logs supabase-rest --tail 5

# API responde para public
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:8000/rest/v1/projects?select=id&limit=1" \
  -H "apikey: $(grep '^ANON_KEY=' ~/supabase-project/.env | cut -d= -f2-)" \
  -H "Accept-Profile: public"

# API responde para beai
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:8000/rest/v1/use_cases?select=id&limit=1" \
  -H "apikey: $(grep '^ANON_KEY=' ~/supabase-project/.env | cut -d= -f2-)" \
  -H "Accept-Profile: beai"

# Schemas expuestos (desde SQL Editor)
SELECT setconfig FROM pg_db_role_setting
WHERE setconfig::text LIKE '%pgrst%';
```
