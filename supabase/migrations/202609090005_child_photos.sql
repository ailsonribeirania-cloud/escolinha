alter table public.children add column if not exists photo_path text;
alter table public.children add constraint children_photo_path_length check (photo_path is null or length(photo_path) between 1 and 300);

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('child-photos', 'child-photos', false)
    on conflict (id) do update set public=false;
  end if;
end $$;
