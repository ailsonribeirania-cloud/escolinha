-- A coluna de foto foi adicionada depois da função save_child original.
-- Esta operação associa um objeto já enviado ao Storage à criança, validando
-- novamente o vínculo e a unidade no banco.
create function public.set_child_photo(p_unit uuid, p_child uuid, p_photo_path text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  changed uuid;
begin
  perform private.assert(
    private.admin(p_unit) or private.guardian(p_unit, p_child, 'manage'),
    'Cadastro não autorizado.'
  );
  perform private.assert(
    p_photo_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.jpg$',
    'Foto inválida.'
  );
  update public.children
     set photo_path=p_photo_path, updated_at=now()
   where id=p_child and unit_id=p_unit and active
   returning id into changed;
  perform private.assert(changed is not null, 'Criança não encontrada.');
  insert into public.audit_logs(unit_id,actor_id,action,entity_id)
  values(p_unit,auth.uid(),'child_photo_updated',changed);
  perform private.signal(p_unit);
  return jsonb_build_object('id',changed,'path',p_photo_path);
end $$;

revoke all on function public.set_child_photo(uuid,uuid,text) from public,anon;
grant execute on function public.set_child_photo(uuid,uuid,text) to authenticated;
