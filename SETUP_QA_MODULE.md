# 🎯 Configuración del Módulo Q&A & Technical Audit

## 📋 Resumen

El módulo **Q&A & Technical Audit** ha sido completamente integrado en tu Dashboard con coherencia visual total. Este módulo permite:

- ✅ Generar automáticamente preguntas técnicas basadas en deficiencias detectadas
- ✅ Organizar preguntas por disciplina (Eléctrica, Mecánica, Civil, Proceso, General)
- ✅ Editar, aprobar y gestionar el flujo de preguntas
- ✅ Sincronización en tiempo real con Supabase
- ✅ Integración completa con workflow n8n existente

---

## 🔧 1. Configuración de Supabase

### 1.1. Crear Proyecto en Supabase

Si aún no tienes un proyecto de Supabase:

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Anota las credenciales:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 1.2. Configurar Variables de Entorno

Edita el archivo `.env.local` y reemplaza los placeholders:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 1.3. Crear la Tabla QA_PENDIENTE

Ejecuta el siguiente SQL en el editor SQL de Supabase:

```sql
-- Crear tipos ENUM
CREATE TYPE disciplina AS ENUM ('Eléctrica', 'Mecánica', 'Civil', 'Proceso', 'General');
CREATE TYPE estado_pregunta AS ENUM ('Borrador', 'Pendiente', 'Aprobada', 'Enviada', 'Respondida', 'Descartada');
CREATE TYPE importancia AS ENUM ('Alta', 'Media', 'Baja');

-- Crear tabla QA_PENDIENTE
CREATE TABLE QA_PENDIENTE (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  disciplina disciplina NOT NULL,
  pregunta_texto TEXT NOT NULL,
  estado estado_pregunta DEFAULT 'Borrador',
  importancia importancia,
  respuesta_proveedor TEXT,
  fecha_respuesta TIMESTAMPTZ,
  notas_internas TEXT
);

-- Crear índices para optimizar queries
CREATE INDEX idx_qa_project ON QA_PENDIENTE(project_id);
CREATE INDEX idx_qa_proveedor ON QA_PENDIENTE(proveedor);
CREATE INDEX idx_qa_disciplina ON QA_PENDIENTE(disciplina);
CREATE INDEX idx_qa_estado ON QA_PENDIENTE(estado);

-- Habilitar Row Level Security (opcional)
ALTER TABLE QA_PENDIENTE ENABLE ROW LEVEL SECURITY;

-- Política de acceso público (puedes ajustarla según tus necesidades)
CREATE POLICY "Enable read access for all users" ON QA_PENDIENTE
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON QA_PENDIENTE
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON QA_PENDIENTE
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON QA_PENDIENTE
  FOR DELETE USING (true);
```

---

## 🚀 2. Configuración del Workflow n8n

### 2.1. Verificar Webhook URL

El workflow ya está configurado en:

```
https://n8n.beaienergy.com/webhook/0e594d2d-qa-audit-generator
```

### 2.2. Verificar Estructura del Workflow

El workflow `workflow n8n/q&a.json` debe estar desplegado en n8n con:

1. **Webhook** - Endpoint POST que recibe `project_id` y `provider`
2. **Lectura de Datos** - Consulta la tabla RFQ para obtener deficiencias
3. **Filtrado** - Identifica ítems con score < 8, "NO INCLUIDO" o "PARCIAL"
4. **IA (Mistral)** - Genera preguntas técnicas estructuradas
5. **Supabase** - Almacena preguntas en tabla `QA_PENDIENTE`

### 2.3. Configurar Credenciales de Supabase en n8n

1. Ve a n8n → Credentials
2. Agrega credenciales de Supabase:
   - **URL**: Tu Supabase Project URL
   - **Service Role Key**: (para escritura en la tabla)

---

## 📱 3. Uso del Módulo

### 3.1. Acceder al Módulo

1. Abre la aplicación
2. En el sidebar, haz clic en **Q&A**
3. El módulo se abrirá con interfaz completa

### 3.2. Generar Auditoría Técnica

1. **Ingresa Project ID**: Ej: `RFQ-2024-001`
2. **Selecciona Proveedor**: De la lista disponible
3. **Haz clic en "🔍 Generar Auditoría Técnica"**
4. El sistema:
   - Analiza deficiencias del proveedor
   - Genera preguntas con IA
   - Las almacena en Supabase
   - Las muestra en tiempo real

### 3.3. Gestión de Preguntas

#### Por Disciplina:
- **Eléctrica**, **Mecánica**, **Civil**, **Proceso**, **General**
- Haz clic en una disciplina para expandir/colapsar

#### Acciones Disponibles:

**Estado: Borrador**
- ✏️ **Editar** - Modificar texto de la pregunta
- ✅ **Aprobar** - Cambiar estado a "Aprobada"
- ❌ **Descartar** - Cambiar estado a "Descartada"
- 🗑️ **Eliminar** - Borrar permanentemente

**Estado: Aprobada**
- 📧 **Enviar** - Marcar como "Enviada" al proveedor

**Estado: Enviada**
- Muestra mensaje: "✉️ Pregunta enviada al proveedor"

**Estado: Respondida**
- Muestra respuesta del proveedor
- Fecha de respuesta

### 3.4. Filtros

- **Por Proveedor**: Filtrar preguntas de un proveedor específico
- **Por Estado**: Borrador, Pendiente, Aprobada, Enviada, Respondida, Descartada
- **Por Importancia**: Alta, Media, Baja
- **Limpiar Filtros**: Resetear todos los filtros

### 3.5. Estadísticas

El dashboard muestra:
- **Total Preguntas**
- **Aprobadas**
- **Pendientes**
- **Alta Importancia**

---

## 🎨 4. Coherencia Visual

El módulo sigue **exactamente** el design system del Dashboard:

### Colores
- **Primario**: `#12b5b0` (Teal)
- **Secundario**: `#0a2540` (Navy)
- **Success**: `#10b981`
- **Warning**: `#f59e0b`
- **Error**: `#ef4444`

### Estados
- **Borrador**: Azul claro (#e0f2fe)
- **Aprobada**: Ámbar (#ffedd5)
- **Respondida**: Verde (#d1fae5)
- **Descartada**: Gris (#f3f4f6)

### Importancia
- **Alta**: Rojo claro (#fee2e2)
- **Media**: Ámbar (#fef3c7)
- **Baja**: Azul claro (#e0f2fe)

### Animaciones
- **Fade In Dashboard**: 0.4s ease-out
- **Fade In Up**: Para tarjetas de preguntas
- **Hover Effects**: Transiciones suaves en botones y cards

---

## 🔄 5. Sincronización en Tiempo Real

El módulo utiliza **Supabase Realtime**:

1. Al cargar un proyecto, se suscribe a cambios en `QA_PENDIENTE`
2. Cuando n8n crea nuevas preguntas → Se actualizan automáticamente
3. Cuando otro usuario modifica preguntas → Se reflejan en tiempo real
4. Al cambiar de proyecto → Se desuscribe y suscribe al nuevo

---

## 🧪 6. Testing

### 6.1. Probar Integración n8n

```bash
curl -X POST https://n8n.beaienergy.com/webhook/0e594d2d-qa-audit-generator \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "TEST-PROJECT-001",
    "provider": "TECNICASREUNIDAS"
  }'
```

### 6.2. Verificar en Supabase

1. Ve a Supabase → Table Editor
2. Abre tabla `QA_PENDIENTE`
3. Verifica que se crearon preguntas con:
   - `project_id`: "TEST-PROJECT-001"
   - `proveedor`: "TECNICASREUNIDAS"
   - `estado`: "Borrador"

---

## 📚 7. Arquitectura del Sistema

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       ├─► 1. Usuario hace clic en "Generar Auditoría"
       │
       ├─► 2. POST a n8n webhook
       │      (project_id + provider)
       │
┌──────▼──────┐
│     n8n     │
│  Workflow   │
└──────┬──────┘
       │
       ├─► 3. Lee tabla RFQ (DataTable)
       │
       ├─► 4. Filtra deficiencias (JS Code)
       │
       ├─► 5. Genera preguntas con IA (Mistral)
       │
       ├─► 6. Parsea salida estructurada (JSON)
       │
       ├─► 7. Guarda en Supabase
       │      (tabla QA_PENDIENTE)
       │
┌──────▼──────┐
│  Supabase   │
│   Database  │
└──────┬──────┘
       │
       ├─► 8. Notifica cambios (Realtime)
       │
┌──────▼──────┐
│   Frontend  │
│   Update    │
└─────────────┘
       │
       └─► 9. Muestra preguntas en UI
```

---

## 🛠️ 8. Archivos Creados

### Backend/Servicios
- `src/lib/supabase.ts` - Cliente Supabase
- `src/services/n8n.service.ts` - Función `generateTechnicalAudit()`
- `src/config/constants.ts` - URL del webhook

### Tipos
- `src/types/database.types.ts` - Tipos de Supabase
- `src/types/qa.types.ts` - Tipos del módulo Q&A

### Store
- `src/stores/useQAStore.ts` - Estado global con Zustand

### Componentes
- `src/components/dashboard/tabs/QAModule.tsx` - Componente principal
- `src/components/dashboard/tabs/QAModule.css` - Estilos coherentes

### Integración
- `src/App.tsx` - Integración en navegación

---

## ⚠️ 9. Troubleshooting

### Error: "Supabase credentials not found"
- **Solución**: Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local`

### Error: "relation 'QA_PENDIENTE' does not exist"
- **Solución**: Ejecuta el script SQL en Supabase para crear la tabla

### Error al generar auditoría: "Error 404"
- **Solución**: Verifica que el workflow de n8n esté activo en la URL correcta

### Preguntas no se muestran en tiempo real
- **Solución**: Verifica que las políticas RLS de Supabase permitan SELECT

### Error de CORS
- **Solución**: En Supabase → Settings → API, verifica que el dominio esté en allowed origins

---

## 🎉 10. Próximos Pasos

Ahora que el módulo está implementado, puedes:

1. ✅ **Configurar Supabase** con las credenciales
2. ✅ **Crear la tabla** QA_PENDIENTE
3. ✅ **Probar la generación** de auditorías
4. 🔄 **Personalizar** colores o textos si lo deseas
5. 📧 **Integrar** sistema de envío de emails (futuro)
6. 📊 **Exportar** preguntas a PDF/Excel (futuro)

---

## 📞 Soporte

Si necesitas ayuda:
- Revisa los logs del navegador (F12 → Console)
- Revisa los logs de n8n en el workflow
- Verifica la tabla en Supabase Table Editor

---

**Desarrollado por**: Senior Fullstack Developer
**Fecha**: 2026-01-09
**Versión**: 1.0.0
