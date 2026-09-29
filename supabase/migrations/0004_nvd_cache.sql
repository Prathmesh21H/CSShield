-- 0004_nvd_cve_cache.sql
-- Caches raw NVD CVE attributes so the synthetic-asset finding generator
-- (and any future real-asset ingestion) doesn't need to re-fetch NVD for
-- CVEs already pulled. Findings reference this by cve_id when created.

create table if not exists nvd_cve_cache (
  cve_id text primary key,
  cvss_score numeric(3,1),
  cwe_id text,
  published_at timestamptz,
  last_modified_at timestamptz,
  description text,
  epss_score numeric(6,5),      -- filled in by the EPSS ingestion route
  is_kev boolean not null default false, -- filled in by the KEV ingestion route
  kev_date_added timestamptz,
  cached_at timestamptz not null default now()
);

create index if not exists idx_nvd_cve_cache_cvss on nvd_cve_cache(cvss_score desc);
create index if not exists idx_nvd_cve_cache_is_kev on nvd_cve_cache(is_kev) where is_kev = true;

alter table nvd_cve_cache enable row level security;
create policy "Authenticated users can read nvd_cve_cache" on nvd_cve_cache for select using (auth.role() = 'authenticated');