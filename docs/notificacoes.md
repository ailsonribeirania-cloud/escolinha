# Notificações e processamento assíncrono

## Canais e privacidade

1. Notificação interna persistida no backend.
2. Push enviado logo após o registro do chamado.
3. E-mail complementar após prazo sem confirmação, conforme preferências e política operacional.
4. Orientação visual para ligação caso continue sem resposta.
5. Painel da professora com atualização Realtime e som ativado por interação.

Mensagem proposta: “Olá, [nome do responsável]. A equipe da Escolinha solicita sua presença. Por favor, dirija-se até a recepção.” Para tela bloqueada, oferecer versão sem nome. Nunca incluir criança, sala, motivo médico ou credencial de retirada. Link abre uma rota autenticada; possuir o link não concede acesso.

Não usar pixel de rastreamento de e-mail como prova de visualização. Visualização é registrada na área autenticada e confirmação depende de ação explícita.

## Estados independentes

| Objeto | Estados/informações |
| --- | --- |
| Chamado | open, viewed, acknowledged, on_the_way, finalized, cancelled |
| Tarefa | pending, processing, retry_scheduled, completed, cancelled, dead_letter |
| Tentativa | pending, sending, accepted, delivered quando comprovável, failed, unknown, skipped |
| Destinatário | disponibilização, visualização, confirmação e timestamps |
| Dispositivo | ativo, revogado, inscrição inválida, permissão desconhecida/bloqueada quando observável |

`accepted` significa aceitação pelo provedor. Push padrão não oferece recibo universal de entrega ao aparelho. `unknown` representa timeout ou resultado ambíguo, sem inventar falha ou sucesso. Status de permissão observado em um dispositivo não descreve todos os dispositivos do responsável.

## Fluxo persistente

Criar chamado, notificação interna e outbox na mesma transação. Worker agendado busca tarefas vencidas com bloqueio e lease. Ao assumir uma tarefa, revalida estado do chamado, destinatário, inscrição, preferências e prazo. Envia fora da transação longa e registra resultado de forma idempotente.

Após confirmação/finalização, tarefas futuras são canceladas. Uma requisição já entregue ao provedor pode não ser cancelável; esse limite deve ser refletido no histórico.

Os tempos de espera são configurações da unidade, não constantes da interface. Proposta para simulação: e-mail após 2 minutos e indicação de ligação após 5 minutos desde a criação. São exemplos de demonstração, não protocolo aprovado ou promessa de atendimento. Para urgência, a equipe deve agir presencialmente sem esperar.

## Retentativa e prevenção de duplicidade

- Chave de deduplicação por chamado, destinatário, canal, dispositivo e etapa de escalonamento.
- Lease com expiração recupera trabalho após queda do worker. Worker antigo não pode concluir tarefa reassumida sem verificar propriedade/versionamento.
- Backoff com variação aleatória, limite de tentativas e horizonte máximo; prazos exatos serão configurados e testados.
- Respeitar limitação do provedor e `Retry-After` quando fornecido.
- Erro permanente de inscrição revoga endpoint; erro temporário permite nova tentativa.
- Reenvio manual tem cooldown, autorização e auditoria; reutiliza o chamado.
- Múltiplos cliques e múltiplos workers não criam tarefas iguais.
- Idempotência do provedor será usada quando disponível; timeout após aceitação pode ainda causar envio duplicado. Nunca prometer exatamente uma entrega externa.
- Fila de falhas finais visível à administração, com reprocessamento controlado.

## Contratos planejados

`EmailProvider.send()` recebe destinatário obtido no servidor, chave/versão do template, parâmetros permitidos e chave de idempotência; retorna resultado normalizado e ID do provedor. Adaptador Resend implementará o contrato na Fase 5. Nenhum texto livre vindo do navegador será enviado diretamente por esse endpoint.

`PushProvider.send()` recebe inscrição válida, payload discreto e identificador de tentativa; classifica sucesso aceito, falha permanente, temporária ou ambígua. Segredo VAPID fica somente no backend. Chave VAPID pública pode ser disponibilizada ao cliente.

Simuladores implementarão os mesmos resultados: sucesso, demora, inscrição inválida, limitação, falha definitiva e timeout ambíguo. Testes não enviarão mensagens a pessoas reais.

Webhooks de e-mail, quando habilitados, exigem verificação de assinatura, janela temporal, deduplicação de evento e tratamento de chegada fora de ordem. ID de mensagem do provedor não basta para autenticar callback.

## Dados de acompanhamento

Relacionar chamado, criança por referência, destinatário, autora, motivo restrito, canal, dispositivo quando aplicável, número da tentativa e timestamps. Armazenar erro saneado/código do provedor, sem corpo completo, credencial ou contato desnecessário no log.

Painel mostra linha do tempo por chamado, resposta do responsável e tentativas por canal. Uma falha de um dispositivo não deve apresentar o chamado inteiro como falho se outro canal foi aceito. Falta de recibo é “entrega não confirmada”, não “não entregue”.

## Configuração externa futura

Antes de ativar envio real: autorização do usuário, ambiente de homologação, remetente/domínio verificado, DNS requerido pelo provedor, segredos de backend, endpoint de webhook validado, VAPID e dispositivos de teste autorizados. `.env.example` apenas documentará nomes. Configuração administrativa mostra estado de prontidão e dados públicos, nunca devolve segredos.
