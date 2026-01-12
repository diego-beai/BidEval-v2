# Tabla de Proyectos - Documentación

## Resumen

Se ha creado una nueva tabla `projects` para normalizar y regularizar los nombres de proyectos en toda la base de datos. Esto evita inconsistencias en los nombres (por ejemplo, "Hydrogen Production Plant – La Zaida, Spain" vs "Hydrogen Production Plant - La Zaida, Spain").

## Estructura de la Tabla

```sql
CREATE TABLE public.projects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,           -- Nombre normalizado (sin caracteres especiales)
    display_name TEXT NOT NULL,          -- Nombre para mostrar (puede tener caracteres especiales)
    description TEXT,                    -- Descripción opcional del proyecto
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Campos

- **id**: UUID único que identifica el proyecto
- **name**: Nombre normalizado (sin caracteres especiales, en mayúsculas, espacios reemplazados por guiones bajos)
  - Ejemplo: `HYDROGEN_PRODUCTION_PLANT_LA_ZAIDA_SPAIN`
- **display_name**: Nombre para mostrar (puede tener caracteres especiales, acentos, etc.)
  - Ejemplo: `Hydrogen Production Plant – La Zaida, Spain`
- **description**: Descripción opcional del proyecto
- **created_at**: Fecha de creación
- **updated_at**: Fecha de última actualización (se actualiza automáticamente)

## Funciones Helper

### `normalize_project_name(display_name TEXT)`

Normaliza un nombre de proyecto eliminando caracteres especiales y normalizando espacios.

```sql
SELECT normalize_project_name('Hydrogen Production Plant – La Zaida, Spain');
-- Resultado: 'HYDROGEN_PRODUCTION_PLANT_LA_ZAIDA_SPAIN'
```

### `get_or_create_project(p_display_name TEXT, p_description TEXT)`

Obtiene un proyecto existente o lo crea si no existe. Útil para evitar duplicados.

```sql
SELECT get_or_create_project('Hydrogen Production Plant – La Zaida, Spain', 'Proyecto de hidrógeno verde');
-- Retorna el UUID del proyecto (creado o existente)
```

## Tablas Actualizadas

Las siguientes tablas ahora referencian `projects` mediante `project_id` (UUID):

1. **document_metadata**: `project_id UUID REFERENCES projects(id)`
2. **rfq_items_master**: `project_id UUID REFERENCES projects(id)`
3. **qa_audit**: `project_id UUID REFERENCES projects(id)`

**Nota**: La tabla `QA_PENDIENTE` mantiene `project_id TEXT` por compatibilidad con el frontend, pero se recomienda migrar a UUID en el futuro.

## Vista Útil

### `v_projects_with_stats`

Vista que muestra proyectos con estadísticas agregadas:

```sql
SELECT * FROM v_projects_with_stats;
```

Incluye:
- Información del proyecto
- Número de documentos asociados
- Número de requisitos asociados
- Número de preguntas Q&A asociadas

## Migración de Datos Existentes

Si ya tienes datos en las tablas con `project_name` (TEXT), ejecuta el script de migración:

```bash
psql -d tu_base_de_datos -f migrate_to_projects_table.sql
```

Este script:
1. Extrae todos los `project_name` únicos
2. Crea registros en `projects` con nombres normalizados
3. Actualiza las tablas existentes con `project_id`

## Uso en el Código

### Crear un nuevo proyecto

```typescript
import { supabase } from './lib/supabase';

// Opción 1: Usar la función helper (recomendado)
const { data } = await supabase.rpc('get_or_create_project', {
  p_display_name: 'Hydrogen Production Plant – La Zaida, Spain',
  p_description: 'Proyecto de hidrógeno verde en La Zaida'
});

// Opción 2: Insertar directamente
const { data, error } = await supabase
  .from('projects')
  .insert({
    name: 'HYDROGEN_PRODUCTION_PLANT_LA_ZAIDA_SPAIN',
    display_name: 'Hydrogen Production Plant – La Zaida, Spain',
    description: 'Proyecto de hidrógeno verde'
  })
  .select()
  .single();
```

### Buscar proyectos

```typescript
// Buscar por nombre normalizado
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('name', 'HYDROGEN_PRODUCTION_PLANT_LA_ZAIDA_SPAIN')
  .single();

// Buscar por nombre de visualización
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('display_name', 'Hydrogen Production Plant – La Zaida, Spain')
  .single();

// Obtener proyecto con estadísticas
const { data } = await supabase
  .from('v_projects_with_stats')
  .select('*')
  .eq('id', projectId)
  .single();
```

### Usar project_id en otras tablas

```typescript
// Insertar documento con project_id
const { data } = await supabase
  .from('document_metadata')
  .insert({
    id: 'doc-123',
    title: 'RFQ Base',
    project_id: projectUuid, // UUID del proyecto
    document_type: 'RFQ'
  });
```

## Ventajas de esta Estructura

1. **Normalización**: Evita duplicados por variaciones en el nombre
2. **Consistencia**: Todos los proyectos tienen un formato estándar
3. **Búsqueda eficiente**: Índices en `name` y `display_name`
4. **Flexibilidad**: `display_name` permite mantener nombres originales con caracteres especiales
5. **Integridad referencial**: Foreign keys aseguran que los proyectos existan
6. **Auditoría**: `created_at` y `updated_at` para tracking

## Índices Creados

- `idx_projects_name`: Búsqueda rápida por nombre normalizado
- `idx_projects_display_name`: Búsqueda rápida por nombre de visualización
- `idx_rfq_items_master_project_id`: Búsqueda de requisitos por proyecto
- `idx_qa_audit_project_id`: Búsqueda de Q&A por proyecto
- `idx_qa_pendiente_project_id`: Búsqueda de QA_PENDIENTE por proyecto

## Próximos Pasos Recomendados

1. **Migrar QA_PENDIENTE**: Actualizar `project_id TEXT` a `project_id UUID` en el futuro
2. **Actualizar frontend**: Modificar el código para usar `project_id` (UUID) en lugar de `project_name` (TEXT)
3. **Validación**: Agregar validaciones en el frontend para asegurar que los proyectos existan antes de crear documentos
