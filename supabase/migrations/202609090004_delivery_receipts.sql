create table private.webhook_events (id text primary key, provider_id text not null, event_type text not null, occurred_at timestamptz not null, processed_at timestamptz not null default now());
alter table public.deliveries add column receipt_at timestamptz;
create function public.email_receipt(p_id text,p_provider_id text,p_type text,p_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;begin
 if p_type not in ('email.delivered','email.bounced','email.failed','email.complained') then return;end if;
 insert into private.webhook_events(id,provider_id,event_type,occurred_at) values(p_id,p_provider_id,p_type,p_at) on conflict do nothing;
 if not found then return;end if;
 update public.deliveries set status=case when p_type='email.delivered' then 'delivered' else 'failed' end,receipt_at=p_at,error=case when p_type='email.delivered' then null else upper(replace(p_type,'.','_')) end where provider_id=p_provider_id and channel='email' and (receipt_at is null or receipt_at<p_at) returning unit_id into u;
 if u is not null then perform private.signal(u);end if;
end $$;
revoke all on function public.email_receipt(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.email_receipt(text,text,text,timestamptz) to service_role;

-- A callback can arrive before the sending worker stores the provider message ID.
create function private.reconcile_email_receipt() returns trigger language plpgsql security definer set search_path='' as $$
declare e private.webhook_events;begin
 if new.provider_id is null or new.channel<>'email' then return new;end if;
 select * into e from private.webhook_events where provider_id=new.provider_id order by occurred_at desc limit 1;
 if found then update public.deliveries set status=case when e.event_type='email.delivered' then 'delivered' else 'failed' end,receipt_at=e.occurred_at,error=case when e.event_type='email.delivered' then null else upper(replace(e.event_type,'.','_')) end where id=new.id and (receipt_at is null or receipt_at<=e.occurred_at);end if;
 return new;end $$;
create trigger reconcile_email_receipt after update of provider_id on public.deliveries for each row execute function private.reconcile_email_receipt();
