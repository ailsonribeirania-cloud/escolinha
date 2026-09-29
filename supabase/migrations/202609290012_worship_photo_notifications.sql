-- Uma nova foto adicionada a um álbum publicado reabre a notificação interna
-- do álbum para os responsáveis daquela unidade.
do $patch$
declare source text;
begin
  select pg_get_functiondef('public.worship_album_operation(uuid,text,jsonb,uuid)'::regprocedure) into source;
  source := replace(source,
    $old$insert into public.worship_photos(unit_id,album_id,storage_path,thumbnail_path,caption,sort_order,uploaded_by) values(p_unit,a.id,p_data->>'storage_path',nullif(p_data->>'thumbnail_path',''),coalesce(trim(p_data->>'caption'),''),coalesce((p_data->>'sort_order')::int,0),actor) returning id into rid;$old$,
    $new$insert into public.worship_photos(unit_id,album_id,storage_path,thumbnail_path,caption,sort_order,uploaded_by) values(p_unit,a.id,p_data->>'storage_path',nullif(p_data->>'thumbnail_path',''),coalesce(trim(p_data->>'caption'),''),coalesce((p_data->>'sort_order')::int,0),actor) returning id into rid;
  insert into public.worship_notifications(unit_id,recipient_id,album_id,kind) select p_unit,m.user_id,a.id,m2.kind from public.memberships m cross join (values('album_published'::text)) m2(kind) where m.unit_id=p_unit and m.active and 'guardian'=any(m.roles) on conflict(album_id,recipient_id,kind) do update set created_at=now(),read_at=null;$new$);
  execute source;
end $patch$;
