-- Fixtures locais e de homologação. Não contém pessoas, crianças, contatos ou credenciais.
-- Os UUIDs fixos tornam o ambiente descartável reproduzível.
insert into public.units (id, name, slug, timezone)
values
  ('10000000-0000-4000-8000-000000000001', 'Unidade fictícia A', 'principal', 'America/Sao_Paulo'),
  ('10000000-0000-4000-8000-000000000002', 'Unidade fictícia B', 'secundaria', 'America/Sao_Paulo')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, timezone = excluded.timezone;

insert into public.legal_document_versions (id, kind, version, published, content)
values
  ('terms-v1', 'terms', '1.0', true, 'Termos de uso fictícios para desenvolvimento local.'),
  ('privacy-v1', 'privacy', '1.0', true, 'Política de privacidade fictícia para desenvolvimento local.')
on conflict (id) do update set published = excluded.published, content = excluded.content;

insert into public.unit_settings (unit_id, email_delay_minutes, phone_delay_minutes)
values
  ('10000000-0000-4000-8000-000000000001', 2, 5),
  ('10000000-0000-4000-8000-000000000002', 2, 5)
on conflict (unit_id) do update set email_delay_minutes = excluded.email_delay_minutes,
  phone_delay_minutes = excluded.phone_delay_minutes;

insert into public.integration_settings (unit_id, provider, enabled, mode, duration_seconds)
values
  ('10000000-0000-4000-8000-000000000001', 'holyrics', false, 'media_approval', 15),
  ('10000000-0000-4000-8000-000000000002', 'holyrics', false, 'media_approval', 15)
on conflict (unit_id, provider) do update set enabled = excluded.enabled,
  mode = excluded.mode, duration_seconds = excluded.duration_seconds;
