# Conector local do Holyrics

O conector está isolado em `holyrics-connector/`. Ele não é importado pelo PWA e não altera `npm run dev` nem `npm run dev:server`.

## Comandos na raiz

```bash
npm run connector:dev
npm run connector:build
npm run connector:test
npm run connector:start
```

## Banco

`supabase/migrations/202609160001_media_alerts.sql` e `202609160002_media_alerts_expiry.sql` são migrations propostas para homologação. Elas não foram aplicadas automaticamente. Antes de aplicar, revisar RLS, criar o usuário técnico e testar com dados fictícios.

## Estados

```text
pending -> received_by_connector -> awaiting_approval
awaiting_approval -> approved -> sending -> sent_to_holyrics
awaiting_approval -> rejected
awaiting_approval -> cancelled
sending -> failed -> approved
```

Chamados cancelados, finalizados, expirados ou retirados não podem ser enviados. A transição é validada no banco, não apenas no painel.

## API oficial

O cliente usa a API Server local em `/api/SetAlert`. O token é enviado somente pelo processo Node. `ShowCustomMessageStandalone` fica documentado como alternativa para versões recentes, mas a primeira implementação usa aprovação no painel local e `SetAlert` após aprovação.
