-- 0002_seed_frameworks.sql
-- Reference data only — framework names and a representative subset of
-- control IDs/titles. These are public framework identifiers, not the
-- copyrighted full standard text (ISO 27001 in particular is a paid
-- standard; we store only its public Annex A control titles).

insert into frameworks (name, version) values
  ('NIST CSF', '2.0'),
  ('CIS Controls', 'v8'),
  ('ISO 27001', '2022'),
  ('RBI CSF', '2016'),
  ('SEBI CSCRF', '2024')
on conflict (name) do nothing;

-- NIST CSF 2.0 — representative control subset
insert into framework_controls (framework_id, control_ref, control_title)
select id, ref, title from frameworks, (values
  ('ID.AM-1', 'Physical devices and systems are inventoried'),
  ('ID.RA-1', 'Asset vulnerabilities are identified and documented'),
  ('PR.AC-1', 'Identities and credentials are managed'),
  ('PR.IP-12', 'A vulnerability management plan is developed and implemented'),
  ('DE.CM-8', 'Vulnerability scans are performed'),
  ('RS.MI-3', 'Newly identified vulnerabilities are mitigated or documented as accepted risk')
) as v(ref, title)
where frameworks.name = 'NIST CSF'
on conflict (framework_id, control_ref) do nothing;

-- CIS Controls v8 — representative control subset
insert into framework_controls (framework_id, control_ref, control_title)
select id, ref, title from frameworks, (values
  ('CIS-1', 'Inventory and Control of Enterprise Assets'),
  ('CIS-4', 'Secure Configuration of Enterprise Assets and Software'),
  ('CIS-7', 'Continuous Vulnerability Management'),
  ('CIS-12', 'Network Infrastructure Management'),
  ('CIS-16', 'Application Software Security')
) as v(ref, title)
where frameworks.name = 'CIS Controls'
on conflict (framework_id, control_ref) do nothing;

-- ISO 27001:2022 Annex A — public control titles only
insert into framework_controls (framework_id, control_ref, control_title)
select id, ref, title from frameworks, (values
  ('A.5.7', 'Threat intelligence'),
  ('A.8.8', 'Management of technical vulnerabilities'),
  ('A.8.9', 'Configuration management'),
  ('A.5.23', 'Information security for use of cloud services'),
  ('A.8.16', 'Monitoring activities')
) as v(ref, title)
where frameworks.name = 'ISO 27001'
on conflict (framework_id, control_ref) do nothing;

-- RBI Cyber Security Framework — representative topic areas
insert into framework_controls (framework_id, control_ref, control_title)
select id, ref, title from frameworks, (values
  ('RBI-2.1', 'Inventory management of business IT assets'),
  ('RBI-2.4', 'Vulnerability assessment and penetration testing'),
  ('RBI-2.6', 'Patch/vulnerability & change management'),
  ('RBI-4', 'Cyber Crisis Management Plan')
) as v(ref, title)
where frameworks.name = 'RBI CSF'
on conflict (framework_id, control_ref) do nothing;

-- SEBI Cybersecurity and Cyber Resilience Framework — representative areas
insert into framework_controls (framework_id, control_ref, control_title)
select id, ref, title from frameworks, (values
  ('SEBI-VAPT', 'Vulnerability Assessment and Penetration Testing'),
  ('SEBI-NET', 'Network security and segmentation'),
  ('SEBI-IR', 'Incident response and reporting'),
  ('SEBI-DR', 'Business continuity and disaster recovery')
) as v(ref, title)
where frameworks.name = 'SEBI CSCRF'
on conflict (framework_id, control_ref) do nothing;