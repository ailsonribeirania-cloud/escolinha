-- Service-only entrypoint. Never grant this function to anon/authenticated.
create function public.server_operation(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; j private.outbox_jobs; cl public.calls; dl public.deliveries; job_id uuid; token uuid; rate private.rate_limits; row private.server_sessions; subscription_id uuid;
begin
 if p_action='session_get' then
  select * into row from private.server_sessions where hash=p_data->>'hash' and expires_at>now() and revoked_at is null;
  return case when found then to_jsonb(row) else null end;
 elsif p_action='session_put' then
  insert into private.server_sessions(hash,user_id,encrypted_tokens,expires_at) values(p_data->>'hash',(p_data->>'user_id')::uuid,p_data->>'encrypted_tokens',(p_data->>'expires_at')::timestamptz) on conflict(hash) do update set encrypted_tokens=excluded.encrypted_tokens,updated_at=now() where private.server_sessions.revoked_at is null;
 elsif p_action='session_delete' then
  update private.server_sessions set revoked_at=now() where hash=p_data->>'hash';update private.push_subscriptions set active=false where session_hash=p_data->>'hash';
 elsif p_action='rate_limit' then
  insert into private.rate_limits(key) values(p_data->>'key') on conflict(key) do update set count=case when private.rate_limits.window_start<now()-interval '1 minute' then 1 else private.rate_limits.count+1 end,window_start=case when private.rate_limits.window_start<now()-interval '1 minute' then now() else private.rate_limits.window_start end returning * into rate;
  return jsonb_build_object('allowed',rate.count<=least(120,greatest(1,(p_data->>'limit')::int)));
 elsif p_action='subscribe' then
  perform private.assert(exists(select 1 from private.server_sessions where hash=p_data->>'session_hash' and user_id=(p_data->>'user_id')::uuid and revoked_at is null and expires_at>now()),'Sessão inválida.');
  insert into private.push_subscriptions(user_id,session_hash,endpoint,subscription) values((p_data->>'user_id')::uuid,p_data->>'session_hash',p_data->'subscription'->>'endpoint',p_data->'subscription') on conflict(endpoint) do update set user_id=excluded.user_id,session_hash=excluded.session_hash,subscription=excluded.subscription,active=true;
 elsif p_action='invalidate_subscription' then update private.push_subscriptions set active=false where id=(p_data->>'id')::uuid;
 elsif p_action='claim_jobs' then
  result:='[]'::jsonb;
  for j in select * from private.outbox_jobs where (status='pending' and run_after<=now()) or (status='processing' and lease_until<now()) order by run_after for update skip locked limit 10 loop
   select * into cl from public.calls where id=j.call_id;
   if cl.status in ('acknowledged','on_the_way','finalized','cancelled') or not exists(select 1 from public.memberships m where m.unit_id=cl.unit_id and m.user_id=cl.guardian_id and m.active) then
    update private.outbox_jobs set status='cancelled' where id=j.id;update public.deliveries set status='cancelled' where id=j.delivery_id;continue;
   end if;
   if j.attempts>=4 then update private.outbox_jobs set status='dead_letter' where id=j.id;update public.deliveries set status='failed',error='MAX_ATTEMPTS' where id=j.delivery_id;continue;end if;
   token:=gen_random_uuid();
   update private.outbox_jobs set status='processing',lease_token=token,lease_until=now()+interval '2 minutes',attempts=attempts+1 where id=j.id;
   select * into dl from public.deliveries where id=j.delivery_id;
   result:=result||jsonb_build_array(jsonb_build_object('job_id',j.id,'lease_token',token,'delivery_id',dl.id,'call_id',cl.id,'unit_id',cl.unit_id,'guardian_id',cl.guardian_id,'channel',dl.channel,'attempt',j.attempts+1));
  end loop;return result;
 elsif p_action='job_payload' then
  select * into j from private.outbox_jobs where id=(p_data->>'job_id')::uuid and status='processing' and lease_token=(p_data->>'lease_token')::uuid and lease_until>now();
  if not found then return null;end if;
  select * into cl from public.calls where id=j.call_id;
  select * into dl from public.deliveries where id=j.delivery_id;
  if cl.status not in ('open','viewed') or not exists(select 1 from public.check_ins where id=cl.attendance_id and status in ('present','pickup_requested')) or not exists(select 1 from public.child_guardians where unit_id=cl.unit_id and child_id=cl.child_id and guardian_id=cl.guardian_id and active) or not exists(select 1 from public.memberships where unit_id=cl.unit_id and user_id=cl.guardian_id and active) then return null;end if;
  if dl.channel='email' and coalesce((select email from public.notification_preferences where unit_id=cl.unit_id and user_id=cl.guardian_id),true)=false then return null;end if;
  if dl.channel='push' and coalesce((select push from public.notification_preferences where unit_id=cl.unit_id and user_id=cl.guardian_id),false)=false then return null;end if;
  return jsonb_build_object('email',(select email from public.profiles where id=cl.guardian_id),'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'subscription',p.subscription)) from private.push_subscriptions p join private.server_sessions s on s.hash=p.session_hash where p.user_id=cl.guardian_id and p.active and s.revoked_at is null and s.expires_at>now()),'[]'::jsonb));
 elsif p_action='finish_job' then
  select * into j from private.outbox_jobs where id=(p_data->>'job_id')::uuid and status='processing' and lease_token=(p_data->>'lease_token')::uuid and lease_until>now() for update;
  if not found then return jsonb_build_object('stale',true);end if;
  perform private.assert(p_data->>'status' in ('accepted','failed','unknown','cancelled'),'Resultado inválido.');
  insert into private.delivery_attempts(job_id,lease_token,number,result) values(j.id,j.lease_token,j.attempts,jsonb_build_object('status',p_data->>'status','code',left(p_data->>'code',80),'provider_id',left(p_data->>'provider_id',150))) on conflict do nothing;
  if p_data->>'status' in ('failed','unknown') and coalesce((p_data->>'retry')::boolean,false) and j.attempts<4 then
   update private.outbox_jobs set status='pending',lease_token=null,lease_until=null,run_after=now()+make_interval(secs=>least(300,15*power(2,j.attempts)::int)+floor(random()*10)::int) where id=j.id;
  else update private.outbox_jobs set status=case when p_data->>'status'='cancelled' then 'cancelled' when p_data->>'status' in ('failed','unknown') then 'dead_letter' else 'completed' end,lease_until=null where id=j.id;end if;
  update public.deliveries set status=p_data->>'status',attempts=j.attempts,error=left(p_data->>'code',80),provider_id=left(p_data->>'provider_id',150),updated_at=now() where id=j.delivery_id;
  perform private.signal((select unit_id from public.calls where id=j.call_id));
 elsif p_action='cleanup' then
  delete from private.rate_limits where window_start<now()-interval '1 day';
  delete from private.server_sessions where expires_at<now()-interval '1 day' or revoked_at<now()-interval '1 day';
  delete from private.idempotency where created_at<now()-interval '7 days';
 else raise exception 'Operação de servidor desconhecida.';end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.server_operation(text,jsonb) from public,anon,authenticated;
grant execute on function public.server_operation(text,jsonb) to service_role;

create function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid;begin
 select id into u from public.units where slug=new.raw_user_meta_data->>'unit_slug' and active;
 if u is null then raise exception 'Unidade inválida.';end if;
 perform private.assert(length(trim(new.raw_user_meta_data->>'name')) between 2 and 120,'Nome inválido.');
 perform private.assert(new.raw_user_meta_data->>'terms'='true' and new.raw_user_meta_data->>'privacy'='true','Aceite dos documentos necessário.');
 perform private.assert((select count(*) from public.legal_document_versions where published and id in ('terms-v1','privacy-v1'))=2,'Documentos institucionais ainda não publicados.');
 insert into public.profiles(id,name,email) values(new.id,trim(new.raw_user_meta_data->>'name'),coalesce(new.email,''));
 insert into public.memberships(unit_id,user_id,roles) values(u,new.id,array['guardian']);
 insert into public.consents(unit_id,user_id,document_id) values(u,new.id,'terms-v1'),(u,new.id,'privacy-v1');
 return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.on_signup();

-- Publish only opaque per-user invalidations; private records never appear in Realtime payloads.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.change_signals;
 end if;
end $$;
