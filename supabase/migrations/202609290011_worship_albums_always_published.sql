-- Os álbuns do mural são publicados imediatamente após sua criação.
-- A visibilidade continua protegida pela unidade e pela autenticação.
update public.worship_albums
set status='published',
    consent_confirmed=true,
    published_by=coalesce(published_by,created_by),
    published_at=coalesce(published_at,created_at),
    updated_at=now()
where status='draft';

insert into public.worship_notifications(unit_id,recipient_id,album_id)
select a.unit_id,m.user_id,a.id
from public.worship_albums a
join public.memberships m on m.unit_id=a.unit_id and m.active and 'guardian'=any(m.roles)
where a.status='published'
on conflict do nothing;

do $patch$
declare source text;
begin
  select pg_get_functiondef('public.worship_album_operation(uuid,text,jsonb,uuid)'::regprocedure) into source;
  source := replace(source,
    $old$if p_action='create_album' then
  insert into public.worship_albums(unit_id,title,description,service_date,created_by) values(p_unit,trim(p_data->>'title'),coalesce(trim(p_data->>'description'),''),(p_data->>'service_date')::date,actor) returning id into rid;$old$,
    $new$if p_action='create_album' then
  insert into public.worship_albums(unit_id,title,description,service_date,status,consent_confirmed,created_by,published_by,published_at) values(p_unit,trim(p_data->>'title'),coalesce(trim(p_data->>'description'),''),(p_data->>'service_date')::date,'published',true,actor,actor,now()) returning id into rid;
  insert into public.worship_notifications(unit_id,recipient_id,album_id) select p_unit,m.user_id,rid from public.memberships m where m.unit_id=p_unit and m.active and 'guardian'=any(m.roles) on conflict do nothing;$new$);
  source := replace(source,
    $old$perform private.assert(found and a.status in ('draft','hidden') and (p_data->>'consent_confirmed')::boolean,'Confirme as autorizações de uso de imagem antes de publicar.');$old$,
    $new$perform private.assert(found and a.status in ('draft','hidden','published'),'Álbum não pode ser publicado.');$new$);
  execute source;
end $patch$;
