# Informe Competitivo: SAP Ariba vs BidEval-v2

**Fecha:** 21 de febrero de 2026
**Autor:** Equipo BidEval
**Version:** 2.0
**Clasificacion:** Interno - Estrategia de Producto

---

## Indice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Que es SAP Ariba](#2-que-es-sap-ariba)
3. [Comparacion Funcional Detallada](#3-comparacion-funcional-detallada)
4. [UX/UI: El Talon de Aquiles de Ariba](#4-uxui-el-talon-de-aquiles-de-ariba)
5. [Ariba en el Sector Oil & Gas / EPC](#5-ariba-en-el-sector-oil--gas--epc)
6. [Joule AI vs IA de BidEval](#6-joule-ai-vs-ia-de-bideval)
7. [Pricing y Costos Ocultos](#7-pricing-y-costos-ocultos)
8. [Mapa Competitivo Completo](#8-mapa-competitivo-completo)
9. [Pain Points de Usuarios de Ariba](#9-pain-points-de-usuarios-de-ariba)
10. [Estrategia: Como Ganarle a Ariba](#10-estrategia-como-ganarle-a-ariba)
11. [Plan de Mejoras Prioritarias](#11-plan-de-mejoras-prioritarias)
12. [Fuentes y Referencias](#12-fuentes-y-referencias)

---

## 1. Resumen Ejecutivo

SAP Ariba es el lider del mercado de procurement software con un **29.1% de cuota de mercado** y una red de **5.5 millones de proveedores** que procesan **$3.84 billones USD** en gasto anual. Fue fundada en 1996 y adquirida por SAP en 2012 por USD 4.4 mil millones.

Sin embargo, Ariba es una plataforma **generalista de procurement** (source-to-pay), no una herramienta especializada en evaluacion de ofertas. En el sector EPC energetico, sus limitaciones son evidentes:

- **No extrae datos de PDFs tecnicos** (solo facturas)
- **No tiene IA para analisis de scope tecnico**
- **No genera informes de evaluacion auditables con IA**
- **La UX tiene rating de 3.6/5** en facilidad de uso
- **Requiere 3-6 meses de implementacion** y consultores SAP

**Conclusion principal:** SAP Ariba y BidEval-v2 son **complementarios, no competidores directos**. Ariba cubre el ciclo completo de procurement (ordenes de compra, invoicing, contratos). BidEval cubre la evaluacion tecnica profunda de ofertas con IA, algo que Ariba no sabe hacer.

**Novedad v2.0:** BidEval ahora tiene autenticacion completa, multi-tenant con organizaciones, API REST documentada, audit logging SOC2, session timeout, RLS y monitoring con Sentry. Ya no es un prototipo — es una plataforma production-grade que puede integrarse con Ariba via API.

La estrategia recomendada es posicionar BidEval como el **"motor de evaluacion inteligente"** que complementa o reemplaza el modulo de sourcing de Ariba en proyectos EPC.

---

## 2. Que es SAP Ariba

### Historia

| Ano | Evento |
|-----|--------|
| 1996 | Fundacion de Ariba (Sunnyvale, California) |
| 1999 | IPO — valoracion de USD 4 mil millones el primer dia |
| 2004 | Adquisicion de FreeMarkets (capacidades de sourcing) |
| 2012 | SAP adquiere Ariba por **USD 4.4 mil millones** |
| 2025 | Lanzamiento de Joule AI (Bid Analysis Agent, beta) |
| 2026 | SAP reconstruye Ariba completamente sobre nuevo stack |

### Modulos Principales

SAP Ariba es una suite **source-to-pay** que cubre todo el ciclo:

| Modulo | Funcion |
|--------|---------|
| **Ariba Sourcing** | Eventos RFI/RFP/RFQ, subastas, scoring, adjudicacion |
| **Ariba Procurement** | Requisiciones, ordenes de compra, aprobaciones |
| **Ariba Contracts** | Ciclo de vida de contratos, compliance |
| **Ariba Network** | Red global de 5.5M proveedores |
| **Supplier Management** | Cualificacion, onboarding, riesgo |
| **Spend Analysis** | Analitica de gasto corporativo |
| **Invoice Management** | Cuentas por pagar, matching 3 vias |

### Datos de Mercado

- **Red:** 5.5 millones de empresas conectadas
- **Transacciones:** $3.84 billones USD anuales
- **Market share:** 29.1% en procurement software (lider)
- **Clientes principales:** Empresas de +10,000 empleados
- **Rating Gartner:** 4.3/5 (vs 4.7 de Coupa, 4.5 de JAGGAER)
- **Industrias:** Oil & gas, manufactura, retail, utilities, gobierno

---

## 3. Comparacion Funcional Detallada

### Tabla Comparativa Completa

| Funcionalidad | SAP Ariba | BidEval-v2 | Ventaja |
|---------------|-----------|------------|---------|
| **Setup de proyecto** | Formulario rigido por tipo de evento | Wizard configurable de 7 pasos | BidEval |
| **Tipos de licitacion** | RFI, RFP, RFQ, Auction | RFP, RFQ, RFI | Ariba (subastas) |
| **Invitacion a proveedores** | Via Ariba Network (5.5M) | Invitacion por email + token unico | Ariba (red, pero BidEval mejora) |
| **Recepcion de ofertas** | Formulario online del proveedor | Upload PDFs + portal de proveedor (rutas publicas /respond/:token y /upload/:token) | Empate |
| **Extraccion de datos de PDFs** | Solo facturas (Document AI) | PDFs tecnicos completos (n8n + Ollama) | **BidEval** |
| **Scoring ponderado** | Pesos 1-100 seccion + 0-10 pregunta | 12+ criterios configurables con pesos | Empate |
| **Multi-evaluador** | Team grading con pesos por evaluador | Sistema de permisos por rol | Ariba (mas maduro) |
| **Simulacion what-if** | Solver de optimizacion con restricciones | Simulacion interactiva en dashboard | Empate |
| **Dashboard ejecutivo** | Reportes limitados y genericos | Radar charts, ranking, comparativas | **BidEval** |
| **Comparacion economica** | Tabla basica de precios | Excel template del cliente + comparativa | **BidEval** |
| **Chat IA sobre documentos** | No | Chat RAG conversacional | **BidEval** |
| **Generacion de RFP con IA** | No | 6 agentes especializados | **BidEval** |
| **Justificacion de scores** | No nativo | Justificaciones IA por criterio | **BidEval** |
| **Informe tecnico PDF** | No nativo | Auto-generado, versionado, auditable | **BidEval** |
| **Propuesta de adjudicacion** | Manual | Auto-generada por IA | **BidEval** |
| **Historial de proveedor** | Basico (supplier qualification) | Timeline cross-proyecto, precios historicos | **BidEval** |
| **Adjudicacion** | Award scenarios (split/full) | Adjudicacion con wizard + lock proyecto | Ariba (split awards) |
| **Contratos** | Contract lifecycle management | No (futuro) | Ariba |
| **Ordenes de compra** | Si (procurement completo) | No | Ariba |
| **Invoicing / Pago** | Si (cuentas por pagar) | No | Ariba |
| **Subastas inversas** | Si | No | Ariba |
| **Integracion ERP** | Nativa con SAP S/4HANA | API REST documentada (6 endpoints) + API Keys + webhooks n8n | Ariba (nativa, pero BidEval ya tiene API) |
| **Sealed bidding** | Si | No (pendiente) | Ariba |
| **Autenticacion** | SSO empresarial + SAML | Supabase Auth (email/password) + invitaciones por token | Ariba (SSO, pero BidEval ya es production-grade) |
| **Multi-tenant** | Enterprise completo | Organizaciones con miembros, roles, invitaciones, limites por plan, RLS | Ariba (mas maduro, pero BidEval tiene separacion real) |
| **Audit / Compliance** | SOC2 Type II + ISO 27001 | Audit logging SOC2 (via RPC), session timeout (30/60 min), RLS | Ariba (certificaciones formales) |
| **Monitoring** | SAP Cloud Operations | Sentry (error tracking + performance + replay) + Status Page publica | Ariba (mas maduro) |
| **API Management** | SAP API Hub | API Keys (CRUD, permisos read/write, rate limiting 100 req/hr, expiracion) | Empate |
| **Dark/Light mode** | No | Si | BidEval |
| **i18n ES/EN** | Multi-idioma enterprise | ES/EN | Ariba |
| **LLM local (privacidad)** | No (cloud SAP) | Si (Ollama on-premise posible) | **BidEval** |

### Resumen de Ventajas

- **BidEval gana en:** Extraccion IA, dashboards, comparacion economica, chat IA, generacion RFP, informes, adjudicacion IA, historial proveedor, UX, privacidad, API keys management, dark mode, portal de proveedores con tokens
- **Ariba gana en:** Red proveedores, contratos, OC, invoicing, subastas, sealed bidding, integracion ERP nativa, multi-idioma enterprise, SSO/SAML, certificaciones SOC2/ISO 27001
- **Empate en:** Scoring, simulacion, recepcion ofertas, API REST, audit logging

---

## 4. UX/UI: El Talon de Aquiles de Ariba

### Ratings en Plataformas de Reviews

| Plataforma | Rating General | Facilidad de Uso | Probabilidad Recomendar |
|------------|----------------|-------------------|------------------------|
| Capterra | 3.8/5 | **3.6/5** | **5.4/10** |
| Gartner Peer Insights | 4.3/5 | — | — |
| G2 (Soporte) | 7.8/10 | — | — |

**Comparativa con competidores (Gartner):**
- Coupa: **4.7/5** (684 reviews) — +0.4 sobre Ariba
- JAGGAER: **4.5/5** (193 reviews) — +0.2 sobre Ariba
- SAP Ariba: **4.3/5** (354 reviews) — el mas bajo del top 3

### Las 7 Criticas Recurrentes

1. **Interfaz lenta y anticuada** — Descrita como lenta, poco intuitiva, con bugs frecuentes
2. **Curva de aprendizaje extrema** — Abrumadora para nuevos usuarios, requiere meses de capacitacion
3. **Navegacion confusa** — Los usuarios no encuentran lo que necesitan, los procesos raramente funcionan al primer intento
4. **Uploads fallidos** — Subir documentos requiere 4-5 intentos frecuentemente
5. **No responsive** — Problemas de visualizacion en desktop y mobile
6. **Reportes insuficientes** — Dashboards no tan potentes como deberian para analisis profundo
7. **Soporte deficiente** — Demoras en resolucion, comunicacion dificil

### Lo que esto significa para BidEval

Cada pain point de Ariba es un argumento de venta directo:

| Pain Point Ariba | Respuesta BidEval |
|------------------|-------------------|
| UI lenta y anticuada | React 18 moderno, transiciones fluidas, dark/light mode |
| Curva de aprendizaje de meses | Wizard de 7 pasos, productivo en minutos, tour de onboarding |
| Uploads fallidos | Upload con drag & drop + portal de proveedor (token-based) |
| Reportes limitados | Dashboard con radar charts, ranking animado, comparativas |
| No responsive | Responsive mobile/tablet/desktop |
| Sin chat inteligente | Chat IA con RAG sobre documentos de la licitacion |
| Implementacion compleja | Auth + multi-tenant + API REST out-of-the-box, zero config |
| Sin visibilidad de estado | Status page publica + Sentry monitoring en tiempo real |

---

## 5. Ariba en el Sector Oil & Gas / EPC

### Presencia

- **Siemens Energy** implemento SAP Ariba para su cadena de suministro
- SAP ofrece soluciones especificas para "Energy and Natural Resources"
- Grandes EPC como Fluor y Technip tienen integraciones Ariba

### Limitaciones Criticas para EPC

| Limitacion | Impacto en EPC | BidEval lo resuelve? |
|-----------|----------------|---------------------|
| **No extrae PDFs tecnicos** | Las ofertas EPC son documentos de 200+ paginas con datasheets, specs, P&IDs | Si (n8n + Ollama) |
| **Scoring generico** | No tiene criterios especificos HSE, experiencia en proyectos similares, capacidad de movilizacion | Si (12+ criterios configurables) |
| **Sin comparacion de scope tecnico** | No puede superponer y comparar alcances entre proveedores | Si (chat IA + comparativas) |
| **Sin generacion de TBE/CBE** | No genera Technical/Commercial Bid Evaluations | Si (informe tecnico PDF) |
| **Rigidez de workflow** | Flujo estandar, sin personalizacion por disciplina (mecanica, electrica, civil) | Si (setup wizard configurable) |
| **Sin historial cross-proyecto** | No compara precios historicos del mismo proveedor en diferentes proyectos | Si (supplier history) |
| **Sin propuesta de adjudicacion** | El award document se redacta manualmente | Si (auto-generada por IA) |

### El Flujo Tipico de Evaluacion EPC (y donde falla Ariba)

```
1. Emision RFP/RFQ                    [Ariba OK]
2. Recepcion de ofertas (PDFs)         [Ariba: solo formulario, no PDFs]
3. Lectura y analisis de documentos    [Ariba: MANUAL, semanas]
4. Scoring tecnico por criterio        [Ariba: generico, manual]
5. Comparativa economica detallada     [Ariba: tabla basica]
6. Informe de evaluacion (TBE/CBE)     [Ariba: NO genera]
7. Simulacion de escenarios            [Ariba: solver basico]
8. Propuesta de adjudicacion           [Ariba: manual]
9. Aprobacion y contrato               [Ariba OK]
```

**BidEval cubre pasos 2-8 con IA.** Ariba solo cubre 1 y 9 adecuadamente para EPC.

---

## 6. Joule AI vs IA de BidEval

### Estado de Joule (Febrero 2026)

SAP lanzo su copiloto de IA **Joule** con agentes especializados, incluyendo el **Bid Analysis Agent**:

- **Disponibilidad:** Beta desde dic 2025, GA en Q1 2026
- **Funcion:** Compara automaticamente datos de ofertas entre proveedores
- **Capacidades:** Costo total, precio unitario, terminos de pago, envio, resumenes con trade-offs

### Comparacion Directa de Capacidades IA

| Capacidad IA | Joule (Ariba) | BidEval-v2 |
|--------------|---------------|------------|
| Extraccion de PDFs tecnicos | No | Si (n8n + Ollama) |
| Chat RAG sobre documentos | No | Si (conversacional) |
| Multi-agente especializado | No (1 agente generico) | Si (6 agentes: scope, compliance, risk...) |
| Generacion de RFP | No | Si (multi-agente) |
| Analisis de scope tecnico | No | Si |
| Comparacion precios unitarios | Si | Si (template Excel del cliente) |
| Informe PDF auditable generado por IA | No | Si (versionado) |
| Propuesta de adjudicacion | No | Si (auto-generada) |
| Justificacion de scores por criterio | No | Si |
| LLM local (privacidad datos) | No (cloud SAP) | Si (Ollama on-premise) |
| Analisis por area/disciplina EPC | No | Si |
| API REST publica | SAP API Hub (compleja) | 6 endpoints + API Keys management |
| Multi-tenant con aislamiento | Enterprise (caro) | Organizaciones + RLS (incluido) |
| Audit logging | SAP GRC (modulo aparte) | Incluido (SOC2, via RPC) |
| Session timeout | Configurable por admin | SOC2 compliant (30/60 min) out-of-the-box |
| Error tracking | SAP Cloud ALM (caro) | Sentry integrado (error + performance + replay) |

### Ventana de Oportunidad

Joule esta en sus primeras versiones. Trabaja sobre **datos estructurados** del formulario de Ariba, no sobre documentos no estructurados (PDFs). En el sector EPC, donde los proveedores envian dossiers tecnicos complejos en PDF, esta diferencia es critica.

**Riesgo:** SAP tiene recursos para mejorar Joule rapidamente. BidEval debe acelerar su ventaja de IA ahora.

**Ventaja nueva:** BidEval ahora tiene la infraestructura enterprise (auth, multi-tenant, API, audit) que antes era un blocker. Esto permite la integracion real con entornos Ariba via API, posicionando a BidEval como complemento credible en lugar de prototipo.

---

## 7. Pricing y Costos Ocultos

### Modelo de Ariba

SAP Ariba usa un modelo **two-sided** que cobra tanto al comprador como al proveedor:

**Lado Comprador:**

| Concepto | Costo Estimado |
|----------|----------------|
| Suscripcion anual (mid-market) | $50,000 - $500,000+ USD/ano |
| Enterprise grande | $500,000 - $1,000,000+ USD/ano |
| Implementacion | 1.5x - 2.5x de la suscripcion anual |
| Consultores SAP | $1,200 - $2,000 USD/dia |
| Timeline implementacion | 3-6 meses tipico |

**Lado Proveedor:**

| Concepto | Costo |
|----------|-------|
| Cuenta gratuita | Hasta 5 documentos O $50K/ano/relacion |
| Membresia Bronze | ~$50/ano + 0.155% por transaccion |
| Membresías superiores | Basadas en volumen total |

### Costos Ocultos

1. **Implementacion:** Requiere consultores SAP certificados (3-6 meses)
2. **Customizaciones:** Descritas como "caras y engorrosas"
3. **Integracion ERP:** Requiere SAP Integration Suite (costo adicional)
4. **Training:** La curva de aprendizaje obliga a invertir en capacitacion
5. **Supplier pushback:** Los proveedores pueden resistirse a pagar fees o trasladar el costo
6. **Soporte premium:** Puede venderse por separado
7. **Middleware:** Integraciones no-SAP requieren middleware adicional

### Ventaja de BidEval

| Aspecto | SAP Ariba | BidEval-v2 |
|---------|-----------|------------|
| Precio de entrada | $50,000+/ano | SaaS accesible |
| Costo proveedores | Si (fees de red) | $0 para proveedores (portal con token gratuito) |
| Implementacion | 3-6 meses + consultores | Dias (SaaS cloud, auth incluida) |
| Dependencia ERP | Si (SAP ecosystem) | No (standalone con API REST) |
| Costos de training | Meses de capacitacion | Wizard intuitivo + tour de onboarding |
| Seguridad incluida | Requiere config adicional | Auth + RLS + audit SOC2 + session timeout out-of-the-box |
| Total cost of ownership (3 anos) | $250,000 - $2,000,000+ | Fraccion del costo |

### Comparacion de Precios: Escenarios Reales

#### Escenario 1: EPC Mediana (500 empleados, 10-15 licitaciones/ano)

| Concepto | SAP Ariba | BidEval-v2 (estimado) |
|----------|-----------|----------------------|
| Licencia anual (Sourcing only) | $75,000 - $120,000 | $6,000 - $12,000 |
| Implementacion (one-time) | $150,000 - $250,000 | $0 (SaaS, self-service) |
| Consultoria SAP (anual) | $30,000 - $60,000 | $0 |
| Training usuarios (one-time) | $15,000 - $25,000 | $0 (wizard autoguiado) |
| Integracion ERP (one-time) | $50,000 - $100,000 | $0 (standalone) |
| Fees proveedores (anual) | $5,000 - $15,000 (indirecto) | $0 |
| **Ano 1 TOTAL** | **$325,000 - $570,000** | **$6,000 - $12,000** |
| **Ano 2-3 (anual)** | **$110,000 - $195,000** | **$6,000 - $12,000** |
| **TCO 3 anos** | **$545,000 - $960,000** | **$18,000 - $36,000** |
| **Ahorro con BidEval** | — | **96-97%** |

#### Escenario 2: EPC Grande (3,000 empleados, 30+ licitaciones/ano)

| Concepto | SAP Ariba | BidEval-v2 (estimado) |
|----------|-----------|----------------------|
| Licencia anual (Sourcing + Contracts) | $200,000 - $400,000 | $18,000 - $36,000 |
| Implementacion (one-time) | $400,000 - $800,000 | $0 - $5,000 (onboarding) |
| Consultoria SAP (anual) | $80,000 - $150,000 | $0 |
| Training (one-time) | $40,000 - $60,000 | $0 - $2,000 |
| Integracion ERP (one-time) | $100,000 - $200,000 | $5,000 - $10,000 (API) |
| Fees proveedores (anual) | $15,000 - $40,000 (indirecto) | $0 |
| **Ano 1 TOTAL** | **$835,000 - $1,650,000** | **$23,000 - $53,000** |
| **Ano 2-3 (anual)** | **$295,000 - $590,000** | **$18,000 - $36,000** |
| **TCO 3 anos** | **$1,425,000 - $2,830,000** | **$59,000 - $125,000** |
| **Ahorro con BidEval** | — | **95-96%** |

#### Escenario 3: Owner/Operator Energetico (evaluacion puntual, 3-5 licitaciones/ano)

| Concepto | SAP Ariba | BidEval-v2 (estimado) |
|----------|-----------|----------------------|
| Licencia anual minima | $50,000 - $75,000 | $3,000 - $6,000 |
| Implementacion | $100,000 - $200,000 | $0 |
| **TCO 3 anos** | **$250,000 - $425,000** | **$9,000 - $18,000** |
| **Ahorro con BidEval** | — | **95-96%** |

> **Nota importante:** Los precios de BidEval-v2 son estimaciones sugeridas para posicionamiento competitivo. Ariba no publica precios oficiales; las estimaciones se basan en fuentes publicas de analistas y consultores SAP.

#### Grafico de Comparacion TCO (3 anos)

```
TCO 3 anos (USD)

SAP Ariba (EPC grande)     |████████████████████████████████| $1.4M - $2.8M
SAP Ariba (EPC mediana)    |██████████████████|               $545K - $960K
SAP Ariba (Owner/Op)       |████████████|                     $250K - $425K
                           |
BidEval (EPC grande)       |█|                                $59K - $125K
BidEval (EPC mediana)      ||                                 $18K - $36K
BidEval (Owner/Op)         ||                                 $9K - $18K
                           +----+----+----+----+----+----+
                           0   $500K  $1M  $1.5M $2M  $2.5M
```

#### Desglose del Ahorro: Donde se va el dinero con Ariba?

```
Distribucion del costo de Ariba (Ano 1, EPC mediana):

  Licencia (25%)          |████████████|
  Implementacion (40%)    |████████████████████|
  Consultoria (10%)       |█████|
  Training (5%)           |██|
  Integracion ERP (15%)   |████████|
  Supplier fees (5%)      |██|
                          +----+----+----+----+

Con BidEval, los costos de implementacion, consultoria,
training, integracion y supplier fees son $0 o minimos.
Solo se paga la licencia SaaS.
```

#### ROI de Cambiar de Ariba a BidEval (solo modulo Sourcing)

| Metrica | Valor |
|---------|-------|
| Ahorro anual (EPC mediana) | $100,000 - $180,000 |
| Ahorro anual (EPC grande) | $270,000 - $550,000 |
| Payback period | Inmediato (SaaS, sin implementacion) |
| Reduccion tiempo evaluacion | 60-80% (IA vs manual) |
| Reduccion tiempo setup proyecto | 95% (wizard vs Ariba config) |
| FTE liberados (evaluacion manual) | 1-3 FTE equivalentes/ano |

---

## 8. Mapa Competitivo Completo

### Competidores por Categoria

#### Plataformas Generalistas (Source-to-Pay)

| Plataforma | Market Share | Rating | Fortaleza |
|-----------|-------------|--------|-----------|
| **SAP Ariba** | 29.1% | 4.3/5 | Red 5.5M proveedores, integracion SAP |
| **Coupa** | ~10-12% | 4.7/5 | Mejor UX del mercado, adopcion rapida |
| **JAGGAER** | ~5-7% | 4.5/5 | Sourcing directo complejo, sector publico |
| **Ivalua** | ~4-6% | Leader MQ | Maxima configurabilidad, oil & gas |
| **Oracle Procurement** | ~8-10% | — | Integracion Oracle ERP |

#### Plataformas Especializadas EPC (Competidores Directos)

| Plataforma | Enfoque | Diferenciador | Riesgo para BidEval |
|-----------|---------|---------------|---------------------|
| **Mintmesh RUDY** | Evaluacion ofertas EPC | "Engineering Language Processing", 40-70% ahorro tiempo | ALTO |
| **Midpilot** | Evaluacion tenders energetico | Desarrollado por ex-DNV, reports PDF + Excel | MEDIO |

### Posicionamiento Visual

```
                        Especializado EPC
                              |
                Midpilot  BidEval-v2  RUDY
                              |
     Configurabilidad --------+-------- Facilidad de Uso
                              |
                 Ivalua     JAGGAER
                              |
                  SAP Ariba       Coupa
                              |
                        Generalista S2P
```

### Analisis de Competidores Directos

**Mintmesh RUDY — Amenaza Alta**
- Plataforma IA especifica para evaluacion de ofertas EPC
- Usa "Engineering Language Processing" (ELP) entrenado para lenguaje de ingenieria
- Crea "Single System of Records" (SSOR) de requisicion a bid evaluation
- Ahorra 40-70% del tiempo en comparaciones tecnicas y comerciales
- AI Innovation Award 2024
- Fundada 2015, Detroit, financiacion de Bridge Lake Partners (NYC)

**Midpilot — Amenaza Media**
- Evaluacion de tenders EPC en sector energetico
- Equipo fundador de DNV y Norges Bank Investment Management
- Cross-check de ofertas contra requisitos del proyecto
- Reportes PDF con gaps + audit trails en Excel
- Revisiones por expertos humanos antes de entrega
- Residencia de datos en EU

### BidEval vs Competidores Directos

| Capacidad | BidEval-v2 | Mintmesh RUDY | Midpilot |
|-----------|-----------|---------------|----------|
| Extraccion IA de PDFs | Si (n8n + Ollama) | Si (ELP propietario) | Si |
| Chat RAG documentos | Si | No documentado | No |
| Generacion RFP multi-agente | Si (6 agentes) | No | No |
| Dashboard interactivo | Si (radar, ranking, comparativas) | No documentado | No |
| Informe tecnico versionado | Si | Reports basicos | Si (PDF + Excel) |
| Propuesta adjudicacion IA | Si | No | No |
| Modulo economico Excel | Si (template cliente) | Si | No documentado |
| Simulacion what-if | Si | No documentado | No |
| Historial proveedor | Si (cross-proyecto) | No | No |
| Autenticacion + Multi-tenant | Si (Supabase Auth, organizaciones, RLS) | Enterprise custom | No documentado |
| API REST publica | Si (6 endpoints, API keys, rate limiting) | No documentado | No |
| Audit logging SOC2 | Si (acciones de usuario, RPC) | No documentado | No documentado |
| Session timeout | Si (30/60 min, SOC2 compliant) | No documentado | No documentado |
| Status page publica | Si (health checks, auto-refresh) | No | No |
| Monitoring (Sentry) | Si (error tracking, performance, replay) | No documentado | No documentado |
| Portal de proveedores | Si (rutas publicas con token) | No documentado | No |
| LLM local (privacidad) | Si (Ollama) | Cloud propietario | EU only |
| Dark/light mode | Si | No documentado | No |

---

## 9. Pain Points de Usuarios de Ariba

### Top 7 Quejas Recurrentes

Basado en reviews de Capterra, G2, Gartner Peer Insights y TrustRadius:

#### 1. Interfaz Lenta y Anticuada (>60% de reviews negativas)
> Los usuarios la describen como lenta, poco intuitiva y con bugs consistentes. Las paginas no se ajustan correctamente ni en desktop ni en mobile.

**Respuesta BidEval:** Interfaz React 18, Vite, transiciones fluidas de 0.15-0.3s, dark/light mode, responsive.

#### 2. Curva de Aprendizaje Extrema
> La interfaz es abrumadora para principiantes. Requiere meses de formacion antes de ser productivo. Solo power users la aprovechan realmente.

**Respuesta BidEval:** Wizard de 7 pasos guiado, productivo desde el primer proyecto. Sin necesidad de consultores.

#### 3. Navegacion Confusa
> Los usuarios reportan que no encuentran lo que necesitan y los procesos raramente funcionan al primer intento.

**Respuesta BidEval:** Sidebar con iconos claros, navegacion por fases del proyecto (BID > RFP > Scoring > Resultados).

#### 4. Uploads Fallidos
> Subir documentos (facturas, ofertas) frecuentemente requiere 4-5 intentos.

**Respuesta BidEval:** Upload con drag & drop, portal de subida para proveedores, procesamiento inmediato.

#### 5. Reportes Insuficientes
> Los dashboards no son tan potentes como deberian para analisis profundo.

**Respuesta BidEval:** Dashboard ejecutivo con radar charts, ranking dinamico, quick compare, informe tecnico PDF versionado.

#### 6. Soporte Lento
> Quality of Support: 7.8/10 en G2 (debajo de competidores). Demoras en resolucion.

**Respuesta BidEval:** Soporte directo, actualizaciones frecuentes, chat IA para autoservicio.

#### 7. Integracion Compleja
> Integrar con SAP ERP requiere planificacion cuidadosa y expertise tecnico. Sincronizacion de datos problematica.

**Respuesta BidEval:** SaaS standalone, zero dependencia de ERP. Import/export de datos por Excel.

---

## 10. Estrategia: Como Ganarle a Ariba

### Posicionamiento

BidEval **NO debe competir** con Ariba como plataforma de procurement generalista. El posicionamiento correcto es:

> **"La plataforma de evaluacion de ofertas con IA disenada especificamente para proyectos EPC — donde SAP Ariba termina, BidEval comienza."**

### Escenarios de Mercado

#### Escenario A: Complemento de Ariba
Para empresas EPC que ya usan Ariba para procurement general pero necesitan evaluacion tecnica profunda.

```
SAP Ariba                            BidEval-v2
    |                                     |
    |-- Publicar RFP en Ariba Network --> |
    |-- Recibir ofertas de proveedores -> |
    |                                     |-- Upload PDFs de ofertas
    |                                     |-- Extraccion IA automatica
    |                                     |-- Scoring tecnico profundo
    |                                     |-- Chat IA sobre documentos
    |                                     |-- Dashboard comparativo
    |                                     |-- Informe tecnico auditable
    |                                     |-- Propuesta de adjudicacion
    |<-- Resultado de evaluacion ---------|
    |-- Award formal en Ariba             |
    |-- Contrato + PO                     |
    |-- Invoicing y pago                  |
```

#### Escenario B: Reemplazo de Ariba Sourcing
Para empresas EPC medianas que no justifican el costo de Ariba solo para sourcing.

#### Escenario C: Standalone para EPC sin Ariba
Para empresas que no tienen Ariba y necesitan una solucion de evaluacion de ofertas.

### 8 Mensajes de Venta Diferenciadores

| # | Mensaje | Argumento |
|---|---------|-----------|
| 1 | **"De PDF a decision en minutos, no semanas"** | Ariba requiere carga manual de datos; BidEval extrae automaticamente |
| 2 | **"Sin curva de aprendizaje SAP"** | Wizard de 7 pasos vs meses de capacitacion |
| 3 | **"IA que entiende ingenieria"** | 6 agentes especializados vs 1 agente generico de Joule |
| 4 | **"Zero supplier fees"** | Sin modelo two-sided; proveedores acceden gratis via portal con token |
| 5 | **"Deploy en dias, no meses"** | SaaS cloud con auth, multi-tenant y API incluidos. Zero config |
| 6 | **"Informes auditables automaticos"** | PDF versionado auto-generado + audit logging SOC2 completo |
| 7 | **"Tu dato, tu servidor"** | Ollama on-premise vs cloud de SAP |
| 8 | **"Seguridad enterprise sin precio enterprise"** | Auth, RLS, session timeout SOC2, audit logging, API keys con rate limiting — incluido en el precio base |

### Target Market

| Segmento | Perfil | Escenario |
|----------|--------|-----------|
| **EPC grande (>5000 emp)** | Ya usan Ariba para procurement | Complemento (Escenario A) |
| **EPC mediana (500-5000 emp)** | Ariba es demasiado caro/complejo | Reemplazo de sourcing (Escenario B) |
| **EPC pequena/Owner operators** | No tienen Ariba | Standalone (Escenario C) |
| **Consultoras de ingenieria** | Evaluacion de licitaciones como servicio | Herramienta core |

---

## 11. Plan de Mejoras Prioritarias

Funcionalidades que BidEval deberia incorporar para cerrar gaps con Ariba y ampliar ventaja:

### Prioridad ALTA (Impacto directo en ventas)

| # | Mejora | Descripcion | Esfuerzo |
|---|--------|-------------|----------|
| ~~1~~ | ~~**API de integracion**~~ | ~~REST API para import/export con Ariba y otros sistemas~~ **COMPLETADO**: 6 endpoints documentados, API Key auth + JWT, rate limiting (100 req/hr), gestion de API keys (CRUD, permisos, expiracion) | ~~3-4 sem~~ |
| 2 | **Sealed bidding** | Sobre cerrado digital: ofertas cifradas hasta fecha de apertura. Critico en licitaciones publicas/reguladas | 2 sem |
| 3 | **Workflow de aprobaciones** | Aprobaciones escalonadas por monto ($1M+ VP, $10M+ C-level). Delegacion, audit trail | 2-3 sem |
| 4 | **Collaborative scoring** | Multiples evaluadores puntuan con pesos configurables. Consolidacion automatica de scores. La infraestructura de auth y roles ya soporta esto | 2-3 sem |
| 5 | **Split award / Multi-lote** | Adjudicacion parcial o por lotes (ej: un proveedor para mecanica, otro para electrica) | 3 sem |
| 6 | **Certificacion SOC2 Type I** | Los controles tecnicos ya estan implementados (audit logging, session timeout, RLS, auth). Falta la auditoria formal | 4-8 sem (externo) |

### Prioridad MEDIA (Diferenciacion competitiva)

| # | Mejora | Descripcion | Esfuerzo |
|---|--------|-------------|----------|
| 6 | **Templates EPC** | Biblioteca de templates RFP/RFQ pre-configurados (FEED, EPC, EPCM, Lump Sum) | 2 sem |
| 7 | **Compliance automatico** | Verificacion de certificaciones (ISO, API, ASME), seguros, licencias | 3 sem |
| 8 | **Benchmarking historico** | Comparar precios actuales vs historicos del mismo proveedor cross-proyectos | 2-3 sem |
| 9 | **Scenario planning avanzado** | Multiples escenarios de adjudicacion con analisis costo-riesgo | 3 sem |
| 10 | **Contrato post-adjudicacion** | Templates FIDIC/NEC pre-llenados con datos de la oferta ganadora | 3-4 sem |

### Prioridad BAJA (Nice-to-have)

| # | Mejora | Descripcion | Esfuerzo |
|---|--------|-------------|----------|
| 11 | **Mini-subastas** | Subastas inversas para items commodity (tuberias, cableado) | 4 sem |
| 12 | **Supplier portal** | Portal donde proveedores gestionan perfil, reciben invitaciones, envian ofertas | 4-6 sem |
| 13 | **Spend analytics** | Dashboard de gasto acumulado por categoria, proveedor, periodo | 3 sem |
| 14 | **Mobile app** | App nativa para scoring y revision desde campo | 6-8 sem |
| 15 | **Supplier risk scoring** | Score de riesgo basado en datos publicos, sanciones, salud financiera | 4 sem |

### Roadmap Sugerido

```
Q1 2026 (Completado/En curso)  Q2 2026                    Q3 2026
    |                              |                          |
    |-- API integracion [DONE]     |-- Templates EPC          |-- Contrato post-award
    |-- Auth + Multi-tenant [DONE] |-- Compliance auto        |-- Mini-subastas
    |-- Audit SOC2 [DONE]          |-- Benchmarking           |-- Spend analytics
    |-- Sentry + Status [DONE]     |-- Scenario planning      |-- Mobile app
    |-- Portal proveedores [DONE]  |-- SOC2 Type I cert       |
    |-- Sealed bidding             |-- Collaborative scoring  |
    |-- Split award                |-- Workflow aprobaciones   |
```

---

## 12. Fuentes y Referencias

### SAP Ariba - Documentacion Oficial
- SAP Ariba Sourcing Features: https://www.sap.com/products/spend-management/ariba-sourcing/features.html
- SAP Ariba Event Process: https://help.sap.com/docs/strategic-sourcing/event-management/sap-ariba-sourcing-event-process
- Bid Analysis: https://help.sap.com/docs/strategic-sourcing/event-management/bid-analysis
- Award Scenarios: https://learning.sap.com/learning-journeys/introducing-sap-ariba-guided-sourcing-projects/exploring-the-award-scenarios-panel

### IA y Joule
- SAP Joule Agents: https://news.sap.com/2025/10/sap-connect-business-ai-new-joule-agents-embedded-intelligence/
- SAP Ariba AI Updates: https://sapinsider.org/articles/sap-ariba-updates-embed-ai-deeper-into-procurement-supplier-management/
- SAP AI Release Q4 2025: https://news.sap.com/2026/01/sap-business-ai-release-highlights-q4-2025/

### Pricing
- SAP Ariba Licensing: https://saplicensingexperts.com/sap-ariba-licensing-module-pricing-and-ariba-network-fees-explained/
- Redress Compliance Guide: https://redresscompliance.com/sap-ariba-licensing-guide-for-enterprise-cios-and-ctos/

### Reviews de Usuarios
- Capterra: https://www.capterra.com/p/227334/SAP-Ariba/reviews/
- Gartner Peer Insights: https://www.gartner.com/reviews/market/source-to-pay-suites/vendor/sap/product/sap-ariba
- Software Advice: https://www.softwareadvice.com/ecommerce/sap-ariba-profile/reviews/

### Sector Oil & Gas / EPC
- SAP Ariba for Oil and Gas: https://www.ariba.com/resources/library/library-pages/sap-ariba-solutions-for-oil-and-gas-companies
- Siemens Energy SAP Ariba: https://www.siemens-energy.com/us/en/home/supplier/supplier-cockpit/sap-ariba-implementation.html
- Ivalua Oil Gas: https://www.ivalua.com/solutions/industry/oil-gas-energy/

### Competidores Directos
- Mintmesh RUDY: https://www.mintmesh.ai
- Midpilot: https://www.midpilot.com

### Mercado
- Top 10 Procurement Vendors: https://www.appsruntheworld.com/top-10-procurement-software-vendors-and-market-forecast/
- SAP Ariba Market Share: https://6sense.com/tech/procurement-and-purchasing/ariba-procurement-solutions-market-share

---

*Documento actualizado el 21 de febrero de 2026 (v2.0). La informacion de mercado y pricing son estimaciones basadas en fuentes publicas y pueden variar.*
