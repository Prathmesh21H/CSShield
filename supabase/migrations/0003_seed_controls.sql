insert into public.controls (name, cost, est_risk_reduction_pct, framework_refs)
values
	('Multi-factor authentication', 25000, 18.00, '{"NIST CSF":["PR.AA-03"],"CIS Controls":["6"]}'::jsonb),
	('Endpoint detection and response', 50000, 24.00, '{"NIST CSF":["DE.CM-01"],"CIS Controls":["13"]}'::jsonb),
	('Vulnerability management', 35000, 21.00, '{"NIST CSF":["ID.RA-01"],"CIS Controls":["7"]}'::jsonb),
	('Network segmentation', 75000, 16.00, '{"NIST CSF":["PR.IR-01"],"CIS Controls":["12"]}'::jsonb),
	('Security awareness training', 15000, 8.00, '{"NIST CSF":["PR.AT-01"],"CIS Controls":["14"]}'::jsonb)
on conflict (name) do nothing;
