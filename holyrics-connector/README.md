# Conector local Holyrics

Processo Node.js independente do PWA. Ele escuta uma projeção pública de chamados no Supabase, mantém uma fila local de aprovação e envia somente mensagens fixas com código temporário para a API Server local do Holyrics.

## Segurança

- Escuta por padrão em `127.0.0.1:3090`.
- Não usa `service_role`.
- O usuário técnico deve ter acesso RLS somente à tabela `media_alerts` e à função de transição.
- O token do Holyrics fica somente no `.env` do computador da mídia.
- O modo inicial é simulado (`HOLYRICS_MOCK=true`).
- Não há nomes, fotos, sala, responsáveis, telefone, e-mail, motivo detalhado ou dados médicos na projeção.

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

Painel: http://127.0.0.1:3090

```bash
npm run build
npm run start
```

## Holyrics local

No Holyrics, abrir `Arquivo > Configurações > API Server`, ativar o acesso local e criar um token em `Gerenciar permissões`. Para este conector, a permissão mínima é `SetAlert`; `GetAPIServerInfo` é usada apenas para teste de disponibilidade. Não ativar acesso web nem usar a API Online.

```env
HOLYRICS_BASE_URL=http://127.0.0.1:8091
HOLYRICS_TOKEN=token-local
HOLYRICS_ALERT_DURATION=20
HOLYRICS_MOCK=false
```

## Teste

1. Manter `HOLYRICS_MOCK=true`.
2. Abrir o painel local.
3. Usar uma fixture com `E-TESTE01`.
4. Aprovar e confirmar que nenhuma credencial foi impressa.
5. Configurar a API local e um token restrito.
6. Repetir com `HOLYRICS_MOCK=false` e somente o código fictício.

A integração Supabase só funciona após as migrations `202609160001_media_alerts.sql` e `202609160002_media_alerts_expiry.sql` serem revisadas e aplicadas manualmente em homologação. Depois disso, deve ser criado um usuário técnico autenticado e uma linha em `private.media_connectors`.
