# Troubleshooting - RFQ Processor

## Problemas Comunes y Soluciones

### 1. La tabla no se muestra después del procesamiento

**Síntomas:**
- El procesamiento termina exitosamente
- No se muestra la tabla de resultados
- En la consola aparecen logs de "No results to display"

**Posibles causas:**
- La transformación de datos está fallando
- La URL del webhook no coincide con el backend
- Error en el formato de respuesta del servidor

**Solución:**
1. Verificar que la URL del webhook sea correcta:
   ```
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/rfq
   ```
2. Revisar los logs de transformación en la consola del navegador
3. Verificar que el backend esté devolviendo datos en el formato esperado

### 2. Error de CORS

**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solución automática para desarrollo:**
- El proyecto ya incluye configuración de proxy en Vite
- En desarrollo, las peticiones se redirigen automáticamente a través del proxy
- Para producción, configura CORS en tu servidor n8n:

```bash
# En n8n, configura los siguientes headers CORS:
Access-Control-Allow-Origin: https://tu-dominio.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Cómo funciona:**
- Desarrollo: Peticiones van a través de `/api/n8n/` → `http://localhost:5678/`
- Producción: Peticiones directas usando `VITE_N8N_WEBHOOK_URL`

### 3. Error 500 Internal Server Error

**Causa:** El servidor n8n está devolviendo un error interno

**Solución:**
- Verificar que n8n esté ejecutándose correctamente
- Revisar los logs del servidor n8n
- Verificar que el webhook esté configurado correctamente

### 4. Uso alto de memoria

**Síntomas:** La aplicación consume más de 1GB de RAM

**Solución:**
- Los logs de memoria se han reducido a cada 5 minutos solo en desarrollo
- Limpiar el estado al resetear la aplicación
- Evitar memory leaks en componentes

### 5. Tiempo de carga negativo

**Causa:** Problema en la medición del performance timing

**Solución:**
- Se ha corregido el código de medición de performance
- Ahora usa PerformanceObserver para mediciones más precisas

## Configuración Recomendada

### Variables de Entorno (.env)

Crear un archivo `.env` en la raíz del proyecto con:

```bash
# URL del webhook de n8n (para producción - desarrollo usa proxy automático)
VITE_N8N_WEBHOOK_URL=https://tu-dominio.com/webhook/rfq

# Timeout en milisegundos (10 minutos por defecto)
VITE_REQUEST_TIMEOUT=600000
```

> **Nota:** Para desarrollo local, no necesitas configurar nada. El proxy automático se encarga de las peticiones CORS. Solo configura estas variables para producción.

### Problema de "DebugInfo is not defined"

Si ves este error en la consola:
1. Limpia el cache del navegador (Ctrl+Shift+R o Cmd+Shift+R)
2. Reinicia el servidor de desarrollo
3. Si persiste, ejecuta: `rm -rf node_modules/.vite && npm run dev`

### Problema de Logs Excesivos

Los logs de desarrollo han sido eliminados. Si necesitas debugging:
1. Los logs solo aparecen en modo desarrollo (`npm run dev`)
2. Para producción limpia: `npm run clean-debug`
3. Reinicia el servidor después de limpiar logs

### Configuración de n8n

**Paso 1: Crear el Webhook**
1. En n8n, crea un nodo "Webhook"
2. Configura el método como "POST"
3. Establece el path como "rfq" (sin barra inicial)
4. Conecta el webhook a tu workflow de procesamiento

**Paso 2: Activar el Webhook**
- En modo test: Haz click en "Execute workflow" en el canvas
- En producción: Activa el workflow

**Paso 3: Verificar Configuración**
- El webhook debe aceptar: Método POST, Content-Type: application/json
- Para producción: Configurar CORS headers apropiados

**Nota:** En modo test de n8n, el webhook solo funciona para una llamada después de ejecutar el workflow.

## Logs de Debug

En modo desarrollo, la aplicación muestra información de debug:
- Estado actual de procesamiento
- Resultados transformados
- Errores de API
- Uso de memoria (cada 5 minutos)

Para producción, ejecutar:
```bash
npm run clean-debug
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Limpiar logs de debug
npm run clean-debug

# Optimizar imágenes
npm run optimize-images
```
