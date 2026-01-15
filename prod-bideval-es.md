# BidEval - Documento de Producto

**Plataforma de Evaluación de Ofertas con Inteligencia Artificial**

---

| Campo | Valor |
|-------|-------|
| **Producto** | BidEval |
| **Versión** | 2.1 Beta |
| **Empresa** | BeAI Energy |
| **Categoría** | AI-Powered Bid Evaluation Platform |
| **Fecha** | Enero 2026 |
| **Tagline** | "Evalúa ofertas 10x más rápido con IA" |

---

## PARTE 1: INFORMACIÓN DE PRODUCTO

### 1.1 Elevator Pitch

**BidEval** es una plataforma de inteligencia artificial que automatiza la evaluación de propuestas de proveedores para proyectos de infraestructura energética. En lugar de semanas de trabajo manual comparando documentos, BidEval procesa RFQs y ofertas en minutos, extrayendo requisitos, evaluando cumplimiento y generando rankings objetivos.

Desarrollado por **BeAI Energy**, BidEval representa la convergencia entre expertise del sector energético y tecnología de IA de última generación. La plataforma procesa documentación técnica compleja —desde especificaciones Pre-FEED hasta evaluaciones económicas— con la misma rigurosidad que un equipo de ingenieros senior, pero en una fracción del tiempo.

**Diferenciador clave:** Toda la inteligencia artificial opera 100% on-premise, garantizando que los datos sensibles de licitaciones nunca abandonen los servidores del cliente.

---

### 1.2 El Problema

#### El Proceso de Evaluación de RFQs es Lento, Costoso y Propenso a Errores

En proyectos de infraestructura energética —plantas de hidrógeno verde, parques solares, instalaciones BESS— el proceso de selección de proveedores representa uno de los cuellos de botella más críticos:

**Tiempo perdido:**
- Evaluar 5-7 proveedores para un proyecto típico requiere **2-4 semanas** de trabajo dedicado
- Cada propuesta contiene 50-200 páginas de documentación técnica y económica
- La comparación manual de requisitos consume +100 horas de ingenieros senior

**Costos ocultos:**
- Horas de personal técnico cualificado (€80-150/hora)
- Retrasos en cronogramas de proyecto
- Oportunidades perdidas por decisiones tardías

**Riesgos de calidad:**
- Inconsistencias en la evaluación entre proveedores
- Subjetividad en la interpretación de requisitos
- Errores humanos por fatiga en documentos extensos
- Falta de trazabilidad en decisiones

**Estadísticas del mercado:**
- El 67% de los profesionales de procurement consideran que el proceso de evaluación es ineficiente
- El 45% reporta haber tomado decisiones basadas en información incompleta
- El costo promedio de una mala selección de proveedor supera el 15% del valor del contrato

---

### 1.3 La Solución: BidEval

BidEval transforma el proceso de evaluación de ofertas mediante un flujo automatizado de 5 pasos:

```
1. CARGA      →  Arrastra y suelta PDFs de RFQ y propuestas
2. EXTRACCIÓN →  IA extrae requisitos y evalúa cumplimiento
3. SCORING    →  Sistema pondera criterios técnicos y económicos
4. ANÁLISIS   →  Dashboard muestra ranking y comparativas
5. ACCIÓN     →  Genera preguntas de clarificación y comunicaciones
```

**Propuesta de valor única:**

| Sin BidEval | Con BidEval |
|-------------|-------------|
| 2-4 semanas de evaluación | 1-2 días |
| +100 horas de trabajo manual | <10 horas supervisión |
| Evaluación subjetiva | Scoring objetivo y trazable |
| Datos en múltiples sistemas | Plataforma centralizada |
| Riesgo de fuga de información | 100% procesamiento local |

---

## PARTE 2: FUNCIONALIDADES

### 2.1 Módulo de Ingesta de RFQs

**Extracción inteligente de requisitos desde documentos base**

El primer paso en cualquier proceso de evaluación es entender qué se está solicitando. BidEval analiza los documentos RFQ del cliente y extrae automáticamente:

- **Requisitos técnicos:** Especificaciones de equipos, estándares, certificaciones
- **Requisitos económicos:** Estructura de precios, garantías, penalizaciones
- **Entregables Pre-FEED:** Estudios conceptuales, PFDs preliminares, HAZID
- **Entregables FEED:** Especificaciones detalladas, datasheets, MTOs

**Características:**
- Drag & drop de múltiples PDFs
- OCR automático para documentos escaneados
- Clasificación inteligente por tipo de evaluación
- Soporte para documentos en español e inglés
- Procesamiento de hasta 200 páginas en menos de 10 minutos

**Resultado:** Una base de datos estructurada de todos los requisitos del proyecto, lista para evaluar propuestas de proveedores.

---

### 2.2 Módulo de Evaluación de Propuestas

**Análisis automático de cumplimiento con tecnología RAG**

Una vez definidos los requisitos, BidEval evalúa cada propuesta de proveedor contra la lista completa de requisitos:

**Proceso de evaluación:**
1. Carga de propuestas de proveedores (hasta 7 simultáneamente)
2. Extracción de texto y OCR si es necesario
3. Vectorización del contenido para búsqueda semántica
4. Evaluación de cada requisito usando RAG (Retrieval-Augmented Generation)
5. Clasificación del cumplimiento:
   - **INCLUIDO** - El proveedor cumple completamente
   - **PARCIALMENTE INCLUIDO** - Cumplimiento parcial o con condiciones
   - **NO INCLUIDO** - Sin evidencia de cumplimiento
   - **NO APLICA** - Requisito no relevante para este proveedor

**Para evaluaciones económicas:**
- Extracción de valores reales (precios, tarifas, totales)
- Identificación de estructura de costos
- Detección de partidas no cotizadas

**Métricas de rendimiento:**
- Procesamiento de 80 requisitos en 4-6 minutos
- Precisión superior al 95% en detección de cumplimiento
- Reducción del 55% en tiempo de evaluación vs proceso manual

---

### 2.3 Módulo de Scoring

**Sistema de puntuación multicriteria personalizable**

BidEval implementa un sistema de scoring ponderado con 12 criterios organizados en 4 categorías principales:

| Categoría | Peso | Criterios Incluidos |
|-----------|------|---------------------|
| **TÉCNICA** | 35% | Eficiencia del sistema (12%), Vida útil/degradación (8%), Flexibilidad operativa (8%), Pureza y presión (7%) |
| **ECONÓMICA** | 35% | CAPEX total (18%), OPEX garantizado (12%), Garantías y penalizaciones (5%) |
| **EJECUCIÓN** | 12% | Plazo de entrega (6%), Track record (3%), Solidez del proveedor (3%) |
| **HSE/ESG** | 18% | Seguridad ATEX (12%), Sostenibilidad (6%) |

**Características del scoring:**
- Pesos completamente personalizables por proyecto
- Cálculo automático basado en evaluaciones de cumplimiento
- Ranking ordenado de proveedores
- Identificación de fortalezas y debilidades por categoría
- Exportación a Excel para análisis adicional

**Personalización:**
Los pesos mostrados corresponden al proyecto H2 La Zaida (hidrógeno verde). BidEval permite ajustar estos pesos según los requisitos específicos de cada proyecto o industria.

---

### 2.4 Módulo Q&A (Preguntas de Clarificación)

**Generación automática de preguntas técnicas**

Cuando la IA detecta gaps o ambigüedades en las propuestas, genera automáticamente preguntas de clarificación organizadas por:

**Disciplinas:**
- Eléctrica (cables, power, circuitos)
- Mecánica (equipos rotativos, bombas, piping)
- Civil (estructuras, cimentaciones, hormigón)
- Proceso (workflows, etapas químicas, P&IDs)
- General (administrativo, multidisciplinar)

**Niveles de importancia:**
- **Alta** - Crítico para evaluación técnica o económica
- **Media** - Relevante pero no bloqueante
- **Baja** - Aclaración menor o informativa

**Gestión de estados:**
```
Borrador → Pendiente → Aprobada → Enviada → Respondida
```

**Funcionalidades:**
- Creación manual de preguntas adicionales
- Edición y aprobación por el equipo
- Exportación a PDF para envío formal
- Tracking de respuestas recibidas

---

### 2.5 Módulo de Comunicaciones

**Generación automática de emails profesionales**

BidEval redacta automáticamente comunicaciones a proveedores basándose en:
- Deficiencias detectadas en la evaluación
- Preguntas de clarificación aprobadas
- Contexto del proyecto

**Tonos disponibles:**
- **Formal** - Profesional y directo
- **Diplomático** - Educado y constructivo
- **Urgente** - Con énfasis en plazos

**Output:**
- Asunto optimizado para apertura
- Cuerpo estructurado con puntos de clarificación
- Formato editable antes del envío
- Soporte para español e inglés

---

### 2.6 Chat con IA

**Asistente conversacional con acceso a toda la base de conocimiento**

El módulo de chat permite consultas en lenguaje natural sobre RFQs y propuestas:

**Ejemplos de consultas:**
- "¿Cuál es el precio que ofrece IDOM para el sistema de refrigeración?"
- "Compara las especificaciones técnicas de SENER y WORLEY para la fase FEED"
- "¿Qué proveedor cumple mejor con los requisitos de certificación ISO?"
- "Lista todos los items no incluidos por SACYR"

**Tecnología:**
- RAG (Retrieval-Augmented Generation) sobre documentos vectorizados
- Acceso a base de datos estructurada de evaluaciones
- Respuestas contextualizadas con referencias a documentos originales
- Historial de conversación persistente

---

### 2.7 Dashboard Ejecutivo

**Visualización integral del proceso de evaluación**

**Métricas principales:**
- Total de propuestas procesadas
- RFQs analizados
- Nivel de automatización (94%+)
- Precisión de IA (98%+)

**Resultados de Scoring:**
- Top performer identificado
- Score promedio del proceso
- Tasa de cumplimiento por proveedor
- Número de proveedores evaluados

**Visualizaciones:**
- Gráfico radar de comparación multicriteria
- Barras apiladas por categoría de scoring
- Tabla de ranking con desglose
- Feed de actividad reciente

**Exportación:**
- Excel (.xlsx) con datos completos
- CSV para integración con otros sistemas

---

## PARTE 3: PROPUESTA DE VALOR

### 3.1 Beneficios Cuantificables

| Métrica | Mejora | Detalle |
|---------|--------|---------|
| **Tiempo de evaluación** | -60% | De semanas a días |
| **Horas de trabajo** | -100+ horas | Por proyecto típico |
| **Consistencia** | 100% | Mismos criterios para todos los proveedores |
| **Trazabilidad** | Total | Cada decisión documentada |
| **Seguridad de datos** | 100% local | Cero datos en cloud |

**Caso real - Proyecto H2 La Zaida:**
- 7 proveedores evaluados
- 150+ requisitos por proveedor
- Tiempo total: 2 días (vs 3+ semanas estimadas manualmente)
- Preguntas de clarificación generadas: 50+
- Ahorro estimado: +€15,000 en horas de ingeniería

---

### 3.2 ROI Estimado

**Para un proyecto típico (5-7 proveedores, 100+ requisitos):**

| Concepto | Sin BidEval | Con BidEval |
|----------|-------------|-------------|
| Horas de evaluación | 120 horas | 15 horas |
| Costo/hora ingeniero | €100 | €100 |
| **Costo total evaluación** | €12,000 | €1,500 |
| Licencia BidEval | - | €X/mes |
| **Ahorro neto** | - | **€10,000+** |

**Payback period:** < 1 proyecto

**Beneficios adicionales no cuantificados:**
- Reducción de riesgos por decisiones más informadas
- Mejora en negociaciones por análisis más profundo
- Aceleración de cronogramas de proyecto

---

### 3.3 Diferenciadores vs Competencia

| Característica | BidEval | Competencia típica |
|----------------|---------|-------------------|
| **Procesamiento de IA** | 100% local/on-premise | Cloud (datos salen del servidor) |
| **Especialización** | Sector energético | Genérico |
| **Ciclo completo** | RFQ → Evaluación → Q&A → Email | Solo evaluación |
| **Scoring multicriteria** | 12 criterios, 4 categorías | Básico o manual |
| **Idiomas** | ES + EN | Variable |
| **Personalización** | Pesos ajustables | Limitada |

**Ventaja competitiva clave: Privacidad Total**

En licitaciones de infraestructura crítica, la confidencialidad es fundamental. BidEval garantiza que:
- Ningún documento abandona los servidores del cliente
- La IA procesa localmente sin conexión a APIs externas
- No hay riesgo de filtración de información competitiva

---

## PARTE 4: MERCADO Y CLIENTES

### 4.1 Target Market

**Mercado primario:**
- EPC Contractors (Engineering, Procurement, Construction)
- Ingenierías especializadas en energía
- Empresas de desarrollo de proyectos

**Mercado secundario:**
- Utilities y empresas energéticas
- Fondos de inversión en infraestructura
- Organismos públicos de licitación

**Verticales prioritarias:**
- Hidrógeno verde y electrolizadores
- Solar fotovoltaico y termosolar
- Eólico onshore y offshore
- Almacenamiento de energía (BESS)
- Oil & Gas (transición energética)

**Tamaño de mercado:**
- El mercado global de procurement en energía supera los €500B anuales
- El 70% de proyectos de renovables involucra procesos de RFQ competitivos
- Crecimiento esperado del 15% anual en hidrógeno verde

---

### 4.2 Buyer Personas

#### Persona 1: Director de Compras / Procurement Manager

**Perfil:**
- Responsable de optimizar costos y tiempos en adquisiciones
- KPIs: Ahorro en compras, tiempo de ciclo, compliance

**Pain points:**
- Presión por reducir tiempos sin perder calidad
- Falta de visibilidad en el proceso de evaluación
- Dificultad para justificar decisiones ante dirección

**Mensaje clave:** "Reduce el tiempo de evaluación un 60% con trazabilidad completa"

---

#### Persona 2: Jefe de Proyecto / Project Manager

**Perfil:**
- Responsable de entregar proyectos en tiempo y presupuesto
- KPIs: Cumplimiento de cronograma, desviaciones de costo

**Pain points:**
- La selección de proveedores retrasa el arranque del proyecto
- Dependencia de equipos técnicos saturados
- Necesidad de decisiones rápidas pero informadas

**Mensaje clave:** "Toma decisiones de proveedor en días, no semanas"

---

#### Persona 3: Director Técnico / CTO

**Perfil:**
- Responsable de la calidad técnica de las soluciones
- KPIs: Fiabilidad de equipos, cumplimiento de especificaciones

**Pain points:**
- Preocupación por precisión de evaluaciones automatizadas
- Requisitos de seguridad de datos
- Necesidad de personalizar criterios técnicos

**Mensaje clave:** "IA de precisión 98%+ con procesamiento 100% local"

---

#### Persona 4: CFO / Director Financiero

**Perfil:**
- Responsable de rentabilidad y control de costos
- KPIs: ROI, márgenes, eficiencia operativa

**Pain points:**
- Alto costo de equipos técnicos en evaluaciones
- Dificultad para cuantificar valor de procesos internos
- Riesgo de decisiones costosas por análisis incompletos

**Mensaje clave:** "ROI positivo desde el primer proyecto, ahorro de €10K+ por evaluación"

---

### 4.3 Casos de Uso por Vertical

#### Hidrógeno Verde
- Evaluación de electrolizadores (AE, PEM, SOEC)
- Comparación de eficiencias BOP
- Análisis de garantías de degradación
- **Proyecto referencia:** H2 La Zaida

#### Solar Fotovoltaico
- Evaluación de módulos y estructuras
- Comparación de inversores y transformadores
- Análisis de garantías de rendimiento

#### Almacenamiento BESS
- Evaluación de sistemas de baterías
- Comparación de ciclos de vida y eficiencias
- Análisis de BMS y sistemas de seguridad

#### Infraestructura Industrial
- Evaluación de equipos de proceso
- Comparación de sistemas de control
- Análisis de cumplimiento normativo

---

## PARTE 5: ARQUITECTURA TÉCNICA

### 5.1 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
│                    (Navegador Web)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND REACT                            │
│     Dashboard │ Upload │ Tabla │ Q&A │ Chat │ Email         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              MOTOR DE AUTOMATIZACIÓN                         │
│         (Workflows de procesamiento inteligente)            │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Ingesta │ │ Evalua- │ │ Scoring │ │  Q&A/   │           │
│  │   RFQ   │ │  ción   │ │         │ │  Mail   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  IA PROPIETARIA LOCAL                        │
│                                                              │
│    ┌──────────────┐    ┌──────────────┐                     │
│    │   Modelos    │    │  Embeddings  │                     │
│    │    LLM       │    │  Vectoriales │                     │
│    └──────────────┘    └──────────────┘                     │
│                                                              │
│         100% ON-PREMISE │ ZERO CLOUD                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS                              │
│                                                              │
│    ┌──────────────┐    ┌──────────────┐                     │
│    │  PostgreSQL  │    │  Vectorstore │                     │
│    │ (Estructural)│    │   (pgvector) │                     │
│    └──────────────┘    └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.2 Seguridad y Privacidad

**Principio fundamental: Los datos nunca salen del entorno del cliente**

| Aspecto | Implementación |
|---------|----------------|
| **Procesamiento de IA** | 100% local, sin APIs cloud |
| **Almacenamiento** | Base de datos on-premise |
| **Transmisión** | Solo red interna |
| **Backups** | Control total del cliente |
| **Acceso** | Autenticación local |

**Cumplimiento:**
- Compatible con políticas de datos sensibles
- Alineado con requisitos de confidencialidad en licitaciones
- Sin dependencia de terceros para procesamiento

**Garantía:**
- Cero datos transmitidos a servidores externos
- Cero dependencia de APIs de IA cloud
- Control total sobre modelos y configuraciones

---

### 5.3 Requisitos de Infraestructura

**Servidor de aplicación:**
- CPU: 8+ cores recomendados
- RAM: 16GB mínimo, 32GB recomendado
- Almacenamiento: 100GB+ SSD
- Sistema operativo: Linux (Ubuntu/CentOS) o Windows Server

**Modelos de IA:**
- Modelos de lenguaje propietarios optimizados
- Modelos de embeddings para búsqueda semántica
- RAM adicional: 8-16GB para modelos en memoria

**Base de datos:**
- PostgreSQL con extensión de vectores
- Almacenamiento escalable según volumen de proyectos

**Red:**
- Acceso interno únicamente
- HTTPS para interfaz web
- Sin requisitos de conectividad externa

---

## PARTE 6: ROADMAP Y VISIÓN

### 6.1 Versión Actual (2.1 Beta)

**Estado:** Funcionalidades completas, optimizado para producción

**Características disponibles:**
- Ingesta de RFQs con OCR
- Evaluación de propuestas con RAG
- Scoring multicriteria 12 criterios
- Generación de Q&A automático
- Redacción de emails
- Chat conversacional
- Dashboard ejecutivo
- Exportación a Excel

**Validación:**
- Probado en proyecto real (H2 La Zaida)
- 7 proveedores evaluados exitosamente
- Feedback integrado de usuarios piloto

---

### 6.2 Próximas Versiones (2026)

**Q1 2026 - Versión 2.2:**
- API REST para integraciones externas
- Webhooks para notificaciones
- Mejoras en UI/UX basadas en feedback

**Q2 2026 - Versión 2.5:**
- Integración con ERP/SAP
- Módulo de contratos y comparación de términos
- Dashboard analítico avanzado

**Q3-Q4 2026 - Versión 3.0:**
- Multi-idioma completo (FR, DE, PT)
- Marketplace de plantillas de scoring
- Modo colaborativo multi-usuario

---

### 6.3 Visión a Largo Plazo

**Plataforma de Procurement Inteligente para Energía**

BidEval evoluciona hacia una plataforma integral que cubra todo el ciclo de procurement:

```
Planificación → Sourcing → Evaluación → Negociación → Contratación → Seguimiento
```

**Funcionalidades futuras:**
- **Predicción de éxito:** IA que predice probabilidad de éxito con cada proveedor
- **Benchmarking automático:** Comparación con proyectos similares del mercado
- **Negociación asistida:** Sugerencias de puntos de negociación basadas en datos
- **Gestión de contratos:** Seguimiento de cumplimiento post-adjudicación

**Meta 2028:** Ser la plataforma de referencia en procurement B2B para el sector energético en Europa y Latinoamérica.

---

## PARTE 7: MODELO DE NEGOCIO

### 7.1 Estructura de Pricing

| Tier | Descripción | Incluye | Precio Sugerido |
|------|-------------|---------|-----------------|
| **Starter** | Para equipos pequeños | 1 proyecto activo, 5 proveedores, soporte email | €990/mes |
| **Professional** | Para ingenierías medianas | 5 proyectos, proveedores ilimitados, soporte prioritario | €2,490/mes |
| **Enterprise** | Para grandes EPC | Proyectos ilimitados, instalación on-premise, SLA dedicado | Personalizado |

**Modelo de licenciamiento:**
- Suscripción mensual o anual (descuento 15% anual)
- Por número de proyectos activos
- Sin límite de usuarios dentro de la organización

---

### 7.2 Servicios Profesionales

| Servicio | Descripción | Precio Orientativo |
|----------|-------------|-------------------|
| **Implementación** | Instalación, configuración, integración | €5,000 - €15,000 |
| **Onboarding** | Formación de usuarios (hasta 10 personas) | €2,500 |
| **Personalización de Scoring** | Configuración de criterios específicos | €1,500/proyecto |
| **Soporte Premium** | SLA 24/7, acceso a especialistas | €500/mes adicional |
| **Desarrollo a medida** | Integraciones específicas, funcionalidades custom | Consultar |

---

## PARTE 8: MATERIAL DE MARKETING

### 8.1 Taglines Alternativos

**Principal:**
> "Evalúa ofertas 10x más rápido con IA"

**Alternativos:**
- "De semanas a horas: evaluación de propuestas con IA"
- "Tu ingeniero de compras con IA, 24/7"
- "Procurement inteligente para proyectos de energía"
- "La IA que entiende de licitaciones energéticas"
- "Decisiones de proveedor más rápidas, más precisas, más seguras"

**Por audiencia:**
- **Técnicos:** "Análisis de 150 requisitos en minutos, no semanas"
- **Ejecutivos:** "ROI positivo desde el primer proyecto"
- **IT/Seguridad:** "IA 100% local. Tus datos nunca salen de tu servidor"

---

### 8.2 Mensajes Clave por Audiencia

#### Para Directores de Compras/Procurement:
- Reduce el ciclo de evaluación de semanas a días
- Trazabilidad completa para auditorías y compliance
- Ranking objetivo basado en criterios definidos
- Integración de todo el proceso en una sola plataforma

#### Para Jefes de Proyecto:
- Acelera la selección de proveedores sin sacrificar calidad
- Informes ejecutivos listos para presentar a dirección
- Identificación temprana de gaps y riesgos
- Generación automática de preguntas de clarificación

#### Para Directores Técnicos/CTOs:
- Precisión superior al 98% en detección de cumplimiento
- Personalización total de criterios de scoring
- Tecnología de IA de última generación
- Sin dependencia de proveedores cloud

#### Para CFOs:
- Ahorro de +€10,000 por proyecto en horas de evaluación
- ROI positivo desde el primer uso
- Reducción de riesgos por decisiones mejor informadas
- Modelo de suscripción predecible

---

### 8.3 Preguntas Frecuentes (FAQs)

**1. ¿Cómo maneja BidEval documentos escaneados?**
BidEval incluye OCR (Reconocimiento Óptico de Caracteres) automático que detecta cuando un documento está escaneado y lo procesa para extraer el texto. Soporta documentos en español e inglés.

**2. ¿Qué tan precisa es la evaluación automática?**
Nuestros tests muestran una precisión superior al 98% en la detección de cumplimiento de requisitos. El sistema está entrenado específicamente en documentación técnica del sector energético.

**3. ¿Mis datos están seguros?**
Sí. BidEval procesa toda la información localmente en los servidores del cliente. Ningún documento o dato se envía a servidores externos o APIs cloud. El procesamiento de IA es 100% on-premise.

**4. ¿Se pueden personalizar los criterios de scoring?**
Absolutamente. Los 12 criterios y sus pesos son completamente configurables. Puedes adaptar el scoring a los requisitos específicos de cada proyecto o seguir estándares de tu organización.

**5. ¿Cuántos proveedores puedo evaluar simultáneamente?**
BidEval soporta procesamiento paralelo de hasta 7 propuestas de proveedores simultáneamente. No hay límite en el número total de proveedores por proyecto.

**6. ¿Qué tipos de documento soporta?**
Principalmente PDF (tanto nativos como escaneados). Los documentos pueden contener texto, tablas, gráficos e imágenes. El sistema extrae información de todos estos formatos.

**7. ¿Cuánto tiempo tarda en procesar una propuesta?**
Una propuesta típica de 80-100 páginas se procesa en 4-6 minutos. Un proyecto completo con 7 proveedores puede evaluarse en menos de 1 hora.

**8. ¿Necesito conocimientos técnicos para usar BidEval?**
No. La interfaz está diseñada para usuarios de negocio. Solo necesitas cargar los documentos y el sistema hace el resto. Para configuración avanzada, ofrecemos soporte y formación.

**9. ¿Puedo exportar los resultados?**
Sí. Todos los datos pueden exportarse a Excel (.xlsx) o CSV. Los informes de Q&A pueden descargarse en PDF. Las comunicaciones se generan listas para copiar/pegar.

**10. ¿Qué soporte está incluido?**
Depende del tier de suscripción. Starter incluye soporte por email, Professional añade soporte prioritario, y Enterprise incluye SLA dedicado con acceso directo a especialistas.

---

## PARTE 9: GUÍAS PARA GENERACIÓN DE ASSETS

### 9.1 Estructura para Presentación PPTX (15 slides)

| Slide | Contenido | Notas |
|-------|-----------|-------|
| 1 | **Cover** | Logo BidEval + BeAI, tagline principal |
| 2 | **El Problema** | Dolor del proceso manual, estadísticas |
| 3 | **La Solución** | BidEval en una frase + flujo de 5 pasos |
| 4 | **Cómo Funciona** | Diagrama visual del flujo |
| 5 | **Demo/Screenshots** | Capturas de pantalla de la interfaz |
| 6 | **Funcionalidades** | 6 módulos en cards visuales |
| 7 | **Beneficios** | Tabla comparativa antes/después |
| 8 | **ROI** | Cálculo de ahorro con cifras concretas |
| 9 | **Arquitectura** | Diagrama alto nivel (sin detalles técnicos) |
| 10 | **Seguridad** | Énfasis en procesamiento 100% local |
| 11 | **Casos de Uso** | Verticales: H2, Solar, BESS, Industrial |
| 12 | **Roadmap** | Timeline visual de evolución |
| 13 | **Pricing** | Tabla de tiers |
| 14 | **BeAI Energy** | About, equipo, misión |
| 15 | **CTA/Contacto** | Próximos pasos, datos de contacto |

---

### 9.2 Outline para White Paper (10 páginas)

**Título:** "Transformando la Evaluación de Ofertas en el Sector Energético con IA"

| Sección | Páginas | Contenido |
|---------|---------|-----------|
| 1. Executive Summary | 0.5 | Resumen ejecutivo del documento |
| 2. El Reto del Procurement en Energía | 1 | Contexto del mercado, estadísticas, pain points |
| 3. BidEval: Visión General | 1 | Qué es, cómo funciona, propuesta de valor |
| 4. Profundización Técnica | 2 | Arquitectura, IA local, RAG, scoring |
| 5. Caso de Estudio: H2 La Zaida | 1.5 | Proyecto real con métricas y resultados |
| 6. Análisis de ROI | 1 | Cálculos detallados, comparativas, payback |
| 7. Seguridad y Compliance | 1 | Privacidad, procesamiento local, cumplimiento |
| 8. Guía de Implementación | 1 | Pasos para adopción, requisitos, timeline |
| 9. Visión de Futuro | 0.5 | Roadmap, evolución del producto |
| 10. Sobre BeAI Energy | 0.5 | Historia, misión, equipo, contacto |

---

### 9.3 Estructura para Landing Page

**Secciones:**

1. **Hero**
   - Headline: "Evalúa ofertas 10x más rápido con IA"
   - Subheadline: "Plataforma de evaluación de propuestas para proyectos de energía"
   - CTA: "Solicitar Demo" / "Ver Video"
   - Visual: Screenshot o animación del dashboard

2. **Problema/Solución**
   - Icono de dolor + texto breve del problema
   - Flecha de transición
   - Icono de solución + propuesta de valor

3. **Funcionalidades (6 cards)**
   - Ingesta de RFQs
   - Evaluación de Propuestas
   - Scoring Multicriteria
   - Q&A Automático
   - Comunicaciones
   - Chat con IA

4. **Métricas/Social Proof**
   - -60% tiempo de evaluación
   - +98% precisión
   - 100% datos locales
   - Logos de clientes/casos (si disponibles)

5. **Demo Interactiva**
   - Video embebido o GIF animado
   - Walkthrough visual del flujo

6. **Testimonial**
   - Quote de cliente piloto
   - Foto + nombre + cargo + empresa

7. **Pricing**
   - Tabla de 3 tiers
   - CTA en cada tier

8. **FAQ Accordion**
   - 5-7 preguntas más frecuentes

9. **Footer CTA**
   - "¿Listo para transformar tu proceso de evaluación?"
   - Form de contacto o botón de demo

---

### 9.4 Guión para Video (2-3 minutos)

**Estructura:**

| Tiempo | Sección | Contenido |
|--------|---------|-----------|
| 0:00-0:20 | **Hook** | "¿Cuánto tiempo dedica tu equipo a evaluar propuestas de proveedores?" + estadística impactante |
| 0:20-0:40 | **Problema** | Descripción del dolor: semanas de trabajo, inconsistencias, riesgos |
| 0:40-1:00 | **Introducción** | "Presentamos BidEval" + qué es en una frase |
| 1:00-1:45 | **Demo** | Walkthrough visual: upload → evaluación → scoring → Q&A |
| 1:45-2:15 | **Beneficios** | 3 beneficios clave con cifras: tiempo, precisión, seguridad |
| 2:15-2:30 | **CTA** | "Solicita una demo" + URL/contacto + logo BeAI |

**Tono:** Profesional pero accesible, enfocado en resultados

---

### 9.5 Temas para Contenido (Podcast/Blog/LinkedIn)

**Temas de alto impacto:**

1. "El futuro del procurement en energía: ¿Por qué la IA local es el nuevo estándar?"
2. "Cómo evaluamos 7 proveedores en 1 día: Caso de estudio H2 La Zaida"
3. "IA Cloud vs IA Local: ¿Qué necesita realmente tu empresa para proteger datos de licitaciones?"
4. "Los 5 errores más costosos en evaluación de propuestas (y cómo evitarlos)"
5. "Del Excel al AI: La evolución del scoring de proveedores"
6. "¿Por qué las ingenierías líderes están automatizando la evaluación de RFQs?"
7. "Hidrógeno verde y el reto del procurement: Lecciones de proyectos reales"
8. "El ROI oculto de automatizar la evaluación de ofertas"

---

## SOBRE BEAI ENERGY

### Nuestra Empresa

**BeAI Energy** es una empresa tecnológica especializada en soluciones de Inteligencia Artificial para los sectores energético e industrial. Con sede en Madrid, España, desarrollamos implementaciones personalizadas de IA diseñadas para mejorar la eficiencia operativa e impulsar la transformación digital.

### Nuestra Misión

*"Ser la energía que impulsa a las organizaciones hacia un futuro más inteligente"*

A través de la automatización de procesos, la aceleración de decisiones y la mitigación de riesgos, ayudamos a empresas del sector energético a aprovechar el poder de la inteligencia artificial de manera ética y efectiva.

### Nuestro Enfoque

**"Beyond Artificial. Genuinely Human."**

Creemos en una IA centrada en las personas. Nuestra tecnología potencia las capacidades humanas, no las reemplaza. Cada solución que desarrollamos prioriza:
- ROI medible y demostrable
- Principios de IA ética y responsable
- Implementación práctica con resultados rápidos
- Seguridad y privacidad de datos como fundamento

### Nuestros Servicios

- **AI-Lab as a Service:** Identificación de casos de uso, prototipos MVP, evaluación de beneficios
- **Soluciones LLM y NLP:** Implementaciones personalizadas de modelos de lenguaje
- **IA Agéntica:** Desarrollo de agentes autónomos para tareas complejas
- **Modelado Predictivo:** Forecasting y optimización basada en datos
- **Computer Vision:** Aplicaciones de visión artificial para industria

### Contacto

**BeAI Energy**
Calle Cardenal Spínola 2
28016 Madrid, España

**Web:** [beaienergy.com](https://beaienergy.com)
**LinkedIn:** BEAI Energy
**Email:** info@beaienergy.com

**CEO:** José Salamanca

---

*Documento generado: Enero 2026*
*Versión: 1.0*
*© 2026 BeAI Energy. Todos los derechos reservados.*
