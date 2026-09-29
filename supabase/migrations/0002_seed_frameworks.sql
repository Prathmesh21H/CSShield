insert into public.frameworks (name, version)
values
	('NIST CSF', '2.0'),
	('CIS Controls', 'v8'),
	('ISO/IEC 27001', '2022')
on conflict (name, version) do nothing;
