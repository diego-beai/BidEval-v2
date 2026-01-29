# Solución a Problemas de CORS en BidEval

## 🔍 Problema Identificado

La aplicación está teniendo errores CORS al intentar conectarse a los webhooks de n8n desde el navegador. Esto ocurre porque n8n no tiene configurados los headers CORS necesarios.

---

## ✅ Soluciones Implementadas

### 1. **Desarrollo Local (SOLUCIONADO)**

He configurado el código para usar el proxy de Vite en desarrollo:

**Archivos modificados:**
- `front-rfq/src/config/constants.ts` - Ahora usa rutas `/api/n8n/*` en desarrollo
- `front-rfq/vite.config.ts` - Agregados proxies para scoring y qa-process-email-response

**Para usar en desarrollo:**
```bash
cd front-rfq
npm run dev
```

El servidor de desarrollo ahora correrá en `http://localhost:3002` y usará el proxy para evitar CORS.

---

## 🚀 Soluciones para Producción

Tienes 3 opciones para solucionar CORS en producción:

### Opción 1: Configurar CORS en n8n (RECOMENDADO)

Agrega estos headers en los webhooks de n8n:

**En cada workflow de n8n, agrega un nodo "Set" o "HTTP Response" con:**

```javascript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
}
```

**O en la configuración global de n8n (`docker-compose.yml`):**

```yaml
n8n:
  environment:
    - N8N_CORS_ALLOW_ORIGIN=*
    - N8N_CORS_ALLOW_CREDENTIALS=true
```

---

### Opción 2: Nginx como Proxy Reverso

Actualiza tu `nginx.conf` en producción:

```nginx
server {
    listen 80;
    server_name portalia.ignisenergia.es;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy para webhooks n8n
    location /api/n8n/ {
        # Eliminar el prefijo /api/n8n/
        rewrite ^/api/n8n/(.*)$ /webhook/$1 break;

        proxy_pass https://n8n.beaienergy.com;
        proxy_http_version 1.1;
        proxy_set_header Host n8n.beaienergy.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        # Timeouts largos para procesamiento de PDFs
        proxy_read_timeout 1800s;
        proxy_connect_timeout 1800s;
        proxy_send_timeout 1800s;

        # Manejar preflight OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
            add_header Access-Control-Max-Age 86400;
            return 204;
        }
    }
}
```

**Luego actualiza las variables de entorno en producción:**

```bash
# En tu servidor de producción, crea/actualiza .env
VITE_N8N_WEBHOOK_URL=/api/n8n/ofertas
VITE_N8N_RFQ_INGESTA_URL=/api/n8n/ingesta-rfq
VITE_N8N_CHAT_URL=/api/n8n/chat
VITE_N8N_TABLA_URL=/api/n8n/tabla
VITE_N8N_MAIL_URL=/api/n8n/mail
VITE_N8N_QA_AUDIT_URL=/api/n8n/qa-audit
VITE_N8N_SCORING_URL=/api/n8n/scoring
VITE_N8N_QA_SEND_TO_SUPPLIER_URL=/api/n8n/qa-send-to-supplier
VITE_N8N_QA_PROCESS_RESPONSES_URL=/api/n8n/qa-process-responses
VITE_N8N_QA_SEND_EMAIL_URL=/api/n8n/qa-send-email
VITE_N8N_QA_PROCESS_EMAIL_RESPONSE_URL=/api/n8n/qa-process-email-response
```

---

### Opción 3: Usar Rutas Relativas con Proxy Docker

Si usas Docker Compose, puedes configurar nginx como proxy en el mismo stack:

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "9102:80"
    volumes:
      - ./nginx-prod.conf:/etc/nginx/nginx.conf
      - ./front-rfq/dist:/usr/share/nginx/html
    depends_on:
      - n8n
```

---

## 🐛 Error de Supabase

También veo errores de Supabase "Failed to fetch". Verifica:

1. **Conexión a Supabase:**
```bash
# Verifica que las credenciales estén correctas
cat front-rfq/.env | grep SUPABASE
```

2. **URL de Supabase accesible:**
```bash
curl -I https://tu-proyecto.supabase.co
```

3. **Políticas RLS (Row Level Security):**
   - Asegúrate de que las políticas en Supabase permitan lectura desde tu dominio
   - Verifica en el dashboard de Supabase: Authentication > Policies

---

## 🧪 Prueba los Cambios

### En Desarrollo:
```bash
cd front-rfq
npm run dev
# Visita http://localhost:3002
```

### En Producción:
1. Aplica una de las opciones anteriores
2. Reconstruye el frontend:
```bash
cd front-rfq
npm run build
```
3. Reinicia nginx/docker:
```bash
docker-compose restart nginx
# o
sudo systemctl restart nginx
```

---

## 📞 Soporte

Si sigues teniendo problemas:

1. **Verifica los logs de n8n:**
```bash
docker logs n8n
```

2. **Verifica los logs de nginx:**
```bash
docker logs nginx
# o
tail -f /var/log/nginx/error.log
```

3. **Inspecciona la consola del navegador:**
   - F12 > Console
   - F12 > Network (ver requests fallidos)

4. **Prueba el webhook directamente:**
```bash
curl -X POST https://n8n.beaienergy.com/webhook/ingesta-rfq \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

**Última actualización:** 2025-01-29
