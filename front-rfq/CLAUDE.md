# CLAUDE - Orquestador de Agentes

Documento de referencia para orquestar y utilizar los agentes especializados de Claude Code.

---

## 📋 Tabla de Agentes Disponibles

### 1. **general-purpose**
**Descripción:** Agente de propósito general para investigar preguntas complejas, buscar código y ejecutar tareas multistep.

**Herramientas:** Acceso a todas las herramientas disponibles

**Cuándo usarlo:**
- Búsquedas amplias o exploratorias cuando no estás seguro de los resultados
- Tareas multistep complejas sin un patrón definido
- Cuando necesitas búsqueda iterativa de código o archivos
- Investigaciones generales que requieren flexibilidad

**Ejemplo:**
```
Buscar y entender cómo se implementa el manejo de errores en todo el proyecto
```

---

### 2. **Explore**
**Descripción:** Agente especializado en exploración rápida de repositorios. Encuentra archivos por patrones, busca código por palabras clave y responde preguntas sobre el codebase.

**Herramientas:** Todas las herramientas

**Niveles de Throughness:**
- `quick`: Búsquedas básicas y rápidas
- `medium`: Exploración moderada en múltiples ubicaciones
- `very thorough`: Análisis comprensivo de convenciones de nomenclatura diversas

**Cuándo usarlo:**
- Encontrar archivos por patrones (ej: `src/components/**/*.tsx`)
- Buscar endpoints API, rutas o handlers
- Responder preguntas sobre la arquitectura del codebase
- Exploración rápida del proyecto

**Ejemplo:**
```
Encontrar todos los componentes de React en src/components/
Buscar cómo se estructura la autenticación
¿Cómo funcionan los endpoints API?
```

---

### 3. **Plan**
**Descripción:** Arquitecto de software que diseña planes de implementación. Devuelve pasos paso a paso, identifica archivos críticos y considera trade-offs.

**Herramientas:** Todas las herramientas

**Cuándo usarlo:**
- Antes de implementaciones significativas
- Cuando necesitas diseñar la estrategia de un feature
- Para identificar qué archivos necesitan cambios
- Evaluar arquitectura y patrones

**Ejemplo:**
```
Diseña un plan para implementar autenticación OAuth2
Planifica la refactorización del sistema de estado global
```

---

### 4. **statusline-setup**
**Descripción:** Configura la línea de estado en las configuraciones de Claude Code.

**Herramientas:** Read, Edit

**Cuándo usarlo:**
- Configurar visualización de estado en CLI
- Personalizar información mostrada en statusline

---

### 5. **claude-code-guide**
**Descripción:** Responde preguntas sobre Claude Code, Claude Agent SDK y la API de Claude.

**Herramientas:** Glob, Grep, Read, WebFetch, WebSearch

**Cuándo usarlo:**
- Preguntas sobre características de Claude Code
- Cómo usar hooks o slash commands
- Cómo trabajar con servidores MCP
- Preguntas sobre Claude Agent SDK
- Documentación de Claude API

**Ejemplo:**
```
¿Cómo configuro un hook en Claude Code?
¿Cuáles son las capacidades de Claude Code?
¿Cómo escribo un agente personalizado?
```

---

### 6. **electron-pro**
**Descripción:** Especialista en aplicaciones de escritorio. Desarrolla apps Electron con integración nativa de SO, enfoque en seguridad y rendimiento.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Desarrollar aplicaciones Electron
- Integración con APIs nativas del SO
- Seguridad en aplicaciones de escritorio
- Optimización de rendimiento en Electron

---

### 7. **api-designer**
**Descripción:** Experto en arquitectura de APIs. Diseña APIs REST y GraphQL escalables con documentación completa.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Diseñar nuevas APIs REST o GraphQL
- Mejorar consistencia y experiencia de desarrollador
- Documentar endpoints
- Optimizar performance de APIs

---

### 8. **backend-developer**
**Descripción:** Ingeniero senior en backend. Especializado en APIs escalables y arquitectura de microservicios.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Desarrollar endpoints de API
- Implementar lógica de servidor
- Optimización de base de datos
- Manejo de seguridad en backend

**Ejemplo:**
```
Implementa un sistema de caché para las queries
Desarrolla los endpoints REST para autenticación
```

---

### 9. **microservices-architect**
**Descripción:** Arquitecto de sistemas distribuidos. Diseña ecosistemas de microservicios escalables.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Diseñar arquitectura de microservicios
- Patrones de comunicación entre servicios
- Escalabilidad en entornos cloud-native
- Descomposición de monolitos

---

### 10. **websocket-engineer**
**Descripción:** Especialista en comunicación en tiempo real. Implementa arquitecturas WebSocket escalables y sistemas event-driven.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Implementar WebSockets
- Sistemas de mensajería en tiempo real
- Arquitecturas event-driven
- Comunicación bidireccional con baja latencia

**Ejemplo:**
```
Implementa notificaciones en tiempo real con WebSockets
Crea un sistema de chats colaborativo
```

---

### 11. **ui-designer**
**Descripción:** Diseñador de UX/UI. Crea interfaces intuitivas, hermosas y accesibles.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Diseñar sistemas de diseño
- Mejorar UX/UI
- Accesibilidad
- Jerarquía visual

---

### 12. **fullstack-developer**
**Descripción:** Desarrollador full-stack. Experto en soluciones end-to-end desde base de datos hasta UI.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Features completas que abarcan toda la stack
- Cuando necesitas integración seamless frontend-backend
- Desarrollo ágil de features complejas

**Ejemplo:**
```
Implementa un sistema de carrito de compras completo
Desarrolla un dashboard con filtros y gráficas
```

---

### 13. **graphql-architect**
**Descripción:** Arquitecto de esquemas GraphQL. Diseña APIs GraphQL eficientes y escalables.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Diseñar esquemas GraphQL
- Implementar federación GraphQL
- Optimización de queries
- Type safety en GraphQL

---

### 14. **mobile-developer**
**Descripción:** Especialista en mobile multiplataforma. Crea apps nativas optimizadas con React Native y Flutter.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Desarrollar apps mobile con React Native o Flutter
- Optimización de rendimiento en mobile
- Integración con APIs nativas del dispositivo
- Eficiencia de batería

---

### 15. **frontend-developer**
**Descripción:** Ingeniero de UI robusto. Construye componentes React escalables y de alta calidad.

**Herramientas:** Read, Write, Edit, Bash, Glob, Grep

**Cuándo usarlo:**
- Desarrollo de componentes React
- Refactorización de frontend
- Mejora de performance
- State management
- Testing de componentes

**Ejemplo:**
```
Refactoriza los componentes para mejorar performance
Implementa un sistema de design tokens
```

---

## 🎯 Patrones de Orquestación

### Patrón 1: Exploración → Plan → Implementación
Para features nuevas complejas:

```
1. Explore: Entender la estructura existente
2. Plan: Diseñar la estrategia
3. (backend/frontend/fullstack): Implementar
```

### Patrón 2: Investigación Iterativa
Para problemas complejos sin solución clara:

```
1. general-purpose: Investigación inicial amplia
2. Explore: Profundizar en áreas específicas
3. Plan: Diseñar solución
4. Especialista: Implementar
```

### Patrón 3: Feature Paralela
Para features que requieren múltiples disciplinas:

```
Ejecutar en paralelo:
- api-designer: Diseñar API
- frontend-developer: Diseñar componentes
- Luego integrar con fullstack-developer
```

### Patrón 4: Arquitectura Inicial
Para nuevos sistemas:

```
1. Plan: Diseño general
2. api-designer: APIs REST/GraphQL
3. (backend/frontend): Implementación
4. (websocket-engineer si necesario): Real-time
```

---

## 💡 Mejores Prácticas

### 1. **Usa el Agente Correcto**
- No uses `general-purpose` si existe un especialista
- `Explore` es más rápido que `general-purpose` para búsquedas
- Agentes especializados = mejor output

### 2. **Ejecución Paralela**
Cuando los agentes son independientes, lánzalos en paralelo:
```
- api-designer y frontend-developer en paralelo
- Ambos trabajan sin dependencias
```

### 3. **Cadena de Dependencias**
Si hay dependencias, ejecuta secuencialmente:
```
1. Explore: entender estructura
2. Plan: diseñar basado en estructura
3. fullstack-developer: implementar basado en plan
```

### 4. **Contexto es Crítico**
Proporciona:
- Descripción clara de la tarea
- Restricciones técnicas
- Estado actual del código
- Requisitos específicos

### 5. **Validación de Output**
- Siempre revisa el código generado
- Ejecuta tests después de cambios
- Verifica que la solución cumple requisitos

---

## 🚀 Ejemplos de Orquestación

### Ejemplo 1: Nueva Feature Completa
**Objetivo:** Implementar sistema de notificaciones en tiempo real

```
1. Explore (quick): Estructura actual del proyecto
2. Plan: Arquitectura de notificaciones
3. Paralelo:
   - websocket-engineer: WebSocket backend
   - frontend-developer: UI de notificaciones
4. fullstack-developer: Integración final
```

### Ejemplo 2: Refactorización de API
**Objetivo:** Migrar a GraphQL

```
1. Explore (medium): APIs REST existentes
2. graphql-architect: Diseñar schema GraphQL
3. backend-developer: Implementar resolvers
4. frontend-developer: Actualizar queries
```

### Ejemplo 3: Bug Complejo
**Objetivo:** Encontrar y fijar bug de performance

```
1. general-purpose: Investigación inicial
2. Explore (very thorough): Análisis profundo
3. Plan: Estrategia de fix
4. Especialista relevante: Implementación
```

---

## ⚙️ Configuración Recomendada

### Para Proyectos Frontend
```
Primario: frontend-developer
Secundario: ui-designer
Soporte: fullstack-developer para backend
```

### Para Proyectos Backend
```
Primario: backend-developer
Secundario: api-designer
Soporte: microservices-architect para escalabilidad
```

### Para Proyectos Full-Stack
```
Primario: fullstack-developer
Secundario: frontend-developer, backend-developer
Especialistas: Según necesidad (GraphQL, WebSocket, etc)
```

### Para Aplicaciones Móviles
```
Primario: mobile-developer
Secundario: frontend-developer
Soporte: fullstack-developer para backend
```

---

## 📞 Cuándo Pedir Clarificación

**Usa AskUserQuestion cuando:**
- Hay múltiples enfoques válidos
- Necesitas confirmar requisitos
- Hay trade-offs importantes
- La solución afecta la arquitectura

**Proporciona contexto cuando:**
- Dependencias técnicas
- Restricciones del proyecto
- Preferences del team
- Versiones de librerías específicas

---

## 🔄 Flujo Recomendado para Cualquier Tarea

```
1. ¿Es investigación? → Explore (con nivel apropiado)
2. ¿Necesita diseño? → Plan (antes de código)
3. ¿Es una disciplina específica? → Especialista
4. ¿Abarca varias disciplinas? → fullstack-developer o ejecución paralela
5. Siempre: Validar y revisar output
```

---

**Última actualización:** 2025-12-29
**Claude Code Version:** Haiku 4.5
