# Roadmap e limites de execução

## Fase 1 — Planejamento

Entrega documental autorizada e concluída:

- Requisitos com critérios de aceite e inventário de telas.
- Arquitetura modular, desenho de sessão e ambientes.
- Modelo lógico, restrições transacionais e índices previstos.
- Matriz de autorização/RLS e cenários negativos.
- Estados e fluxos de presença, chamados, ocorrência e retirada.
- Notificações, escalonamento e tratamento de falhas.
- Segurança, privacidade, cache, offline e atualização.
- Contrato documental do Holyrics com flag desativada.
- Plano de testes, backlog e decisões pendentes.

Não inclui: código de aplicação, instalação de dependências, migrations, provisionamento, `.env` com credenciais, testes de aplicativo, build ou chamadas a provedores.

## Fase 2 — Protótipo visual

Só iniciar após nova autorização. Usar dados fictícios e adaptadores locais, com aviso de demonstração e nenhum envio real.

Ordem sugerida:

1. Base React/TypeScript/Vite, rotas, tokens e componentes acessíveis; README executável e `.env.example` sem segredos.
2. Área pública e cadastro/login demonstrativos, sem sugerir autenticação real.
3. Jornada do responsável: filhos, autorizados, evento, solicitação/comprovante, chamado e retirada.
4. Jornada da professora: turma, presentes, cuidados, chamado, ocorrência e validação simulada.
5. Dashboard e telas principais de gestão, com cenários vazio/carregando/erro.
6. Revisão em tamanhos de celular/desktop, tipos, navegação, acessibilidade básica e build.

Aceite: jornadas principais navegáveis, identidade substituível, todas as ações claramente simuladas e inventário de telas implementadas versus pendentes. Não persistir dados pessoais nem introduzir serviços externos. Instalação/push reais pertencem às fases posteriores.

## Fase 3 — Estrutura funcional

Estado: concluída em ambiente local descartável. O acesso remoto, provisionamento e produção continuam desativados.

- Migrations versionadas e `supabase/seed.sql` reproduzível com duas unidades e documentos fictícios.
- BFF com cookie HttpOnly, sessão de servidor cifrada, refresh no servidor e token curto para Realtime.
- Auth com cadastro condicionado à unidade, termos e privacidade; perfis, vínculos e papéis separados da identidade.
- RLS, grants mínimos, comandos transacionais, idempotência, sinais de reconciliação e operações administrativas protegidas.
- Testes SQL de isolamento, vínculos, autoelevação, revogação, capacidade, fila e credenciais.

Validação local: `npm test -- tests/database.test.ts --reporter=dot` — 22 testes aprovados. O ambiente Supabase gerenciado não foi provisionado.

1. Confirmar desenho de sessão/BFF e validar Realtime com tokens curtos.
2. Configurar ambiente Supabase local, migrations versionadas e fixtures fictícias.
3. Implementar Auth, vínculos por unidade, perfis e permissões; provisionamento inicial controlado.
4. Criar responsáveis, crianças, cuidados, autorizados e consentimentos versionados.
5. Criar eventos, salas, turmas e atribuições de professoras.
6. Criar estrutura de configuração/logs e contrato tipado de integração, Holyrics desativado.
7. Executar testes de RLS/grants, validação, tipos e build.

Aceite: isolamento comprovado também por acesso direto ao backend; nenhum papel controlado pelo usuário. Serviço remoto real só mediante autorização, produção sem migration automática.

## Fase 4 — Operação

1. Check-in, capacidade, recebimento e comprovante.
2. Painel da professora, consulta restrita de cuidados e presença.
3. Chamados, respostas e histórico de transições.
4. Ocorrências e revisões restritas.
5. Validação/retirada transacional, código público e credencial distintos.
6. Auditoria e atualização Realtime com reconciliação.
7. Relatórios básicos e testes de concorrência/jornadas/build.

Aceite: ausência de duplicatas sob concorrência, retirada com pessoa autorizada e trilha completa. Notificações podem permanecer simuladas até a fase seguinte.

## Fase 5 — Notificações

1. Simuladores de canal e cenários de falha.
2. Notificação interna, outbox, tarefas persistentes e worker.
3. Inscrições de dispositivos, adaptador Web Push e estados de permissão.
4. Adaptador Resend, templates discretos e callbacks autenticados quando aplicáveis.
5. Escalonamento, retentativas, reenvio manual, logs e painel de falhas.
6. Testes com provedores falsos; homologação real apenas após autorização específica.

Aceite: chamado e tentativa têm estados distintos; confirmação cancela tarefas pendentes; nenhum dado sensível em mensagens. O service worker mínimo para push pode ser introduzido nesta fase, com política de cache segura desde o primeiro uso.

## Fase 6 — PWA e finalização inicial

1. Completar manifesto, ícones, instalação e offline.
2. Revisar cache, atualização e sessões em dispositivo compartilhado.
3. Revisar responsividade, acessibilidade e todas as telas requeridas.
4. Testar Android/iPhone disponíveis e documentar limitações reais.
5. Executar verificação de tipos, testes aplicáveis e build.
6. Documentar execução, ambientes, configuração de canais, recuperação e implantação.
7. Fechar decisões operacionais/jurídicas necessárias ao uso real e preparar implantação revisável.

Aceite: relatório de validação e lacunas explícitas. Preparar implantação não é autorizar publicação nem migrations de produção.

## Fase 7 — Holyrics real

Somente após funcionamento do sistema principal e autorização específica. Revisar documentação oficial, conectividade local, token mínimo, ações de exibição/ocultação, aprovação da mídia, duração, modo de teste, logs, reconexão e expiração. Testar sem dados reais, comprovando que falhas não afetam outros canais e que apenas códigos temporários aparecem.

## Ritual de entrega

Ao encerrar cada fase: informar o que foi desenvolvido, arquivos alterados, como testar, comandos e resultados, build quando aplicável, problemas e pendências. Parar e aguardar autorização antes de iniciar a seguinte. Se houver impedimento de teste externo/dispositivo, explicar a limitação sem declarar teste realizado.
