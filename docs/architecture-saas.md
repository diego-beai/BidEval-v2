# BidEval v2 - SaaS Architecture

## Current State

```
Browser → nginx (Docker :9102)
           ├── Static SPA (React/Vite)
           ├── /api/n8n/* → proxy → n8n.beaienergy.com/webhook/*
           └── Supabase JS Client (direct from browser)
```

- **Frontend**: React SPA, Vite build, served by nginx in a single Docker container
- **Backend**: n8n webhook workflows (PDF ingestion, scoring, Q&A, email)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Auth**: None. All RLS policies use `USING(true)`. No user sessions.
- **Multi-tenancy**: None. All data is in a single flat namespace.

### Key Gaps for SaaS
1. No user authentication or authorization
2. No tenant isolation (organization-level data separation)
3. No API gateway or rate limiting
4. n8n webhook URLs are unauthenticated
5. Secrets (Supabase anon key) embedded in frontend bundle
6. No CI/CD pipeline
7. No staging environment
8. No monitoring or observability
9. Single Docker container, no horizontal scaling

---

## Target Architecture

### Phase 1: Authentication & Tenant Isolation (Pre-Production)

**Goal**: Add user auth and org-based data isolation without changing the deployment model.

```
Browser → nginx
           ├── Static SPA
           ├── /api/n8n/* → proxy (adds org context headers) → n8n
           └── Supabase Auth (email/password + SSO)
                └── RLS policies: auth.uid() + organization_id
```

#### 1.1 Supabase Auth Integration

Use Supabase's built-in Auth service (already included in the hosted plan):

```sql
-- Add organization and user tracking to projects
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise')),
    max_projects INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 3,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-org membership
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### 1.2 RLS Policy Migration

Replace all `USING(true)` policies with tenant-scoped policies:

```sql
-- Example: projects table
DROP POLICY IF EXISTS "Allow all" ON public.projects;

CREATE POLICY "Users see own org projects"
    ON public.projects FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Members can insert projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

-- Cascade to child tables via project_id join
CREATE POLICY "Users see own org rankings"
    ON public.ranking_proveedores FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects
            WHERE organization_id = public.get_user_org_id()
        )
    );
```

#### 1.3 n8n Webhook Authentication

Add an API key header via the nginx proxy so n8n can verify requests:

```nginx
location /api/n8n/ {
    rewrite ^/api/n8n/(.*)$ /webhook/$1 break;
    proxy_pass https://n8n.beaienergy.com;
    # Add auth header (injected at runtime via env var)
    proxy_set_header X-BidEval-API-Key $BIDEVAL_WEBHOOK_SECRET;
    proxy_set_header X-BidEval-Org-Id $http_x_org_id;
    # ... existing proxy settings
}
```

n8n workflows should validate `X-BidEval-API-Key` before processing.

---

### Phase 2: CI/CD & Environments

**Goal**: Automated build, test, and deploy pipeline with staging.

#### 2.1 GitHub Actions Pipeline

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd front-rfq && npm ci --legacy-peer-deps
      - run: cd front-rfq && npm run lint
      # - run: cd front-rfq && npm test (when tests exist)

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: |
          docker build \
            --build-arg VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }} \
            --build-arg VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }} \
            -t bideval:${{ github.sha }} .
      - name: Push to registry
        run: |
          docker tag bideval:${{ github.sha }} ${{ secrets.REGISTRY }}/bideval:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/bideval:${{ github.sha }}

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          ssh ${{ secrets.STAGING_HOST }} \
            "docker pull ${{ secrets.REGISTRY }}/bideval:${{ github.sha }} && \
             docker-compose -f /opt/bideval/docker-compose.yml up -d"

  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.bideval.com
    steps:
      - name: Deploy to production
        run: |
          ssh ${{ secrets.PROD_HOST }} \
            "docker pull ${{ secrets.REGISTRY }}/bideval:${{ github.sha }} && \
             docker-compose -f /opt/bideval/docker-compose.yml up -d"
```

#### 2.2 Environment Strategy

| Environment | Purpose | Supabase | n8n | URL |
|---|---|---|---|---|
| Local dev | Development | Local or dev project | Local n8n or dev instance | localhost:3002 |
| Staging | QA / demo | Separate Supabase project | Staging n8n instance | staging.bideval.com |
| Production | Live | Production Supabase project | Production n8n instance | app.bideval.com |

#### 2.3 Database Migrations

Use Supabase CLI for migration management:

```bash
# Apply migrations
supabase db push --db-url $DATABASE_URL

# Or in CI:
npx supabase migration up --db-url ${{ secrets.DATABASE_URL }}
```

Migration files already exist in `migrations/` - integrate into CI pipeline.

---

### Phase 3: Scalability & Production Hardening

**Goal**: Handle multiple organizations, larger file uploads, and ensure uptime.

#### 3.1 Deployment Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare     │
                    │   (CDN + WAF)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Load Balancer   │
                    │  (nginx/Caddy)   │
                    └────────┬────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
        ┌──────▼──────┐ ┌───▼───────┐ ┌──▼──────────┐
        │ bideval:web  │ │ bideval:web│ │ bideval:web  │
        │ (container)  │ │ (container)│ │ (container)  │
        └──────┬──────┘ └───┬───────┘ └──┬──────────┘
               │             │             │
               └─────────────┼─────────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
        ┌──────▼──────┐ ┌───▼───────┐ ┌──▼──────────┐
        │  Supabase    │ │   n8n      │ │   Redis     │
        │  (managed)   │ │  (workers) │ │  (sessions) │
        └─────────────┘ └───────────┘ └─────────────┘
```

Since this is a static SPA, horizontal scaling is trivial - just add nginx containers behind a load balancer. The heavy processing runs in n8n and Supabase (both externally managed).

#### 3.2 Multi-Tenant Data Model

All data isolation happens via `organization_id` in the database:

```
organizations
    ├── organization_members (user ↔ org mapping)
    ├── projects (organization_id FK)
    │   ├── project_providers
    │   ├── ranking_proveedores
    │   ├── economic_offers
    │   ├── qa_audit
    │   ├── scoring_categories → scoring_criteria
    │   └── document_metadata → document_chunks
    └── (future) billing, usage_metrics
```

**No schema-per-tenant**: All tenants share the same schema. Isolation is enforced by RLS policies at the database level. This is the correct approach for:
- Simpler operations (one schema to migrate)
- Lower cost (shared connection pools)
- Supabase compatibility (RLS is their recommended pattern)
- Up to ~1000 organizations before needing to consider sharding

#### 3.3 n8n Scaling Strategy

n8n is the processing bottleneck (PDF parsing, AI scoring, email sending).

**Current**: Single n8n instance at n8n.beaienergy.com
**Target**: n8n with queue mode for parallel execution

```
n8n main (webhook receiver)
    └── Redis queue
        ├── n8n worker 1 (PDF processing)
        ├── n8n worker 2 (scoring)
        └── n8n worker 3 (email)
```

n8n supports this natively with `EXECUTIONS_MODE=queue` and `QUEUE_BULL_REDIS_HOST`.

#### 3.4 File Storage

Current: Files are processed in-memory by n8n.
Target: Use Supabase Storage for persistent file storage:

```
supabase-storage/
    └── {organization_id}/
        └── {project_id}/
            ├── rfq/           (uploaded RFQ documents)
            ├── proposals/     (supplier proposals)
            └── reports/       (generated reports)
```

Supabase Storage supports RLS policies on buckets, enabling tenant isolation for files.

---

### Phase 4: Billing & Usage Metering (Future)

For commercial SaaS, add:

```sql
CREATE TABLE public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    metric_type TEXT NOT NULL, -- 'project_created', 'pdf_processed', 'ai_evaluation'
    quantity INTEGER DEFAULT 1,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_org_month
    ON public.usage_metrics(organization_id, date_trunc('month', recorded_at));
```

Integrate with Stripe for subscription billing based on plan limits (`max_projects`, `max_users`).

---

## Deployment Checklist (Immediate Actions)

### Must Do Before Production
- [ ] Enable Supabase Auth (email/password minimum)
- [ ] Add `organization_id` to `projects` and cascade to child tables
- [ ] Replace all `USING(true)` RLS policies with auth-scoped policies
- [ ] Remove `.env.production` from git history (`git filter-branch` or BFG)
- [ ] Rotate Supabase anon key (it was exposed in git)
- [ ] Add `X-BidEval-API-Key` header validation to n8n webhooks
- [ ] Set up GitHub Actions for CI/CD (lint + build + deploy)
- [ ] Create staging Supabase project

### Nice to Have Before Launch
- [ ] Cloudflare or similar CDN in front of nginx
- [ ] Supabase Storage for file persistence
- [ ] Rate limiting on nginx (limit_req_zone)
- [ ] Structured logging (JSON format in nginx)
- [ ] Uptime monitoring (UptimeRobot, Betterstack, or similar)
- [ ] Error tracking (Sentry for frontend)

### Post-Launch
- [ ] n8n queue mode with Redis workers
- [ ] Usage metering + Stripe billing integration
- [ ] SSO support (SAML/OIDC for enterprise customers)
- [ ] Audit log for compliance
- [ ] Data export API (GDPR compliance)

---

## Cost Estimates (Monthly)

| Component | Current (Demo) | Starter SaaS (<10 orgs) | Scale (50+ orgs) |
|---|---|---|---|
| Supabase | Free tier | Pro $25 | Pro $25 + compute add-ons |
| n8n | Self-hosted (free) | Self-hosted or Cloud $20 | Cloud $50 + workers |
| Hosting (VPS) | Single VPS ~$10 | 1 VPS $20 | 2-3 VPS $60 |
| Cloudflare | Free | Free | Pro $20 |
| Domain + SSL | ~$15/yr | ~$15/yr | ~$15/yr |
| **Total** | **~$12/mo** | **~$65/mo** | **~$155/mo** |

---

## Migration Path from Current State

1. **Week 1**: Auth + Organizations + RLS (Phase 1.1 - 1.2)
2. **Week 2**: CI/CD pipeline + Staging environment (Phase 2.1 - 2.2)
3. **Week 3**: n8n webhook auth + Secrets rotation (Phase 1.3 + checklist)
4. **Week 4**: CDN + Monitoring + File storage (Phase 3)
5. **Ongoing**: Billing integration as customer pipeline develops
