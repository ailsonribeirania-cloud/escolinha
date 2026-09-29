-- Permite à equipe gerenciar fotos também depois da publicação do álbum.
do $patch$
declare source text;
begin
 select pg_get_functiondef('public.worship_album_operation(uuid,text,jsonb,uuid)'::regprocedure) into source;
 source := replace(source,
   $old$perform private.assert(found and a.status='draft','Somente rascunhos aceitam fotos.');$old$,
   $new$perform private.assert(found and a.status in ('draft','published'),'O álbum não aceita novas fotos.');$new$);
 source := replace(source,
   $old$perform private.assert(found and (private.worship_admin(p_unit) or a.created_by=actor) and a.status='draft','Foto não pode ser removida.');$old$,
   $new$perform private.assert(found and (private.worship_admin(p_unit) or a.created_by=actor) and a.status in ('draft','published'),'Foto não pode ser removida.');$new$);
 source := replace(source,
   $old$ elsif p_action='delete_photo' then$old$,
   $new$ elsif p_action='update_photo' then
  select * into ph from public.worship_photos where id=(p_data->>'id')::uuid and unit_id=p_unit and deleted_at is null for update;
  select * into a from public.worship_albums where id=ph.album_id and unit_id=p_unit;
  perform private.assert(found and (private.worship_admin(p_unit) or a.created_by=actor) and a.status in ('draft','published'),'Foto não pode ser editada.');
  update public.worship_photos set caption=coalesce(trim(p_data->>'caption'),''),sort_order=coalesce((p_data->>'sort_order')::int,sort_order) where id=ph.id;
  rid:=ph.id;
 elsif p_action='delete_photo' then$new$);
 execute source;
end $patch$;
