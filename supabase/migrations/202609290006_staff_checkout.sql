-- Checkout presencial pela equipe, sem QR Code do responsável.
-- O caminho antigo continua disponível para compatibilidade com registros e clientes antigos.
alter table public.check_outs alter column person_id drop not null;
alter table public.check_outs alter column person_name drop not null;
alter table public.check_outs alter column credential_id drop not null;
alter table public.check_outs add column if not exists checkout_method text not null default 'credential';
alter table public.check_outs drop constraint if exists check_outs_checkout_method_check;
alter table public.check_outs add constraint check_outs_checkout_method_check check (checkout_method in ('credential','staff_manual','staff_bulk'));

create or replace function private.staff_checkout_one(p_unit uuid, p_attendance uuid, p_method text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.check_ins; actor uuid := auth.uid();
begin
 select * into a from public.check_ins where id=p_attendance and unit_id=p_unit for update;
 perform private.assert(found and private.staff_attendance(p_unit,a.id) and a.status in ('present','pickup_requested'),'Presença não disponível para retirada.');
 insert into public.check_outs(unit_id,check_in_id,person_id,person_name,requested_by,validated_by,completed_by,credential_id,checkout_method)
 values(p_unit,a.id,null,'Equipe da Escolinha',null,actor,actor,null,case when p_method='manual' then 'staff_manual' else p_method end);
 update public.check_ins set status='checked_out',checked_out_at=now() where id=a.id;
 update public.calls set status='finalized',finalized_at=now() where attendance_id=a.id and status not in ('finalized','cancelled');
 update private.outbox_jobs set status='cancelled' where call_id in(select id from public.calls where attendance_id=a.id) and status='pending';
 update public.deliveries set status='cancelled' where call_id in(select id from public.calls where attendance_id=a.id) and status='pending';
 insert into public.audit_logs(unit_id,actor_id,action,entity_id) values(p_unit,actor,'staff_checkout_'||p_method,a.id);
end $$;
revoke all on function private.staff_checkout_one(uuid,uuid,text) from public,anon;
grant execute on function private.staff_checkout_one(uuid,uuid,text) to authenticated;

create or replace function private.staff_checkout_all(p_unit uuid, p_event uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare item record; total integer := 0;
begin
 perform private.assert(private.admin(p_unit) or exists(select 1 from public.memberships m where m.unit_id=p_unit and m.user_id=auth.uid() and m.active and 'teacher'=any(m.roles)),'Somente administradores e professores podem concluir retiradas.');
 for item in
   select i.id from public.check_ins i
   where i.unit_id=p_unit and i.event_id=p_event and i.status in ('present','pickup_requested')
     and private.staff_attendance(p_unit,i.id)
   order by i.requested_at
   for update
 loop
   perform private.staff_checkout_one(p_unit,item.id,'staff_bulk');
   total := total + 1;
 end loop;
 perform private.assert(total>0,'Não há crianças disponíveis para checkout neste evento.');
 return total;
end $$;
revoke all on function private.staff_checkout_all(uuid,uuid) from public,anon;
grant execute on function private.staff_checkout_all(uuid,uuid) to authenticated;

-- Adiciona os dois novos comandos sem copiar a função transacional inteira.
do $patch$
declare source text;
begin
 select pg_get_functiondef('private.command(uuid,jsonb,uuid)'::regprocedure) into source;
 if position('kind=''staff_checkout''' in source)=0 then
   source := replace(source,
     $old$ else raise exception 'Operação desconhecida.';$old$,
     $new$ elsif kind='staff_checkout' then
       perform private.staff_checkout_one(p_unit,(d->>'attendance_id')::uuid,'manual');
       rid:=(d->>'attendance_id')::uuid;
     elsif kind='staff_checkout_all' then
       perform private.staff_checkout_all(p_unit,(d->>'event_id')::uuid);
       rid:=(d->>'event_id')::uuid;
     else raise exception 'Operação desconhecida.';$new$);
   execute source;
 end if;
end $patch$;

-- A ausência de person_id é intencional: a equipe confirma a entrega presencialmente.
drop policy if exists checkout_read on public.check_outs;
create policy checkout_read on public.check_outs for select to authenticated using(
 exists(select 1 from public.check_ins a where a.id=check_in_id and (private.guardian(a.unit_id,a.child_id) or private.staff_attendance(a.unit_id,a.id)))
);
