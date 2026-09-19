-- Complemento da migration de mídia. Aplicar somente junto com 202609160001, após revisão.
create function public.media_alert_expire(p_alert uuid, p_connector text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.media_alerts;
begin
  select * into a from public.media_alerts where id=p_alert for update;
  if not found or not private.media_connector(a.unit_id) then raise exception 'Alerta não autorizado.' using errcode='42501'; end if;
  update public.media_alerts set status='expired', last_error='ALERTA_EXPIRADO', connector_id=p_connector, updated_at=now()
    where id=a.id and status in ('pending','received_by_connector','awaiting_approval','failed') and expires_at<=now();
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.media_alert_expire(uuid,text) from public,anon;
grant execute on function public.media_alert_expire(uuid,text) to authenticated;
