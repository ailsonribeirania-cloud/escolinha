-- Mural privado de fotos dos cultos.
create table public.worship_albums (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 title text not null check(length(title) between 2 and 120 and title !~ '[<>]'),
 description text not null default '' check(length(description)<=1000 and description !~ '[<>]'),
 service_date date not null,
 status text not null default 'draft' check(status in ('draft','published','hidden','archived')),
 consent_confirmed boolean not null default false,
 cover_photo_id uuid,
 created_by uuid not null references public.profiles(id),
 published_by uuid references public.profiles(id),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index worship_albums_list on public.worship_albums(unit_id,status,service_date desc,created_at desc);

create table public.worship_photos (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 album_id uuid not null references public.worship_albums(id),
 storage_path text not null unique check(length(storage_path)<=500),
 thumbnail_path text check(thumbnail_path is null or length(thumbnail_path)<=500),
 caption text not null default '' check(length(caption)<=500 and caption !~ '[<>]' and caption !~* 'https?://'),
 sort_order int not null default 0,
 uploaded_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 deleted_at timestamptz,
 deleted_by uuid references public.profiles(id)
);
create index worship_photos_album on public.worship_photos(album_id,sort_order,created_at);
alter table public.worship_albums add constraint worship_cover_fk foreign key(cover_photo_id) references public.worship_photos(id);

create table public.worship_photo_likes (
 photo_id uuid not null references public.worship_photos(id),
 unit_id uuid not null references public.units(id),
 user_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 primary key(photo_id,user_id)
);
create index worship_likes_photo on public.worship_photo_likes(photo_id);

create table public.worship_photo_comments (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 photo_id uuid not null references public.worship_photos(id),
 user_id uuid not null references public.profiles(id),
 parent_comment_id uuid references public.worship_photo_comments(id),
 content text not null check(length(trim(content)) between 1 and 500 and content !~ '[<>]' and content !~* 'https?://'),
 status text not null default 'published' check(status in ('published','removed_by_author','removed_by_moderator')),
 edited_at timestamptz,
 deleted_at timestamptz,
 deleted_by uuid references public.profiles(id),
 moderation_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index worship_comments_photo on public.worship_photo_comments(photo_id,status,created_at);

create table public.worship_comment_reports (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 comment_id uuid not null references public.worship_photo_comments(id),
 reported_by uuid not null references public.profiles(id),
 reason text not null check(reason in ('inappropriate','personal_information','child_name','spam','other')),
 details text not null default '' check(length(details)<=500 and details !~ '[<>]'),
 status text not null default 'pending' check(status in ('pending','ignored','removed','blocked')),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 resolution text,
 created_at timestamptz not null default now()
);
create index worship_reports_queue on public.worship_comment_reports(unit_id,status,created_at desc);

create table public.worship_interaction_blocks (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 user_id uuid not null references public.profiles(id),
 reason text not null check(length(reason) between 2 and 500),
 blocked_until timestamptz not null,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create index worship_active_block on public.worship_interaction_blocks(unit_id,user_id,blocked_until);

create table public.child_image_consents (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 child_id uuid not null references public.children(id),
 guardian_id uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','granted','revoked')),
 consent_version text not null default 'image-v1',
 granted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(child_id,guardian_id)
);
create index child_image_consent_lookup on public.child_image_consents(unit_id,child_id,status);

create table public.worship_notifications (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units(id),
 recipient_id uuid not null references public.profiles(id),
 album_id uuid not null references public.worship_albums(id),
 kind text not null default 'album_published' check(kind='album_published'),
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(album_id,recipient_id,kind)
);
create index worship_notifications_recipient on public.worship_notifications(recipient_id,created_at desc);

do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public) values('worship-media','worship-media',false) on conflict(id) do update set public=false;
 end if;
end $$;

create function private.worship_member(u uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.member(u) $$;
create function private.worship_staff(u uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.member(u) and exists(select 1 from public.memberships m where m.unit_id=u and m.user_id=auth.uid() and m.active and ('administrator'=any(m.roles) or 'teacher'=any(m.roles))) $$;
create function private.worship_admin(u uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.admin(u) $$;
create function private.worship_guardian(u uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.member(u) and exists(select 1 from public.memberships m where m.unit_id=u and m.user_id=auth.uid() and m.active and 'guardian'=any(m.roles)) $$;
create function private.worship_can_interact(u uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select not exists(select 1 from public.worship_interaction_blocks b where b.unit_id=u and b.user_id=p_user and b.blocked_until>now()) $$;

alter table public.worship_albums enable row level security;
alter table public.worship_photos enable row level security;
alter table public.worship_photo_likes enable row level security;
alter table public.worship_photo_comments enable row level security;
alter table public.worship_comment_reports enable row level security;
alter table public.worship_interaction_blocks enable row level security;
alter table public.child_image_consents enable row level security;
alter table public.worship_notifications enable row level security;
revoke all on public.worship_albums,public.worship_photos,public.worship_photo_likes,public.worship_photo_comments,public.worship_comment_reports,public.worship_interaction_blocks,public.child_image_consents,public.worship_notifications from anon,authenticated;
grant select on public.worship_albums,public.worship_photos,public.worship_photo_likes,public.worship_photo_comments,public.worship_notifications to authenticated;
create policy worship_album_read on public.worship_albums for select to authenticated using(private.worship_member(unit_id) and (status='published' or private.worship_staff(unit_id)));
create policy worship_photo_read on public.worship_photos for select to authenticated using(private.worship_member(unit_id) and (not exists(select 1 from public.worship_albums a where a.id=album_id and a.status not in ('published')) or private.worship_staff(unit_id)) and deleted_at is null);
create policy worship_like_read on public.worship_photo_likes for select to authenticated using(private.worship_member(unit_id));
create policy worship_comment_read on public.worship_photo_comments for select to authenticated using(private.worship_member(unit_id));
create policy worship_report_admin_read on public.worship_comment_reports for select to authenticated using(private.worship_admin(unit_id));
create policy worship_block_admin_read on public.worship_interaction_blocks for select to authenticated using(private.worship_admin(unit_id));
create policy worship_notification_read on public.worship_notifications for select to authenticated using(recipient_id=auth.uid() and private.worship_member(unit_id));
create policy image_consent_read on public.child_image_consents for select to authenticated using(guardian_id=auth.uid() or private.worship_admin(unit_id));

create function public.worship_album_operation(p_unit uuid,p_action text,p_data jsonb,p_key uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); a public.worship_albums; ph public.worship_photos; c public.worship_photo_comments; rid uuid; title text; description text; parent public.worship_photo_comments; blocked boolean;
begin
 perform private.assert(private.member(p_unit),'Acesso à unidade não autorizado.');
 if p_action in ('create_album','update_album','publish_album','hide_album','archive_album','create_photo','delete_photo') then perform private.assert(private.worship_staff(p_unit),'Permissão de equipe necessária.');end if;
 if p_action='create_album' then
  insert into public.worship_albums(unit_id,title,description,service_date,created_by) values(p_unit,trim(p_data->>'title'),coalesce(trim(p_data->>'description'),''),(p_data->>'service_date')::date,actor) returning id into rid;
 elsif p_action='update_album' then
  select * into a from public.worship_albums where id=(p_data->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found and (a.created_by=actor or private.worship_admin(p_unit)) and a.status in ('draft','published'),'Álbum não pode ser editado.');
  update public.worship_albums set title=trim(p_data->>'title'),description=coalesce(trim(p_data->>'description'),''),service_date=(p_data->>'service_date')::date,updated_at=now() where id=a.id;rid:=a.id;
 elsif p_action='publish_album' then
  select * into a from public.worship_albums where id=(p_data->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found and a.status in ('draft','hidden') and (p_data->>'consent_confirmed')::boolean,'Confirme as autorizações de uso de imagem antes de publicar.');perform private.assert(exists(select 1 from public.worship_photos where album_id=a.id and deleted_at is null),'Adicione ao menos uma foto antes de publicar.');
  update public.worship_albums set status='published',consent_confirmed=true,published_by=actor,published_at=coalesce(published_at,now()),updated_at=now() where id=a.id;insert into public.worship_notifications(unit_id,recipient_id,album_id) select p_unit,m.user_id,a.id from public.memberships m where m.unit_id=p_unit and m.active and 'guardian'=any(m.roles) on conflict do nothing;rid:=a.id;
 elsif p_action in ('hide_album','archive_album') then
  select * into a from public.worship_albums where id=(p_data->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found and private.worship_admin(p_unit),'Somente administradores podem ocultar ou arquivar.');update public.worship_albums set status=case when p_action='hide_album' then 'hidden' else 'archived' end,updated_at=now() where id=a.id;rid:=a.id;
 elsif p_action='create_photo' then
  select * into a from public.worship_albums where id=(p_data->>'album_id')::uuid and unit_id=p_unit for update;perform private.assert(found and a.status='draft','Somente rascunhos aceitam fotos.');insert into public.worship_photos(unit_id,album_id,storage_path,thumbnail_path,caption,sort_order,uploaded_by) values(p_unit,a.id,p_data->>'storage_path',nullif(p_data->>'thumbnail_path',''),coalesce(trim(p_data->>'caption'),''),coalesce((p_data->>'sort_order')::int,0),actor) returning id into rid;
 elsif p_action='delete_photo' then
  select * into ph from public.worship_photos where id=(p_data->>'id')::uuid and unit_id=p_unit for update;select * into a from public.worship_albums where id=ph.album_id;perform private.assert(found and (private.worship_admin(p_unit) or a.created_by=actor) and a.status='draft','Foto não pode ser removida.');update public.worship_photos set deleted_at=now(),deleted_by=actor where id=ph.id;rid:=ph.id;
 elsif p_action in ('like','unlike') then
  select * into ph from public.worship_photos where id=(p_data->>'photo_id')::uuid and unit_id=p_unit and deleted_at is null;perform private.assert(found and exists(select 1 from public.worship_albums where id=ph.album_id and status='published'),'Foto indisponível.');perform private.assert(private.worship_guardian(p_unit) and private.worship_can_interact(p_unit,actor),'Interação não autorizada.');if p_action='like' then insert into public.worship_photo_likes(photo_id,unit_id,user_id) values(ph.id,p_unit,actor) on conflict do nothing;else delete from public.worship_photo_likes where photo_id=ph.id and user_id=actor;end if;rid:=ph.id;
 elsif p_action='comment' then
  select * into ph from public.worship_photos where id=(p_data->>'photo_id')::uuid and unit_id=p_unit and deleted_at is null;perform private.assert(found and private.worship_guardian(p_unit) and private.worship_can_interact(p_unit,actor) and exists(select 1 from public.worship_albums where id=ph.album_id and status='published'),'Comentário não autorizado.');if p_data->>'parent_comment_id' is not null then select * into parent from public.worship_photo_comments where id=(p_data->>'parent_comment_id')::uuid and photo_id=ph.id and status='published';perform private.assert(found and parent.parent_comment_id is null,'Respostas só podem ter um nível.');end if;insert into public.worship_photo_comments(unit_id,photo_id,user_id,parent_comment_id,content) values(p_unit,ph.id,actor,nullif(p_data->>'parent_comment_id','')::uuid,trim(p_data->>'content')) returning id into rid;
 elsif p_action='edit_comment' then select * into c from public.worship_photo_comments where id=(p_data->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found and c.user_id=actor and c.status='published' and private.worship_can_interact(p_unit,actor),'Comentário não pode ser editado.');update public.worship_photo_comments set content=trim(p_data->>'content'),edited_at=now(),updated_at=now() where id=c.id;rid:=c.id;
 elsif p_action='delete_comment' then select * into c from public.worship_photo_comments where id=(p_data->>'id')::uuid and unit_id=p_unit for update;perform private.assert(found and (c.user_id=actor or private.worship_admin(p_unit)),'Comentário não pode ser removido.');update public.worship_photo_comments set status=case when c.user_id=actor then 'removed_by_author' else 'removed_by_moderator' end,deleted_at=now(),deleted_by=actor,updated_at=now() where id=c.id;rid:=c.id;
 elsif p_action='report_comment' then select * into c from public.worship_photo_comments where id=(p_data->>'comment_id')::uuid and unit_id=p_unit;perform private.assert(found and private.worship_guardian(p_unit),'Denúncia não autorizada.');insert into public.worship_comment_reports(unit_id,comment_id,reported_by,reason,details) values(p_unit,c.id,actor,p_data->>'reason',coalesce(p_data->>'details','')) returning id into rid;
 elsif p_action='review_report' then perform private.assert(private.worship_admin(p_unit),'Somente administradores podem revisar denúncias.');update public.worship_comment_reports set status=p_data->>'status',reviewed_by=actor,reviewed_at=now(),resolution=left(p_data->>'resolution',500) where id=(p_data->>'report_id')::uuid and unit_id=p_unit returning id into rid;perform private.assert(rid is not null,'Denúncia não encontrada.');
 elsif p_action='block_user' then perform private.assert(private.worship_admin(p_unit),'Somente administradores podem bloquear interações.');insert into public.worship_interaction_blocks(unit_id,user_id,reason,blocked_until,created_by) values(p_unit,(p_data->>'user_id')::uuid,left(p_data->>'reason',500),(p_data->>'blocked_until')::timestamptz,actor) returning id into rid;
 elsif p_action='moderate_comment' then perform private.assert(private.worship_admin(p_unit),'Somente administradores podem moderar.');update public.worship_photo_comments set status='removed_by_moderator',deleted_at=now(),deleted_by=actor,moderation_reason=left(p_data->>'reason',500),updated_at=now() where id=(p_data->>'comment_id')::uuid and unit_id=p_unit returning id into rid;update public.worship_comment_reports set status='removed',reviewed_by=actor,reviewed_at=now(),resolution=left(p_data->>'reason',500) where comment_id=rid and status='pending';
 else raise exception 'Operação do mural desconhecida.';end if;
 insert into public.audit_logs(unit_id,actor_id,action,entity_id) values(p_unit,actor,'worship_'||p_action,rid);
 perform private.signal(p_unit);return jsonb_build_object('ok',true,'id',rid);
end $$;
alter function public.worship_album_operation(uuid,text,jsonb,uuid) security definer;
revoke all on function public.worship_album_operation(uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.worship_album_operation(uuid,text,jsonb,uuid) to authenticated;
