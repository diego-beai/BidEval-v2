# 🔧 Fix: Nombre de Proyecto en Data Table

## 🐛 Problema Reportado

Cuando subes un archivo RFQ después de crear un proyecto desde el dashboard, en la **data table** aparecía el **nombre del archivo** en lugar del **nombre del proyecto que seleccionaste**.

**Ejemplo del problema:**
- Proyecto creado: "Hydrogen Plant - La Zaida, Spain"
- Archivo subido: "RFQ_Technical_v2.pdf"
- ❌ Aparecía en tabla: "RFQ_Technical_v2"
- ✅ Debería aparecer: "Hydrogen Plant - La Zaida, Spain"

---

## 🔍 Causa Raíz

El frontend enviaba al workflow de N8N:
```json
{
  "file_id": "rfq-123...",
  "file_title": "RFQ_Technical_v2.pdf",
  "file_binary": "base64...",
  "project_id": "uuid-del-proyecto"  ✅
  // ❌ Faltaba: "project_name": "Hydrogen Plant..."
}
```

El workflow de N8N esperaba recibir `project_name`, pero como no llegaba, usaba un **fallback** que tomaba el `file_title` (nombre del archivo).

**Código N8N que causaba el problema:**
```javascript
// Nombre del Proyecto: Prioridad IA > Prioridad Metadata > Fallback Genérico
let finalProjectName = output.nombre_proyecto || metadataProjectName;

if (!finalProjectName || finalProjectName === "Sin Nombre") {
    // Fallback inteligente basado en el nombre del archivo
    finalProjectName = fileTitle.replace(/\.pdf$/i, '') + " (Project)";  // <-- ❌ AQUÍ
}
```

---

## ✅ Solución Implementada

### 1. Modificado `n8n.service.ts` (línea 284-300)

**Antes:**
```typescript
export async function uploadRfqBase(file: File, projectId?: string)
```

**Después:**
```typescript
export async function uploadRfqBase(
  file: File,
  projectId?: string,
  projectName?: string  // <-- NUEVO parámetro
)
```

**Payload enviado ahora:**
```typescript
const payload = {
  file_id: fileId,
  file_title: fileTitle,
  file_url: "",
  file_binary: fileBase64,
  project_id: projectId || null,
  project_name: projectName || fileTitle.replace(/\.pdf$/i, '')  // <-- NUEVO
};
```

### 2. Modificado `useRfqBaseProcessing.ts` (línea 90-103)

**Obtener nombre del proyecto:**
```typescript
const { activeProjectId, getActiveProject } = useProjectStore();

// ...

// Obtener el nombre del proyecto para enviarlo a N8N
const activeProject = getActiveProject();
const projectName = activeProject?.display_name || activeProject?.name || undefined;

// Procesar archivos con project_id Y project_name
const uploadPromises = files.map(file =>
  uploadRfqBase(file, activeProjectId, projectName)  // <-- NUEVO
);
```

---

## 📊 Resultado

Ahora cuando subes un RFQ:

1. **Frontend obtiene** el proyecto activo del store
2. **Extrae** el `display_name` del proyecto
3. **Envía a N8N**:
   ```json
   {
     "project_id": "123e4567-e89b-12d3-a456-426614174000",
     "project_name": "Hydrogen Plant - La Zaida, Spain",  ✅
     "file_title": "RFQ_Technical_v2.pdf"
   }
   ```
4. **N8N usa** `project_name` en lugar del fallback con `file_title`
5. **Resultado en tabla**: "Hydrogen Plant - La Zaida, Spain" ✅

---

## 🧪 Cómo Probar

1. **Crear un proyecto** en el dashboard:
   - Nombre: "Solar PV Plant - Andalucía"

2. **Seleccionar el proyecto** en el sidebar

3. **Subir un RFQ** con nombre de archivo feo:
   - Archivo: `rfq_documento_tecnico_v3_final.pdf`

4. **Verificar en la tabla** que aparece:
   - ✅ "Solar PV Plant - Andalucía"
   - ❌ NO "rfq_documento_tecnico_v3_final"

---

## 📝 Archivos Modificados

1. ✅ `front-rfq/src/services/n8n.service.ts`
   - Agregado parámetro `projectName`
   - Incluido en payload a N8N

2. ✅ `front-rfq/src/hooks/useRfqBaseProcessing.ts`
   - Obtiene proyecto activo del store
   - Pasa `display_name` a `uploadRfqBase()`

---

## ⚠️ Notas Importantes

1. **Fallback sigue funcionando**: Si por alguna razón no hay `projectName`, usa el nombre del archivo (como antes)

2. **Retrocompatibilidad**: Los workflows de N8N antiguos siguen funcionando

3. **Console logs mejorados**: Ahora muestra en consola el `projectName` enviado para debugging

---

## 🚀 Próximos Pasos

1. ✅ **Reiniciar el frontend** para aplicar cambios
2. ✅ **Probar subida de RFQ** y verificar nombre correcto
3. ✅ **Verificar logs** en consola del navegador

---

**Fix implementado por:** Claude Code
**Fecha:** 2026-01-29
**Archivos afectados:** 2
**Líneas modificadas:** ~15
