# Plan de Ejecución: Enterprise Hardening (2.6 → 6.0+)

> Escalabilidad + Multi-Tenant Real + API REST Pública + SOC2/ISO 27001 + User Management + Soporte
> Fecha: 20 febrero 2026
> Esfuerzo total estimado: 39-47 días de desarrollo (7 fases)
>
> **PRIORIDAD #1: ESCALABILIDAD** — Sin rendimiento, las funcionalidades no sirven de nada.
> Da igual tener 50 features si con 20 proyectos la app se arrastra.

---

## Estado Actual (lo que hay)

| Componente | Estado | Archivos clave |
|---|---|---|
| **Autenticación** | NO existe. Supabase Auth deshabilitado (`persistSession: false`) | `src/lib/supabase.ts` |
| **RBAC** | Solo localStorage, bypassable en DevTools. 4 roles hardcodeados | `src/stores/usePermissionsStore.ts` |
| **RLS** | Todas las policies son `USING (true) WITH CHECK (true)` — sin aislamiento | `migrations/v2_production_migration.sql` |
| **Multi-tenancy** | Tablas `organizations` + `organization_members` EXISTEN pero no se usan. `projects.organization_id` existe pero es nullable y nunca se setea | `migrations/v2_production_migration.sql` |
| **Backend API** | NO existe. Frontend habla directo a Supabase + n8n webhooks via nginx proxy | `src/services/n8n.service.ts`, `nginx.conf` |
| **Función helper** | `get_user_org_id()` existe en DB pero no se usa en ninguna policy | `migrations/v2_production_migration.sql` |
| **Routing** | 3 rutas: `/*` (App), `/respond/:token`, `/upload/:token`. App usa `activeView` state interno | `src/main.tsx` |
| **Stores** | 26 Zustand stores acceden a Supabase directamente sin filtrar por org | `src/stores/` |

---

## Fase 1: Autenticación + Multi-Tenant Básico

**Objetivo**: Login real, organización por usuario, base para todo lo demás
**Esfuerzo**: 8-10 días | **Score: 2.6 → 3.5**

### 1.1 Habilitar Supabase Auth

**Modificar** `src/lib/supabase.ts`:

```typescript
// ANTES (línea ~22):
const clientOptions = {
  auth: { persistSession: false },
};

// DESPUÉS:
const clientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'bideval-auth-token',
  },
};
```

### 1.2 Crear useAuthStore

**Crear** `src/stores/useAuthStore.ts`:

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  organizationId: string | null;
  organizationRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  organizationName: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  loadOrganization: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    organizationId: null,
    organizationRole: null,
    organizationName: null,

    initialize: async () => {
      if (!supabase) { set({ isLoading: false }); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session, isAuthenticated: true });
        await get().loadOrganization();
      }
      set({ isLoading: false });

      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session?.user,
        });
        if (session?.user) {
          await get().loadOrganization();
        } else {
          set({ organizationId: null, organizationRole: null, organizationName: null });
        }
      });
    },

    signIn: async (email, password) => {
      if (!supabase) return { error: 'Supabase not configured' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },

    signUp: async (email, password, fullName) => {
      if (!supabase) return { error: 'Supabase not configured' };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return error ? { error: error.message } : {};
    },

    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      set({ user: null, session: null, isAuthenticated: false,
            organizationId: null, organizationRole: null, organizationName: null });
    },

    resetPassword: async (email) => {
      if (!supabase) return { error: 'Supabase not configured' };
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return error ? { error: error.message } : {};
    },

    loadOrganization: async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(name)')
        .limit(1)
        .single();
      if (data) {
        set({
          organizationId: data.organization_id,
          organizationRole: data.role as any,
          organizationName: (data as any).organizations?.name ?? null,
        });
      }
    },
  }), { name: 'AuthStore' })
);
```

### 1.3 Páginas de autenticación

**Crear** 3 archivos:

| Archivo | Contenido |
|---|---|
| `src/pages/LoginPage.tsx` + `.css` | Formulario email/password, links a signup y forgot. Estilo consistente con `LandingPage.tsx` |
| `src/pages/SignupPage.tsx` | Registro + campo "Nombre de empresa" para crear org |
| `src/pages/ForgotPasswordPage.tsx` | Email para reset password |

### 1.4 Auth Guard + Routing

**Crear** `src/components/auth/AuthGuard.tsx`:

```typescript
// Si no autenticado → redirect a /login
// Si autenticado pero sin org → mostrar OrganizationOnboarding
// Si autenticado + org → render children
```

**Modificar** `src/main.tsx` — agregar rutas:

```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignupPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/respond/:token" element={<SupplierResponsePage />} />  {/* pública, sin cambio */}
<Route path="/upload/:token" element={<SupplierUploadPage />} />     {/* pública, sin cambio */}
<Route path="/*" element={<AuthGuard><App /></AuthGuard>} />
```

### 1.5 Onboarding de organización

**Crear** `src/components/auth/OrganizationOnboarding.tsx`:
- Input: nombre de organización
- Llama a RPC `create_organization_with_owner(name, slug)`
- Redirect a la app principal

### 1.6 Migración de base de datos

**Crear** `migrations/v4_auth_foundation.sql`:

```sql
BEGIN;

-- 1. Trigger: auto-asignar organization_id y created_by en nuevos proyectos
CREATE OR REPLACE FUNCTION public.set_project_org_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        NEW.organization_id := public.get_user_org_id();
    END IF;
    IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid()::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_project_org ON public.projects;
CREATE TRIGGER trigger_set_project_org
    BEFORE INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_project_org_id();

-- 2. RPC: crear org + membership como owner (para onboarding)
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    p_name TEXT,
    p_slug TEXT
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    INSERT INTO public.organizations (name, slug, plan, max_projects, max_users)
    VALUES (p_name, p_slug, 'trial', 5, 3)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, auth.uid(), 'owner');

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BACKFILL (ejecutar manualmente una vez):
-- INSERT INTO organizations (name, slug, plan) VALUES ('BEA Energy (Legacy)', 'bea-energy-legacy', 'professional');
-- UPDATE projects SET organization_id = '<legacy-org-id>' WHERE organization_id IS NULL;

COMMIT;
```

### 1.7 Integrar permisos con DB

**Modificar** `src/stores/usePermissionsStore.ts`:
- Agregar método `syncFromAuth()` que lee role de `organization_members`
- Mapping: owner/admin → 'admin', member → 'evaluator', viewer → 'viewer'
- Mantener fallback localStorage cuando `VITE_DEMO_MODE=true`

### 1.8 User menu en header

**Modificar** `src/components/layout/SidebarLayout.tsx`:
- Reemplazar selector de rol demo con avatar + nombre del usuario
- Dropdown: Mi Perfil, Mi Organización, Cerrar Sesión
- Ocultar demo role selector cuando hay auth real (cuando `useAuthStore.isAuthenticated`)

---

## Fase 2: RLS Hardening + Aislamiento de Datos

**Objetivo**: Reescribir TODAS las RLS policies para aislar datos por organización
**Esfuerzo**: 6-8 días | **Score: 3.5 → 4.5** | Depende de Fase 1

### 2.1 Migración RLS completa

**Crear** `migrations/v4_rls_organization_isolation.sql`:

#### Función helper (reutilizable en todas las policies):

```sql
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id
        AND organization_id = public.get_user_org_id()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### Mejorar `get_user_org_id()`:

```sql
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
    RETURN v_org_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Patrón A — Tablas con `organization_id` directo

Aplica a: `projects`, `project_setup_templates`, `pdf_template_config`

```sql
-- Ejemplo: projects
DROP POLICY IF EXISTS "Allow all on projects" ON public.projects;

CREATE POLICY "org_select_projects" ON public.projects
    FOR SELECT USING (
        organization_id = public.get_user_org_id()
        OR organization_id IS NULL  -- legacy, eliminar tras backfill
    );
CREATE POLICY "org_insert_projects" ON public.projects
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_org_id()
    );
CREATE POLICY "org_update_projects" ON public.projects
    FOR UPDATE USING (
        organization_id = public.get_user_org_id()
    );
CREATE POLICY "org_delete_projects" ON public.projects
    FOR DELETE USING (
        organization_id = public.get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE user_id = auth.uid()
            AND organization_id = public.get_user_org_id()
            AND role IN ('owner', 'admin')
        )
    );
```

#### Patrón B — Tablas child con `project_id` (la mayoría)

Aplica a **20+ tablas**:
- `project_providers`
- `document_metadata`
- `document_chunks`
- `rfq_items_master`
- `ranking_proveedores`
- `provider_criterion_scores`
- `economic_offers`
- `qa_audit`
- `QA_PENDIENTE`
- `qa_notifications`
- `scoring_categories`
- `scoring_criteria`
- `scoring_weight_configs`
- `scoring_change_log`
- `scoring_simulations`
- `project_milestones`
- `project_document_types`
- `project_economic_fields`
- `project_awards`
- `technical_reports`

```sql
-- Template para CADA tabla child:
DROP POLICY IF EXISTS "Allow all on <tabla>" ON public.<tabla>;

CREATE POLICY "org_access_<tabla>" ON public.<tabla>
    FOR ALL USING (public.user_has_project_access(project_id))
    WITH CHECK (public.user_has_project_access(project_id));
```

#### Patrón C — Tablas de organización

```sql
-- organizations: solo ver tu propia org
DROP POLICY IF EXISTS "Allow all on organizations" ON public.organizations;
CREATE POLICY "org_select_own" ON public.organizations
    FOR SELECT USING (id = public.get_user_org_id());

-- organization_members: solo ver miembros de tu org
DROP POLICY IF EXISTS "Allow all on organization_members" ON public.organization_members;
CREATE POLICY "org_select_members" ON public.organization_members
    FOR SELECT USING (organization_id = public.get_user_org_id());
CREATE POLICY "org_manage_members" ON public.organization_members
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
```

#### Patrón D — Tokens públicos (rutas de proveedor)

```sql
-- supplier_upload_tokens / qa_response_tokens: SELECT público
CREATE POLICY "public_read_tokens" ON public.supplier_upload_tokens
    FOR SELECT USING (true);
CREATE POLICY "public_update_non_expired" ON public.supplier_upload_tokens
    FOR UPDATE USING (expires_at > NOW());
CREATE POLICY "org_insert_tokens" ON public.supplier_upload_tokens
    FOR INSERT WITH CHECK (public.user_has_project_access(project_id));
```

#### Patrón E — Chat histories (sin project_id)

```sql
ALTER TABLE public.n8n_chat_histories ADD COLUMN IF NOT EXISTS project_id UUID;

CREATE POLICY "org_select_chat" ON public.n8n_chat_histories
    FOR SELECT USING (
        project_id IS NULL
        OR public.user_has_project_access(project_id)
    );
```

### 2.2 Actualizar servicios del frontend

**Modificar** `src/services/api.service.ts` — inyectar JWT en requests:

```typescript
// Dentro de fetchWithTimeout, antes del fetch:
if (supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
    };
  }
}
```

**Modificar** `src/services/n8n.service.ts` — usar email real en `changed_by`:

```typescript
// Donde actualmente pone changed_by: 'system' o string hardcodeado:
const email = useAuthStore.getState().user?.email ?? 'system';
```

**Modificar** `nginx.conf` — agregar secret header al proxy n8n:

```nginx
location /api/n8n/ {
    # ... existente ...
    proxy_set_header X-BidEval-Webhook-Secret $BIDEVAL_WEBHOOK_SECRET;
}
```

### 2.3 Nota sobre stores

Los 26 stores **no necesitan cambiar sus queries** — RLS filtra automáticamente. Solo cambios menores:
- `useProjectStore`: trigger `set_project_org_id` auto-asigna org al crear
- `useScoringAuditStore`: usar `user.email` para `changed_by`
- `useChatStore`: agregar `project_id` al guardar mensajes

---

## Fase 3: API REST Pública

**Objetivo**: API documentada para integraciones externas
**Esfuerzo**: 10-12 días | **Score: 4.5 → 5.5** | Depende de Fase 2

### 3.1 Estrategia

Supabase PostgREST **ya es una REST API**. Con auth + RLS (Fases 1-2), queda protegida automáticamente.

**Endpoints ya disponibles gratis** (PostgREST, no requieren trabajo):
```
GET  /rest/v1/projects?is_active=eq.true
GET  /rest/v1/ranking_proveedores?project_id=eq.<uuid>
GET  /rest/v1/economic_offers?project_id=eq.<uuid>
GET  /rest/v1/qa_audit?project_id=eq.<uuid>&status=eq.Answered
GET  /rest/v1/project_awards?project_id=eq.<uuid>
GET  /rest/v1/technical_reports?project_id=eq.<uuid>
POST /rest/v1/projects  (crear proyecto)
PATCH /rest/v1/projects?id=eq.<uuid>  (actualizar)
```

**Solo necesitan Edge Functions** las operaciones complejas:

### 3.2 Tabla de API keys

**Agregar a migración**:

```sql
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['read'],
    rate_limit_per_hour INTEGER DEFAULT 100,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_manage_api_keys" ON public.api_keys
    FOR ALL USING (organization_id = public.get_user_org_id());

CREATE TABLE public.rate_limit_counters (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Supabase Edge Functions

Inicializar: `supabase init` → crea directorio `supabase/functions/`

**Estructura de archivos**:

```
supabase/
  functions/
    _shared/
      auth.ts          -- Middleware: validar Bearer JWT o X-API-Key
      rate-limiter.ts   -- Rate limiting por API key
      cors.ts           -- Headers CORS
    api-keys/
      index.ts          -- GET/POST/DELETE gestión de API keys
    v1-projects/
      index.ts          -- GET lista enriquecida, POST con trigger n8n
    v1-scoring/
      index.ts          -- GET resultados, POST trigger evaluación
    v1-reports/
      index.ts          -- GET listar, POST generar informe
    v1-upload/
      index.ts          -- POST upload archivo → trigger workflow n8n
```

**Middleware de auth compartido** (`_shared/auth.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');

  // Opción 1: Bearer JWT (usuarios de la app)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Invalid token');
    return { type: 'jwt' as const, user, supabase };
  }

  // Opción 2: API Key (integraciones externas)
  const apiKey = req.headers.get('X-API-Key');
  if (apiKey) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: keyRecord } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_hash', hashHex)
      .eq('is_active', true)
      .single();

    if (!keyRecord) throw new Error('Invalid API key');
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      throw new Error('API key expired');
    }

    await supabaseAdmin.from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    return { type: 'api_key' as const, apiKey: keyRecord, supabase: supabaseAdmin };
  }

  throw new Error('No authentication provided');
}
```

### 3.4 Documentación OpenAPI

- **Crear** `docs/api/openapi.yaml` — spec OpenAPI 3.0
- **Crear** `src/pages/ApiDocsPage.tsx` — UI de docs embebida con Redoc, solo visible para admins
- Agregar ruta `/api-docs` en `main.tsx` (protegida por AuthGuard + role admin)

### 3.5 Nginx: proxy a Edge Functions

**Agregar a** `nginx.conf`:

```nginx
location /api/v1/ {
    proxy_pass https://<supabase-project>.supabase.co/functions/v1/;
    proxy_set_header Host <supabase-project>.supabase.co;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_ssl_server_name on;
    limit_req zone=api burst=20 nodelay;
}
```

---

## Fase 4: Controles Técnicos SOC2/ISO 27001

**Objetivo**: Preparación técnica para auditoría de cumplimiento
**Esfuerzo**: 5-7 días | **Score: 5.5 → 6.0** | Depende de Fase 2 | Paralelizable con Fase 3

### 4.1 Audit log universal

**Crear** en migración `migrations/v4_audit_comprehensive.sql`:

```sql
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL,        -- 'project.create', 'scoring.evaluate', 'user.login'
    resource_type TEXT NOT NULL,  -- 'project', 'scoring', 'qa', 'user', 'api_key'
    resource_id TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_read_audit" ON public.audit_log
    FOR SELECT USING (organization_id = public.get_user_org_id());

-- RPC para escribir (SECURITY DEFINER bypasses RLS en INSERT)
CREATE OR REPLACE FUNCTION public.log_audit(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_log (
        organization_id, user_id, user_email,
        action, resource_type, resource_id, metadata
    ) VALUES (
        public.get_user_org_id(),
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        p_action, p_resource_type, p_resource_id, p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger automático en projects
CREATE OR REPLACE FUNCTION public.trigger_audit_projects()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit('project.create', 'project', NEW.id::text,
            jsonb_build_object('name', NEW.display_name));
    ELSIF TG_OP = 'UPDATE' AND OLD.is_locked IS DISTINCT FROM NEW.is_locked THEN
        PERFORM public.log_audit('project.lock', 'project', NEW.id::text,
            jsonb_build_object('locked', NEW.is_locked));
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_audit('project.delete', 'project', OLD.id::text,
            jsonb_build_object('name', OLD.display_name));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_projects();
```

**Crear** `src/services/audit.service.ts`:

```typescript
import { supabase } from '../lib/supabase';

export async function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  if (!supabase) return;
  await supabase.rpc('log_audit', {
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId ?? null,
    p_metadata: metadata ?? {},
  });
}
```

Integrar en: login/logout, crear/eliminar proyecto, ejecutar scoring, aprobar award, exportar informe.

### 4.2 Security headers en nginx

**Modificar** `nginx.conf` — agregar al bloque `server`:

```nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://n8n.beaienergy.com;" always;

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
```

### 4.3 Data retention

**Agregar a migración**:

```sql
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS JSONB AS $$
DECLARE
    v_tokens INTEGER;
    v_chat INTEGER;
BEGIN
    -- Tokens expirados >30 días
    DELETE FROM public.supplier_upload_tokens WHERE expires_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_tokens = ROW_COUNT;
    DELETE FROM public.qa_response_tokens WHERE expires_at < NOW() - INTERVAL '30 days';

    -- Rate limit counters antiguos
    DELETE FROM public.rate_limit_counters WHERE window_start < NOW() - INTERVAL '1 day';

    RETURN jsonb_build_object(
        'tokens_deleted', v_tokens,
        'executed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar semanalmente via pg_cron:
-- SELECT cron.schedule('cleanup-expired', '0 3 * * 0', 'SELECT public.cleanup_expired_data()');
```

### 4.4 Session timeout

**Crear** `src/hooks/useSessionTimeout.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

const WARNING_MS = 30 * 60 * 1000;   // 30 min
const LOGOUT_MS = 60 * 60 * 1000;    // 60 min

export function useSessionTimeout() {
  const { signOut, isAuthenticated } = useAuthStore();
  const timerRef = useRef<number>();
  const warningRef = useRef<number>();

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimers = () => {
      clearTimeout(warningRef.current);
      clearTimeout(timerRef.current);
      warningRef.current = window.setTimeout(() => {
        // Mostrar toast de warning
      }, WARNING_MS);
      timerRef.current = window.setTimeout(() => {
        signOut();
      }, LOGOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimers));
    resetTimers();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimers));
      clearTimeout(warningRef.current);
      clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, signOut]);
}
```

### 4.5 GDPR: exportar/borrar datos

**Crear** `supabase/functions/v1-data-export/index.ts`:
- GET → genera ZIP con todos los datos de la org en JSON
- Solo accesible para role `owner`

**Crear** `supabase/functions/v1-data-delete/index.ts`:
- POST → marca datos para borrado (soft delete + flag)
- Periodo de gracia de 30 días antes de borrado real
- Solo accesible para role `owner`

---

## Fase 5: Escalabilidad (3 → 5)

**Objetivo**: Paginación, caché, virtual scrolling — que la app aguante 50+ proyectos y 10+ usuarios concurrentes
**Esfuerzo**: 4 días | **Escalabilidad: 3 → 5** | Independiente (puede hacerse en cualquier momento)

### 5.0 Estado actual detectado

| Problema | Dónde | Impacto |
|---|---|---|
| Queries sin paginación | `useRfqStore:751`, `useScoringStore:204`, `useSupplierDirectoryStore:87`, `useEconomicStore:92` | Carga TODO en memoria |
| Listas sin virtualización | `ScoringMatrix:768,842`, `EconomicSection:470,813`, `SupplierDirectoryPage` | UI lag con 50+ items |
| Cero caché | Todos los stores re-fetchan en cada mount sin verificar si ya tienen datos | Requests innecesarios |
| Índices DB faltantes | `rfq_items_master`, `ranking_proveedores`, `provider_responses` | Queries lentos en producción |
| `@tanstack/react-virtual` no instalado | `package.json` | No se puede virtualizar |
| Límite arbitrario 1000 | `useRfqStore:566` `.limit(1000)` | Pierde datos silenciosamente si hay >1000 |

### 5.1 Instalar dependencias

```bash
npm install @tanstack/react-query @tanstack/react-virtual
```

- `@tanstack/react-query` — caché automático, deduplicación, stale-while-revalidate
- `@tanstack/react-virtual` — render solo filas visibles en viewport
- NOTA: `@tanstack/react-table` ya está instalado pero no se usa (ScoringMatrix usa `<table>` manual)

### 5.2 Configurar React Query Provider

**Crear** `src/lib/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min antes de considerar stale
      gcTime: 30 * 60 * 1000,         // 30 min en cache antes de garbage collect
      refetchOnWindowFocus: false,     // no refetch al volver a la pestaña
      retry: 1,                        // 1 retry en error
    },
  },
});
```

**Modificar** `src/main.tsx` — wrap con QueryClientProvider:

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// En el render:
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    {/* ... rutas existentes ... */}
  </BrowserRouter>
</QueryClientProvider>
```

### 5.3 Crear hooks de query reutilizables

**Crear** `src/hooks/queries/useProjectsQuery.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface PaginationOptions {
  page: number;
  pageSize: number;
}

export function useProjectsQuery({ page = 0, pageSize = 20 }: PaginationOptions) {
  return useQuery({
    queryKey: ['projects', page, pageSize],
    queryFn: async () => {
      if (!supabase) return { data: [], count: 0 };
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });
}
```

**Crear** `src/hooks/queries/useScoringQuery.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useScoringQuery(projectId: string | null) {
  return useQuery({
    queryKey: ['scoring', projectId],
    queryFn: async () => {
      if (!supabase || !projectId) return [];
      const { data, error } = await supabase
        .from('ranking_proveedores')
        .select('*')
        .eq('project_id', projectId)
        .order('overall_score', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Crear** `src/hooks/queries/useEconomicQuery.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useEconomicQuery(projectId: string | null) {
  return useQuery({
    queryKey: ['economic', projectId],
    queryFn: async () => {
      if (!supabase || !projectId) return [];
      const { data, error } = await supabase
        .from('economic_offers')
        .select('*')
        .eq('project_id', projectId)
        .order('total_price', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Crear** `src/hooks/queries/useSupplierDirectoryQuery.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useSupplierDirectoryQuery({ page = 0, pageSize = 30 }) {
  return useQuery({
    queryKey: ['supplier-directory', page, pageSize],
    queryFn: async () => {
      if (!supabase) return { data: [], count: 0 };
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('v_supplier_history')
        .select('*', { count: 'exact' })
        .order('project_count', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    staleTime: 10 * 60 * 1000, // 10 min — cambia poco
  });
}
```

**Crear** `src/hooks/queries/useRfqItemsQuery.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useRfqItemsQuery(projectId: string | null, { page = 0, pageSize = 50 }) {
  return useQuery({
    queryKey: ['rfq-items', projectId, page, pageSize],
    queryFn: async () => {
      if (!supabase || !projectId) return { data: [], count: 0 };
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('rfq_items_master')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
```

### 5.4 Componente de paginación reutilizable

**Crear** `src/components/ui/Pagination.tsx` + `.css`:

```typescript
interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

// Componente: « Anterior | Página 1 de 5 | Siguiente »
// Estilo consistente con el design system (var(--primary), border-radius, etc.)
```

### 5.5 Virtual scrolling en tablas grandes

**Modificar** `src/components/dashboard/tabs/ScoringMatrix.tsx`:

Actualmente renderiza TODAS las filas (`providers.map()`). Con 10 providers × 50 criterios = 500+ celdas.

Estrategia: Wrap la tabla con `@tanstack/react-virtual`:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// Dentro del componente:
const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: providers.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // altura estimada de cada fila
  overscan: 5,
});

// En el render — reemplazar providers.map() con:
<div ref={parentRef} className="scoring-matrix-scroll" style={{ height: '600px', overflow: 'auto' }}>
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
    {rowVirtualizer.getVirtualItems().map(virtualRow => {
      const provider = providers[virtualRow.index];
      return (
        <div key={provider.provider_name}
             style={{ position: 'absolute', top: virtualRow.start, height: virtualRow.size, width: '100%' }}>
          {/* render fila del provider */}
        </div>
      );
    })}
  </div>
</div>
```

**Modificar** `src/components/economic/EconomicSection.tsx`:

Mismo patrón para la tabla de comparación económica (`sortedComparison.map()`).

**Modificar** `src/pages/SupplierDirectoryPage.tsx`:

Agregar paginación con el hook `useSupplierDirectoryQuery` + componente `Pagination`.

### 5.6 Caché inteligente en stores existentes

Los stores Zustand siguen existiendo (no los eliminamos), pero agregamos guards para no re-fetchear si ya hay datos frescos.

**Patrón a aplicar en todos los stores que fetchan** — ejemplo para `useScoringStore`:

```typescript
// Agregar campo de timestamp:
interface ScoringState {
  // ... campos existentes ...
  lastFetchedAt: number | null;
}

// En refreshScoring():
refreshScoring: async () => {
  const now = Date.now();
  const lastFetched = get().lastFetchedAt;

  // Si los datos tienen menos de 2 minutos, no refetchear
  if (lastFetched && now - lastFetched < 2 * 60 * 1000 && get().rankings.length > 0) {
    return;
  }

  // ... fetch existente ...
  set({ lastFetchedAt: Date.now() });
},

// Agregar método para forzar refresh (bypass del cache):
forceRefresh: async () => {
  set({ lastFetchedAt: null });
  await get().refreshScoring();
},
```

**Stores que necesitan este patrón**:
- `useScoringStore` — `refreshScoring()`
- `useEconomicStore` — `loadOffers()`
- `useSupplierDirectoryStore` — `loadSuppliers()`
- `useRfqStore` — `fetchAllTableData()`
- `useProjectStore` — `loadProjects()`

### 5.7 Índices de base de datos adicionales

**Crear** `migrations/v4_performance_indexes.sql`:

```sql
BEGIN;

-- rfq_items_master: no tiene ningún índice
CREATE INDEX IF NOT EXISTS idx_rfq_items_project_created
    ON public.rfq_items_master(project_id, created_at DESC);

-- provider_responses: falta índice por proyecto + fecha
CREATE INDEX IF NOT EXISTS idx_provider_responses_project_updated
    ON public.provider_responses(project_id, updated_at DESC);

-- ranking_proveedores: falta índice por proyecto + score
CREATE INDEX IF NOT EXISTS idx_ranking_project_score
    ON public.ranking_proveedores(project_id, overall_score DESC);

-- scoring_change_log: ya tiene 3 índices, pero añadir composite
CREATE INDEX IF NOT EXISTS idx_scoring_changelog_project_created
    ON public.scoring_change_log(project_id, created_at DESC);

-- n8n_chat_histories: índice por session_id para búsqueda de historial
CREATE INDEX IF NOT EXISTS idx_chat_histories_session
    ON public.n8n_chat_histories(session_id);

-- qa_audit: índice composite para listado filtrado
CREATE INDEX IF NOT EXISTS idx_qa_audit_project_provider_status
    ON public.qa_audit(project_id, provider_name, status);

-- economic_offers: índice para comparaciones de precio
CREATE INDEX IF NOT EXISTS idx_economic_offers_project_price
    ON public.economic_offers(project_id, total_price ASC NULLS LAST);

-- ANALYZE para actualizar estadísticas del planner
ANALYZE public.rfq_items_master;
ANALYZE public.provider_responses;
ANALYZE public.ranking_proveedores;
ANALYZE public.scoring_change_log;
ANALYZE public.n8n_chat_histories;
ANALYZE public.qa_audit;
ANALYZE public.economic_offers;

COMMIT;
```

### 5.8 Health check endpoint real

**Crear** `supabase/functions/health/index.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // 1. Check Supabase DB
  const dbStart = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { error } = await supabase.from('projects').select('id').limit(1);
    checks.database = {
      status: error ? 'degraded' : 'healthy',
      latency_ms: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: 'down', latency_ms: Date.now() - dbStart };
  }

  // 2. Check n8n
  const n8nStart = Date.now();
  try {
    const res = await fetch('https://n8n.beaienergy.com/healthz', {
      signal: AbortSignal.timeout(5000),
    });
    checks.n8n = {
      status: res.ok ? 'healthy' : 'degraded',
      latency_ms: Date.now() - n8nStart,
    };
  } catch {
    checks.n8n = { status: 'down', latency_ms: Date.now() - n8nStart };
  }

  // 3. Overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const anyDown = Object.values(checks).some(c => c.status === 'down');
  const overallStatus = anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded';

  return new Response(JSON.stringify({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    version: Deno.env.get('APP_VERSION') ?? 'unknown',
  }), {
    status: overallStatus === 'down' ? 503 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Modificar** `nginx.conf` — redirigir health a Edge Function:

```nginx
location /health {
    proxy_pass https://<supabase-project>.supabase.co/functions/v1/health;
    proxy_set_header Host <supabase-project>.supabase.co;
    proxy_ssl_server_name on;
}
```

### 5.9 Verificación Fase 5

- [ ] `npm run build` sin errores tras instalar @tanstack/react-query y react-virtual
- [ ] Lista de proyectos paginada (20 por página) — no fetcha todo
- [ ] ScoringMatrix con 20+ providers no tiene lag visible (virtual scrolling)
- [ ] Cambiar de tab y volver: no re-fetcha si datos tienen <5 min (caché)
- [ ] `curl /health` devuelve JSON con status de DB + n8n
- [ ] `EXPLAIN ANALYZE` en queries principales muestra uso de índices nuevos

---

## Fase 6: User Management UI (Multi-tenant 6 → 7)

**Objetivo**: UI para gestionar organización, usuarios, invitaciones y límites del plan
**Esfuerzo**: 3 días | **Multi-tenant: 6 → 7** | Depende de Fase 1 (auth)

### 6.1 Migración: tabla de invitaciones

**Crear** en `migrations/v4_user_management.sql`:

```sql
BEGIN;

-- Tabla de invitaciones pendientes
CREATE TABLE public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invited_by UUID NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_invites_org ON public.organization_invites(organization_id);
CREATE INDEX idx_org_invites_email ON public.organization_invites(email);
CREATE INDEX idx_org_invites_token ON public.organization_invites(token);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Miembros de la org pueden ver invitaciones de su org
CREATE POLICY "org_select_invites" ON public.organization_invites
    FOR SELECT USING (organization_id = public.get_user_org_id());

-- Solo admin/owner pueden crear invitaciones
CREATE POLICY "org_insert_invites" ON public.organization_invites
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE user_id = auth.uid()
            AND organization_id = public.get_user_org_id()
            AND role IN ('owner', 'admin')
        )
    );

-- Lectura pública por token (para aceptar invitación sin estar logueado)
CREATE POLICY "public_read_invite_by_token" ON public.organization_invites
    FOR SELECT USING (true);

-- RPC: aceptar invitación
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_invite RECORD;
BEGIN
    -- Buscar invitación válida
    SELECT * INTO v_invite FROM public.organization_invites
    WHERE token = p_token AND status = 'pending' AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invitación no válida o expirada');
    END IF;

    -- Verificar que el email del usuario coincide
    IF (SELECT email FROM auth.users WHERE id = auth.uid()) != v_invite.email THEN
        RETURN jsonb_build_object('error', 'Email no coincide con la invitación');
    END IF;

    -- Verificar límite de usuarios
    IF (SELECT count(*) FROM public.organization_members WHERE organization_id = v_invite.organization_id)
       >= (SELECT max_users FROM public.organizations WHERE id = v_invite.organization_id) THEN
        RETURN jsonb_build_object('error', 'La organización ha alcanzado el límite de usuarios');
    END IF;

    -- Crear membership
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_invite.organization_id, auth.uid(), v_invite.role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Marcar invitación como aceptada
    UPDATE public.organization_invites
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: verificar límites del plan
CREATE OR REPLACE FUNCTION public.check_org_limits()
RETURNS JSONB AS $$
DECLARE
    v_org RECORD;
    v_project_count INTEGER;
    v_user_count INTEGER;
BEGIN
    SELECT * INTO v_org FROM public.organizations WHERE id = public.get_user_org_id();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'No organization'); END IF;

    SELECT count(*) INTO v_project_count FROM public.projects
    WHERE organization_id = v_org.id AND is_active = true;

    SELECT count(*) INTO v_user_count FROM public.organization_members
    WHERE organization_id = v_org.id;

    RETURN jsonb_build_object(
        'plan', v_org.plan,
        'projects_used', v_project_count,
        'projects_max', v_org.max_projects,
        'projects_available', v_org.max_projects - v_project_count,
        'users_used', v_user_count,
        'users_max', v_org.max_users,
        'users_available', v_org.max_users - v_user_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
```

### 6.2 Store de organización

**Crear** `src/stores/useOrganizationStore.ts`:

```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface OrgMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  email?: string;
  full_name?: string;
  created_at: string;
}

interface OrgInvite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

interface OrgLimits {
  plan: string;
  projects_used: number;
  projects_max: number;
  projects_available: number;
  users_used: number;
  users_max: number;
  users_available: number;
}

interface OrganizationState {
  members: OrgMember[];
  invites: OrgInvite[];
  limits: OrgLimits | null;
  isLoading: boolean;

  loadMembers: () => Promise<void>;
  loadInvites: () => Promise<void>;
  loadLimits: () => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<{ error?: string; token?: string }>;
  changeRole: (memberId: string, newRole: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  updateOrgName: (name: string) => Promise<void>;
  canCreateProject: () => boolean;
  canInviteUser: () => boolean;
}
```

### 6.3 Página "Mi Organización"

**Crear** `src/pages/OrganizationPage.tsx` + `.css`:

Layout con 3 secciones:

**Sección 1: Información de la organización**
- Nombre editable (solo owner/admin)
- Plan actual con badge (trial/starter/professional/enterprise)
- Barras de uso: "3/5 proyectos", "2/3 usuarios"
- Fecha de creación

**Sección 2: Miembros**
- Tabla: Avatar | Nombre | Email | Rol | Acciones
- Dropdown para cambiar rol (solo owner/admin pueden cambiar)
- Botón "Eliminar" (solo owner puede eliminar, no puede eliminarse a sí mismo)
- Badge "Owner" no editable
- Botón "Invitar usuario" → abre modal

**Sección 3: Invitaciones pendientes**
- Tabla: Email | Rol | Estado | Expira | Acciones
- Botón "Revocar" para cancelar invitación
- Botón "Reenviar" para generar nuevo token
- Badge de estado: pendiente (amarillo), aceptada (verde), expirada (gris)

### 6.4 Modal de invitación

**Crear** `src/components/organization/InviteUserModal.tsx`:

- Input: email
- Select: rol (admin, member, viewer)
- Validación: email válido, no ya miembro, no ya invitado, dentro del límite
- Al enviar: crea registro en `organization_invites` + trigger n8n para enviar email
- Muestra link de invitación copiable como fallback

### 6.5 Página de aceptar invitación

**Crear** `src/pages/AcceptInvitePage.tsx`:

- Ruta: `/invite/:token`
- Si no logueado → redirect a signup con `?invite=<token>` en query params
- Si logueado → llama a RPC `accept_invite(token)` → redirect a app
- Si token inválido/expirado → mensaje de error

**Modificar** `src/main.tsx`:
```typescript
<Route path="/invite/:token" element={<AcceptInvitePage />} />
```

### 6.6 Enforcement de límites

**Modificar** `src/stores/useProjectStore.ts` — en `createProject()`:

```typescript
// Antes de crear proyecto, verificar límite:
const { data } = await supabase!.rpc('check_org_limits');
if (data && data.projects_available <= 0) {
  useToastStore.getState().addToast({
    type: 'error',
    message: t('org.limit_projects_reached'),  // "Has alcanzado el límite de proyectos de tu plan"
  });
  return;
}
```

**Modificar** `src/components/organization/InviteUserModal.tsx` — verificar antes de invitar:

```typescript
const limits = useOrganizationStore.getState().limits;
if (limits && limits.users_available <= 0) {
  // Mostrar error: "Has alcanzado el límite de usuarios de tu plan"
  return;
}
```

### 6.7 Envío de invitación por email via n8n

**Webhook n8n** a configurar (no en este repo, documentar):
- Endpoint: `/webhook/send-invite`
- Payload: `{ email, inviter_name, org_name, invite_url, role }`
- Template de email con link de invitación y branding BidEval

**Agregar en** `src/services/n8n.service.ts`:

```typescript
export async function sendInviteEmail(params: {
  email: string;
  inviterName: string;
  orgName: string;
  inviteUrl: string;
  role: string;
}) {
  return fetchWithTimeout(`${N8N_BASE}/send-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}
```

### 6.8 Navegación

**Modificar** `src/components/layout/SidebarLayout.tsx`:
- Agregar item "Mi Organización" en el menú de usuario (dropdown del avatar)
- Badge con número de invitaciones pendientes (opcional)

### 6.9 Verificación Fase 6

- [ ] Página de organización muestra nombre, plan, uso
- [ ] Admin puede invitar usuario por email
- [ ] Invitación llega por email con link funcional
- [ ] Nuevo usuario acepta invitación y ve los proyectos de la org
- [ ] No se puede crear proyecto si se excede `max_projects`
- [ ] No se puede invitar si se excede `max_users`
- [ ] Owner puede cambiar roles de otros miembros
- [ ] Owner no puede eliminarse a sí mismo

---

## Fase 7: Soporte y Monitorización (2 → 4)

**Objetivo**: Error tracking, status page, changelog in-app, health dashboard
**Esfuerzo**: 3 días | **Soporte: 2 → 4** | Independiente (puede hacerse en cualquier momento)

### 7.1 Sentry: error tracking

**Instalar**:

```bash
npm install @sentry/react
```

**Crear** `src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react';

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,   // 'development' | 'production'
    release: import.meta.env.VITE_APP_VERSION ?? 'unknown',

    // Capturar 10% de transacciones para performance
    tracesSampleRate: 0.1,

    // No enviar en desarrollo
    enabled: import.meta.env.PROD,

    // Filtrar errores de red comunes
    ignoreErrors: [
      'ResizeObserver loop',
      'Network request failed',
      'AbortError',
    ],

    // Agregar contexto de usuario
    beforeSend(event) {
      // Limpiar datos sensibles
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }
      return event;
    },
  });
}

// Helper para setear contexto de usuario tras login
export function setSentryUser(user: { id: string; email: string; orgId?: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
  if (user.orgId) {
    Sentry.setTag('organization_id', user.orgId);
  }
}

// Helper para limpiar contexto tras logout
export function clearSentryUser() {
  Sentry.setUser(null);
}
```

**Modificar** `src/main.tsx`:

```typescript
import { initSentry } from './lib/sentry';
initSentry(); // Antes del render

// Wrap App con Sentry error boundary:
import * as Sentry from '@sentry/react';

<Sentry.ErrorBoundary fallback={<ErrorFallbackPage />}>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {/* ... */}
    </BrowserRouter>
  </QueryClientProvider>
</Sentry.ErrorBoundary>
```

**Modificar** `src/stores/useAuthStore.ts` — setear contexto Sentry:

```typescript
// En initialize(), tras autenticarse:
import { setSentryUser, clearSentryUser } from '../lib/sentry';

// Tras login exitoso:
setSentryUser({ id: user.id, email: user.email, orgId: get().organizationId });

// Tras logout:
clearSentryUser();
```

**Crear** `src/pages/ErrorFallbackPage.tsx`:
- Página amigable cuando hay un crash fatal
- Botón "Recargar" + "Reportar problema"
- Muestra event ID de Sentry para soporte

### 7.2 Status page

**Reutilizar** la Edge Function `health` de la Fase 5 (5.8).

**Crear** `src/pages/StatusPage.tsx` + `.css`:

- Ruta pública: `/status` (no requiere auth)
- Muestra estado de cada servicio: Database, n8n Workflows, API
- Indicador visual: verde (healthy), amarillo (degraded), rojo (down)
- Última comprobación con timestamp
- Auto-refresh cada 30 segundos
- Historial de las últimas 24h (opcional, si se guarda en DB)

```typescript
// Componente que llama a /health cada 30s:
const [status, setStatus] = useState(null);

useEffect(() => {
  const check = async () => {
    const res = await fetch('/health');
    setStatus(await res.json());
  };
  check();
  const interval = setInterval(check, 30000);
  return () => clearInterval(interval);
}, []);
```

**Modificar** `src/main.tsx`:
```typescript
<Route path="/status" element={<StatusPage />} />  {/* pública, sin AuthGuard */}
```

**Integración externa** (configuración manual, no código):
- Registrar `/health` en **Uptime Robot** (gratuito, 5 min intervals)
- Configurar alertas por email cuando status != healthy

### 7.3 Changelog in-app

**Crear** `src/components/changelog/Changelog.tsx` + `.css`:

```typescript
interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  title_es: string;
  title_en: string;
  description_es?: string;
  description_en?: string;
}

// Datos estáticos en un array (no necesita DB):
const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.5.0',
    date: '2026-02-20',
    type: 'feature',
    title_es: 'Sistema de adjudicación con IA',
    title_en: 'AI-powered award system',
    description_es: 'Nuevo wizard de adjudicación con justificación generada por IA...',
    description_en: 'New award wizard with AI-generated justification...',
  },
  // ... más entradas
];
```

Componente modal/drawer que muestra las últimas novedades.

**Crear** `src/hooks/useChangelogBadge.ts`:

```typescript
const CHANGELOG_VERSION_KEY = 'bideval-last-seen-changelog';

export function useChangelogBadge() {
  const lastSeen = localStorage.getItem(CHANGELOG_VERSION_KEY);
  const latestVersion = CHANGELOG[0]?.version;
  const hasNew = lastSeen !== latestVersion;

  const markAsSeen = () => {
    localStorage.setItem(CHANGELOG_VERSION_KEY, latestVersion);
  };

  return { hasNew, markAsSeen, newCount: /* contar entradas nuevas */ };
}
```

**Modificar** `src/components/layout/SidebarLayout.tsx`:
- Agregar botón/icono "Novedades" en el sidebar (junto al botón de ayuda/tour existente)
- Badge rojo con número si hay entradas no vistas
- Al hacer clic: abre modal Changelog + marca como visto

### 7.4 Health dashboard para admins

**Crear** `src/pages/AdminDashboardPage.tsx` + `.css`:

- Ruta: solo visible para role `admin` (permission gate)
- Secciones:

**Panel 1: Estado del sistema**
- Reutiliza datos de `/health` — muestra status en tiempo real
- Latencia de DB y n8n con indicador visual

**Panel 2: Uso de la organización**
- Reutiliza datos de `check_org_limits()` — proyectos y usuarios
- Gráfico de barras simple con uso vs límite

**Panel 3: Actividad reciente** (requiere Fase 4: audit_log)
- Últimos 20 eventos del audit log
- Filtrable por tipo (login, scoring, award, etc.)
- Columnas: Fecha | Usuario | Acción | Recurso

**Panel 4: Errores recientes** (requiere Sentry)
- Si Sentry SDK disponible: mostrar últimos 5 errores sin resolver
- Link a dashboard de Sentry para detalle completo
- Alternativa sin Sentry: tabla de `audit_log` filtrada por action='error.*'

### 7.5 Variables de entorno nuevas

**Agregar a** `.env.example`:

```env
# Sentry (opcional, solo producción)
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy

# Versión de la app (inyectada en build)
VITE_APP_VERSION=2.5.0
```

**Modificar** `Dockerfile` — inyectar versión en build:

```dockerfile
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=$APP_VERSION
```

### 7.6 Verificación Fase 7

- [ ] Error JS en producción aparece en Sentry con contexto (user, org, proyecto)
- [ ] `/status` muestra estado real de DB + n8n (sin auth requerida)
- [ ] Badge "Nuevo" aparece en sidebar cuando hay changelog no visto
- [ ] Click en badge abre modal con novedades
- [ ] Admin dashboard muestra actividad reciente y uso de la org
- [ ] Uptime Robot envía alerta cuando `/health` devuelve 503

---

## Cronograma y dependencias

> **Orden de ejecución recomendado**: Escalabilidad PRIMERO.
> Sin rendimiento, las funcionalidades no sirven de nada.

```
Semana 1:    ████        FASE 5 → Escalabilidad (PRIORIDAD #1)
Semana 1:    ███         FASE 7 → Soporte y Monitorización (paralelo con F5)
Semana 2-3:  ████████    FASE 1 → Auth + Multi-Tenant Básico
Semana 4:    ███         FASE 6 → User Management (depende de F1)
Semana 4-5:  ██████      FASE 2 → RLS Hardening (depende de F1)
Semana 6-8:  ██████████  FASE 3 → API REST Pública (depende de F2)
Semana 6-7:  █████       FASE 4 → SOC2/ISO Controls (depende de F2, paralelo con F3)
```

| Orden | Fase | Días | Depende de | Impacto |
|-------|------|------|------------|---------|
| **1o** | **5. Escalabilidad** | **4** | **—** | **Escalabilidad 3→5. Base para todo lo demás** |
| **2o** | **7. Soporte y Monitorización** | **3** | **—** | **Soporte 2→4. Sentry + status page desde el día 1** |
| 3o | 1. Auth + Multi-tenant | 8-10 | — | Score enterprise 2.6→3.5 |
| 4o | 6. User Management | 3 | Fase 1 | Multi-tenant 6→7 |
| 5o | 2. RLS Hardening | 6-8 | Fase 1 | Score enterprise 3.5→4.5 |
| 6o | 3. API REST Pública | 10-12 | Fase 2 | Score enterprise 4.5→5.5 |
| 7o | 4. SOC2/ISO Controls | 5-7 | Fase 2 | Score enterprise 5.5→6.0 |
| | **Total** | **39-47** | | **Enterprise 2.6 → ~4.5** |

**Por qué Escalabilidad primero:**
1. No tiene dependencias — se puede empezar inmediatamente
2. Mejora la experiencia de TODOS los usuarios actuales y futuros
3. React Query + paginación + índices DB son fundamentos que benefician a todas las fases posteriores
4. Sin escalabilidad, los demos a clientes enterprise fallarían con datasets reales
5. Sentry (Fase 7) en paralelo permite detectar errores desde el primer día

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper la app actual | Variable `VITE_DEMO_MODE=true` para modo sin auth durante transición |
| n8n no envía org_id | n8n usa `service_role` key (bypasses RLS). Trigger `set_project_org_id` asigna org automáticamente |
| Performance de RLS | `get_user_org_id()` marcada como `STABLE` (cache por transacción). Si hay problemas: JWT custom claim |
| Datos legacy sin org | Policies incluyen `OR organization_id IS NULL` temporalmente. Eliminar tras backfill |
| Rutas públicas proveedores | `/respond/:token` y `/upload/:token` usan tokens con expiración, no necesitan auth |
| React Query + Zustand coexistencia | React Query para fetching/caché, Zustand para UI state. No compiten — se complementan |
| Sentry en desarrollo | `enabled: import.meta.env.PROD` — deshabilitado en dev, no genera ruido |

---

## Checklist de verificación

### Tras Fase 1:
- [ ] Login/signup funcional
- [ ] Se crea organización al registrarse
- [ ] Proyectos nuevos tienen `organization_id` asignado
- [ ] Roles vienen de DB, no de localStorage

### Tras Fase 2:
- [ ] Crear 2 orgs distintas, verificar que una NO ve datos de la otra
- [ ] Proveedor puede responder via `/respond/:token` sin login
- [ ] `scoring_change_log` registra email real del usuario
- [ ] n8n sigue funcionando (usa service_role, bypasses RLS)

### Tras Fase 3:
- [ ] `curl -H "X-API-Key: xxx" https://bideval.com/api/v1/projects` devuelve solo proyectos de la org
- [ ] Rate limiting funciona (>100 req/h → 429)
- [ ] Documentación OpenAPI accesible en `/api-docs`

### Tras Fase 4:
- [ ] `curl -I https://bideval.com` muestra security headers
- [ ] Tabla `audit_log` registra login, crear proyecto, scoring, award
- [ ] Session timeout funciona (logout tras 60 min inactividad)
- [ ] Data export genera ZIP con todos los datos de la org

### Tras Fase 5:
- [ ] Lista de proyectos paginada — no fetcha todo
- [ ] ScoringMatrix con 20+ providers sin lag (virtual scrolling)
- [ ] Cambiar de tab y volver: no re-fetcha si datos <5 min
- [ ] `curl /health` devuelve JSON con status DB + n8n
- [ ] Nuevos índices visibles en `EXPLAIN ANALYZE`

### Tras Fase 6:
- [ ] Página de organización muestra nombre, plan, uso
- [ ] Admin puede invitar por email
- [ ] Nuevo usuario acepta invitación y ve los proyectos de la org
- [ ] No se puede crear proyecto si se excede `max_projects`
- [ ] Owner puede cambiar roles

### Tras Fase 7:
- [ ] Error JS en producción aparece en Sentry
- [ ] `/status` muestra estado real sin auth
- [ ] Badge "Nuevo" en sidebar para changelog
- [ ] Admin dashboard muestra actividad y uso
