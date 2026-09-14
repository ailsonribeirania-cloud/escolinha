-- app_command valida o usuário com auth.uid(), mas precisa executar as
-- gravações internas acima das políticas RLS de leitura das tabelas públicas.
alter function private.command(uuid, jsonb, uuid) security definer;
