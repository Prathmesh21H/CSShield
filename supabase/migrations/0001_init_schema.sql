create extension if not exists pgcrypto;

create table if not exists public.business_units (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	created_at timestamptz not null default now()
);

create table if not exists public.assets (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	business_unit_id uuid not null references public.business_units(id) on delete cascade,
	criticality text not null check (criticality in ('low', 'medium', 'high', 'critical')),
	internet_facing boolean not null default false,
	created_at timestamptz not null default now()
);

create table if not exists public.findings (
	id uuid primary key default gen_random_uuid(),
	asset_id uuid not null references public.assets(id) on delete cascade,
	cve_id text not null,
	cvss_score numeric(4, 2),
	epss_score numeric(6, 5),
	is_kev boolean not null default false,
	cwe_id text,
	status text not null default 'open' check (status in ('open', 'patched', 'accepted_risk')),
	discovered_at timestamptz not null default now()
);

create table if not exists public.controls (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	cost numeric(12, 2) not null check (cost >= 0),
	est_risk_reduction_pct numeric(5, 2) not null check (est_risk_reduction_pct between 0 and 100),
	framework_refs jsonb
);

create table if not exists public.risk_scores (
	id uuid primary key default gen_random_uuid(),
	scope_type text not null check (scope_type in ('org', 'business_unit', 'asset')),
	scope_id uuid,
	eal_value numeric(14, 2) not null,
	var95_value numeric(14, 2) not null,
	computed_at timestamptz not null default now()
);

create table if not exists public.frameworks (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	version text,
	unique (name, version)
);

create table if not exists public.ingestion_log (
	id uuid primary key default gen_random_uuid(),
	source text not null check (source in ('nvd', 'epss', 'kev', 'synthetic')),
	record_count integer not null check (record_count >= 0),
	status text not null check (status in ('success', 'partial', 'failed')),
	ran_at timestamptz not null default now()
);

create index if not exists assets_business_unit_id_idx on public.assets(business_unit_id);
create index if not exists findings_asset_id_idx on public.findings(asset_id);
create index if not exists findings_status_idx on public.findings(status);
create index if not exists risk_scores_scope_idx on public.risk_scores(scope_type, scope_id, computed_at desc);
create index if not exists ingestion_log_ran_at_idx on public.ingestion_log(ran_at desc);
