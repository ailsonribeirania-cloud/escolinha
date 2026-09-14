# Plano de testes e critérios de liberação

## Situação atual

Fases 1 e 2 foram concluídas. A Fase 3 foi validada em PGlite com migrations e fixtures sintéticas: isolamento entre unidades, vínculos, privilégios, revogação, idempotência e transações passaram. Supabase local com Docker, dispositivos e provedores externos ainda não foram homologados.

## Estratégia

| Camada | Ferramenta proposta | Finalidade |
| --- | --- | --- |
| Regras puras | Vitest | Idade, estados, normalização e políticas temporais |
| Componentes | Testing Library | Formulários e comportamento acessível relevante |
| Banco/permissões | Testes SQL/pgTAP com Supabase local | RLS, grants, transações e invariantes |
| Jornada | Playwright | Fluxos completos, navegação e falhas de rede |
| Acessibilidade | Verificação automatizada + revisão manual | Teclado, foco, contraste, leitor de tela e toque |
| PWA | Browser DevTools + dispositivos | Cache, push, instalação, atualização e limitações |

Usar fixtures sintéticas identificadas como demonstração: duas unidades, famílias sem relação, criança com dois responsáveis, professora de turma A, professora de turma B, administrador por unidade, usuário revogado e pessoa autorizada sem conta. E-mails devem usar domínio reservado, por exemplo `responsavel.a@example.test`; não usar telefone real plausível para enviar mensagens.

## Matriz de cenários

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| AUTH-01 | Login/logout/recuperação | Sessão criada/revogada, resposta segura e sem enumeração de conta |
| AUTH-02 | Sessão expirada durante confirmação | Nenhuma operação sem autorização; estado recuperável após login |
| AUTH-03 | Cookie/CSRF/armazenamento | Cookies protegidos, mutação cross-site rejeitada, sem refresh token no navegador |
| AUTH-04 | Papel alterado ou revogado | Privilégio antigo deixa de funcionar, inclusive em sessão aberta |
| RLS-01 | Responsável A usa UUID da criança B | Leitura/escrita negadas sem vazamento |
| RLS-02 | Usuário troca unit_id em INSERT/UPDATE | Rejeição no backend e no banco |
| RLS-03 | Professora A consulta turma B | Negado para consulta, busca, cuidados, chamados e checkout |
| RLS-04 | Administrador A acessa unidade B | Negado também via views/RPC/Realtime |
| RLS-05 | Usuário atribui papel a si mesmo | Negado por grants, política e função |
| RLS-06 | Cadastro básico versus saúde | Campos restritos não aparecem na projeção comum |
| RLS-07 | Chamada direta à API/RPC sem UI | Mesmas permissões; nenhum bypass por rota escondida |
| RLS-08 | Assinatura aberta após revogação | Sem novos dados sensíveis; canal/consulta reautorizado |
| FAM-01 | Cadastro e retorno em outro culto | Criança reutilizada sem duplicar cadastro |
| FAM-02 | Convite errado/expirado/reutilizado | Não cria vínculo; token não aparece em logs |
| FAM-03 | Revogar pessoa autorizada | Retirada posterior impedida |
| IN-01 | Dois check-ins simultâneos | Uma presença ativa e resposta consistente ao concorrente |
| IN-02 | Última vaga disputada | Capacidade não é ultrapassada sem exceção autorizada |
| IN-03 | Resposta perdida após commit | Repetição idempotente recupera mesma presença |
| IN-04 | Limite de idade e fuso | Elegibilidade calculada na data do evento e limites corretos |
| IN-05 | Solicitação/recebimento/cancelamento | Presença física só após recebimento; vaga liberada ao cancelar/expirar |
| IN-06 | Evento fechado e reentrada | Bloqueio correto; reentrada aprovada gera novos códigos |
| OUT-01 | QR válido e pessoa autorizada | Uma saída com todos os atores e horários |
| OUT-02 | QR adulterado/expirado/de outro evento | Rejeitado sem revelar identidade |
| OUT-03 | Reutilização e duas confirmações simultâneas | Uma única conclusão, alternativas revogadas |
| OUT-04 | Autorização revogada depois da leitura | Confirmação final rejeitada |
| OUT-05 | Tentativas numéricas excessivas | Limitação eficaz, erro discreto, operação legítima recuperável |
| OUT-06 | Ler QR e abandonar tela | Credencial não consumida apenas pela leitura |
| OUT-07 | Retirada excepcional | Somente permissão especial, motivo e auditoria obrigatórios |
| CALL-01 | Duplo clique e concorrência | Um chamado por ocorrência e uma sequência de tarefas |
| CALL-02 | “Estou a caminho” sem confirmar antes | Registra confirmação e deslocamento uma vez |
| CALL-03 | Resposta fora de ordem/apos finalização | Não regride nem reabre chamado |
| CALL-04 | Múltiplos destinatários | Autorização individual; primeira confirmação interrompe escalonamento pendente |
| INC-01 | Registro/correção/compartilhamento | Revisão preservada, acesso restrito, auditoria sem descrição médica |
| NOT-01 | Push aceito sem recibo | UI não declara entregue ou lido |
| NOT-02 | Prazo sem confirmação | E-mail e orientação de ligação nas etapas configuradas |
| NOT-03 | Confirmação antes do prazo | Tarefa ainda não enviada é cancelada |
| NOT-04 | Worker cai antes/depois do envio | Lease recuperado, duplicidade mitigada, ambiguidade registrada |
| NOT-05 | Inscrição inválida/429/timeout | Revogação ou retentativa conforme classe de erro |
| NOT-06 | Reenvio manual simultâneo | Cooldown e dedupe evitam disparos concorrentes iguais |
| NOT-07 | Webhook falso/duplicado/fora de ordem | Assinatura validada, sem duplicata ou regressão de estado |
| NOT-08 | Push/e-mail/logs | Nenhum motivo sensível, token ou código de retirada exposto |
| PWA-01 | Offline durante operação | Sem sucesso fictício ou envio posterior silencioso |
| PWA-02 | Inspeção dos armazenamentos | Nenhum dado sensível persistido ou resposta privada em cache |
| PWA-03 | Atualização durante checkout | Não recarrega no momento crítico |
| PWA-04 | iPhone/Android instalado e navegador | Instruções e permissões corretas conforme suporte real |
| PWA-05 | Logout/troca de usuário em dispositivo | Memória limpa, inscrição reassociada com segurança |
| PWA-06 | Reconexão perde eventos Realtime | Consulta completa recupera o estado atual |
| A11Y-01 | Teclado/leitor de tela/zoom | Ações utilizáveis, foco e mensagens claros |
| REP-01 | Reentrada e chamados não confirmados | Métricas não duplicam crianças; média informa denominador |
| INT-01 | Holyrics desativado | Zero chamadas de rede e nenhuma indicação falsa de conexão |
| INT-02 | Payload do contrato | Rejeita dados pessoais; somente código público permitido |
| SEC-01 | Bundle/logs/repositorio | Sem segredos, payload médico ou dados reais |
| SEC-02 | Restauração e retenção | Procedimento testado em ambiente autorizado antes de produção |

## Concorrência e falhas

Testes de invariantes usarão conexões independentes no banco; simular cliques sequenciais não demonstra segurança sob concorrência. Usar relógio controlado nos testes de prazo, evitando esperas reais longas. Provedores serão falsos por padrão; testes de rede reais só após autorização e com destinatários de teste autorizados.

## Critério de encerramento por fase

- Fase 1: documentos consistentes, links válidos, decisões abertas identificadas; testes/build marcados não aplicáveis.
- Fase 2: navegação e jornadas fictícias principais, verificação de tipos e build, revisão responsiva/acessível; nenhuma integração externa.
- Fase 3: migrations locais reproduzíveis, seed institucional e testes de isolamento, vínculos e privilégios aprovados em PGlite; falta homologação do runtime Supabase local.
- Fase 4: transações de presença/retirada, concorrência, chamados, ocorrência, auditoria e Realtime aprovados.
- Fase 5: testes de todos os resultados dos canais e escalonamento; envio real somente se autorizado.
- Fase 6: revisão PWA/cache, dispositivos disponíveis, build, jornadas e checklist de prontidão; lacunas registradas.

Registrar comando real, ambiente, resultado e limitações em cada entrega futura. Não declarar compatibilidade, conformidade, segurança total ou teste físico com base apenas em mocks ou emulação.
