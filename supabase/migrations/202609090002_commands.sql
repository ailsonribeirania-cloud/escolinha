create function private.assert(ok boolean, message text) returns void language plpgsql set search_path='' as $$ begin if ok is distinct from true then raise exception '%',message using errcode='P0001';end if;end $$;
create function private.command(p_unit uuid,p_command jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); kind text:=p_command->>'type'; d jsonb:=p_command->'data'; rid uuid; a public.check_ins; c public.children; r public.classes; ev public.events; cl public.calls; person public.authorized_people; credential private.pickup_credentials; previous private.idempotency; result jsonb; months int; next_status text; teachers uuid[]; delivery_id uuid; old_name text; req_hash jsonb:=to_jsonb(encode(sha256(convert_to(p_command::text,'UTF8')),'hex')); rate private.rate_limits;
begin
 perform private.assert(private.member(p_unit),'Acesso à unidade não autorizado.');
 perform private.assert(p_key is not null and jsonb_typeof(d)='object','Solicitação inválida.');
 perform pg_advisory_xact_lock(hashtextextended(p_unit::text||actor::text||p_key::text,0));
 select * into previous from private.idempotency where unit_id=p_unit and actor_id=actor and key=p_key;
 if found then perform private.assert(previous.request=req_hash,'Chave reutilizada com conteúdo diferente.');return previous.result;end if;
 if kind in ('save_event','save_class','set_member') then perform private.assert(private.admin(p_unit),'Permissão administrativa necessária.');end if;
 if kind='save_child' then
  perform private.assert(length(trim(d->>'name')) between 2 and 120 and (d->>'birth_date')::date<=current_date and (d->>'birth_date')::date>current_date-interval '18 years','Dados da criança inválidos.');
  if d->>'id' is not null then rid:=(d->>'id')::uuid;perform private.assert(private.guardian(p_unit,rid,'manage') or private.admin(p_unit),'Cadastro não autorizado.');update public.children set name=trim(d->>'name'),birth_date=(d->>'birth_date')::date,photo_path=nullif(d->>'photo_path',''),updated_at=now() where id=rid and unit_id=p_unit;
  else insert into public.children(unit_id,guardian_id,name,birth_date,created_by,photo_path) values(p_unit,actor,trim(d->>'name'),(d->>'birth_date')::date,actor,nullif(d->>'photo_path','')) returning id into rid;
   insert into public.child_guardians(unit_id,child_id,guardian_id,can_manage,can_check_in,can_pick_up) values(p_unit,rid,actor,true,true,true);
   insert into public.authorized_people(unit_id,child_id,name,relationship,phone,created_by) select p_unit,rid,name,'Responsável',phone,actor from public.profiles where id=actor;
  end if;
  if private.guardian(p_unit,rid,'manage') then
  insert into public.child_care(unit_id,child_id,allergies,medication,needs,notes,updated_by) values(p_unit,rid,coalesce(d->>'allergies',''),coalesce(d->>'medication',''),coalesce(d->>'needs',''),coalesce(d->>'notes',''),actor) on conflict(child_id) do update set allergies=excluded.allergies,medication=excluded.medication,needs=excluded.needs,notes=excluded.notes,updated_by=actor,updated_at=now();end if;
 elsif kind='add_person' then
  perform private.assert(private.guardian(p_unit,(d->>'child_id')::uuid,'manage'),'Sem permissão para autorizar retirada.');
  insert into public.authorized_people(unit_id,child_id,name,relationship,phone,created_by) values(p_unit,(d->>'child_id')::uuid,trim(d->>'name'),trim(d->>'relationship'),coalesce(d->>'phone',''),actor) returning id into rid;
 elsif kind='revoke_person' then
  select * into person from public.authorized_people where id=(d->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found and private.guardian(p_unit,person.child_id,'manage'),'Sem permissão.');update public.authorized_people set active=false,revoked_at=now() where id=person.id;rid:=person.id;
 elsif kind='check_in' then
  select * into c from public.children where id=(d->>'child_id')::uuid and unit_id=p_unit for update;
  perform private.assert(found and c.active and (private.guardian(p_unit,c.id,'checkin') or private.admin(p_unit)),'Criança indisponível ou sem permissão.');
  select * into ev from public.events where id=(d->>'event_id')::uuid and unit_id=p_unit for update;perform private.assert(found and ev.status='open','Evento não está aberto.');
  select * into r from public.classes where id=(d->>'class_id')::uuid and unit_id=p_unit for update;perform private.assert(found and r.active,'Turma indisponível.');
  months:=extract(year from age((ev.starts_at at time zone (select timezone from public.units where id=p_unit))::date,c.birth_date))::int*12+extract(month from age((ev.starts_at at time zone (select timezone from public.units where id=p_unit))::date,c.birth_date))::int;
  perform private.assert(months>=r.min_months and months<r.max_months,'A faixa etária não corresponde à turma.');
  perform private.assert(not exists(select 1 from public.check_ins where child_id=c.id and event_id=ev.id and status in ('pending_reception','present','pickup_requested')),'Esta criança já tem um check-in ativo.');
  perform private.assert((select count(*) from public.check_ins where class_id=r.id and event_id=ev.id and status in ('pending_reception','present','pickup_requested'))<r.capacity,'A turma está lotada.');
  insert into public.check_ins(unit_id,child_id,event_id,class_id,guardian_id,created_by,age_months,class_name_snapshot,room_snapshot) values(p_unit,c.id,ev.id,r.id,case when private.guardian(p_unit,c.id,'checkin') then actor else c.guardian_id end,actor,months,r.name,r.room) returning id into rid;
 elsif kind in ('receive','request_pickup','cancel_check_in') then
  select * into a from public.check_ins where id=(d->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found,'Presença não encontrada.');rid:=a.id;
  if kind='receive' then perform private.assert(private.staff_attendance(p_unit,a.id) and a.status='pending_reception','Recebimento não autorizado.');update public.check_ins set status='present',received_at=now(),received_by=actor where id=a.id;
  elsif kind='request_pickup' then perform private.assert(private.guardian(p_unit,a.child_id,'pickup') and a.status='present','Retirada não autorizada.');update public.check_ins set status='pickup_requested' where id=a.id;
  else perform private.assert((private.guardian(p_unit,a.child_id,'checkin') or private.staff_attendance(p_unit,a.id)) and a.status='pending_reception','Somente solicitações pendentes podem ser canceladas.');update public.check_ins set status='cancelled' where id=a.id;update private.pickup_credentials set revoked_at=now() where check_in_id=a.id and revoked_at is null;end if;
 elsif kind='create_call' then
  select * into a from public.check_ins where id=(d->>'attendance_id')::uuid and unit_id=p_unit for update;
  perform private.assert(found and private.staff_attendance(p_unit,a.id) and a.status in ('present','pickup_requested'),'Sem presença autorizada.');
  perform private.assert(not exists(select 1 from public.calls where attendance_id=a.id and status not in ('finalized','cancelled')),'Já existe um chamado ativo. Acompanhe o existente.');
  insert into public.calls(unit_id,attendance_id,child_id,guardian_id,created_by,reason,note) values(p_unit,a.id,a.child_id,a.guardian_id,actor,trim(d->>'reason'),coalesce(d->>'note','')) returning id into rid;
  insert into public.call_events(unit_id,call_id,status,actor_id) values(p_unit,rid,'open',actor);
  insert into public.deliveries(unit_id,call_id,channel,status,attempts) values(p_unit,rid,'internal','delivered',1);
  insert into public.deliveries(unit_id,call_id,channel) values(p_unit,rid,'push') returning id into delivery_id;
  insert into private.outbox_jobs(delivery_id,call_id) values(delivery_id,rid);
  insert into public.deliveries(unit_id,call_id,channel) values(p_unit,rid,'email') returning id into delivery_id;
  insert into private.outbox_jobs(delivery_id,call_id,run_after) values(delivery_id,rid,now()+make_interval(mins=>coalesce((select email_delay_minutes from public.unit_settings where unit_id=p_unit),2)));
 elsif kind='respond_call' then
  select * into cl from public.calls where id=(d->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found,'Chamado não encontrado.');rid:=cl.id;next_status:=d->>'status';
  perform private.assert(next_status in ('viewed','acknowledged','on_the_way','finalized'),'Estado inválido.');
  perform private.assert(case when next_status='finalized' then private.staff_attendance(p_unit,cl.attendance_id) else cl.guardian_id=actor and private.guardian(p_unit,cl.child_id) end,'Resposta não autorizada.');
  perform private.assert(cl.status not in ('finalized','cancelled'),'Chamado já encerrado.');
  update public.calls set status=case when array_position(array['open','viewed','acknowledged','on_the_way','finalized'],next_status)>array_position(array['open','viewed','acknowledged','on_the_way','finalized'],status) then next_status else status end,
   viewed_at=case when next_status='viewed' then coalesce(viewed_at,now()) else viewed_at end,
   acknowledged_at=case when next_status in ('acknowledged','on_the_way') then coalesce(acknowledged_at,now()) else acknowledged_at end,
   on_the_way_at=case when next_status='on_the_way' then coalesce(on_the_way_at,now()) else on_the_way_at end,
   finalized_at=case when next_status='finalized' then now() else finalized_at end where id=cl.id;
  insert into public.call_events(unit_id,call_id,status,actor_id) values(p_unit,cl.id,next_status,actor);
  if next_status in ('acknowledged','on_the_way','finalized') then update private.outbox_jobs set status='cancelled' where call_id=cl.id and status='pending';update public.deliveries set status='cancelled' where call_id=cl.id and status='pending';end if;
 elsif kind='resend_call' then
  select * into cl from public.calls where id=(d->>'id')::uuid and unit_id=p_unit for update;
  perform private.assert(found and private.staff_attendance(p_unit,cl.attendance_id) and cl.status in ('open','viewed'),'Chamado não pode ser reenviado.');rid:=cl.id;
  perform private.assert(not exists(select 1 from public.deliveries where call_id=cl.id and channel='push' and created_at>now()-interval '1 minute'),'Aguarde um minuto antes de reenviar.');
  perform private.assert(not exists(select 1 from private.outbox_jobs j join public.deliveries dl on dl.id=j.delivery_id where j.call_id=cl.id and dl.channel='push' and j.status in ('pending','processing')),'Já existe um envio pendente.');
  insert into public.deliveries(unit_id,call_id,channel) values(p_unit,cl.id,'push') returning id into delivery_id;insert into private.outbox_jobs(delivery_id,call_id) values(delivery_id,cl.id);
 elsif kind='incident' then
  select * into a from public.check_ins where id=(d->>'attendance_id')::uuid and unit_id=p_unit;
  perform private.assert(found and private.teacher(p_unit,a.class_id),'Somente a equipe atribuída registra detalhes de cuidado.');
  insert into public.incidents(unit_id,attendance_id,child_id,category,description,shared,created_by) values(p_unit,a.id,a.child_id,trim(d->>'category'),trim(d->>'description'),coalesce((d->>'shared')::boolean,false),actor) returning id into rid;
 elsif kind='checkout' then
  select * into a from public.check_ins where id=(d->>'attendance_id')::uuid and unit_id=p_unit for update;
  perform private.assert(found and private.staff_attendance(p_unit,a.id) and a.status in ('present','pickup_requested'),'Presença não disponível para retirada.');rid:=a.id;
  insert into private.rate_limits(key) values('pickup:'||actor::text||':'||a.id::text) on conflict(key) do update set count=case when private.rate_limits.window_start<now()-interval '15 minutes' then 1 else private.rate_limits.count+1 end,window_start=case when private.rate_limits.window_start<now()-interval '15 minutes' then now() else private.rate_limits.window_start end returning * into rate;
  if rate.count>8 then return jsonb_build_object('error','Muitas tentativas. Procure a coordenação.');end if;
  select * into credential from private.pickup_credentials where check_in_id=a.id and ((digest=d->>'credential_digest') or (numeric_digest=d->>'credential_digest')) and expires_at>now() and consumed_at is null and revoked_at is null for update;
  if not found then insert into public.audit_logs(unit_id,actor_id,action,entity_id) values(p_unit,actor,'pickup_invalid',a.id);return jsonb_build_object('error','Código inválido ou expirado.');end if;
  select * into person from public.authorized_people where id=(d->>'person_id')::uuid and child_id=a.child_id and unit_id=p_unit and active for update;
  perform private.assert(found,'Pessoa não autorizada para esta retirada.');
  update private.pickup_credentials set consumed_at=now() where id=credential.id;
  update private.pickup_credentials set revoked_at=now() where check_in_id=a.id and id<>credential.id and revoked_at is null;
  insert into public.check_outs(unit_id,check_in_id,person_id,person_name,requested_by,validated_by,completed_by,credential_id) values(p_unit,a.id,person.id,person.name,credential.created_by,actor,actor,credential.id);
  update public.check_ins set status='checked_out',checked_out_at=now() where id=a.id;
  update public.calls set status='finalized',finalized_at=now() where attendance_id=a.id and status not in ('finalized','cancelled');
  update private.outbox_jobs set status='cancelled' where call_id in(select id from public.calls where attendance_id=a.id) and status='pending';
  update public.deliveries set status='cancelled' where call_id in(select id from public.calls where attendance_id=a.id) and status='pending';
 elsif kind='save_event' then
  if d->>'id' is null then insert into public.events(unit_id,name,starts_at,status,created_by) values(p_unit,trim(d->>'name'),(d->>'starts_at')::timestamptz,d->>'status',actor) returning id into rid;
  else rid:=(d->>'id')::uuid;select * into ev from public.events where id=rid and unit_id=p_unit for update;perform private.assert(found,'Evento não encontrado.');
   perform private.assert(d->>'status'<>'closed' or not exists(select 1 from public.check_ins where event_id=rid and status in ('pending_reception','present','pickup_requested')),'Há crianças presentes ou aguardando recebimento.');
   update public.events set name=trim(d->>'name'),starts_at=(d->>'starts_at')::timestamptz,status=d->>'status' where id=rid;
  end if;
 elsif kind='save_class' then
  select coalesce(array_agg(value::uuid),'{}'::uuid[]) into teachers from jsonb_array_elements_text(d->'teacher_ids');
  perform private.assert(not exists(select 1 from unnest(teachers) t where not exists(select 1 from public.memberships m where m.user_id=t and m.unit_id=p_unit and m.active and 'teacher'=any(m.roles))),'Professora não pertence à unidade.');
  if d->>'id' is null then insert into public.classes(unit_id,name,room,min_months,max_months,capacity,teacher_ids,color,created_by) values(p_unit,trim(d->>'name'),trim(d->>'room'),(d->>'min_months')::int,(d->>'max_months')::int,(d->>'capacity')::int,teachers,d->>'color',actor) returning id into rid;
  else rid:=(d->>'id')::uuid;select * into r from public.classes where id=rid and unit_id=p_unit for update;perform private.assert(found,'Turma não encontrada.');perform private.assert(not exists(select 1 from public.check_ins where class_id=rid and status in ('pending_reception','present','pickup_requested')),'Edite a turma depois de concluir as presenças ativas.');update public.classes set name=trim(d->>'name'),room=trim(d->>'room'),min_months=(d->>'min_months')::int,max_months=(d->>'max_months')::int,capacity=(d->>'capacity')::int,teacher_ids=teachers,color=d->>'color' where id=rid;
  end if;
 elsif kind='save_profile' then
  perform private.assert(length(trim(d->>'name')) between 2 and 120 and length(coalesce(d->>'phone',''))<=25,'Dados inválidos.');update public.profiles set name=trim(d->>'name'),phone=coalesce(d->>'phone',''),updated_at=now() where id=actor;rid:=actor;
 elsif kind='settings' then
  insert into public.notification_preferences(unit_id,user_id,email,push,sound) values(p_unit,actor,(d->>'email')::boolean,(d->>'push')::boolean,(d->>'sound')::boolean) on conflict(unit_id,user_id) do update set email=excluded.email,push=excluded.push,sound=excluded.sound;
  if private.admin(p_unit) then insert into public.unit_settings(unit_id,email_delay_minutes,phone_delay_minutes) values(p_unit,(d->>'email_delay_minutes')::int,(d->>'phone_delay_minutes')::int) on conflict(unit_id) do update set email_delay_minutes=excluded.email_delay_minutes,phone_delay_minutes=excluded.phone_delay_minutes;end if;rid:=actor;
 elsif kind='set_member' then
  rid:=(d->>'id')::uuid;perform private.assert(rid<>actor,'Não altere sua própria permissão.');perform private.assert(exists(select 1 from public.memberships where unit_id=p_unit and user_id=rid),'Membro não encontrado.');
  update public.memberships set roles=array(select jsonb_array_elements_text(d->'roles')),active=(d->>'active')::boolean where unit_id=p_unit and user_id=rid;
  insert into public.change_signals(user_id,changed_at) values(rid,clock_timestamp()) on conflict(user_id) do update set changed_at=excluded.changed_at;
 elsif kind='deactivate_child' then
  rid:=(d->>'id')::uuid;perform private.assert(private.admin(p_unit) or private.guardian(p_unit,rid,'manage'),'Sem permissão.');select * into c from public.children where id=rid and unit_id=p_unit for update;perform private.assert(found and not exists(select 1 from public.check_ins where child_id=rid and status in ('pending_reception','present','pickup_requested')),'Conclua as presenças antes de desativar.');update public.children set active=false,updated_at=now() where id=rid;
 elsif kind='save_reason' then
  perform private.assert(private.admin(p_unit),'Permissão administrativa necessária.');
  if d->>'id' is null then insert into public.call_reasons(unit_id,label,active,created_by) values(p_unit,trim(d->>'label'),(d->>'active')::boolean,actor) returning id into rid;
  else rid:=(d->>'id')::uuid;update public.call_reasons set label=trim(d->>'label'),active=(d->>'active')::boolean where id=rid and unit_id=p_unit;perform private.assert(found,'Motivo não encontrado.');end if;
 elsif kind='revise_incident' then
  rid:=(d->>'id')::uuid;perform private.assert(exists(select 1 from public.incidents i join public.check_ins a on a.id=i.attendance_id where i.id=rid and i.unit_id=p_unit and private.teacher(p_unit,a.class_id)),'Revisão não autorizada.');
  perform private.assert(length(trim(d->>'description')) between 5 and 3000 and length(trim(d->>'reason')) between 5 and 200,'Revisão inválida.');
  perform 1 from public.incidents where id=rid for update;
  insert into public.incident_revisions(unit_id,incident_id,description,reason,created_by) select p_unit,id,description,d->>'reason',actor from public.incidents where id=rid;
  update public.incidents set description=d->>'description' where id=rid;
 elsif kind='privacy_request' then
  insert into public.privacy_requests(unit_id,user_id,kind) values(p_unit,actor,d->>'kind') returning id into rid;
 else raise exception 'Operação desconhecida.';
 end if;
 insert into public.audit_logs(unit_id,actor_id,action,entity_id) values(p_unit,actor,kind,rid);
 perform private.signal(p_unit);
 result:=jsonb_build_object('id',rid,'ok',true);
 insert into private.idempotency(unit_id,actor_id,key,request,result) values(p_unit,actor,p_key,req_hash,result);
 return result;
end $$;
revoke all on function private.command(uuid,jsonb,uuid) from public,anon;
grant execute on function private.command(uuid,jsonb,uuid) to authenticated;
create function public.app_command(p_unit uuid,p_command jsonb,p_key uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.command(p_unit,p_command,p_key) $$;
grant execute on function public.app_command(uuid,jsonb,uuid) to authenticated;

create function private.issue_credential(p_unit uuid,p_attendance uuid,p_digest text,p_numeric_digest text) returns jsonb language plpgsql security definer set search_path='' as $$ declare a public.check_ins;begin
 select * into a from public.check_ins where id=p_attendance and unit_id=p_unit for update;
 perform private.assert(found and private.guardian(p_unit,a.child_id,'pickup') and a.status in ('pending_reception','present','pickup_requested'),'Não é possível emitir credencial.');
 perform private.assert(p_digest ~ '^[a-f0-9]{64}$' and p_numeric_digest ~ '^[a-f0-9]{64}$','Credencial inválida.');
 update private.pickup_credentials set revoked_at=now() where check_in_id=a.id and consumed_at is null and revoked_at is null;
 insert into private.pickup_credentials(check_in_id,digest,numeric_digest,expires_at,created_by) values(a.id,p_digest,p_numeric_digest,now()+interval '10 minutes',auth.uid());
 insert into public.audit_logs(unit_id,actor_id,action,entity_id) values(p_unit,auth.uid(),'credential_issued',a.id);
 return jsonb_build_object('expires_at',now()+interval '10 minutes');end $$;
revoke all on function private.issue_credential(uuid,uuid,text,text) from public,anon;
grant execute on function private.issue_credential(uuid,uuid,text,text) to authenticated;
create function public.issue_credential(p_unit uuid,p_attendance uuid,p_digest text,p_numeric_digest text) returns jsonb language sql security invoker set search_path='' as $$select private.issue_credential(p_unit,p_attendance,p_digest,p_numeric_digest)$$;
grant execute on function public.issue_credential(uuid,uuid,text,text) to authenticated;
