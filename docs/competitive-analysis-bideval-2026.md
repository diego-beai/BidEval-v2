# BidEval v2 - Analisis Competitivo y Posicionamiento

> Documento generado: Febrero 2026
> Objetivo: Comparacion honesta y objetiva de BidEval frente a competidores en el mercado de IA para procurement

---

## 1. Que es BidEval

**BidEval** es una plataforma SaaS de evaluacion inteligente de ofertas (bids/proposals) para departamentos de compras. Utiliza IA para automatizar el analisis, scoring y comparacion de propuestas de proveedores en procesos de licitacion (RFP/RFQ/RFI).

### 1.1 Propuesta de Valor

> "Procesos de evaluacion de 6 meses reducidos a 1 hora con IA"

BidEval se posiciona como una herramienta **especializada y accesible** frente a las mega-suites S2P (Source-to-Pay) que cuestan USD 500K+/ano y tardan meses en implementarse.

### 1.2 Funcionalidades Actuales (v2)

| Area | Funcionalidades |
|------|----------------|
| **Setup de Proyectos** | Wizard de 4 pasos: info basica, plazos/hitos, proveedores invitados, criterios de evaluacion con pesos personalizables |
| **Procesamiento de Documentos** | Subida de PDFs (RFQ base + propuestas), OCR, clasificacion automatica por tipo (tecnico/economico/otros), extraccion de contenido |
| **Evaluacion y Scoring** | Criterios dinamicos por proyecto, pesos jerarquizados (categoria + criterio), scoring automatico via IA, override manual, validacion de sumas |
| **Seccion Economica** | Extraccion automatica de precios, descuentos, TCO, condiciones de pago (30d/60d/120d), desglose CAPEX/OPEX, garantias, escalacion de precios |
| **Vista Ejecutiva** | Spider chart comparativo, pie chart de pesos, bar charts de ranking, Board Report para presentar a CEO/director de compras |
| **ESG/Sostenibilidad** | Categoria de scoring dedicada con sub-criterios (ambiental/social/gobernanza), catalogo de 12 certificaciones (ISO 14001, CSRD, SBTi...), extraccion automatica de certificaciones de propuestas, badges visuales con estados (confirmado/mencionado/no detectado), matriz comparativa certificaciones x proveedores, benchmarking ESG relativo entre proveedores |
| **Sistema Q&A** | Generacion automatica de preguntas tecnicas basadas en gaps detectados, workflow de aprobacion (draft/approved/sent/answered), envio a proveedores |
| **Comunicaciones** | Hub centralizado: emails, llamadas, reuniones, notas internas. Timeline cronologica con Q&A integrado |
| **Generador de RFP** | Creacion de documentos RFP/RFQ desde requisitos + templates reutilizables |
| **Directorio de Proveedores** | Mini CRM con historico de proveedores, scores promedio, categorias |
| **Gestion Multi-proyecto** | Vista lista con filtros, busqueda, ordenamiento por progreso/nombre/fecha |
| **Progreso Visual** | Barra de progreso horizontal por proyecto, anillos de progreso por proveedor, grid de estado de evaluaciones |
| **Soporte Multi-idioma** | Espanol/Ingles con toggle, persistencia |
| **Dark/Light Mode** | Toggle con preferencia de sistema |

### 1.3 Stack Tecnologico

- **Frontend**: React 18 + TypeScript + Vite + Zustand
- **Backend/IA**: n8n workflows (OCR, NLP, LLM, embeddings)
- **Base de Datos**: Supabase (PostgreSQL + Realtime)
- **Despliegue**: Docker (arquitectura SaaS en desarrollo)

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

### 4.1 Funcionalidades Core

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **Evaluacion cualitativa de ofertas (tecnica)** | 7 | 5 | 5 | 8 | 4 | 5 | 6 | 1 |
| **Evaluacion cuantitativa (precio/coste)** | 7 | 7 | 7 | 6 | 9 | 7 | 6 | 3 |
| **Scoring automatico con IA** | 7 | 6 | 7 | 9 | 7 | 6 | 5 | 1 |
| **Criterios de evaluacion personalizables** | 9 | 7 | 7 | 6 | 8 | 5 | 5 | 1 |
| **Procesamiento de PDFs/documentos** | 8 | 6 | 6 | 7 | 4 | 5 | 5 | 1 |
| **Analisis economico profundo (TCO, condiciones pago)** | 8 | 7 | 7 | 4 | 6 | 4 | 3 | 2 |
| **Comparacion visual ejecutiva** | 8 | 5 | 6 | 5 | 5 | 4 | 4 | 2 |
| **Sistema Q&A con proveedores** | 7 | 6 | 6 | 5 | 4 | 5 | 3 | 1 |
| **Generacion de RFP/RFQ** | 6 | 7 | 7 | 8 | 6 | 7 | 4 | 1 |
| **Negociacion autonoma** | 1 | 3 | 3 | 2 | 3 | 3 | 1 | 10 |
| **Promedio funcionalidades core** | **6.8** | **5.9** | **6.1** | **6.0** | **5.6** | **5.1** | **4.2** | **2.3** |

### 4.2 Plataforma y Experiencia

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **UX/UI moderno** | 8 | 5 | 7 | 7 | 7 | 7 | 7 | 5 |
| **Time-to-value (rapidez de implementacion)** | 9 | 2 | 3 | 6 | 6 | 6 | 8 | 5 |
| **Facilidad de uso (curva de aprendizaje)** | 8 | 3 | 4 | 7 | 5 | 6 | 7 | 4 |
| **Accesibilidad de precio** | 9 | 1 | 1 | 3 | 4 | 4 | 7 | 2 |
| **Soporte multi-idioma** | 7 | 9 | 9 | 7 | 6 | 5 | 8 | 5 |
| **Dark/light mode** | 8 | 4 | 5 | 5 | 4 | 4 | 5 | 3 |
| **Promedio plataforma** | **8.2** | **4.0** | **4.8** | **5.8** | **5.3** | **5.3** | **7.0** | **4.0** |

### 4.3 Capacidades Enterprise

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **Integraciones ERP/sistemas existentes** | 2 | 10 | 9 | 6 | 7 | 7 | 4 | 5 |
| **Seguridad y compliance enterprise** | 3 | 10 | 10 | 8 | 8 | 7 | 6 | 7 |
| **Escalabilidad (1000+ usuarios)** | 3 | 10 | 10 | 8 | 8 | 8 | 5 | 6 |
| **Multi-tenant / SaaS maduro** | 2 | 10 | 10 | 9 | 8 | 8 | 7 | 7 |
| **Soporte y SLA** | 2 | 9 | 9 | 7 | 7 | 7 | 5 | 6 |
| **Ecosistema de proveedores (network)** | 1 | 10 | 9 | 6 | 5 | 7 | 4 | 3 |
| **Trayectoria y referencias** | 2 | 10 | 10 | 7 | 7 | 7 | 3 | 4 |
| **Cobertura Source-to-Pay completa** | 1 | 10 | 10 | 4 | 5 | 5 | 3 | 2 |
| **Promedio enterprise** | **2.0** | **9.9** | **9.6** | **6.9** | **6.9** | **7.0** | **4.6** | **5.0** |

### 4.4 Innovacion y Diferenciacion

| Criterio | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| **IA avanzada (GenAI/Agentic AI)** | 6 | 7 | 8 | 9 | 8 | 7 | 5 | 8 |
| **Innovacion en el approach** | 7 | 5 | 6 | 8 | 8 | 7 | 6 | 9 |
| **Game theory / predictive** | 1 | 2 | 2 | 2 | 3 | 2 | 1 | 10 |
| **Sostenibilidad/ESG como criterio** | 6 | 5 | 6 | 3 | 4 | 3 | 2 | 1 |
| **Roadmap publico ambicioso** | 5 | 8 | 8 | 7 | 7 | 7 | 5 | 6 |
| **Promedio innovacion** | **5.0** | **5.4** | **6.0** | **5.8** | **6.0** | **5.2** | **3.8** | **6.8** |

### 4.5 Resumen Global

| Categoria | BidEval | SAP Ariba | Coupa | Globality | Keelvar | Fairmarkit | Tendios | nnamu |
|-----------|---------|-----------|-------|-----------|---------|------------|---------|-------|
| Funcionalidades Core | 6.8 | 5.9 | 6.1 | 6.0 | 5.6 | 5.1 | 4.2 | 2.3 |
| Plataforma y UX | **8.2** | 4.0 | 4.8 | 5.8 | 5.3 | 5.3 | 7.0 | 4.0 |
| Enterprise | 2.0 | **9.9** | **9.6** | 6.9 | 6.9 | 7.0 | 4.6 | 5.0 |
| Innovacion | 5.0 | 5.4 | 6.0 | 5.8 | 6.0 | 5.2 | 3.8 | **6.8** |
| **PROMEDIO GLOBAL** | **5.5** | **6.3** | **6.6** | **6.1** | **6.0** | **5.7** | **4.9** | **4.5** |

---

## 5. Interpretacion Honesta

### 5.1 Donde BidEval Gana

1. **Evaluacion de ofertas como producto** (no como sub-feature): BidEval es el unico producto standalone enfocado 100% en evaluar y comparar propuestas. Los demas lo hacen como una funcionalidad menor dentro de suites enormes.

2. **Time-to-value**: Horas vs meses. Subir PDFs y obtener una evaluacion comparativa en la misma sesion.

3. **Accesibilidad de precio**: Gap enorme entre suites de USD 500K+/ano y spreadsheets. BidEval llena ese vacio.

4. **UX/UI moderno**: Disenado para presentar a directivos, no solo para el buyer tecnico. Spider charts, dashboard ejecutivo, dark mode.

5. **Analisis economico profundo**: TCO, condiciones de pago, desglose CAPEX/OPEX. La mayoria de competidores solo miran precio unitario.

6. **Criterios personalizables con transparencia**: Los pesos se definen al inicio y no se cambian (compliance sector publico EU).

### 5.2 Donde BidEval Pierde (Honestamente)

1. **Madurez enterprise**: Sin integraciones ERP, multi-tenant en desarrollo, sin certificaciones de seguridad (SOC2, ISO 27001). Esto es un blocker para grandes corporaciones con procurement compliance estricto.

2. **Trayectoria y referencias**: Sin clientes publicos de referencia aun. Las enterprise compran a vendors con track record. SAP/Coupa tienen miles de clientes.

3. **Ecosistema**: No hay red de proveedores, no hay marketplace, no hay integraciones con sistemas existentes. Las enterprise necesitan que encaje en su stack.

4. **Cobertura S2P**: Solo cubre evaluacion. No cubre requisition, PO, contract management, AP, supplier onboarding. Las enterprise quieren consolidar vendors.

5. **IA avanzada**: La IA de BidEval (n8n + LLM) es funcional pero no esta al nivel de los modelos propietarios de Coupa (Navi) o Globality (Glo) que han sido entrenados con millones de transacciones.

6. **Game theory / prediccion**: No tiene capacidades predictivas ni de teoria de juegos. nnamu y Arkestro lideran esta tendencia.

7. **Escalabilidad**: No probado con 100+ usuarios concurrentes ni con grandes volumenes de datos.

### 5.3 Donde BidEval Esta Par

- Procesamiento de documentos PDF (comparable con startups, inferior a enterprise)
- Scoring automatico (funcional, mejorando)
- Q&A con proveedores (implementado, diferenciador vs muchos startups)
- Soporte RFP/RFQ/RFI (implementado)
- ESG/Sostenibilidad (6/10): catalogo de 12 certificaciones con extraccion automatica, benchmarking entre proveedores y matriz comparativa. Par con Coupa, por encima de Globality/Keelvar. Limitacion: sin integracion con datos externos (EcoVadis, CDP) ni tracking de emisiones Scope 1/2/3

---

## 6. Gaps del Mercado (Oportunidad para BidEval)

Basado en el analisis, estos son los gaps que BidEval puede explotar:

| Gap | Descripcion | Oportunidad |
|-----|-------------|-------------|
| **Mid-market pricing** | No existe solucion seria de evaluacion de ofertas con IA en el rango USD 5K-50K/ano | BidEval puede ser "el Figma del procurement evaluation" |
| **Evaluacion cualitativa** | La mayoria se enfoca en precio. Evaluacion tecnica/compliance esta poco automatizada | BidEval ya lo hace, reforzar messaging |
| **Mercado espanol B2B privado** | Tendios cubre publico, pero no hay nada para procurement privado en Espana | First-mover advantage |
| **Time-to-value** | Implementaciones de 6-18 meses son inaceptables para proyectos urgentes | BidEval en horas, demostrarlo con case studies |
| **Dashboard ejecutivo** | Los dashboards son tecnicos, no para directivos | BidEval ya tiene esto, reforzar |
| **Condiciones de pago como criterio** | Casi nadie analiza condiciones de pago (30d vs 120d) como factor de scoring | Diferenciador unico de BidEval |

---

## 7. Recomendaciones Estrategicas

### 7.1 Corto Plazo (3-6 meses)

| Prioridad | Accion | Impacto |
|-----------|--------|---------|
| **CRITICA** | Conseguir 2-3 clientes piloto y documentar case studies con resultados medibles | Sin referencias = sin ventas enterprise |
| **CRITICA** | Implementar autenticacion robusta + multi-tenant real | Blocker para cualquier empresa seria |
| **ALTA** | Crear integraciones basicas (API REST publica, webhook I/O, CSV/Excel export) | Las empresas necesitan que encaje en su stack |
| **ALTA** | Certificacion SOC2 Type I o equivalente | Requisito minimo de muchos departamentos de compras |
| ~~**MEDIA**~~ | ~~Anadir scoring ESG/sostenibilidad como criterio de evaluacion~~ **COMPLETADO**: Categoria ESG con sub-criterios, catalogo 12 certificaciones, extraccion automatica, badges, benchmarking, matriz comparativa | Puntuacion: 1→6. Par con Coupa. Siguiente paso: integrar datos externos (EcoVadis, CDP) |

### 7.2 Medio Plazo (6-12 meses)

| Prioridad | Accion | Impacto |
|-----------|--------|---------|
| **ALTA** | Integrar con SAP Ariba / Coupa como "motor de evaluacion" | Posicion de complemento, no competidor. Amplifica mercado 10x |
| **ALTA** | Anadir prediccion de precios basica (benchmarking por sector) | Feature muy demandada, actualmente solo GEP y Arkestro la tienen |
| **MEDIA** | Explorar game theory para recomendaciones de award | Tendencia emergente (nnamu, Arkestro), alto valor percibido |
| **MEDIA** | Marketplace de templates de evaluacion por industria | Reduce time-to-value aun mas, genera comunidad |

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
| **SAP Ariba / Coupa** | "La evaluacion de ofertas que su suite S2P no hace bien. Implementacion en horas, no en meses." |
| **Globality** | "Mismo concepto de scoring automatico, pero con analisis economico profundo (TCO, condiciones de pago) y UX ejecutiva." |
| **Tendios** | "Para procurement privado lo que Tendios hace para el publico." |
| **nnamu** | "Complementarios: BidEval evalua, nnamu negocia. Juntos cubren el ciclo completo." |
| **Spreadsheets** | "Deje de evaluar ofertas en Excel. La IA analiza 500 paginas en minutos." |

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
