-- Permite que responsáveis, professores e administradores interajam
-- somente com fotos de álbuns publicados.
do $patch$
declare source text;
begin
  select pg_get_functiondef('public.worship_album_operation(uuid,text,jsonb,uuid)'::regprocedure) into source;
  source := replace(source,
    $old$perform private.assert(private.worship_guardian(p_unit) and private.worship_can_interact(p_unit,actor),'Interação não autorizada.');$old$,
    $new$perform private.assert((private.worship_guardian(p_unit) or private.worship_staff(p_unit)) and private.worship_can_interact(p_unit,actor),'Interação não autorizada.');$new$);
  source := replace(source,
    $old$perform private.assert(found and private.worship_guardian(p_unit) and private.worship_can_interact(p_unit,actor) and exists(select 1 from public.worship_albums where id=ph.album_id and status='published'),'Comentário não autorizado.');$old$,
    $new$perform private.assert(found and (private.worship_guardian(p_unit) or private.worship_staff(p_unit)) and private.worship_can_interact(p_unit,actor) and exists(select 1 from public.worship_albums where id=ph.album_id and status='published'),'Comentário não autorizado.');$new$);
  source := replace(source,
    $old$perform private.assert(found and private.worship_guardian(p_unit),'Denúncia não autorizada.');$old$,
    $new$perform private.assert(found and (private.worship_guardian(p_unit) or private.worship_staff(p_unit)),'Denúncia não autorizada.');$new$);
  execute source;
end $patch$;
