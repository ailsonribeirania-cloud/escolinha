-- Exclusão explícita de álbum, restrita à administração e registrada em auditoria.
do $patch$
declare source text;
begin
 select pg_get_functiondef('public.worship_album_operation(uuid,text,jsonb,uuid)'::regprocedure) into source;
 source := replace(source,
   $old$ elsif p_action in ('hide_album','archive_album') then$old$,
   $new$ elsif p_action='delete_album' then
  select * into a from public.worship_albums where id=(p_data->>'id')::uuid and unit_id=p_unit for update;
  perform private.assert(found and private.worship_admin(p_unit),'Somente administradores podem apagar álbuns.');
  delete from public.worship_comment_reports where comment_id in(select id from public.worship_photo_comments where album_id=a.id);
  delete from public.worship_photo_likes where photo_id in(select id from public.worship_photos where album_id=a.id);
  delete from public.worship_photo_comments where photo_id in(select id from public.worship_photos where album_id=a.id);
  delete from private.worship_notification_jobs where album_id=a.id;
  delete from public.worship_notifications where album_id=a.id;
  delete from public.worship_photos where album_id=a.id;
  delete from public.worship_albums where id=a.id;
  rid:=a.id;
  insert into public.audit_logs(unit_id,actor_id,action,entity_id) values(p_unit,actor,'worship_delete_album',rid);
 elsif p_action in ('hide_album','archive_album') then$new$);
 execute source;
end $patch$;
