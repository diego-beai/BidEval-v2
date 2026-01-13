# Sobre la Solución

## Una Plataforma Integral para la Gestión Inteligente de RFQs

Nuestra solución combina la potencia de un **motor de procesamiento de IA** con una **interfaz intuitiva** diseñada para equipos de ingeniería y procurement. No es solo un comparador de ofertas: es un sistema completo que extrae, valida, estructura y permite consultar información técnica de licitaciones de forma instantánea.

---

## La Experiencia de Usuario

### Sube tus Documentos en Segundos

Olvídate de formularios complejos. Simplemente **arrastra y suelta** hasta 7 PDFs de ofertas de proveedores en nuestra zona de carga. El sistema valida automáticamente el formato y tamaño de cada archivo antes de procesarlo.

- Soporte para múltiples archivos simultáneos
- Validación instantánea de formato PDF
- Vista previa de archivos seleccionados con información de tamaño
- Interfaz responsive que funciona en cualquier dispositivo

---

### Compara Ofertas con una Tabla Inteligente

Una vez procesados los documentos, accede a una **tabla comparativa dinámica** que los ingenieros pueden explorar sin límites:

| Capacidad | Descripción |
|-----------|-------------|
| **Filtros múltiples** | Filtra por evaluación, fase del proyecto, proveedor o búsqueda de texto libre |
| **Selección de proveedores** | Muestra solo los proveedores que te interesan comparar |
| **Exportación Excel/CSV** | Descarga los datos filtrados directamente a tu herramienta de análisis favorita |
| **Vista responsiva** | Tabla con scroll horizontal para manejar múltiples columnas de proveedores |

**Proveedores soportados:** Técnicas Reunidas, IDOM, SACYR, EA, SENER, TRESCA, WORLEY — con arquitectura extensible para añadir más.

---

### Chatea con tus Ofertas

¿Necesitas una respuesta rápida? Nuestro **Asistente RFQ** te permite consultar en lenguaje natural sobre las ofertas procesadas:

> *"¿Cuál es el precio que ofrece IDOM para el sistema de refrigeración?"*
>
> *"Compara las especificaciones técnicas de SENER y WORLEY para la fase FEED"*
>
> *"¿Qué proveedor cumple mejor con los requisitos de certificación ISO?"*

El chat utiliza tecnología **RAG (Retrieval Augmented Generation)** para buscar en la base de conocimiento vectorizada y darte respuestas precisas con contexto real de los documentos.

---

## El Motor de Procesamiento

Detrás de la interfaz simple, un pipeline robusto en **n8n** orquesta todo el trabajo pesado:

```
PDF → Extracción → Clasificación IA → Vectorización → Base de Datos
```

### Pipeline de Procesamiento

1. **Extracción Inteligente de PDFs**
   - Parseo automático del contenido de documentos
   - Identificación de estructura y secciones relevantes

2. **Clasificación con IA**
   - Detección automática del proveedor
   - Identificación del tipo de evaluación (Pre-FEED, FEED, etc.)
   - Extracción de metadata del proyecto

3. **Vectorización para Búsqueda Semántica**
   - Chunking optimizado (1500 caracteres con overlap de 200)
   - Embeddings con modelos de última generación
   - Almacenamiento en Supabase Vector Store

4. **Agente RAG para Consultas**
   - Búsqueda semántica sobre toda la base de conocimiento
   - Respuestas contextualizadas con información de múltiples documentos

---

## Arquitectura Técnica

| Componente | Tecnología |
|------------|------------|
| **Frontend** | React + TypeScript + Zustand |
| **Orquestación** | n8n (workflows automatizados) |
| **IA/ML** | LangChain + Ollama Embeddings |
| **Vector Store** | Supabase (pgvector) |
| **Exportación** | SheetJS (XLSX) |

---

## ¿Por qué Elegirnos?

- **Potente pero Simple**: Toda la complejidad del procesamiento de IA está oculta detrás de una interfaz que cualquier ingeniero puede usar sin entrenamiento.

- **Datos Exportables**: No te encerramos. Descarga tus análisis en Excel o CSV y continúa tu trabajo donde prefieras.

- **Consultas en Lenguaje Natural**: Pregunta lo que necesites como si hablaras con un experto que ha leído todos los documentos.

- **Validación Técnica Automática**: El backend clasifica y valida cada documento, asegurando que la información esté correctamente categorizada antes de mostrarla.

- **Escalable**: Arquitectura diseñada para crecer con tu volumen de licitaciones y número de proveedores.

---

*¿Listo para transformar tu proceso de evaluación de ofertas?*
