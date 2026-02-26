# Roadmap Unificado: Features Competitivas + Hardening Pendiente

**Fecha:** 20 de febrero de 2026
**Contexto:** 1 desarrollador + Claude Code
**Total estimado:** 10 sprints (10 semanas)
**Features competitivas objetivo:** 9/15 (alta + media prioridad)

---

## 1. Resumen

Este roadmap unifica el hardening tecnico pendiente con las features competitivas del informe Ariba vs BidEval.

**Hallazgo clave:** Tras auditar el proyecto, la mayoria de la infraestructura enterprise ya esta implementada. El plan de hardening original (7 fases, 39-47 dias) estaba desactualizado. Lo que realmente falta es mucho menos de lo previsto.

**Modelo de trabajo:** 1 desarrollador con Claude Code. Sprints de 1 semana (5 dias laborales).

---

## 2. Estado actual (auditado 20 feb 2026)

### Ya implementado

| Componente | Estado | Evidencia |
|---|---|---|
| **Auth (Supabase)** | Implementado | `useAuthStore`, LoginPage, SignupPage, ForgotPasswordPage, AuthGuard, `persistSession: true` |
| **RBAC** | Implementado | `usePermissionsStore` sincronizado con auth, roles en DB (owner/admin/member/viewer) |
| **RLS** | Implementado | 60+ policies en `v7_rls_hardening.sql`, `get_user_org_id()`, `user_has_project_access()` |
| **Multi-tenancy** | Implementado | Tablas `organizations` + `organization_members`, `projects.organization_id` con trigger auto-asignacion |
| **User Management** | Implementado | OrganizationPage, InviteUserModal, AcceptInvitePage, `organization_invites`, RPCs `accept_invite()`, `check_org_limits()` |
| **Audit log** | Implementado | Tabla `audit_log`, RPC `log_audit()`, triggers en projects, `audit.service.ts` |
| **Security headers** | Implementado | nginx.conf: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy |
| **Sentry** | Implementado | `@sentry/react` configurado, ErrorBoundary, contexto de usuario/org, solo en PROD |
| **Status page** | Implementado | `/status` ruta publica |
| **Health check** | Implementado | Endpoint `/health` en nginx |
| **API Keys** | Parcial | ApiKeysPage existe, migracion v8 con tabla `api_keys` |
| **React Query** | Parcial | Instalado (`@tanstack/react-query`), 10 usages de 169 archivos posibles |
| **Virtual scrolling** | Instalado, sin usar | `@tanstack/react-virtual` en package.json, 0 usages |
| **Docker** | Implementado | Multi-stage build, docker-compose, healthcheck |

### Lo que falta

| Componente | Estado | Impacto |
|---|---|---|
| **Virtual scrolling activo** | Libreria instalada, 0 usages | Lag en ScoringMatrix y EconomicSection con muchos providers |
| **React Query expandido** | Solo 10 usages | Sin cache real en la mayoria de stores, re-fetch innecesario |
| **Indices DB adicionales** | Parciales | Faltan indices en tablas de uso frecuente |
| **API REST publica** | No existe | No hay Edge Functions de negocio, no hay OpenAPI docs |
| **Sealed bidding** | No existe | No apto para licitaciones reguladas |
| **Collaborative scoring** | No existe | Solo 1 evaluador, sin consolidacion |
| **Workflow de aprobaciones** | No existe | Sin cadena de aprobacion por monto |
| **Split award avanzado** | Parcial | AwardWizard existe pero sin multi-lote |
| **Templates EPC** | No existe | Cada RFP se crea desde cero |
| **Compliance automatico** | No existe | Verificacion manual de certificaciones |
| **Benchmarking historico** | Parcial | Supplier history existe, sin comparacion de precios cross-proyecto |
| **Scenario planning avanzado** | Parcial | ScenarioSimulator existe (858 lineas), falta analisis costo-riesgo |
| **Tests** | No existen | 0 archivos de test en todo el proyecto |
| **Session timeout** | No implementado | Sin auto-logout por inactividad |
| **GDPR export/delete** | No implementado | Sin funcionalidad de exportar/borrar datos |

---

## 3. Roadmap por sprints

### Sprint 1 -- Escalabilidad: virtual scrolling + React Query + indices

**Objetivo:** Aprovechar las librerias ya instaladas. Virtual scrolling activo, React Query en stores principales, indices DB.

| Item | Detalle |
|---|---|
| Activar virtual scrolling en ScoringMatrix | `@tanstack/react-virtual` ya instalado, aplicar en `providers.map()` |
| Activar virtual scrolling en EconomicSection | Mismo patron para `sortedComparison.map()` |
| Expandir React Query a stores principales | Crear hooks: `useProjectsQuery`, `useScoringQuery`, `useEconomicQuery`, `useSupplierDirectoryQuery`, `useRfqItemsQuery` |
| Componente Pagination reutilizable | UI paginada para listas de proyectos, suppliers, rfq items |
| Cache guard en stores Zustand | Agregar `lastFetchedAt` + guard de 2 min en 5 stores principales |
| Indices DB adicionales | Migracion: 7 indices en `rfq_items_master`, `provider_responses`, `ranking_proveedores`, `scoring_change_log`, `n8n_chat_histories`, `qa_audit`, `economic_offers` |

**Dependencias:** Ninguna.
**Entregable:** ScoringMatrix sin lag con 20+ providers, listas paginadas, cache reduce requests innecesarios, `EXPLAIN ANALYZE` confirma uso de indices.

---

### Sprint 2 -- Hardening pendiente: session timeout + GDPR + rate limiting

**Objetivo:** Cerrar los gaps de compliance que faltan sobre la infraestructura ya existente.

| Item | Detalle |
|---|---|
| Session timeout | Hook `useSessionTimeout`: warning a 30 min, auto-logout a 60 min de inactividad |
| Rate limiting en nginx | `limit_req_zone` para zonas api (30r/s) y auth (5r/m) |
| GDPR: exportar datos de la org | Edge Function `/v1-data-export` genera ZIP con datos de la org (solo owner) |
| GDPR: borrar datos con gracia | Edge Function `/v1-data-delete` soft delete con 30 dias de gracia (solo owner) |
| Data retention: cleanup automatico | Funcion `cleanup_expired_data()` para tokens expirados >30 dias |
| Changelog in-app | Componente modal con novedades + badge "Nuevo" en sidebar |

**Dependencias:** Ninguna (auth y audit log ya existen).
**Entregable:** Auto-logout tras 60 min, rate limiting activo, owner puede exportar/borrar datos de su org, changelog visible.

---

### Sprint 3 -- API REST Publica (parte 1): fundamentos

**Objetivo:** Edge Functions de negocio, middleware compartido, documentacion.

| Item | Detalle |
|---|---|
| Inicializar Supabase Edge Functions | Estructura `supabase/functions/` con `_shared/` |
| Middleware auth (JWT + API Key) | `_shared/auth.ts` — validar Bearer token o X-API-Key |
| Middleware rate limiter | `_shared/rate-limiter.ts` por API key |
| Middleware CORS | `_shared/cors.ts` |
| Edge Function: gestion de API keys | `api-keys/index.ts` — GET/POST/DELETE (complementa ApiKeysPage existente) |
| Proxy nginx a Edge Functions | `/api/v1/` → Supabase Edge Functions |

**Dependencias:** Ninguna (RLS y API keys table ya existen).
**Entregable:** API keys funcionales end-to-end, nginx proxy operativo.

---

### Sprint 4 -- API REST Publica (parte 2): endpoints + Feature Ariba #1

**Objetivo:** Endpoints de negocio, OpenAPI docs. Habilita "API de integracion" del informe Ariba.

| Item | Detalle |
|---|---|
| Edge Function: `v1-projects` | GET lista paginada, POST crear proyecto con trigger n8n |
| Edge Function: `v1-scoring` | GET resultados de scoring, POST trigger evaluacion |
| Edge Function: `v1-reports` | GET listar informes, POST generar informe tecnico |
| Edge Function: `v1-upload` | POST subir archivo, trigger workflow n8n |
| Documentacion OpenAPI | `docs/api/openapi.yaml` — spec OpenAPI 3.0 |
| Pagina `/api-docs` | UI con Redoc embebido, solo visible para admin |
| **Feature Ariba #1: API de integracion** | REST API para import/export con Ariba y otros sistemas |

**Dependencias:** Sprint 3.
**Entregable:** `curl -H "X-API-Key: xxx" /api/v1/projects` retorna proyectos, rate limiting activo, docs en `/api-docs`.

---

### Sprint 5 -- Sealed Bidding (Feature Ariba #2)

**Objetivo:** Sobre cerrado digital con ofertas cifradas hasta fecha de apertura.

| Item | Detalle |
|---|---|
| Modelo de datos: `sealed_bids` | Tabla con campos de cifrado, timestamp apertura, estado |
| RLS para sealed bids | Policy con check temporal: nadie lee antes de fecha apertura |
| UI: fecha de apertura en setup de proyecto | Step adicional en wizard |
| UI: indicador "sobre cerrado" vs "abierto" | Badges + bloqueo de acceso visual |
| Apertura automatica | Edge Function o pg_cron trigger por fecha |
| Audit trail de apertura | Registro automatico en audit_log (quien, cuando) |

**Dependencias:** Ninguna (RLS ya implementado).
**Entregable:** Licitacion con fecha apertura, ofertas no visibles antes de fecha, apertura automatica con registro de auditoria.

---

### Sprint 6 -- Collaborative Scoring (Feature Ariba #4)

**Objetivo:** Multiples evaluadores puntuan con pesos configurables, consolidacion automatica.

| Item | Detalle |
|---|---|
| Modelo de datos | Tablas `evaluator_assignments`, `evaluator_scores` |
| Asignar evaluadores a proyecto | UI en config de proyecto: seleccionar miembros de la org + peso por evaluador |
| Scoring individual por evaluador | Vista de scoring filtrada por usuario logueado |
| Consolidacion automatica | Promedio ponderado de scores, calculo en DB o Edge Function |
| Vista comparativa | Tabla: scores por evaluador vs consolidado |
| Notificaciones a evaluadores pendientes | Email via n8n webhook |

**Dependencias:** Ninguna (auth + user management ya existen).
**Entregable:** 3 evaluadores puntuan independientemente, scores consolidados automaticamente, vista comparativa muestra diferencias.

---

### Sprint 7 -- Workflow de Aprobaciones (Feature Ariba #3)

**Objetivo:** Aprobaciones escalonadas por monto con delegacion y audit trail.

| Item | Detalle |
|---|---|
| Modelo de datos | Tablas `approval_workflows`, `approval_steps`, `approval_decisions` |
| Config de thresholds por org | UI: $1M+ requiere VP, $10M+ requiere C-level |
| Bandeja de aprobaciones | UI: lista de pendientes, aprobar/rechazar con comentario |
| Delegacion temporal | Asignar delegado con fecha de expiracion |
| Notificaciones por email | Webhook n8n cuando hay aprobacion pendiente |
| Audit trail | Cadena completa de aprobacion en audit_log |

**Dependencias:** Ninguna (auth + user management ya existen).
**Entregable:** Adjudicacion de $5M requiere aprobacion de VP, notificacion por email, decision registrada en audit log.

---

### Sprint 8 -- Split Award / Multi-lote (Feature Ariba #5)

**Objetivo:** Extender el AwardWizard existente para adjudicacion por lotes.

| Item | Detalle |
|---|---|
| Modelo de datos | Tablas `project_lots`, `lot_items`, `lot_awards` |
| UI: definir lotes en setup | Agrupar items por lote (mecanica, electrica, civil, etc.) |
| Scoring por lote independiente | Filtrar ScoringMatrix por lote seleccionado |
| Adjudicacion por lote | Wizard de award extendido: diferente ganador por lote |
| Informe tecnico por lotes | Seccion de lotes en report PDF |
| Comparacion economica por lote | Tabla economica filtrada por lote |

**Dependencias:** Ninguna (AwardWizard ya existe como base).
**Entregable:** Proyecto con 3 lotes, cada uno adjudicado a proveedor diferente, informe refleja la adjudicacion.

---

### Sprint 9 -- Templates EPC (Feature Ariba #6) + Compliance (Feature Ariba #7)

**Objetivo:** Biblioteca de templates y verificacion automatica de certificaciones.

| Item | Detalle |
|---|---|
| **Templates EPC** | |
| Modelo de datos: `rfp_templates` | Tipos: FEED, EPC, EPCM, Lump Sum, Unit Rate |
| Templates pre-cargados | Seed data con secciones, criterios y pesos tipicos por tipo |
| Selector de template en wizard | Step en ProjectSetupWizard |
| Guardar proyecto como template | "Guardar como template" en settings de proyecto |
| **Compliance automatico** | |
| Modelo de datos: `compliance_requirements`, `provider_certifications` | Requisitos por proyecto |
| Definir requisitos en setup | UI: ISO 9001, API 650, ASME, seguros minimos |
| Extraccion IA de certificaciones | Workflow n8n con agente IA sobre PDFs del proveedor |
| Matriz de compliance | Vista: proveedor vs requisito (cumple/no cumple/parcial) |
| Gate pre-scoring | Excluir proveedores que no cumplen requisitos obligatorios |

**Dependencias:** Ninguna.
**Entregable:** Crear proyecto con template "EPC Lump Sum" pre-cargado, IA extrae certificaciones, proveedores sin ISO quedan excluidos.

---

### Sprint 10 -- Benchmarking Historico (Feature Ariba #8) + Scenario Planning (Feature Ariba #9)

**Objetivo:** Comparacion de precios historicos y escenarios avanzados de adjudicacion.

| Item | Detalle |
|---|---|
| **Benchmarking historico** | |
| Query cross-proyecto | Precios del mismo proveedor en proyectos anteriores de la org |
| Grafico de tendencia | Line chart: evolucion de precios por proveedor/categoria |
| Indicador de desviacion | Badge "por encima/debajo del promedio historico" |
| **Scenario planning avanzado** | Extender ScenarioSimulator existente (858 lineas) |
| Multiples escenarios por proyecto | Tabla comparativa de escenarios de adjudicacion |
| Analisis costo-riesgo | Score compuesto: costo + riesgo ponderado |
| Comparacion side-by-side | Vista con metricas por escenario |
| Exportar al informe | Seccion de escenarios en report PDF |

**Dependencias:** Datos historicos (requiere proyectos previos con datos economicos).
**Entregable:** Ver tendencia de precios de un proveedor en 5 proyectos, crear 3 escenarios y comparar costo vs riesgo.

---

### Backlog -- Features de baja prioridad (post Sprint 10)

Se priorizan segun demanda de mercado y feedback de clientes.

| # | Feature | Esfuerzo | Dependencia |
|---|---------|----------|-------------|
| 10 | Contrato post-adjudicacion (templates FIDIC/NEC) | 3-4 sem | Ninguna |
| 11 | Mini-subastas inversas (items commodity) | 4 sem | Ninguna |
| 12 | Supplier portal (perfil, invitaciones, ofertas) | 4-6 sem | API REST (Sprint 3-4) |
| 13 | Spend analytics (dashboard de gasto) | 3 sem | Datos historicos |
| 14 | Mobile app (scoring desde campo) | 6-8 sem | API REST (Sprint 3-4) |
| 15 | Supplier risk scoring (datos publicos, sanciones) | 4 sem | Ninguna |

---

## 4. Mapa de dependencias

```
Sprint 1: Escalabilidad         Sprint 2: Compliance pendiente
(virtual scrolling, cache,      (session timeout, GDPR,
 indices, React Query)           rate limiting, changelog)
         |                               |
         +-------+-----------------------+
                 |
         Sprint 3: API REST (fundamentos)
                 |
         Sprint 4: API REST (endpoints) + Feature Ariba #1
                 |
    +------------+------------+------------+
    |            |            |            |
Sprint 5    Sprint 6     Sprint 7     Sprint 8
Sealed      Collab.      Workflow     Split Award
Bidding     Scoring      Aprobac.    Multi-lote
    |            |            |            |
    +------------+------------+------------+
                 |
         Sprint 9: Templates EPC + Compliance Auto
                 |
         Sprint 10: Benchmarking + Scenario Planning
                 |
             Backlog: Features baja prioridad

Notas:
- Sprints 1 y 2 son independientes entre si (paralelizables)
- Sprints 5, 6, 7 y 8 son independientes entre si (paralelizables)
- Sprint 9 y 10 son independientes entre si (paralelizables)
- La API REST (Sprint 3-4) no bloquea features 5-8
  pero es prerrequisito para el backlog (supplier portal, mobile app)
```

---

## 5. Features del informe Ariba: donde encajan

### Prioridad ALTA

| # | Feature | Sprint | Dependencia real |
|---|---------|--------|------------------|
| 1 | API de integracion | Sprint 4 | Necesita Edge Functions (Sprint 3) |
| 2 | Sealed bidding | Sprint 5 | Ninguna (RLS ya existe) |
| 3 | Workflow de aprobaciones | Sprint 7 | Ninguna (auth + user mgmt ya existen) |
| 4 | Collaborative scoring | Sprint 6 | Ninguna (auth + user mgmt ya existen) |
| 5 | Split award / Multi-lote | Sprint 8 | Ninguna (AwardWizard ya existe) |

### Prioridad MEDIA

| # | Feature | Sprint | Dependencia real |
|---|---------|--------|------------------|
| 6 | Templates EPC | Sprint 9 | Ninguna |
| 7 | Compliance automatico | Sprint 9 | Ninguna |
| 8 | Benchmarking historico | Sprint 10 | Datos historicos |
| 9 | Scenario planning avanzado | Sprint 10 | ScenarioSimulator ya existe como base |
| 10 | Contrato post-adjudicacion | Backlog | Ninguna |

### Prioridad BAJA

| # | Feature | Sprint | Dependencia real |
|---|---------|--------|------------------|
| 11 | Mini-subastas | Backlog | Ninguna |
| 12 | Supplier portal | Backlog | API REST (Sprint 3-4) |
| 13 | Spend analytics | Backlog | Datos historicos |
| 14 | Mobile app | Backlog | API REST (Sprint 3-4) |
| 15 | Supplier risk scoring | Backlog | Ninguna |

---

## 6. Riesgos

| Riesgo | Prob. | Impacto | Mitigacion |
|---|---|---|---|
| Virtual scrolling rompe layout existente | Media | Bajo | Aplicar solo en tablas con >20 filas, fallback a render normal |
| Edge Functions: cold start lento | Media | Medio | Warm-up con cron, cache de respuestas frecuentes |
| Sealed bidding: vulnerabilidad en timing | Media | Critico | RLS + timestamp en DB (no frontend), audit trail obligatorio |
| Collaborative scoring: inconsistencia | Media | Alto | Tests de calculo, edge cases (evaluador no puntua, empate) |
| Workflow aprobaciones: deadlock | Alta | Alto | Delegacion obligatoria, timeout configurable, escalado auto |
| API publica: abuso | Media | Medio | Rate limiting por API key, monitoring de uso anomalo |
| Split award: complejidad en informe | Media | Medio | Seccion especifica de lotes, validacion de completitud |
| Scope creep en backlog | Alta | Medio | Priorizar por feedback de clientes reales |
| Bus factor = 1 | Alta | Critico | Documentacion, tests, Claude Code como knowledge base |
| 0 tests en el proyecto | Alta | Alto | Agregar tests progresivamente en cada sprint para codigo nuevo |

---

## 7. Metricas de exito

### Features competitivas habilitadas

| Sprint | Features completadas | Acumulado |
|---|---|---|
| Sprint 1-2 | (hardening pendiente) | 0/15 |
| Sprint 3-4 | #1 API de integracion | 1/15 |
| Sprint 5 | #2 Sealed bidding | 2/15 |
| Sprint 6 | #4 Collaborative scoring | 3/15 |
| Sprint 7 | #3 Workflow aprobaciones | 4/15 |
| Sprint 8 | #5 Split award | 5/15 |
| Sprint 9 | #6 Templates + #7 Compliance | 7/15 |
| Sprint 10 | #8 Benchmarking + #9 Scenarios | 9/15 |

### KPIs operativos

| Metrica | Tras Sprint 1 | Tras Sprint 4 | Tras Sprint 10 |
|---|---|---|---|
| Tiempo carga lista proyectos | < 1s (paginado) | < 1s | < 1s |
| ScoringMatrix con 20+ providers | Sin lag | Sin lag | Sin lag |
| Uptime `/health` | > 99% | > 99.5% | > 99.9% |
| Latencia API REST (p95) | N/A | < 500ms | < 500ms |
| Session timeout activo | No | Si | Si |
| GDPR export disponible | No | Si | Si |

---

## 8. Comparacion: plan original vs plan actualizado

| Aspecto | Plan original (desactualizado) | Plan actualizado |
|---|---|---|
| Sprints totales | 18 | **10** |
| Semanas estimadas | 18 | **10** |
| Fases de hardening | 7 (39-47 dias) | **2 sprints** (lo que realmente falta) |
| Features competitivas | Empezaban en Sprint 10 | **Empiezan en Sprint 4** |
| Auth + RLS + Audit | "Por hacer" | **Ya implementado** |
| Sentry + Status page | "Por hacer" | **Ya implementado** |
| User Management | "Por hacer" | **Ya implementado** |

**Ahorro: 8 semanas** de trabajo que ya estaba hecho.
