-- 0001_init_schema.sql
-- Core schema for SIH26105. Run via `supabase db push` or the SQL editor.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Business units & assets
-- ---------------------------------------------------------------------------
create table if not exists business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_unit_id uuid not null references business_units(id) on delete cascade,
  criticality text not null check (criticality in ('low', 'medium', 'high', 'critical')),
  internet_facing boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_business_unit on assets(business_unit_id);
create index if not exists idx_assets_criticality on assets(criticality);

-- ---------------------------------------------------------------------------
-- Findings (vulnerabilities attached to assets)
-- ---------------------------------------------------------------------------
create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  cve_id text not null,
  cvss_score numeric(3,1),
  epss_score numeric(6,5),
  is_kev boolean not null default false,
  cwe_id text,
  status text not null default 'open' check (status in ('open', 'patched', 'accepted_risk')),
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, cve_id)
);

create index if not exists idx_findings_asset on findings(asset_id);
create index if not exists idx_findings_cve on findings(cve_id);
create index if not exists idx_findings_status on findings(status);
create index if not exists idx_findings_is_kev on findings(is_kev) where is_kev = true;

-- ---------------------------------------------------------------------------
-- Controls (candidate security investments)
-- ---------------------------------------------------------------------------
create table if not exists controls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost numeric(14,2) not null,
  est_risk_reduction_pct numeric(5,4) not null check (est_risk_reduction_pct between 0 and 1),
  framework_refs jsonb not null default '{}'::jsonb,
  -- CWE/category tags this control mitigates, used to link it back to findings
  mitigates_cwe_ids text[] not null default '{}'
);

-- ---------------------------------------------------------------------------
-- Risk scores (time series — this is what makes the platform "continuous")
-- ---------------------------------------------------------------------------
create table if not exists risk_scores (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('org', 'business_unit', 'asset')),
  scope_id uuid, -- null when scope_type = 'org'
  eal_value numeric(16,2) not null,
  var95_value numeric(16,2) not null,
  top_contributors jsonb not null default '[]'::jsonb, -- [{findingId, ealContribution}, ...]
  computed_at timestamptz not null default now()
);

create index if not exists idx_risk_scores_scope on risk_scores(scope_type, scope_id, computed_at desc);
create index if not exists idx_risk_scores_computed_at on risk_scores(computed_at desc);

-- ---------------------------------------------------------------------------
-- Compliance frameworks & control mapping
-- ---------------------------------------------------------------------------
create table if not exists frameworks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  version text
);

create table if not exists framework_controls (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references frameworks(id) on delete cascade,
  control_ref text not null,      -- e.g. "PR.AC-1" (NIST CSF), "5.1" (ISO Annex A)
  control_title text not null,
  unique (framework_id, control_ref)
);

create index if not exists idx_framework_controls_framework on framework_controls(framework_id);

-- ---------------------------------------------------------------------------
-- Ingestion audit log
-- ---------------------------------------------------------------------------
create table if not exists ingestion_log (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('nvd', 'epss', 'kev', 'synthetic')),
  record_count integer not null default 0,
  status text not null check (status in ('success', 'partial', 'failed')),
  error_message text,
  ran_at timestamptz not null default now()
);

create index if not exists idx_ingestion_log_source on ingestion_log(source, ran_at desc);

create table if not exists ingestion_errors (
  id uuid primary key default gen_random_uuid(),
  ingestion_log_id uuid references ingestion_log(id) on delete cascade,
  raw_record jsonb,
  error_message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Optimization run history (audit trail for the optimizer)
-- ---------------------------------------------------------------------------
create table if not exists optimization_runs (
  id uuid primary key default gen_random_uuid(),
  budget numeric(14,2) not null,
  selected_control_ids uuid[] not null default '{}',
  eal_before numeric(16,2) not null,
  projected_eal numeric(16,2) not null,
  rosi numeric(8,4) not null,
  computed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Prototype policy: any authenticated user can read; only the service role
-- (used exclusively in server-side Route Handlers) can write. No table here
-- holds one user's private data, so per-row ownership isn't needed yet.
-- ---------------------------------------------------------------------------
alter table business_units enable row level security;
alter table assets enable row level security;
alter table findings enable row level security;
alter table controls enable row level security;
alter table risk_scores enable row level security;
alter table frameworks enable row level security;
alter table framework_controls enable row level security;
alter table ingestion_log enable row level security;
alter table optimization_runs enable row level security;

create policy "Authenticated users can read business_units" on business_units for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read assets" on assets for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read findings" on findings for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read controls" on controls for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read risk_scores" on risk_scores for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read frameworks" on frameworks for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read framework_controls" on framework_controls for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read ingestion_log" on ingestion_log for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read optimization_runs" on optimization_runs for select using (auth.role() = 'authenticated');

-- No insert/update/delete policies are defined for the anon/authenticated roles,
-- which means only the service role key (used server-side only) can write —
-- exactly the boundary the build prompt requires.