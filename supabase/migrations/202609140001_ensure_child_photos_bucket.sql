-- O bucket é privado; as imagens só são acessadas por URLs assinadas pelo backend.
-- O schema storage é fornecido pelo Supabase, mas não existe no PGlite usado
-- pelos testes unitários locais.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('child-photos', 'child-photos', false)
    on conflict (id) do update set public = false;
  end if;
end $$;
