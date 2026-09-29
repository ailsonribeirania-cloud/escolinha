-- Canais externos para publicação de álbum. A notificação interna continua em
-- public.worship_notifications e é criada na mesma publicação.
create table private.worship_notification_jobs (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 album_id uuid not null references public.worship_albums(id),
 recipient_id uuid not null references public.profiles(id),
 channel text not null check(channel in ('email','push')),
 status text not null default 'pending' check(status in ('pending','processing','completed','cancelled','dead_letter')),
 attempts int not null default 0,
 lease_token uuid,
 lease_until timestamptz,
 run_after timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(album_id,recipient_id,channel)
);
create index worship_notification_due on private.worship_notification_jobs(status,run_after);

create function public.worship_notification_operation(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.worship_notification_jobs; a public.worship_albums; p public.profiles; token uuid; result jsonb; preference boolean;
begin
 if p_action='worship_create_jobs' then
  select * into a from public.worship_albums where id=(p_data->>'album_id')::uuid and unit_id=(p_data->>'unit_id')::uuid and status='published';perform private.assert(found,'Álbum não publicado.');
  insert into private.worship_notification_jobs(unit_id,album_id,recipient_id,channel) select a.unit_id,a.id,m.user_id,ch.channel from public.memberships m cross join (values('email'::text),('push'::text)) ch(channel) where m.unit_id=a.unit_id and m.active and 'guardian'=any(m.roles) on conflict do nothing;return jsonb_build_object('ok',true);
 elsif p_action='worship_claim_jobs' then
  result:='[]'::jsonb;for j in select * from private.worship_notification_jobs where (status='pending' and run_after<=now()) or (status='processing' and lease_until<now()) order by run_after for update skip locked limit 100 loop
   if j.attempts>=4 then update private.worship_notification_jobs set status='dead_letter' where id=j.id;continue;end if;token:=gen_random_uuid();update private.worship_notification_jobs set status='processing',lease_token=token,lease_until=now()+interval '2 minutes',attempts=attempts+1 where id=j.id;result:=result||jsonb_build_array(jsonb_build_object('job_id',j.id,'lease_token',token,'album_id',j.album_id,'recipient_id',j.recipient_id,'channel',j.channel,'attempt',j.attempts+1));end loop;return result;
 elsif p_action='worship_job_payload' then
  select * into j from private.worship_notification_jobs where id=(p_data->>'job_id')::uuid and status='processing' and lease_token=(p_data->>'lease_token')::uuid and lease_until>now();if not found then return null;end if;select * into a from public.worship_albums where id=j.album_id;select * into p from public.profiles where id=j.recipient_id;preference:=case when j.channel='email' then coalesce((select email from public.notification_preferences where unit_id=j.unit_id and user_id=j.recipient_id),true) else coalesce((select push from public.notification_preferences where unit_id=j.unit_id and user_id=j.recipient_id),false) end;if not preference or a.status<>'published' then return null;end if;return jsonb_build_object('email',p.email,'subject','Novos momentos do culto · Escolinha','text',format('A equipe publicou novas fotos em Momentos do Culto: %s.',a.title),'title','Novos momentos do culto','body',format('%s publicou novas fotos.',a.title),'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'subscription',s.subscription)) from private.push_subscriptions s join private.server_sessions ss on ss.hash=s.session_hash where s.user_id=j.recipient_id and s.active and ss.revoked_at is null and ss.expires_at>now()),'[]'::jsonb));
 elsif p_action='worship_finish_job' then
  select * into j from private.worship_notification_jobs where id=(p_data->>'job_id')::uuid and status='processing' and lease_token=(p_data->>'lease_token')::uuid for update;if not found then return jsonb_build_object('stale',true);end if;if p_data->>'status' not in ('accepted','failed','unknown','cancelled') then raise exception 'Resultado inválido.';end if;if p_data->>'status' in ('failed','unknown') and coalesce((p_data->>'retry')::boolean,false) and j.attempts<4 then update private.worship_notification_jobs set status='pending',lease_token=null,lease_until=null,run_after=now()+make_interval(secs=>least(300,15*power(2,j.attempts)::int)+floor(random()*10)::int) where id=j.id;else update private.worship_notification_jobs set status=case when p_data->>'status'='cancelled' then 'cancelled' when p_data->>'status' in ('failed','unknown') then 'dead_letter' else 'completed' end,lease_until=null where id=j.id;end if;return jsonb_build_object('ok',true);
 else raise exception 'Operação de notificação desconhecida.';end if;
end $$;
revoke all on function public.worship_notification_operation(text,jsonb) from public,anon,authenticated;
grant execute on function public.worship_notification_operation(text,jsonb) to service_role;
