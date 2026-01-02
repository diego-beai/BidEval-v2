# 🔧 Configuración de Servicios - Solución Problemas Docker

## 🚨 Problema Detectado

Los servicios no se están levantando correctamente. Docker Desktop está instalado pero el daemon no está disponible.

## ✅ Soluciones Disponibles

### Opción 1: Reiniciar Docker Desktop (Recomendado)

1. **Cierra Docker Desktop completamente**:
   ```bash
   # En macOS, desde el menú de Docker Desktop o con:
   killall "Docker Desktop"
   ```

2. **Espera 10-15 segundos** y vuelve a abrir Docker Desktop desde Spotlight/Launchpad

3. **Espera a que aparezca el ícono de la ballena verde** en la barra de menú

4. **Verifica que Docker esté funcionando**:
   ```bash
   docker ps -a
   ```

### Opción 2: Usar Docker Compose (Una vez que Docker funcione)

He creado un archivo `docker-compose.yml` para ejecutar n8n:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=false
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_PERSONALIZATION_ENABLED=false
      - WEBHOOK_URL=http://localhost:5678/
      - N8N_ENCRYPTION_KEY=your-random-encryption-key-here-change-this
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
    driver: local
```

**Para ejecutar:**
```bash
docker-compose up -d
```

**Para ver logs:**
```bash
docker-compose logs -f n8n
```

**Para detener:**
```bash
docker-compose down
```

### Opción 3: Ejecutar n8n directamente (Sin Docker)

He creado un script `start-n8n.sh` que ejecuta n8n usando npx:

```bash
# Hacer ejecutable el script
chmod +x start-n8n.sh

# Ejecutar n8n
./start-n8n.sh
```

**Nota:** Requiere Node.js >= 20.19. Si tienes una versión anterior, actualiza Node.js primero.

### Opción 4: Verificar estado actual

Ejecuta el script de verificación incluido:

```bash
cd front-rfq
npm run check-n8n
# o directamente:
node check-n8n.js
```

## 🔍 Diagnóstico de Problemas

### Si Docker sigue sin funcionar:

1. **Verifica que Docker Desktop esté abierto** en la barra de menú
2. **Revisa el diagnóstico de Docker**:
   - Click derecho en ícono de Docker → "Troubleshoot"
   - O desde menú: Docker Desktop → "Troubleshoot"
3. **Reinicia el servicio de Docker** (requiere permisos de admin)

### Si n8n no responde:

1. **Verifica que esté corriendo en el puerto correcto**:
   ```bash
   lsof -i :5678
   ```

2. **Revisa logs de n8n** (dependiendo del método usado):
   ```bash
   # Docker Compose
   docker-compose logs -f n8n

   # Docker directo
   docker logs <container_id>

   # npx directo - logs aparecen en la terminal
   ```

## 🎯 Próximos Pasos

Una vez que n8n esté funcionando en `http://localhost:5678`:

1. **Importa el workflow** "RFQ-multiples ofertas v4" (debería estar en el archivo JSON)
2. **Configura las credenciales** necesarias (OpenRouter, Supabase, etc.)
3. **Activa el workflow**
4. **Inicia el frontend**:
   ```bash
   cd front-rfq
   npm run dev
   ```

## 📝 Notas Importantes

- **El frontend requiere n8n corriendo** en `localhost:5678`
- **El webhook de RFQ** debe estar configurado en el path `/webhook/rfq`
- **El chat usa el webhook** `/api/n8n/webhook/072a6322-4bb1-444b-bd82-5c1df6db623f/chat`
- **Sin autenticación** requerida para desarrollo local

## 🆘 Si nada funciona

1. **Verifica la versión de macOS** (Docker Desktop requiere macOS 10.15+)
2. **Actualiza Docker Desktop** a la última versión
3. **Reinstala Docker Desktop** si es necesario
4. **Considera usar una VM** con Docker si persisten los problemas

---

**Estado actual:** Docker daemon no disponible. Usa las opciones 1-3 para resolver.





