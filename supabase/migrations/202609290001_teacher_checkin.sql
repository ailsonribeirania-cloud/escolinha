-- Professores podem iniciar o check-in de crianças nas turmas que lhes foram atribuídas.
-- A atribuição continua sendo verificada no banco, independentemente da interface.
create or replace function private.child_access(u uuid,c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.admin(u) or private.guardian(u,c) or exists(
   select 1
   from public.classes r
   join public.memberships m on m.unit_id=r.unit_id and m.user_id=auth.uid()
   where r.unit_id=u
     and r.active
     and auth.uid()=any(r.teacher_ids)
     and 'teacher'=any(m.roles)
     and m.active
 ) or exists(select 1 from public.check_ins a where a.unit_id=u and a.child_id=c and private.teacher(u,a.class_id));
$$;

-- Atualiza instalações que já aplicaram a migration do comando.
do $$
declare definition text;
begin
  select pg_get_functiondef('private.command(uuid,jsonb,uuid)'::regprocedure) into definition;
  definition:=replace(definition,
    'private.guardian(p_unit,c.id,''checkin'') or private.admin(p_unit)',
    'private.guardian(p_unit,c.id,''checkin'') or private.admin(p_unit) or private.teacher(p_unit,(d->>''class_id'')::uuid)');
  execute definition;
end $$;

create or replace function private.care_access(u uuid,c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.guardian(u,c,'manage') or exists(select 1 from public.check_ins a where a.unit_id=u and a.child_id=c and a.status in ('pending_reception','present','pickup_requested') and private.teacher(u,a.class_id));
$$;
