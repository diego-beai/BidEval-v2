# BidEval v2 - Analisis Competitivo y Posicionamiento

> Documento generado: Febrero 2026
> Ultima actualizacion: 21 febrero 2026
> Objetivo: Comparacion honesta y objetiva de BidEval frente a competidores en el mercado de IA para procurement

---

## 1. Que es BidEval

**BidEval** es una plataforma SaaS de evaluacion inteligente de ofertas (bids/proposals) para departamentos de compras. Utiliza IA para automatizar el analisis, scoring y comparacion de propuestas de proveedores en procesos de licitacion (RFP/RFQ/RFI).

### 1.1 Propuesta de Valor

> "Procesos de evaluacion de 6 meses reducidos a 1 hora con IA"

BidEval se posiciona como una herramienta **especializada y accesible** frente a las mega-suites S2P (Source-to-Pay) que cuestan USD 500K+/ano y tardan meses en implementarse.

### 1.2 Funcionalidades Actuales (v2 - Febrero 2026)

| Area | Funcionalidades |
|------|----------------|
| **Setup de Proyectos** | Wizard de 7 pasos: info basica, plazos/hitos con timeline visual, proveedores invitados, criterios de evaluacion con pesos personalizables, tipos de documento (tecnico/economico/admin/legal/HSE), modelo economico configurable (campos jerarquicos padre-hijo), validacion final. Templates reutilizables con save/load |
| **Procesamiento de Documentos** | Subida de PDFs y Word (RFQ base + propuestas), OCR, clasificacion automatica por tipo (tecnico/economico/otros), extraccion de contenido, progreso en tiempo real con auto-refresh cada 30s, cancelacion de procesamiento |
| **Evaluacion y Scoring** | Criterios 100% dinamicos por proyecto, pesos jerarquizados (categoria + criterio), scoring automatico via IA con justificaciones por criterio, override manual, validacion de sumas, analisis de fortalezas/debilidades por categoria y proveedor |
| **Audit Trail de Scoring** | Log completo de cambios: timestamp, usuario, valor anterior/nuevo, razon del cambio. Categorizado por tipo (score_update, weight_change, criteria_change). Compliance-ready |
| **Simulador de Escenarios** | Analisis what-if: modificar pesos y criterios hipoteticos sin commitear cambios. Ver impacto en rankings antes de decidir |
| **Seccion Economica** | Extraccion automatica de precios, descuentos, TCO, condiciones de pago (30d/60d/120d), desglose CAPEX/OPEX, garantias, escalacion de precios. Campos economicos dinamicos configurables por proyecto (jerarquia padre-hijo). Integracion Excel: generacion de templates, upload de datos estructurados, matriz de comparacion |
| **Vista Ejecutiva** | Spider chart comparativo, pie chart de pesos, bar charts de ranking, Board Report para CEO/director de compras, milestone timeline visual con eventos custom |
| **ESG/Sostenibilidad** | Categoria de scoring dedicada con sub-criterios (ambiental/social/gobernanza), catalogo de 12 certificaciones (ISO 14001, CSRD, SBTi...), extraccion automatica de certificaciones de propuestas, badges visuales con estados (confirmado/mencionado/no detectado), matriz comparativa certificaciones x proveedores, benchmarking ESG relativo entre proveedores |
| **Sistema Q&A** | Generacion automatica de preguntas tecnicas basadas en gaps detectados, workflow completo (Draft/Pending/Approved/Sent/Answered/Resolved/NeedsMoreInfo), organizacion por disciplina (Electrical/Mechanical/Civil/Process/Cost), niveles de importancia |
| **Award / Adjudicacion** | Wizard de adjudicacion completo: seleccion de ganador desde ranking, generacion de justificacion con IA (basada en scores + economico + fortalezas), workflow de aprobacion (Draft/Pending Approval/Approved/Notified/Contracted/Cancelled), gestion de contratos, bloqueo de proyecto post-award |
| **Informes Tecnicos** | 4 tipos de informe: Evaluation Report, Comparison Report, Executive Summary, Award Justification. Metodologia, ranking con scores por categoria, analisis estadistico (min/max/avg/std dev), factores de riesgo, recomendaciones. Versionado con historial. Export PDF con branding custom |
| **Comunicaciones** | Hub centralizado: emails, llamadas, reuniones, notas internas. Timeline cronologica con Q&A integrado |
| **Generador de RFP** | Creacion de documentos RFP/RFQ desde requisitos + templates reutilizables. 8 secciones configurables. Upload de documentos de referencia. PDF personalizable (logo, color corporativo, footer, numeracion de paginas). Export Markdown/PDF/clipboard |
| **Directorio de Proveedores** | CRM con historico de proveedores, scores promedio, categorias. Tracking de win/loss rate, consistencia de scores (analisis de rango), rendimiento multi-proyecto. Sistema de feedback por proveedor por proyecto |
| **Gestion Multi-proyecto** | Vista lista con filtros, busqueda, ordenamiento por progreso/nombre/fecha |
| **Autenticacion y Sesiones** | Login/Signup con Supabase Auth (email/password), recuperacion de contrasena, invitaciones por token (7 dias de expiracion), session timeout SOC2 (warning 30 min, auto-logout 60 min), refresh automatico de tokens |
| **Multi-tenant y Organizaciones** | Sistema completo de organizaciones: creacion, miembros (owner/admin/member/viewer), invitaciones con email y token, limites por plan (proyectos/usuarios), cambio de roles, revocacion de invites, nombre de org editable. Aislamiento de datos por organizacion via RLS |
| **Permisos y Roles** | RBAC dual: 4 roles de organizacion (owner/admin/member/viewer) mapeados a 4 roles de app (admin/evaluator/economic_viewer/viewer). 5 permisos granulares (view_economic, edit_scoring, approve_results, send_qa, manage_users). Permission gates a nivel de componente. Sync automatico org_role→app_role. Seccion economica restringida por tipo de proyecto (oculta en RFI). Demo mode con selector de rol |
| **API REST y API Keys** | 6 endpoints documentados (projects CRUD, scoring, reports, upload). Autenticacion dual: API Key (X-API-Key header) + JWT Bearer. Gestion de API keys: creacion, revocacion, permisos (read/write), rate limiting (100 req/hr API keys, 20 req/hr uploads), fecha de expiracion, tracking de ultimo uso. Retry con exponential backoff + jitter |
| **Admin Dashboard** | Panel de administracion: estado del sistema, conteo de proyectos activos, proveedores registrados, estadisticas de uso de organizacion, limites de plan, log de auditoria reciente (20 entradas). Solo accesible para admins |
| **Audit Logging SOC2** | Servicio de auditoria que registra acciones de usuario via RPC: login, logout, creacion de proyectos, ejecucion de scoring, exportacion de datos. Contexto completo: timestamp, user_id, organization_id, resource_type, metadata. Silent fail (nunca bloquea la accion del usuario) |
| **Portal de Proveedores** | Rutas publicas para proveedores: respuesta a RFQ (/respond/:token) y subida de documentos (/upload/:token). Acceso via token unico sin necesidad de cuenta |
| **Status Page** | Pagina publica de estado del sistema (/status): health checks por componente (API, Supabase, n8n, webhooks), latencia por servicio, auto-refresh cada 30s, indicadores visuales (operativo/degradado/caido), versionado |
| **Chat IA** | Asistente conversacional con soporte Markdown, streaming de respuestas, historial persistente, error boundary para rendering |
| **Progreso Visual** | Barra de progreso horizontal por proyecto, anillos de progreso por proveedor, grid de estado de evaluaciones, milestone timeline |
| **Onboarding** | Tour interactivo guiado, tracking de completado, reset de tour |
| **Notificaciones** | Sistema de notificaciones con badge de no leidos, dropdown, tipos (supplier_responded, questions_sent, evaluation_updated). Changelog con badge de actualizaciones no leidas |
| **Monitoring y Error Handling** | Sentry: error tracking (prod-only), performance monitoring (20% sample rate), session replay en errores (100%), stripping de Authorization headers, ignored errors (ResizeObserver, ChunkLoadError). Error Boundary global con fallback page. Service Worker para cache offline |
| **Soporte Multi-idioma** | Espanol/Ingles con toggle, persistencia |
| **Dark/Light Mode** | Toggle con preferencia de sistema |

### 1.3 Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite + Zustand (28 stores) + React Query (@tanstack/react-query)
- **Backend/IA**: n8n workflows (OCR, NLP, LLM, embeddings)
- **Base de Datos**: Supabase (PostgreSQL + Auth + Realtime subscriptions + RLS + Edge Functions + Storage)
- **Monitoring**: Sentry (error tracking + performance + session replay)
- **Despliegue**: Docker multi-stage build + Nginx (reverse proxy, rate limiting, gzip, CORS, security headers)
- **Estado**: 28 Zustand stores especializados con persistencia selectiva en localStorage
- **Data Fetching**: React Query con 5-min stale time, retry logic, garbage collection 30-min

### 1.4 Target

- Departamentos de compras de grandes empresas en Espana y Europa
- Sectores: industrial, energia, telecomunicaciones, infraestructura
- Target comercial: Airbus, Siemens, Ericsson, Oracle y similares

---

## 2. Analisis de nnamu

### 2.1 Resumen

**nnamu** es una startup alemana (Munich, fundada 2022) que creo el primer agente de IA basado en **teoria de juegos** para negociaciones de procurement. Es un spin-off de TWS Partners, la mayor consultora de teoria de juegos a nivel global. Fue **adquirida por Beroe Inc. en marzo 2025**.

### 2.2 Que hace

nnamu es un agente autonomo que **ejecuta negociaciones** con proveedores:

1. Analiza el contexto de la negociacion y datos de proveedores
2. Simula comportamiento de proveedores usando modelos de teoria de juegos
3. Recomienda estrategias optimas y puntos de anclaje
4. Ejecuta negociaciones multi-etapa de forma autonoma (combina formatos de subasta + negociacion)
5. Mantiene transparencia y auditabilidad completa

### 2.3 Datos Clave

| Aspecto | Detalle |
|---------|---------|
| **Dataset** | 20 anos, 2.000+ negociaciones, valor acumulado >400.000M EUR |
| **Equipo** | Dr. Christian Paul (co-CEO, ex TWS Partners) + Martin Walter (CTO, ex Amazon Alexa) |
| **Clientes** | BT Sourced, Jaguar Land Rover, Deutsche Bahn |
| **Resultados** | 10-15% ahorros en valor total (vs 6-9% de e-auctions clasicas) |
| **Rango de deals** | 20.000 EUR a 27M EUR |
| **Precio** | No publico (enterprise custom, post-adquisicion integrado en Beroe Live.ai) |
| **Stack** | AWS serverless (Lambda, DynamoDB), 46% codigo generado por Amazon Q |

### 2.4 Relacion con BidEval

nnamu y BidEval son **complementarios, no competidores directos**:

- **nnamu** = negociacion post-evaluacion (despues de evaluar, negocia con proveedores)
- **BidEval** = evaluacion pre-negociacion (analiza y puntua propuestas antes de negociar)

Son fases consecutivas del ciclo de procurement. El riesgo seria si nnamu/Beroe expandiera hacia evaluacion de ofertas, o si BidEval expandiera hacia negociacion autonoma.

---

## 3. Panorama Competitivo

### 3.1 Suites Enterprise S2P (Source-to-Pay)

Estas son plataformas completas que cubren todo el ciclo de procurement. La evaluacion de ofertas es UNA funcionalidad entre cientos.

| Plataforma | AI para Bid Evaluation | Precio Estimado | Time-to-Value |
|------------|----------------------|-----------------|---------------|
| **SAP Ariba** | Joule Bid Analysis Agent (Q1 2026, nuevo) | USD 500K+/ano | 6-18 meses |
| **Coupa** | Bid Evaluation Agent (Navi, 100+ AI features) | USD 500K+/ano | 6-12 meses |
| **JAGGAER** | JAI Assist/Copilot/Autopilot (progresivo) | Enterprise custom | 6-12 meses |
| **Ivalua** | IVA (25+ use cases, resumen RFx responses) | Enterprise custom | 6-12 meses |
| **Zycus** | Merlin + ANA (negociacion autonoma) | Enterprise custom | 3-12 meses |
| **GEP SMART** | GEP Qi (cost analytics, sourcing optimization) | Enterprise custom | 3-6 meses |
| **Scanmarket** | Post-bid analysis automatizado | Mid-enterprise | 1-3 meses |

### 3.2 Startups AI-First en Procurement

Estas son empresas mas jovenes enfocadas en nichos especificos con IA avanzada.

| Startup | Foco Principal | Funding/Status | Relevancia vs BidEval |
|---------|---------------|----------------|----------------------|
| **Globality** | Scoring automatico de RFP responses | Establecida | **MUY ALTA** - competidor conceptual mas cercano |
| **Keelvar** | Sourcing optimization + bid eval cuantitativo | VC-funded | Alta |
| **Fairmarkit** | Adaptive RFx (unifica RFP/RFQ/RFI) | VC-funded | Media-Alta |
| **Arkestro** | Game theory + predictive pricing | USD 36M | Media |
| **Pactum AI** | Negociacion autonoma con proveedores | USD 54M Serie C | Baja (complementario) |
| **nnamu** | Game theory + negociacion autonoma | Adquirida por Beroe | Baja (complementario) |
| **Zip** | Procurement orchestration (50+ AI agents) | Visionary Gartner 2026 | Baja-Media |
| **Tonkean** | Procurement orchestration no-code | VC-funded | Baja |

### 3.3 Mercado Espanol

| Plataforma | Foco | Target | Relevancia |
|------------|------|--------|------------|
| **Tendios** (Barcelona, 2023) | Analisis de licitaciones publicas con IA | Sector publico Espana | **MUY ALTA** - pero solo sector publico |
| **TendersTool** | Business intelligence contratacion publica | Empresas tech | Baja (alertas, no evaluacion) |
| **VORTAL** (Portugal) | eSourcing/eProcurement Iberia | Mid-market | Media |

---

## 4. Tabla de Valoracion Comparativa

> Escala: 1 (muy bajo/inexistente) a 10 (excelente/lider del mercado)
> Valoracion **honesta y objetiva** basada en informacion publica disponible a febrero 2026
> Los cambios respecto a la version anterior se indican con flechas (ej: 7→8)

### 4.1 Funcionalidades Core

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **Evaluacion cualitativa de ofertas (tecnica)** | 7→**8** | 5 | 5 | 8 | 4 | 5 | 6 | 1 |
| **Evaluacion cuantitativa (precio/coste)** | 7→**8** | 7 | 7 | 6 | 9 | 7 | 6 | 3 |
| **Scoring automatico con IA** | 7→**8** | 6 | 7 | 9 | 7 | 6 | 5 | 1 |
| **Criterios de evaluacion personalizables** | 9 | 7 | 7 | 6 | 8 | 5 | 5 | 1 |
| **Procesamiento de PDFs/documentos** | 8 | 6 | 6 | 7 | 4 | 5 | 5 | 1 |
| **Analisis economico profundo (TCO, condiciones pago)** | 8→**9** | 7 | 7 | 4 | 6 | 4 | 3 | 2 |
| **Comparacion visual ejecutiva** | 8 | 5 | 6 | 5 | 5 | 4 | 4 | 2 |
| **Sistema Q&A con proveedores** | 7 | 6 | 6 | 5 | 4 | 5 | 3 | 1 |
| **Generacion de RFP/RFQ** | 6→**7** | 7 | 7 | 8 | 6 | 7 | 4 | 1 |
| **Negociacion autonoma** | 1 | 3 | 3 | 2 | 3 | 3 | 1 | 10 |
| **Workflow de adjudicacion (award)** | **7** *(nuevo)* | 8 | 8 | 4 | 5 | 4 | 3 | 1 |
| **Informes/reportes automatizados** | **7** *(nuevo)* | 8 | 8 | 6 | 5 | 5 | 4 | 3 |
| **Trazabilidad / audit trail** | **8** *(nuevo)* | 9 | 9 | 7 | 6 | 5 | 4 | 5 |
| **Promedio funcionalidades core** | 6.8→**7.3** | 5.9→**6.5** | 6.1→**6.6** | 6.0→**5.9** | 5.6→**5.5** | 5.1→**5.0** | 4.2→**4.1** | 2.3→**2.5** |

> **Nota**: Se anadieron 3 criterios nuevos (adjudicacion, informes, trazabilidad) que reflejan funcionalidades implementadas recientemente en BidEval y que son relevantes para la comparacion. Los promedios de TODOS los competidores se recalcularon con los 13 criterios.

**Cambios en BidEval justificados**:
- **Evaluacion cualitativa 7→8**: Justificaciones de scoring por criterio con IA, analisis de fortalezas/debilidades por categoria y proveedor
- **Evaluacion cuantitativa 7→8**: Integracion Excel completa (upload/comparacion/templates), campos economicos dinamicos con jerarquias padre-hijo
- **Scoring automatico 7→8**: Justificaciones generadas por IA, simulador de escenarios what-if, pero el motor sigue siendo n8n+LLM (no modelo propietario)
- **Analisis economico 8→9**: Excel comparison tool, configuracion dinamica de campos por proyecto, desglose jerarquico. Solo Keelvar (optimizacion cuantitativa) supera en la parte de precio puro
- **Generacion RFP 6→7**: PDF con branding custom (logo, colores, footer), templates reutilizables, documentos de referencia. Aun por debajo de Globality (8) que genera RFPs desde cero con IA conversacional

### 4.2 Plataforma y Experiencia

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **UX/UI moderno** | 8→**9** | 5 | 7 | 7 | 7 | 7 | 7 | 5 |
| **Time-to-value (rapidez de implementacion)** | 9 | 2 | 3 | 6 | 6 | 6 | 8 | 5 |
| **Facilidad de uso (curva de aprendizaje)** | 8 | 3 | 4 | 7 | 5 | 6 | 7 | 4 |
| **Accesibilidad de precio** | 9 | 1 | 1 | 3 | 4 | 4 | 7 | 2 |
| **Soporte multi-idioma** | 7 | 9 | 9 | 7 | 6 | 5 | 8 | 5 |
| **Dark/light mode** | 8 | 4 | 5 | 5 | 4 | 4 | 5 | 3 |
| **Promedio plataforma** | 8.2→**8.3** | **4.0** | **4.8** | **5.8** | **5.3** | **5.3** | **7.0** | **4.0** |

**Cambios en BidEval justificados**:
- **UX/UI 8→9**: Tour de onboarding interactivo, milestone timeline visual, permission gates que adaptan la UI por rol, notificaciones con badge, feedback por proveedor. UX mas pulida y enterprise-ready

### 4.3 Capacidades Enterprise

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **Integraciones ERP/sistemas existentes** | 3→**4** | 10 | 9 | 6 | 7 | 7 | 4 | 5 |
| **Seguridad y compliance enterprise** | 4→**6** | 10 | 10 | 8 | 8 | 7 | 6 | 7 |
| **Escalabilidad (1000+ usuarios)** | 3 | 10 | 10 | 8 | 8 | 8 | 5 | 6 |
| **Multi-tenant / SaaS maduro** | 3→**5** | 10 | 10 | 9 | 8 | 8 | 7 | 7 |
| **Soporte y SLA** | 2→**3** | 9 | 9 | 7 | 7 | 7 | 5 | 6 |
| **Ecosistema de proveedores (network)** | 2→**3** | 10 | 9 | 6 | 5 | 7 | 4 | 3 |
| **Trayectoria y referencias** | 2 | 10 | 10 | 7 | 7 | 7 | 3 | 4 |
| **Cobertura Source-to-Pay completa** | 2 | 10 | 10 | 4 | 5 | 5 | 3 | 2 |
| **Promedio enterprise** | 2.6→**3.5** | **9.9** | **9.6** | **6.9** | **6.9** | **7.0** | **4.6** | **5.0** |

**Cambios en BidEval justificados**:
- **Integraciones 3→4**: API REST documentada con 6 endpoints, autenticacion dual (API Key + JWT), rate limiting, gestion de API keys (CRUD, permisos, expiracion). Webhooks via n8n. Retry con exponential backoff + jitter. Aun sin conectores ERP nativos (SAP, Oracle)
- **Seguridad 4→6**: Autenticacion completa con Supabase Auth (login/signup/password reset), session timeout SOC2 (30/60 min), RLS hardening (Row Level Security por organizacion), audit logging SOC2 (via RPC, silent fail), Sentry con stripping de auth headers, RBAC dual (org roles + app roles). Aun sin certificacion formal SOC2/ISO 27001
- **Multi-tenant 3→5**: Sistema de organizaciones real: miembros con roles (owner/admin/member/viewer), invitaciones con token (7 dias), limites por plan (proyectos/usuarios), aislamiento de datos via RLS. Aun single-database (no database-per-tenant)
- **Soporte/SLA 2→3**: Status page publica con health checks por componente y auto-refresh 30s. Sentry para error tracking y alertas. Service Worker para cache offline. Aun sin SLA formal ni soporte 24/7
- **Ecosistema proveedores 2→3**: Portal de proveedores con rutas publicas (respuesta + upload via token unico). Directorio con historico, win/loss tracking, performance multi-proyecto. No es un marketplace pero ya integra a proveedores en el flujo

### 4.4 Innovacion y Diferenciacion

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **IA avanzada (GenAI/Agentic AI)** | 6→**7** | 7 | 8 | 9 | 8 | 7 | 5 | 8 |
| **Innovacion en el approach** | 7→**8** | 5 | 6 | 8 | 8 | 7 | 6 | 9 |
| **Game theory / predictive** | 1 | 2 | 2 | 2 | 3 | 2 | 1 | 10 |
| **Sostenibilidad/ESG como criterio** | 6 | 5 | 6 | 3 | 4 | 3 | 2 | 1 |
| **Roadmap publico ambicioso** | 6→**7** | 8 | 8 | 7 | 7 | 7 | 5 | 6 |
| **Promedio innovacion** | 5.6→**5.8** | **5.4** | **6.0** | **5.8** | **6.0** | **5.2** | **3.8** | **6.8** |

**Cambios en BidEval justificados**:
- **Roadmap 6→7**: Velocidad de ejecucion excepcional: auth completa, multi-tenant con organizaciones, API REST + keys, admin dashboard, status page, audit SOC2, Sentry monitoring, RLS hardening, portal de proveedores — todo entregado en un sprint. Demuestra capacidad de ejecutar a ritmo de startup top-tier

### 4.5 Resumen Global

| Categoria | BidEval (antes→ahora) | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|-----------|----------------------|-----------|-------|-----------|---------|------------|---------|-------|
| Funcionalidades Core | 7.3 | 6.5 | 6.6 | 5.9 | 5.5 | 5.0 | 4.1 | 2.5 |
| Plataforma y UX | 8.3 | 4.0 | 4.8 | 5.8 | 5.3 | 5.3 | 7.0 | 4.0 |
| Enterprise | 2.6→**3.5** | **9.9** | **9.6** | 6.9 | 6.9 | 7.0 | 4.6 | 5.0 |
| Innovacion | 5.6→**5.8** | 5.4 | 6.0 | 5.8 | 6.0 | 5.2 | 3.8 | **6.8** |
| **PROMEDIO GLOBAL** | 6.0→**6.2** | **6.5** | **6.8** | **6.1** | **6.0** | **5.6** | **4.9** | **4.6** |

### 4.6 Variacion respecto a version anterior

| Metrica | Antes | Ahora | Delta | Comentario |
|---------|-------|-------|-------|------------|
| **Promedio Global BidEval** | 6.0 | **6.2** | **+0.2** | Sube gracias al salto enterprise |
| **Funcionalidades Core** | 7.3 | **7.3** | 0 | Sin cambios en funcionalidades core en este sprint |
| **Plataforma y UX** | 8.3 | **8.3** | 0 | Se mantiene fuerte |
| **Enterprise** | 2.6 | **3.5** | **+0.9** | **Mayor subida de la historia de BidEval**. Auth completa, multi-tenant real, API REST, audit SOC2, RLS, status page, Sentry. De "demo" a "production-grade" |
| **Innovacion** | 5.6 | **5.8** | +0.2 | Roadmap execution impresionante |
| **Ranking entre competidores** | 4o de 8 | **3o de 8** | **+1 posicion** | Supera a Globality (6.1) y Keelvar (6.0). Solo por detras de SAP Ariba y Coupa |

---

## 5. Interpretacion Honesta

### 5.1 Donde BidEval Gana

1. **Evaluacion de ofertas como producto** (no como sub-feature): BidEval es el unico producto standalone enfocado 100% en evaluar y comparar propuestas. Los demas lo hacen como una funcionalidad menor dentro de suites enormes.

2. **Ciclo completo evaluacion→adjudicacion**: Con el award management, BidEval cubre desde la subida de documentos hasta la adjudicacion con justificacion generada por IA. Ningun otro producto standalone cubre este flujo completo.

3. **Time-to-value**: Horas vs meses. Subir PDFs y obtener una evaluacion comparativa en la misma sesion.

4. **Accesibilidad de precio**: Gap enorme entre suites de USD 500K+/ano y spreadsheets. BidEval llena ese vacio.

5. **UX/UI moderno y dirigido a directivos**: Onboarding guiado, milestone timeline, dashboard ejecutivo, dark mode, notificaciones. Disenado para presentar a C-level, no solo para el buyer tecnico.

6. **Analisis economico profundo**: TCO, condiciones de pago, desglose CAPEX/OPEX, integracion Excel, campos dinamicos. La mayoria de competidores solo miran precio unitario. **9/10**, solo Keelvar supera en optimizacion cuantitativa pura.

7. **Criterios personalizables con transparencia y trazabilidad**: Los pesos se definen al inicio y no se cambian (compliance sector publico EU). Audit trail completo que registra TODOS los cambios de scoring con timestamp, usuario y razon. Audit logging SOC2 para todas las acciones de usuario.

8. **Simulador de escenarios**: Analisis what-if antes de tomar decisiones. Feature unica entre competidores de tamano similar.

9. **Production-grade sin ser enterprise** *(NUEVO)*: Autenticacion real, multi-tenant con organizaciones, session timeout SOC2, RLS, audit logging, Sentry monitoring, status page, API REST con rate limiting. Nivel de madurez tecnica que la mayoria de startups de este tamano no tienen.

### 5.2 Donde BidEval Pierde (Honestamente)

1. **Certificaciones formales** *(blocker reducido pero presente)*: Tiene los controles tecnicos (auth, RLS, audit logging, session timeout, Sentry), pero sin certificacion formal SOC2 Type I/II o ISO 27001. Muchos departamentos de compras enterprise exigen el papel, no solo la implementacion.

2. **Trayectoria y referencias**: Sin clientes publicos de referencia aun. Las enterprise compran a vendors con track record. SAP/Coupa tienen miles de clientes.

3. **Ecosistema**: Portal de proveedores mejorado (respuesta + upload via token), directorio con historico y performance tracking. Pero no hay marketplace ni red de proveedores. Las enterprise necesitan que encaje en su stack completo.

4. **Cobertura S2P**: Cubre evaluacion + adjudicacion + contratos basicos. Pero no cubre requisition, PO, contract management avanzado, AP, supplier onboarding. Las enterprise quieren consolidar vendors.

5. **IA avanzada**: La IA de BidEval (n8n + LLM) es funcional y esta presente en multiples puntos del ciclo (scoring, justificaciones, chat, reports, award). Pero no esta al nivel de los modelos propietarios de Coupa (Navi) o Globality (Glo) entrenados con millones de transacciones.

6. **Game theory / prediccion**: No tiene capacidades predictivas ni de teoria de juegos. nnamu y Arkestro lideran esta tendencia.

7. **Escalabilidad**: No probado con 100+ usuarios concurrentes ni con grandes volumenes de datos. Multi-tenant es single-database con RLS (no database-per-tenant).

### 5.3 Donde BidEval Esta Par

- Procesamiento de documentos PDF (comparable con startups, inferior a enterprise)
- Scoring automatico (8/10, par con Keelvar, por debajo de Globality 9/10)
- Q&A con proveedores (implementado con workflow completo, diferenciador vs muchos startups)
- Soporte RFP/RFQ/RFI (implementado con generacion PDF customizable)
- ESG/Sostenibilidad (6/10): catalogo de 12 certificaciones con extraccion automatica, benchmarking entre proveedores y matriz comparativa. Par con Coupa, por encima de Globality/Keelvar. Limitacion: sin integracion con datos externos (EcoVadis, CDP) ni tracking de emisiones Scope 1/2/3
- Workflow de adjudicacion (7/10): comparable con Keelvar. Por debajo de suites enterprise (8/10) que integran con contract management completo
- Informes automatizados (7/10): 4 tipos con versionado y branding. Par con Globality, por debajo de suites enterprise
- Seguridad tecnica (6/10) *(NUEVO)*: Auth + RLS + audit logging + session timeout — par con Tendios, pero ambos sin certificaciones formales. Las suites enterprise (9-10) tienen SOC2 Type II + ISO 27001 + equipos de seguridad dedicados

---

## 6. Gaps del Mercado (Oportunidad para BidEval)

Basado en el analisis, estos son los gaps que BidEval puede explotar:

| Gap | Descripcion | Oportunidad |
|-----|-------------|-------------|
| **Mid-market pricing** | No existe solucion seria de evaluacion de ofertas con IA en el rango USD 5K-50K/ano | BidEval puede ser "el Figma del procurement evaluation" |
| **Evaluacion cualitativa** | La mayoria se enfoca en precio. Evaluacion tecnica/compliance esta poco automatizada | BidEval ya lo hace bien (8/10), reforzar messaging |
| **Mercado espanol B2B privado** | Tendios cubre publico, pero no hay nada para procurement privado en Espana | First-mover advantage |
| **Time-to-value** | Implementaciones de 6-18 meses son inaceptables para proyectos urgentes | BidEval en horas, demostrarlo con case studies |
| **Dashboard ejecutivo** | Los dashboards son tecnicos, no para directivos | BidEval ya tiene esto (9/10 UX), reforzar |
| **Condiciones de pago como criterio** | Casi nadie analiza condiciones de pago (30d vs 120d) como factor de scoring | Diferenciador unico de BidEval |
| **Ciclo evaluacion→adjudicacion** | La mayoria de startups solo evaluan, no cubren la adjudicacion | BidEval ya tiene award management con IA |
| **Trazabilidad para compliance** | Los reguladores EU exigen cada vez mas trazabilidad en procurement publico y privado | Audit trail + audit logging SOC2 de BidEval es un diferenciador clave |
| **SaaS accesible con seguridad real** *(NUEVO)* | Las startups tienen UX pero no seguridad; las enterprise tienen seguridad pero no UX. Nadie combina ambos en el mid-market | BidEval tiene auth, RLS, audit SOC2, session timeout Y buena UX. Posicion unica |

---

## 7. Recomendaciones Estrategicas

### 7.1 Corto Plazo (3-6 meses)

| Prioridad | Accion | Impacto |
|-----------|--------|---------|
| **CRITICA** | Conseguir 2-3 clientes piloto y documentar case studies con resultados medibles | Sin referencias = sin ventas enterprise. La plataforma ya esta production-ready |
| **ALTA** | Certificacion SOC2 Type I (los controles tecnicos ya estan implementados) | Requisito minimo de muchos departamentos de compras. La implementacion tecnica ya existe (audit logging, session timeout, RLS, auth), falta la auditoria formal |
| **ALTA** | Collaborative scoring (multiples evaluadores con pesos configurables) | Feature muy demandada en equipos grandes. La infraestructura de auth y roles ya soporta esto |
| **MEDIA** | Sealed bidding (sobre cerrado digital, ofertas cifradas hasta fecha de apertura) | Critico en licitaciones publicas/reguladas |
| ~~**CRITICA**~~ | ~~Implementar autenticacion robusta + multi-tenant real~~ **COMPLETADO**: Auth completa (login/signup/forgot-password/invites), organizaciones con miembros y roles, limites por plan, RLS, session timeout SOC2 | Puntuacion seguridad: 4→6. Multi-tenant: 3→5. **Blocker eliminado** |
| ~~**ALTA**~~ | ~~Crear API REST publica~~ **COMPLETADO**: 6 endpoints documentados, API Key auth + JWT, rate limiting, gestion de keys (CRUD/permisos/expiracion) | Puntuacion integraciones: 3→4. Siguiente paso: conectores ERP nativos |
| ~~**MEDIA**~~ | ~~Anadir scoring ESG/sostenibilidad~~ **COMPLETADO v1**: Categoria ESG con sub-criterios, catalogo 12 certificaciones, extraccion automatica, badges, benchmarking, matriz comparativa | Puntuacion: 1→6. Siguiente paso: integrar datos externos (EcoVadis, CDP) |
| ~~**ALTA**~~ | ~~Crear integraciones basicas~~ **COMPLETADO**: Integracion Excel completa + API REST | Puntuacion economico: 8→9, integraciones: 3→4 |
| ~~**MEDIA**~~ | ~~Sistema de permisos y roles~~ **COMPLETADO**: RBAC dual (org roles + app roles), permission gates, sync automatico | Puntuacion seguridad: 4→6 |
| ~~**MEDIA**~~ | ~~Award/adjudicacion workflow~~ **COMPLETADO** | Nuevo criterio award: 7/10 |
| ~~**MEDIA**~~ | ~~Informes automatizados~~ **COMPLETADO** | Nuevo criterio informes: 7/10 |
| ~~**MEDIA**~~ | ~~Audit trail para compliance~~ **COMPLETADO**: Audit trail de scoring + audit logging SOC2 para todas las acciones | Puntuacion trazabilidad: 8/10 |
| ~~**MEDIA**~~ | ~~Monitoring y error tracking~~ **COMPLETADO**: Sentry (error tracking + performance + replay), status page publica, error boundary | Soporte/SLA: 2→3 |

### 7.2 Medio Plazo (6-12 meses)

| Prioridad | Accion | Impacto |
|-----------|--------|---------|
| **ALTA** | Integrar con SAP Ariba / Coupa como "motor de evaluacion" | Posicion de complemento, no competidor. Amplifica mercado 10x |
| **ALTA** | Anadir prediccion de precios basica (benchmarking por sector) | Feature muy demandada, actualmente solo GEP y Arkestro la tienen |
| **ALTA** | Integrar datos ESG externos (EcoVadis, CDP) | Subir ESG de 6 a 8, diferenciador fuerte en mercado EU |
| **MEDIA** | Explorar game theory para recomendaciones de award | Tendencia emergente (nnamu, Arkestro), alto valor percibido |
| **MEDIA** | Marketplace de templates de evaluacion por industria | Reduce time-to-value aun mas, genera comunidad |
| **MEDIA** | Contract management basico post-award | Extender la cobertura S2P sin construir una suite completa |

### 7.3 Largo Plazo (12-24 meses)

| Prioridad | Accion | Impacto |
|-----------|--------|---------|
| **MEDIA** | AI agentica: agente que evalua propuestas end-to-end sin intervencion | Alineado con tendencia #1 del mercado |
| **MEDIA** | Red de proveedores (supplier network) | Efecto red, moat competitivo |
| **BAJA** | Expandir a negociacion autonoma (competir con nnamu/Pactum) | Solo si el mercado lo demanda, alto riesgo de scope creep |

---

## 8. Posicionamiento Sugerido

### Tagline Actual
> "Procesos de evaluacion de 6 meses reducidos a 1 hora con IA"

### Posicionamiento vs Competidores

| Contra... | Mensaje |
|-----------|---------|
| **SAP Ariba / Coupa** | "La evaluacion de ofertas que su suite S2P no hace bien. Implementacion en horas, no en meses. Con auth enterprise, audit SOC2, API REST y adjudicacion incluidos." |
| **Globality** | "Mismo concepto de scoring automatico, pero con analisis economico profundo (TCO, condiciones de pago, Excel comparison), simulador de escenarios, multi-tenant real y UX ejecutiva." |
| **Tendios** | "Para procurement privado lo que Tendios hace para el publico. Con autenticacion, organizaciones y API REST que Tendios no tiene." |
| **nnamu** | "Complementarios: BidEval evalua y adjudica, nnamu negocia. Juntos cubren el ciclo completo." |
| **Spreadsheets** | "Deje de evaluar ofertas en Excel. La IA analiza 500 paginas en minutos, con trazabilidad SOC2 y justificacion de cada decision." |

---

## 9. Datos del Mercado

- **AI in Procurement Market**: USD 22.6B para 2033, CAGR 28.1%
- **EU Procurement as a Service**: USD 855M (2024) a USD 1,568M (2033)
- **Solo el 5%** de implementaciones AI en procurement estan en produccion madura
- **89%** de procurement teams no estan preparados para AI (Hackett Group)
- **McKinsey**: AI hara procurement 25-40% mas eficiente

---

## 10. Fuentes

### nnamu / Beroe
- [Beroe adquiere nnamu - PR Newswire](https://www.prnewswire.com/news-releases/beroe-acquires-nnamu-to-turbocharge-procurement-negotiations-with-game-theory-and-ai-302403112.html)
- [nnamu by Beroe - Producto](https://www.beroeinc.com/nnamu/)
- [BT Sourced Case Study](https://www.beroeinc.com/resource-centre/insights/introducing-nnamu-how-bt-sourced-turning-procurement-bottlenecks-savings)
- [nnamu AWS Case Study](https://aws.amazon.com/solutions/case-studies/nnamu/)
- [TWS Partners](https://www.tws-partners.com/)

### Suites Enterprise
- [SAP Ariba AI Updates](https://sapinsider.org/articles/sap-ariba-updates-embed-ai-deeper-into-procurement-supplier-management/)
- [Coupa AI Agents Launch](https://www.coupa.com/newsroom/coupa-launches-new-ai-agents-to-accelerate-source-to-pay-roi/)
- [JAGGAER JAI Platform](https://www.jaggaer.com/solutions/jai)
- [Ivalua AI Platform](https://www.ivalua.com/technology/procurement-platform/)
- [Zycus Merlin Platform](https://www.zycus.com/solution/merlin-agentic-ai-platform)
- [GEP SMART](https://marketplace.microsoft.com/en-us/product/web-apps/gep.gep)

### Startups AI-First
- [Globality Autonomous Sourcing](https://www.globality.com/autonomous-sourcing)
- [Keelvar Sourcing Automation](https://www.keelvar.com/sourcing-automation)
- [Fairmarkit Platform](https://www.fairmarkit.com/)
- [Arkestro Platform](https://arkestro.com/)
- [Pactum AI Serie C](https://itkey.media/pactum-secures-usd-54m-of-series-c-funding/)
- [Zip 50 AI Agents](https://venturebeat.com/ai/zip-debuts-50-ai-agents-to-kill-procurement-inefficiencies/)

### Mercado Espanol
- [Tendios Platform](https://tendios.com/en)
- [Tendios + Telefonica Tech](https://telefonicatech.com/en/news/tendios)
- [TendersTool](https://tenderstool.com/)

### Mercado General
- [State of AI Procurement 2026](https://artofprocurement.com/blog/state-of-ai-in-procurement)
- [McKinsey Agentic AI in Procurement](https://www.mckinsey.com/capabilities/operations/our-insights/redefining-procurement-performance-in-the-era-of-agentic-ai)
- [European Procurement Startups (Tracxn)](https://tracxn.com/d/explore/procurement-it-startups-in-europe/)

---

*Documento preparado con investigacion de fuentes publicas. Las valoraciones numericas son estimaciones basadas en informacion disponible y pueden variar segun la version/configuracion especifica de cada producto.*
