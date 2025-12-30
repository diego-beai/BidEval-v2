# Configuración del Chat con n8n

Este documento explica cómo está configurado el sistema de chat integrado con n8n y cómo personalizarlo.

## Arquitectura del Chat

### Componentes Frontend

1. **Tipos** (`src/types/chat.types.ts`)
   - Define los tipos TypeScript para mensajes, roles y estados del chat

2. **Servicio** (`src/services/chat.service.ts`)
   - Maneja la comunicación con el webhook de n8n
   - Envía mensajes y recibe respuestas del agente RAG

3. **Store** (`src/stores/useChatStore.ts`)
   - Gestiona el estado global del chat con Zustand
   - Persiste mensajes y sessionId en localStorage
   - Maneja estados de carga y errores

4. **Componente UI** (`src/components/chat/ChatWidget.tsx`)
   - Widget flotante con diseño moderno
   - Botón flotante que muestra el número de mensajes
   - Interfaz de chat con scroll automático
   - Indicadores de carga y errores

5. **Estilos** (`styles.css`)
   - Estilos CSS integrados con el theme existente
   - Responsive y con animaciones suaves

### Workflow de n8n

El chat se conecta al workflow **"RFQ-multiples ofertas v3"** que incluye:

- **Trigger**: "When chat message received" (webhook ID: `072a6322-4bb1-444b-bd82-5c1df6db623f`)
- **Memoria**: Postgres Chat Memory para mantener el historial de conversación
- **Agente**: RAG AI Agent con acceso a:
  - `consultar_ofertas` (Vector Store): Búsqueda en PDFs originales
  - `consultar_tabla_evaluacion` (Structured Data): Datos tabulares de evaluación
  - `List Documents`: Lista de documentos disponibles
  - `Get File Contents`: Contenido de archivos
  - `Query Document Rows`: Consultas SQL sobre datos

## Configuración del Webhook de Chat en n8n

### ✅ Estado Actual: SIN AUTENTICACIÓN

El frontend **NO** envía ninguna autenticación. Solo envía:
- `Content-Type: application/json`
- Payload con el mensaje y sessionId

El trigger del chat en n8n debe estar configurado **SIN autenticación**:

```javascript
{
  "public": true,
  "authentication": "none",  // ✅ Sin autenticación
  "initialMessages": "Hola! 👋\nQué quieres saber hoy?",
  "options": {
    "allowFileUploads": true,
    "title": "Hola! 👋"
  }
}
```

### Si aún tienes autenticación en n8n

1. **Abre n8n** y navega al workflow "RFQ-multiples ofertas v3"
2. **Selecciona el nodo** "When chat message received"
3. **Cambia** `Authentication` a "None"
4. **Guarda y activa** el workflow

## URLs y Endpoints

### Desarrollo (con proxy)
```
Frontend: http://localhost:3000
n8n: http://localhost:5678
Chat Webhook: /api/n8n/webhook/072a6322-4bb1-444b-bd82-5c1df6db623f/chat
```

El proxy de Vite redirige `/api/n8n/*` a `http://localhost:5678/*`

### Producción

Configura las variables de entorno:

```bash
# .env.production
VITE_N8N_CHAT_URL=https://tu-n8n.com/webhook/072a6322-4bb1-444b-bd82-5c1df6db623f/chat
```

## Uso del Chat

### Desde la UI

1. Click en el **botón flotante** en la esquina inferior derecha
2. Escribe tu pregunta sobre las ofertas
3. El chat responde usando:
   - Datos de la tabla de evaluación
   - Contenido de los PDFs procesados
   - Memoria de la conversación

### Ejemplos de Preguntas

```
"¿Cuál es el precio de IDOM para ingeniería básica?"
"Compara los precios de todos los proveedores"
"¿Qué incluye la oferta de SACYR?"
"Muéstrame las brechas entre los requisitos y la oferta de TR"
```

## Personalización

### Cambiar el Mensaje Inicial

En n8n, edita el campo `initialMessages` del trigger.

### Modificar el System Prompt

En n8n, edita el nodo "RAG AI Agent", campo `systemMessage`:

```
Eres un Asistente Técnico de Compras experto en Licitaciones (RFQ).
Tu objetivo es ayudar al usuario a comparar requisitos técnicos...
```

### Agregar más Herramientas

En n8n, conecta nuevos nodos de herramientas al "RAG AI Agent":
- Database Tools
- HTTP Request Tools
- Custom Tools

### Cambiar el Modelo LLM

En n8n, reemplaza el nodo "OpenRouter Chat Model" por otro modelo:
- OpenAI
- Anthropic Claude
- Mistral
- Ollama (local)

## Estructura de Datos

### Mensaje enviado al webhook

```typescript
{
  action: "sendMessage",
  sessionId: "chat-1234567890-abc123",
  chatInput: "¿Cuál es el precio de IDOM?"
}
```

### Respuesta del webhook

```typescript
{
  output: "Según la tabla de evaluación...",
  sessionId: "chat-1234567890-abc123"
}
```

## Troubleshooting

### El chat no se conecta

1. Verifica que n8n esté corriendo en `http://localhost:5678`
2. Verifica que el workflow esté **activo**
3. Revisa la consola del navegador para errores de red

### El chat responde con errores

1. Verifica que los datos estén en la base de datos
2. Revisa los logs de n8n para ver el error del workflow
3. Verifica las credenciales de las herramientas (Supabase, OpenRouter, etc.)

### El chat no recuerda la conversación

1. Verifica que "Postgres Chat Memory" esté conectado correctamente
2. Verifica las credenciales de PostgreSQL en n8n
3. El sessionId se guarda en localStorage del navegador

### Problemas de CORS

El proxy de Vite maneja CORS en desarrollo. En producción:
- Configura CORS en n8n
- O usa un proxy/gateway (nginx, Traefik, etc.)

## Próximos Pasos

### Mejoras Sugeridas

1. **Streaming de Respuestas**: Implementar SSE para respuestas en tiempo real
2. **Subida de Archivos**: Permitir adjuntar PDFs desde el chat
3. **Formateo de Mensajes**: Markdown, tablas, listas
4. **Historial Persistente**: Sincronizar con backend
5. **Notificaciones**: Alertas cuando hay nuevas respuestas
6. **Multi-usuario**: Chats separados por usuario/proyecto

### Seguridad

Si planeas exponer el chat públicamente:

1. **Implementa rate limiting** en n8n
2. **Agrega autenticación** (JWT, OAuth)
3. **Valida inputs** para prevenir inyección
4. **Limita el tamaño** de mensajes y archivos
5. **Monitorea el uso** para prevenir abuso

## Referencias

- [n8n Chat Trigger Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/)
- [n8n AI Agents](https://docs.n8n.io/advanced-ai/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Best Practices](https://react.dev/)
