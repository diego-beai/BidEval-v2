# Guía de Modificaciones para Soporte Multi-Proyecto

Este documento detalla las modificaciones necesarias en cada workflow de n8n para soportar el filtrado por `project_id` (UUID).

## Resumen de Cambios por Workflow

| Workflow | Cambios Necesarios |
|----------|-------------------|
| `ingesta-ofertas.json` | Recibir y almacenar `project_id` en todas las tablas |
| `ingesta-rfqs.json` | Usar `project_id` del payload en vez de generar hash |
| `scoring.json` | Añadir filtros por `project_id` en queries |
| `q&a.json` | Añadir filtros por `project_id` en queries |
| `mail.json` | Añadir `project_id` al payload y filtros |

---

## 1. INGESTA-OFERTAS.JSON (Ofertas de Proveedores)

### 1.1 Nodo "Set File ID"
**Ubicación:** Segundo nodo después del Webhook

**Añadir nueva asignación:**
```
Name: project_id
Type: String
Value: {{ $json.body.project_id }}
```

El nodo debe quedar con estas asignaciones:
- file_id
- file_title
- file_url
- file_binary
- file_metadata
- proyect_name (ya existe)
- proveedor
- evaluation
- **project_id** (NUEVO)

### 1.2 Nodo "Insert Document Metadata"
**Tipo:** Postgres Upsert

**Añadir nueva columna:**
```
Column: project_id
Value: {{ $('Set File ID').item.json.project_id }}
```

### 1.3 Nodo "Upsert Provider Response"
**Tipo:** Supabase Insert

**Añadir nuevo campo:**
```
Field: project_id
Value: {{ $('Set File ID').first().json.project_id }}
```

### 1.4 Nodo "Get many rows1" (Query rfq_items_master)
**Tipo:** Supabase getAll

**Añadir filtro:**
```
Field: project_id
Condition: equals
Value: {{ $('Set File ID').first().json.project_id }}
```

### 1.5 Nodo "Format for Vectorstore"
**Tipo:** Code

Modificar el return para incluir project_id en metadata:
```javascript
// Buscar esta sección y añadir project_id
return {
    json: {
        text: fullText,
        metadata: {
            file_id: fileId,
            file_title: fileTitle,
            proveedor: proveedor,
            tipo_evaluacion: tipoEval,
            project_name: proyecto,
            project_id: projectId,  // <-- AÑADIR ESTA LÍNEA
            processed_at: new Date().toISOString(),
            total_pages: totalPages
        }
    }
};
```

Y añadir la variable al principio del código:
```javascript
let projectId = "";
try {
    projectId = $('Set File ID').first().json.project_id || "";
} catch(e) {}
```

### 1.6 Nodo "Default Data Loader"
**Añadir nuevo metadata:**
```
Name: project_id
Value: {{ $json.metadata.project_id }}
```

---

## 2. INGESTA-RFQS.JSON (RFQ Base)

### 2.1 Nodo "Generate IDs1"
**Tipo:** Code

**Modificar para usar project_id del payload:**

Buscar y modificar esta sección (aproximadamente línea 20):
```javascript
// CAMBIAR ESTO:
const rfqProjectName = metadata.proyect_name || body.project_name || null;

// POR ESTO:
const projectIdFromPayload = body.project_id || null;  // UUID desde frontend
const rfqProjectName = metadata.proyect_name || body.project_name || null;
```

Y modificar el return para usar el UUID real:
```javascript
return {
  json: {
    file_id: stableId,
    rfq_document_id: documentId,
    file_id_original: originalFileId,
    file_title: fileTitle,
    file_binary: fileBinary,
    file_url: fileUrl,

    // CAMBIAR: Usar el project_id real del payload
    project_id: projectIdFromPayload,  // UUID real
    project_name: rfqProjectName || fileTitle.replace(/\.[^/.]+$/, ""),
    rfq_project_id: projectIdFromPayload || ('proj_' + simpleHash((rfqProjectName || 'generic').toLowerCase().trim())),

    // ... resto del código
  }
};
```

### 2.2 Nodo "Insert Document Metadata2"
**Tipo:** Postgres Upsert

**Modificar la columna id:**
```
Column: id (matching column)
Value: {{ $('Generate IDs1').first().json.rfq_document_id }}
```

**Añadir nueva columna:**
```
Column: project_id
Value: {{ $('Generate IDs1').first().json.project_id }}
```

### 2.3 Nodo "Create a row" (rfq_items_master)
**Tipo:** Supabase Insert

**Añadir nuevo campo:**
```
Field: project_id
Value: {{ $('Generate IDs1').first().json.project_id }}
```

### 2.4 Nodo "Parsear Items1" y "Parsear deliverables"
**Tipo:** Code

En ambos nodos, modificar el return para incluir project_id:
```javascript
return items.map(item => ({
    json: {
        rfq_project_id: loopCtx.rfq_project_id || "unknown",
        project_id: loopCtx.project_id || null,  // <-- AÑADIR
        rfq_document_id: loopCtx.rfq_document_id || "unknown",
        project_name: loopCtx.project_name || "Unknown",
        evaluation: loopCtx.tipo_evaluacion || "Technical Evaluation",
        fase: phase,
        requisito_rfq: req
    }
}));
```

---

## 3. SCORING.JSON

### 3.1 Nodo "Set Input Params1"
**Ya recibe project_id** - Verificar que está configurado:
```
Name: project_id
Value: {{ $json.body.project_id }}
```

### 3.2 Nodo "Fetch Requirements"
**Tipo:** Supabase getAll (tabla: rfq_items_master)

**Añadir filtro:**
```
Field: project_id
Condition: equals
Value: {{ $('Set Input Params1').first().json.project_id }}
```

### 3.3 Nodo "Fetch Provider Responses"
**Tipo:** Supabase getAll (tabla: provider_responses)

**Añadir filtro:**
```
Field: project_id
Condition: equals
Value: {{ $('Set Input Params1').first().json.project_id }}
```

### 3.4 Nodo "Supabase Upsert" (ranking_proveedores)
**Añadir campo:**
```
Field: project_id
Value: {{ $('Set Input Params1').first().json.project_id }}
```

---

## 4. Q&A.JSON (qa-audit-generator)

### 4.1 Nodo "Set Input Params"
**Ya recibe project_id** - Verificar:
```
Name: project_id
Value: {{ $json.body.project_id }}
```

### 4.2 Nodo "Fetch Missing Items"
**Tipo:** Supabase getAll (tabla: provider_responses)

**Añadir filtro:**
```
Field: project_id
Condition: equals
Value: {{ $('Set Input Params').first().json.project_id }}
```

### 4.3 Nodo "Supabase Insert" (qa_audit)
**Modificar el campo project_name:**
```
Field: project_id  (cambiar de project_name)
Value: {{ $('Set Input Params').first().json.project_id }}
```

---

## 5. MAIL.JSON

### 5.1 Nodo "Edit Fields"
**Añadir nueva asignación:**
```
Name: project_id
Type: String
Value: {{ $json.body.project_id }}
```

### 5.2 Nodo "Get Offers"
**Tipo:** Supabase getAll (tabla: provider_responses)

**Añadir filtro:**
```
Field: project_id
Condition: equals
Value: {{ $json.project_id }}
```

### 5.3 Nodo "Filter and Aggregate Issues"
**Tipo:** Code

Modificar para pasar project_id al output:
```javascript
// Al final del return, añadir:
return {
  issues: issuesFound,
  total_count: issuesFound.length,
  project_id: editFields.project_id,  // <-- AÑADIR
  project_name: editFields.project_name,
  provider_name: targetProvider,
  tone: editFields.tone
};
```

---

## Modificaciones en la Base de Datos

Antes de desplegar estos workflows, asegúrate de que las tablas tienen la columna `project_id`:

```sql
-- Verificar y añadir columna project_id si no existe

-- Para provider_responses
ALTER TABLE provider_responses
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Para rfq_items_master
ALTER TABLE rfq_items_master
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Para qa_audit
ALTER TABLE qa_audit
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_provider_responses_project_id
ON provider_responses(project_id);

CREATE INDEX IF NOT EXISTS idx_rfq_items_master_project_id
ON rfq_items_master(project_id);

CREATE INDEX IF NOT EXISTS idx_qa_audit_project_id
ON qa_audit(project_id);
```

---

## Frontend (Ya Modificado)

El frontend ya ha sido modificado para enviar `project_id` en todas las llamadas:

1. **useRfqProcessing.ts** - Envía `project_id` con las ofertas de proveedores
2. **useRfqBaseProcessing.ts** - Envía `project_id` con las RFQ base
3. **n8n.service.ts** - Todas las funciones aceptan y envían `project_id`

---

## Orden de Implementación Recomendado

1. Ejecutar las modificaciones SQL en la base de datos
2. Modificar `ingesta-rfqs.json` (RFQ Base)
3. Modificar `ingesta-ofertas.json` (Ofertas)
4. Modificar `scoring.json`
5. Modificar `q&a.json`
6. Modificar `mail.json`
7. Probar cada workflow individualmente
8. Probar el flujo completo

---

**Fecha:** 2025-01-16
**Versión:** 1.0
