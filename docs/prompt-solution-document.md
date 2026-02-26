# Prompt: BidEval Technical Solution Document

```
You are a senior technical writer specializing in enterprise B2B solutions for engineering and procurement industries.

Generate an ultra-detailed Markdown document titled "BidEval — Intelligent Bid Evaluation Platform" that serves as a complete solution document (Solution Brief + Technical Overview).

Apply the styles and visual language from the provided template throughout the entire document.

## Product Context

BidEval is a SaaS platform that automates the evaluation of supplier bids in engineering, construction, and industrial projects (EPC/EPCM). It uses AI (LLMs) to extract data from PDFs, generate automatic scoring, create technical Q&A, and produce comparative reports — reducing weeks of manual work to hours.

### Real Technical Stack
- Frontend: React 18 + TypeScript + Vite + Zustand
- Backend: Supabase (PostgreSQL + Row Level Security + Auth)
- AI Orchestration: n8n (11 webhooks for PDF processing, scoring, Q&A, RAG chat, RFP generation)
- Multi-tenant: Isolated organizations with RLS, roles (owner/admin/member/viewer), email invitations
- Auth: Supabase Auth (email/password), AuthGuard, RBAC with 4 permission levels
- Scoring: Deterministic LLM (temperature=0), comparative mode, configurable rubrics
- Features: automatic PDF extraction, AI scoring, auto-generated technical Q&A, RAG chat over bids, AI-powered RFP generation, Excel/PDF export, dark/light mode, i18n (es/en)
- Security: RLS hardening, API keys, SOC2 audit trail, Sentry error tracking
- Migrations: 9 versions (up to SOC2 audit)

### Suppliers Already Evaluated (Real Cases)
Técnicas Reunidas, IDOM, SACYR, Empresarios Agrupados (EA), SENER, TRESCA, WORLEY

### Success Story
H2 La Zaida Project (green hydrogen) at Ignis Gravity — 7 suppliers, 150+ requirements per supplier, completed in 2 days (vs 3+ weeks manually), 50+ clarification questions auto-generated, estimated savings >€15,000 in engineering hours.

## Document Structure

### 1. Executive Summary
- What BidEval is in 3 paragraphs
- Key value proposition
- Impact metrics (estimated but realistic for EPC)
- 3 KPI callout boxes: time saved (%), cost reduction (€), accuracy improvement (%)

### 2. The Problem
- Current bid evaluation process in EPC/EPCM (detailed step-by-step description)
- Typical timelines: weeks/months to evaluate 5-10 bids
- Pain points: hundreds of pages of PDFs, manual comparison in Excel, inconsistency between evaluators, lack of traceability, human bias
- Hidden cost: senior engineer man-hours dedicated to repetitive tasks
- Risk: evaluation errors → suboptimal award → millions in cost overruns
- Include a step-by-step process diagram of the current manual workflow (6-8 steps) with time estimates
- Include a "Hidden Costs of Manual Evaluation" table: time, errors, inconsistency, compliance risk — each with estimated annual cost range

### 3. The BidEval Solution
For each feature, describe: what it does, how it works internally, what problem it solves, and the quantifiable benefit.

- **3.1 Intelligent Document Ingestion**: PDF upload → n8n extracts structured data → automatic classification by supplier and type
- **3.2 Automatic AI Scoring**: Configure criteria and weights → LLM evaluates each bid → deterministic and reproducible scoring
- **3.3 Auto-generated Technical Q&A**: AI analyzes gaps/ambiguities in bids → generates questions grouped by discipline → direct send to supplier with unique link
- **3.4 RAG Chat Over Bids**: Ask in natural language → semantic search across all bids → contextualized response with references
- **3.5 Intelligent Comparison Table**: Unified technical + economic view → advanced filters → Excel/PDF export
- **3.6 AI-Powered RFP Generation**: From requirements → generates a structured and professional RFP document
- **3.7 Award Management**: AI-generated justification, approval workflow (draft → approved → notified → contracted), project lock after award
- **3.8 Board Reports & PDF Export**: 4 report types (Evaluation, Comparison, Executive Summary, Award Justification) with custom branding, versioning
- **3.9 ESG/Sustainability Scoring**: Dedicated scoring category with 12 certifications catalog, automatic extraction from proposals, benchmarking between suppliers
- **3.10 Multi-tenant & Collaboration**: Isolated organizations → roles and permissions → invitations → simultaneous teamwork
- **3.11 Audit Trail & Compliance**: Every action recorded → complete traceability → SOC2 audit-ready
- **3.12 REST API & Integrations**: 6 documented endpoints, API key management (CRUD, permissions, expiration, rate limiting), dual auth (API Key + JWT)
- **3.13 Admin Dashboard**: System health, project counts, supplier stats, org usage, recent audit log

For each feature include a mini card with: what it does, problem it solves, and a bold impact metric.
Include a consolidated Before vs After table covering all features (columns: Area | Before BidEval | With BidEval | Impact).

### 4. Technical Architecture
- Horizontal flow diagram: User → React Frontend → Supabase (Auth + DB + RLS) → n8n (11 webhooks) → LLM (Claude/GPT/Mistral) → Supabase → Frontend
- End-to-end data flow (upload → processing → evaluation → result)
- Cloud SaaS deployment: secure cloud (EU), no own infrastructure needed
- Security layers table: layer | mechanism | description (covering RLS, RBAC, API keys, audit trail, encryption, session timeout)
- Scalability: how each layer scales

### 5. Typical User Flow
Step-by-step walkthrough of a complete project:
1. Create project (setup wizard)
2. Upload base RFQ
3. Upload supplier bids (PDFs)
4. Review automatic extraction
5. Configure scoring criteria
6. Run AI evaluation
7. Review comparative scoring
8. Generate Q&A for clarifications
9. Send Q&A to suppliers
10. Receive and process responses
11. Re-evaluate if necessary
12. Export final report

Present as a numbered timeline/flowchart. Mark which steps are AI-automated vs human-reviewed. Include time estimate per step.

### 6. Security and Compliance
- Detail on RLS, RBAC, encryption, audit trail
- SOC2 readiness
- Multi-tenant isolation
- Compliance readiness checklist table: SOC2 control | BidEval implementation | Status (✓ implemented / ◐ in progress)

### 7. Plans and Pricing

**PROFESSIONAL PLAN — €2,100/month | €25,000/year (annual billing)**

✓ Unlimited users
✓ Up to 5 active bids (projects) simultaneously
✓ Up to 30 suppliers in the platform
✓ PDF ingestion + automatic extraction + classification
✓ AI scoring with custom criteria, weights, justifications, strengths/weaknesses analysis
✓ Auto-generated technical Q&A + send to suppliers + response processing
✓ Economic analysis: TCO, CAPEX/OPEX breakdown, payment terms, Excel comparison + export
✓ AI Chat (RAG over bids, multi-document, persistent history)
✓ Communications hub (emails, calls, meetings, timeline)
✓ Supplier directory with historical scores, win/loss, feedback
✓ Collaboration: RBAC with 4 roles (admin/evaluator/economic_viewer/viewer), email invitations, permission gates
✓ Dark/light mode, ES/EN
✓ 16x5 support
✓ 99.9% SLA

**CUSTOM / ENTERPRISE PLAN — from €4,900/month | negotiated annually**

Everything in Professional, plus:
✓ Award wizard with AI-generated justification + approval workflow
✓ Board Reports in PDF with custom branding (4 report types, versioning)
✓ ESG/Sustainability scoring with 12 certifications catalog, automatic extraction, benchmarking
✓ AI-powered RFP/RFQ generator (8 configurable sections, reference docs, custom PDF with branding)
✓ REST API with 6 documented endpoints + API key management (CRUD, permissions, expiration, rate limiting)
✓ Admin dashboard (system health, project counts, supplier stats, org usage, recent audit log)
✓ Full SOC2 audit trail (login, logout, project creation, scoring execution, data export — all logged with timestamp, user, org, metadata)
✓ Reusable scoring templates (save configuration, load across projects, standardize evaluation)
✓ Unlimited dynamic economic fields with parent-child hierarchy per project
✓ Unlimited bids (projects)
✓ Unlimited suppliers
✓ Dedicated 24x7 support
✓ 99.95% SLA + contractual

**Setup: FREE (launch offer)**
Real value: €5,000-€15,000. Includes: environment configuration, custom scoring criteria, team training (up to 10 users), 2 accompanied pilot projects, priority support during onboarding.

**Billing:** Minimum contract 12 months. Annual (with discount) or quarterly. VAT not included. Net 30 payment terms.

### 8. Roadmap (Suggested)
- Logical future features for a platform like this
- Present as a horizontal timeline in 3 phases: Now (current) → Next 6 months → Next 12 months, each with 3-5 feature items

## Writing Rules
- Tone: professional but accessible, not overly sales-oriented
- Length: 2500-4000 words
- Include all tables and diagrams described above
- Include realistic estimated metrics (% time reduction, etc.)
- Language: English
- Format: clean Markdown, well-structured with headers, bullets, tables
- DO NOT invent features that don't exist — stick to the ones described above
- Apply the styles and visual language from the provided template throughout
```
