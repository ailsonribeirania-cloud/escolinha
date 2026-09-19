# Holyrics — contrato e conector local

## Limite desta fase

O conector local foi criado em `holyrics-connector/`, permanece desligado por padrão e não usa a API Online. A migration de projeção está versionada, mas não foi aplicada automaticamente. O guia operacional está em [conector-holyrics-local.md](conector-holyrics-local.md).

## Separação do fluxo principal

Chamados produzem eventos de domínio na outbox. Uma integração futura poderá consumir evento elegível sem alterar a criação, confirmação ou finalização do chamado. Falha ou computador desconectado não interrompe push, e-mail, painel ou retirada.

Com a flag desativada, não haverá tarefa de envio real. A interface administrativa poderá mostrar “Integração futura — desativada”, sem simular conexão ou sucesso.

## Contrato TypeScript proposto

```ts
type IntegrationStatus =
  | 'disabled'
  | 'pending'
  | 'awaiting_approval'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'unknown'
  | 'expired'
  | 'hidden';

type ConnectionStatus = 'unknown' | 'connected' | 'disconnected';
type DisplayMode = 'automatic' | 'media_approval';

interface HolyricsConfiguration {
  unitId: string;
  enabled: boolean; // default false; ativação real somente na Fase 7
  mode: DisplayMode;
  durationSeconds: number;
  secretReference?: string; // somente no backend
}

interface PublicAlert {
  publicCode: string;
  expiresAt: string;
  durationSeconds: number;
  mode: DisplayMode;
}

interface IntegrationContext {
  integrationId: string;
  idempotencyKey: string;
  correlationId: string;
}

interface IntegrationResult {
  status: IntegrationStatus;
  connectionStatus: ConnectionStatus;
  commandId?: string;
  sentAt?: string;
  connectionObservedAt?: string;
  errorCode?: string;
}

interface PublicAlertIntegration {
  publish(alert: PublicAlert, context: IntegrationContext): Promise<IntegrationResult>;
  hide(commandId: string, context: IntegrationContext): Promise<IntegrationResult>;
}
```

Somente `PublicAlert` poderá ser convertido em mensagem visível. O contexto é técnico e interno; IDs de criança, nome, sala, motivo e dados médicos não fazem parte do contrato. O adaptador construirá o texto a partir de template fixo, sem aceitar mensagem arbitrária da interface.

Exemplo permitido: “ESCOLINHA — Responsável pelo código E-127, favor comparecer à recepção.” `E-127` é apenas ilustração; o formato real deve ter espaço suficiente para não reutilizar códigos entre eventos e impedir associação por sequência previsível.

## Código público

Código aleatório sem derivação de nome, telefone, data de nascimento ou ID. Registro de unicidade impede reatribuição futura. Vale apenas no evento/presença atual e expira na saída. Ele não autoriza consultas públicas de identidade e não serve para retirada.

Antes de enviar e antes de aprovar uma exibição atrasada, verificar chamado aberto, presença ativa e validade. No check-out/finalização, cancelar tarefas futuras e solicitar ocultação quando houver comando ativo. Se o computador estiver offline, registrar impossibilidade; não declarar alerta ocultado sem evidência suficiente.

## Ações a avaliar na Fase 7

- `SetAlert`: candidato para exibição automática.
- `ShowCustomMessageStandalone`: candidato para solicitação com aprovação do operador.

Esses nomes vêm do requisito do projeto. Não foram validados aqui quanto a assinatura, parâmetros, garantias de aprovação ou semântica de ocultação. A Fase 7 verificará documentação oficial e capacidade real antes de implementar.

## Configuração e logs

`integration_settings` terá provider, unidade, enabled=false, modo, duração e referência secreta apenas no servidor. UI recebe uma projeção sem segredo. Limites de duração e permissões serão validados no backend.

`integration_logs` registra evento interno, código público, comando lógico, tentativa, estado, horário de envio, observação de conexão e erro saneado. `sent` significa comando aceito/enviado conforme evidência disponível, não prova de exibição física na TV. Desconexão e resultado desconhecido são estados distintos.

Reenvio exige autorização, validade atual e deduplicação. Retentativas são limitadas; alertas vencidos nunca são reenviados por simples retorno da conexão.

## Conectividade e credenciais

API Server possivelmente estará em rede local. Avaliar agente local com conexão de saída autenticada ou mecanismo seguro equivalente; não pressupor abertura de porta pública. Validar TLS, origem dos comandos, proteção contra replay e disponibilidade do computador.

API Key e token ficam exclusivamente no backend/agente protegido, com permissões mínimas para as ações aprovadas. Não gravar tokens em configuração pública, frontend ou logs. Indisponibilidade permanece isolada do domínio principal.
