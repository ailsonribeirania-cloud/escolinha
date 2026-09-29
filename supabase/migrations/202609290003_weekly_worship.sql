-- Programação fixa semanal da unidade. As ocorrências são materializadas pelo worker
-- para que cada domingo tenha um evento e uma notificação próprios.
alter table public.events add column recurrence_key text;
create unique index events_recurrence_key on public.events(unit_id,recurrence_key);

create function private.ensure_weekly_worship_events() returns void language plpgsql security definer set search_path='' as $$
declare u record; d date; h int; starts timestamptz; creator uuid; key text;
begin
 for u in select id,timezone from public.units where active loop
  select m.user_id into creator from public.memberships m where m.unit_id=u.id and m.active and 'administrator'=any(m.roles) order by m.created_at limit 1;
  if creator is null then continue;end if;
  for d in select (x at time zone u.timezone)::date from generate_series(now(),now()+interval '14 days',interval '1 day') x where extract(dow from (x at time zone u.timezone))=0 loop
   foreach h in array array[8,18] loop
    starts:=timezone(u.timezone,(d+make_interval(hours=>h))::timestamp);
    key:=format('weekly-worship-%s-%s',to_char(d,'YYYYMMDD'),lpad(h::text,2,'0'));
    insert into public.events(unit_id,name,starts_at,status,created_by,recurrence_key) values(u.id,'Culto de adoração',starts,'open',creator,key) on conflict(unit_id,recurrence_key) do nothing;
   end loop;
  end loop;
 end loop;
end $$;

-- Também atualiza instalações que já tinham a fila de avisos criada.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.event_notification_operation(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,
   E'if p_action=''event_claim_jobs'' then\n  insert into private.event_notification_jobs',
   E'if p_action=''event_claim_jobs'' then\n  perform private.ensure_weekly_worship_events();\n  insert into private.event_notification_jobs');
 execute definition;
end $$;
