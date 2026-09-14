# Permissões e Row Level Security

## Princípios

Negar por padrão. Autorizar por usuário autenticado, vínculo ativo com a unidade, papel e relação com o registro. Usuário não pode atribuir papel a si próprio por cadastro, metadata editável ou requisição direta.

RLS será habilitada em todas as tabelas expostas, acompanhada de grants mínimos. Tabelas de sessão, tarefas e segredos ficam em schema privado. Referência técnica: [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Matriz de acesso

| Recurso/ação | Responsável | Professora | Administrador da unidade |
| --- | --- | --- | --- |
| Perfil e contatos | Próprios; vínculos não revelam contatos de terceiros sem necessidade | Próprios; contato operacional dos responsáveis pela presença autorizada | Gestão dos cadastros da unidade |
| Crianças | Vinculadas; edição depende de `pode_gerenciar` | Crianças da turma/evento atribuídos | Cadastros da unidade |
| Cuidados especiais | Criança sob gestão | Apenas durante atendimento autorizado | Permissão específica de cuidado; papel administrativo sozinho não basta |
| Pessoas autorizadas | Gerenciar para criança sob gestão | Consultar durante retirada autorizada | Gestão na unidade com auditoria |
| Eventos e turmas | Ler opções publicadas da unidade | Ler eventos/turmas atribuídos | Criar, editar, abrir, encerrar |
| Check-in | Solicitar para vínculo com `pode_checkin` | Confirmar recebimento na turma | Consultar e executar exceções permitidas |
| Presentes | Apenas crianças vinculadas | Apenas turmas atribuídas | Unidade inteira |
| Chamados | Ler os destinados a si; responder | Criar/acompanhar na turma | Consultar na unidade conforme permissão |
| Ocorrências | Somente conteúdo explicitamente compartilhado com o vínculo autorizado | Criar/consultar conforme atribuição e validade | Permissão específica para detalhes restritos |
| Check-out | Solicitar se autorizado; obter sua credencial | Validar e concluir na turma | Exceção auditada conforme procedimento aprovado |
| Histórico | Operações das crianças vinculadas no escopo permitido | Turmas atribuídas e janela histórica aprovada | Unidade e retenção vigente |
| Notificações | Próprias, incluindo confirmação | Estado dos chamados sob sua responsabilidade | Estado e falhas da unidade |
| Dispositivos/preferências | Próprios | Próprios | Sem acesso bruto a endpoints/chaves de terceiros |
| Equipe/permissões | Nenhum | Consultar próprias atribuições | Gerenciar unidade; alterações auditadas |
| Auditoria | Não consultar tabela geral | Não consultar tabela geral | Permissão explícita de auditoria, com campos saneados |
| Integrações | Nenhum | Estado relevante da operação | Configuração não secreta e logs da unidade |
| Sessões/outbox/tarefas | Nenhum acesso direto | Nenhum acesso direto | Nenhum acesso direto por papel de interface |

O administrador pode receber permissões adicionais justificadas. A interface deve diferenciar permissão de gestão de cadastro, consulta de saúde, ocorrências e auditoria.

## Políticas planejadas

- `profiles`: próprio perfil; diretório mínimo da unidade por projeção segura quando necessário. Não expor todos os campos de Auth.
- `children`: SELECT por vínculo ativo de responsável, presença em turma atribuída ou permissão administrativa. INSERT cria criança e vínculo gestor atomicamente; UPDATE exige gestão e não permite trocar unidade.
- `child_guardians`: ninguém se associa por ID arbitrário. Convite validado ou ação administrativa auditada cria vínculo. Revogação não permite apagar auditoria.
- `child_care_information`: regras separadas das do cadastro. Professora precisa de atribuição vigente e contexto de atendimento; histórico comum não concede acesso permanente a saúde.
- `check_ins` e `check_outs`: leituras por escopo; mutações críticas somente pelas operações autorizadas. Não oferecer UPDATE genérico de status.
- `calls` e `incidents`: vínculo com presença e turma verificado no banco. Responsável não acessa ocorrência interna apenas por ser destinatário de chamado.
- `notification_recipients`: usuário lê apenas registros destinados a si. Painel da equipe usa projeção de status sem endpoints, chaves ou corpo sensível.
- `push_subscriptions`: criar/revogar via endpoint autenticado e validado; leitura de segredos somente pelo worker autorizado.
- `audit_logs`: INSERT pelo fluxo transacional, sem UPDATE/DELETE por usuários do aplicativo. Consulta por unidade e permissão.
- Configurações e motivos: escrita administrativa com `WITH CHECK` de unidade; interface não recebe referências secretas utilizáveis.

RLS controla linhas, não resolve sozinha exposição de colunas. Separar tabelas, grants e projeções para saúde, contatos, credenciais e logs. Políticas UPDATE precisam verificar tanto a linha antiga (`USING`) quanto a nova (`WITH CHECK`).

## Realtime

Não usar canais públicos para presença, chamados ou dados pessoais. Assinaturas e eventos respeitam a identidade do usuário e a unidade. Publicar preferencialmente IDs opacos e indicação de mudança; a interface consulta os detalhes autorizados.

Revogar atribuição ou vínculo deve interromper novos acessos, inclusive assinatura já aberta. Esse comportamento será testado explicitamente. Se um mecanismo de Realtime mantiver autorização antiga até reconectar, restringir payloads e implementar encerramento/renovação; não considerar o problema resolvido apenas com guardas de rota.

## Ações privilegiadas

MFA é recomendado para professoras e obrigatório proposto para administradores antes de uso real. O primeiro administrador será provisionado por procedimento controlado, nunca por cadastro público. Não existe superadministrador entre unidades na primeira versão.

Funções elevadas devem verificar identidade, papel, unidade, recursos e transição dentro da transação. Workers têm escopo de tarefa e não podem aceitar destinatário/payload arbitrário fornecido pelo navegador.

## Casos negativos obrigatórios

Troca de `unit_id`, acesso por UUID conhecido, criação de vínculo próprio indevido, autoelevação de papel, leitura de saúde por administrador sem permissão, professora revogada mantendo canal aberto, atualização direta de status, consulta de view que ignora RLS e requisição sem autenticação. A especificação completa está no [plano de testes](plano-de-testes.md).
