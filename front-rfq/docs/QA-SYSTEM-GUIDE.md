# Guía del Sistema Q&A (Preguntas y Respuestas)

Esta guía explica cómo funciona el módulo de Q&A (Questions & Answers) para la gestión de preguntas técnicas a proveedores.

---

## Índice

1. [Resumen General](#resumen-general)
2. [Estados de las Preguntas](#estados-de-las-preguntas)
3. [Flujo de Trabajo Principal](#flujo-de-trabajo-principal)
4. [Generar Preguntas con IA](#generar-preguntas-con-ia)
5. [Revisar y Aprobar Preguntas](#revisar-y-aprobar-preguntas)
6. [Enviar Preguntas a Proveedores](#enviar-preguntas-a-proveedores)
7. [Gestionar Respuestas](#gestionar-respuestas)
8. [Preguntas de Seguimiento (Follow-ups)](#preguntas-de-seguimiento-follow-ups)
9. [Ver Historial de Conversación](#ver-historial-de-conversación)
10. [Portal del Proveedor](#portal-del-proveedor)
11. [Filtros y Exportación](#filtros-y-exportación)
12. [Notificaciones](#notificaciones)

---

## Resumen General

El sistema Q&A permite:
- **Generar automáticamente** preguntas técnicas usando IA basadas en los requisitos del RFQ
- **Enviar cuestionarios** a proveedores a través de un portal web seguro
- **Gestionar respuestas** y evaluar si son satisfactorias
- **Crear preguntas de seguimiento** cuando se necesita más información
- **Mantener trazabilidad** completa del historial de conversaciones

---

## Estados de las Preguntas

Cada pregunta puede tener uno de los siguientes estados:

| Estado | Descripción | Color |
|--------|-------------|-------|
| **Draft** | Borrador - Pregunta creada pero no aprobada | Gris |
| **Approved** | Aprobada - Lista para enviar | Verde |
| **Sent** | Enviada - Esperando respuesta del proveedor | Azul |
| **Answered** | Respondida - El proveedor ha contestado | Púrpura |
| **NeedsMoreInfo** | Necesita más info - Requiere pregunta de seguimiento | Amarillo |
| **Resolved** | Resuelta - Conversación finalizada satisfactoriamente | Verde oscuro |
| **Discarded** | Descartada - Pregunta eliminada/no relevante | Rojo |

---

## Flujo de Trabajo Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUJO PRINCIPAL Q&A                               │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Draft   │────▶│ Approved │────▶│   Sent   │────▶│ Answered │
  │(Borrador)│     │(Aprobada)│     │(Enviada) │     │(Respondida)│
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │                                                   │
       │                                                   ▼
       │                                           ┌──────────────┐
       │                                           │ ¿Respuesta   │
       │                                           │ satisfactoria?│
       │                                           └──────────────┘
       │                                              │       │
       │                                         SÍ   │       │  NO
       │                                              ▼       ▼
       │                                       ┌─────────┐ ┌─────────────┐
       │                                       │Resolved │ │NeedsMoreInfo│
       ▼                                       │(Resuelta)│ │(Seguimiento)│
  ┌──────────┐                                 └─────────┘ └─────────────┘
  │Discarded │                                                   │
  │(Descartada)                                                  │
  └──────────┘                                                   ▼
                                                         ┌──────────────┐
                                                         │ Nueva pregunta│
                                                         │ de seguimiento│
                                                         │   (Draft)     │
                                                         └──────────────┘
```

---

## Generar Preguntas con IA

### Pasos:

1. **Seleccionar Proyecto**: En el dashboard, asegúrate de tener un proyecto seleccionado
2. **Ir a la pestaña Q&A**: Click en "Q&A" en la navegación del dashboard
3. **Seleccionar Proveedor**: En el selector de proveedores, elige el proveedor al que quieres generar preguntas
4. **Click en "Generar Preguntas"**: El sistema usará IA para analizar los requisitos del RFQ y generar preguntas técnicas relevantes
5. **Esperar procesamiento**: El workflow de n8n procesará los requisitos y generará preguntas por disciplina (Electrical, Mechanical, Civil, Process, General, Cost)

### Resultado:
- Las preguntas se crean con estado **Draft** (borrador)
- Aparecen agrupadas por disciplina
- Cada pregunta tiene una importancia asignada (High, Medium, Low)

---

## Revisar y Aprobar Preguntas

### Para revisar una pregunta en borrador:

1. **Localizar la pregunta**: Filtra por estado "Draft" o busca en la lista
2. **Revisar el contenido**: Lee la pregunta generada
3. **Editar si es necesario**: Click en el icono de edición (lápiz) para modificar el texto
4. **Aprobar o Descartar**:
   - ✅ **Aprobar**: Click en el botón de check verde - cambia a estado "Approved"
   - ❌ **Descartar**: Click en el botón X rojo - cambia a estado "Discarded"

### Acciones disponibles para preguntas Draft:

| Acción | Icono | Descripción |
|--------|-------|-------------|
| Editar | ✏️ | Modificar el texto de la pregunta |
| Aprobar | ✓ | Marcar como lista para enviar |
| Descartar | ✗ | Eliminar/descartar la pregunta |
| Eliminar | 🗑️ | Borrar permanentemente |

---

## Enviar Preguntas a Proveedores

### Requisitos previos:
- Las preguntas deben estar en estado **Approved**
- Debes tener preguntas aprobadas para el proveedor seleccionado

### Pasos:

1. **Seleccionar proveedor**: Elige el proveedor en el selector
2. **Verificar preguntas aprobadas**: Asegúrate de que hay preguntas en estado "Approved"
3. **Click en "Enviar al Proveedor"**:
   - Se abre un modal de confirmación
   - Muestra el número de preguntas que se enviarán
4. **Confirmar envío**:
   - El sistema genera un **token único** para el proveedor
   - Crea un **enlace al portal** donde el proveedor responderá
   - Cambia el estado de las preguntas a **Sent**

### Resultado:
- Se genera una URL única: `https://tu-dominio.com/supplier-response?token=XXXXX`
- Este enlace se puede compartir con el proveedor por email
- El proveedor accede al portal y ve todas las preguntas pendientes

---

## Gestionar Respuestas

### Cuando un proveedor responde:

1. **Notificación**: Recibirás una notificación indicando que hay nuevas respuestas
2. **Ver respuesta**: La pregunta cambia a estado **Answered** y muestra la respuesta
3. **Evaluar la respuesta**: Decide si la respuesta es satisfactoria

### Acciones disponibles para preguntas Answered:

| Acción | Resultado |
|--------|-----------|
| **Marcar como Resuelta** | Cambia a estado "Resolved" - la conversación termina |
| **Necesita más información** | Cambia a estado "NeedsMoreInfo" - permite crear follow-up |

---

## Preguntas de Seguimiento (Follow-ups)

Cuando una respuesta no es satisfactoria y necesitas más información del proveedor:

### Paso 1: Marcar como "Necesita más información"

1. Localiza la pregunta con estado **Answered**
2. Click en el botón **"Necesita más información"** (o "Needs More Info")
3. La pregunta cambia a estado **NeedsMoreInfo**

### Paso 2: Crear la pregunta de seguimiento

1. En la pregunta con estado NeedsMoreInfo, aparece el campo de texto para follow-up
2. **Escribe tu pregunta de seguimiento**: Sé específico sobre qué información adicional necesitas
3. Click en **"Enviar Follow-up"** (o el botón de enviar)

### Paso 3: Revisar el borrador

1. Se crea una **nueva pregunta** con estado **Draft**
2. Esta pregunta tiene un badge **"FOLLOW-UP"** para identificarla
3. Está vinculada a la pregunta original (parent_question_id)
4. **Revisa y edita** si es necesario

### Paso 4: Aprobar y enviar

1. **Aprobar** la pregunta de seguimiento (igual que cualquier pregunta Draft)
2. **Enviar al proveedor**: La pregunta se añade al portal del proveedor
3. El proveedor verá el **contexto previo** (pregunta original + su respuesta anterior)

### Diagrama del flujo de Follow-up:

```
┌─────────────┐    "Needs More Info"    ┌───────────────┐
│  Answered   │ ───────────────────────▶│ NeedsMoreInfo │
│(Respondida) │                         │               │
└─────────────┘                         └───────────────┘
                                               │
                                               │ Escribir follow-up
                                               ▼
                                        ┌───────────────┐
                                        │ Nueva pregunta│
                                        │    Draft      │
                                        │  [FOLLOW-UP]  │
                                        └───────────────┘
                                               │
                                               │ Aprobar
                                               ▼
                                        ┌───────────────┐
                                        │   Approved    │
                                        │  [FOLLOW-UP]  │
                                        └───────────────┘
                                               │
                                               │ Enviar
                                               ▼
                                        ┌───────────────┐
                                        │     Sent      │
                                        │  [FOLLOW-UP]  │
                                        └───────────────┘
```

---

## Ver Historial de Conversación

Para preguntas de seguimiento, puedes ver todo el historial de la conversación:

### En el Dashboard:

1. Las preguntas de seguimiento muestran un badge **"FOLLOW-UP"**
2. Click en **"Ver Hilo"** (View Thread) junto al badge
3. Se expande el historial mostrando:
   - Pregunta original
   - Respuestas anteriores
   - Preguntas de seguimiento previas

### Identificadores visuales:

| Badge | Significado |
|-------|-------------|
| **ORIGINAL** | Pregunta inicial de la conversación |
| **FOLLOW-UP** | Pregunta de seguimiento |

---

## Portal del Proveedor

### Acceso:

Los proveedores acceden mediante un enlace único con token:
```
https://tu-dominio.com/supplier-response?token=XXXXXX-XXXX-XXXX-XXXX
```

### Funcionalidades del portal:

1. **Ver preguntas pendientes**: Lista de todas las preguntas enviadas
2. **Ver contexto de follow-ups**: Para preguntas de seguimiento, pueden ver:
   - La pregunta anterior
   - Su respuesta anterior
   - Dropdown "Ver historial de conversación"
3. **Responder preguntas**: Campo de texto para cada respuesta
4. **Enviar respuestas**: Botón para enviar todas las respuestas

### Vista del proveedor para Follow-ups:

```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Pregunta de Seguimiento                              │
│                                                         │
│ ▼ Ver historial de conversación (2 intercambios)       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Pregunta Anterior:                                  │ │
│ │ "Can you provide the Pre-FEED schedule..."          │ │
│ │                                                     │ │
│ │ Tu Respuesta Anterior:                              │ │
│ │ "The Pre-FEED phase duration is 12 weeks..."        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Nueva Pregunta:                                         │
│ "Could you clarify the critical path analysis..."       │
│                                                         │
│ Tu Respuesta:                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Filtros y Exportación

### Filtros disponibles:

| Filtro | Opciones |
|--------|----------|
| **Proveedor** | Lista de proveedores del proyecto |
| **Disciplina** | Electrical, Mechanical, Civil, Process, General, Cost |
| **Estado** | Draft, Approved, Sent, Answered, NeedsMoreInfo, Resolved, Discarded |
| **Importancia** | High, Medium, Low |

### Exportación:

- Click en el botón **"Exportar CSV"**
- Descarga un archivo con todas las preguntas filtradas
- Incluye: ID, Pregunta, Estado, Proveedor, Disciplina, Importancia, Respuesta

---

## Notificaciones

El sistema envía notificaciones cuando:

| Evento | Notificación |
|--------|--------------|
| Proveedor responde | "Nueva respuesta de [Proveedor]" |
| Pregunta aprobada | "Pregunta aprobada en [Disciplina]" |
| Preguntas enviadas | "X preguntas enviadas a [Proveedor]" |

### Ver notificaciones:

1. Click en el icono de campana 🔔 en la barra superior
2. Las notificaciones no leídas aparecen con indicador
3. Click en una notificación para ir a la pregunta relacionada

---

## Resumen de Acciones por Estado

| Estado | Acciones Disponibles |
|--------|---------------------|
| **Draft** | Editar, Aprobar, Descartar, Eliminar |
| **Approved** | Editar, Enviar, Descartar |
| **Sent** | Ver (solo lectura) |
| **Answered** | Resolver, Necesita más info |
| **NeedsMoreInfo** | Crear follow-up |
| **Resolved** | Ver (solo lectura) |
| **Discarded** | Eliminar |

---

## FAQ (Preguntas Frecuentes)

### ¿Puedo editar una pregunta ya enviada?
No. Una vez enviada (estado Sent), la pregunta no se puede modificar.

### ¿El proveedor puede ver las preguntas anteriores en un follow-up?
Sí. El portal muestra todo el contexto de la conversación para que el proveedor entienda qué información adicional se necesita.

### ¿Cuántos follow-ups puedo crear?
No hay límite. Puedes crear tantas preguntas de seguimiento como necesites hasta que la respuesta sea satisfactoria.

### ¿Qué pasa si descarto una pregunta por error?
Las preguntas descartadas se pueden eliminar permanentemente o dejar en estado Discarded para referencia. No se pueden recuperar a otro estado.

### ¿Puedo generar preguntas para múltiples proveedores a la vez?
Debes generar preguntas proveedor por proveedor. Selecciona cada proveedor y genera las preguntas correspondientes.

---

## Soporte

Si tienes problemas o preguntas sobre el sistema Q&A, contacta al equipo de desarrollo.

---

*Última actualización: Enero 2026*
