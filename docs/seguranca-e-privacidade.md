# Segurança e privacidade

## Finalidade e minimização

Coletar apenas o necessário para identificação operacional, cuidado e retirada. Dados de saúde e informações que revelem contexto religioso merecem avaliação específica. Não coletar CPF, fotos, documentos, geolocalização ou biometria por padrão.

O melhor interesse da criança deve orientar as decisões. Base legal não pode ser presumida apenas porque existe checkbox: mapear finalidade e hipótese aplicável por categoria, com validação jurídica antes do uso real. Referência: [enunciado da ANPD sobre crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).

Termos, ciência de privacidade, consentimento por finalidade quando aplicável e permissão técnica de notificações serão distintos. Não condicionar recursos essenciais à autorização de comunicação opcional. Retirada de consentimento requer análise do tratamento afetado, sem apagar automaticamente registros cuja retenção seja justificada.

## Ameaças e controles

| Ameaça | Controle planejado |
| --- | --- |
| Família lê criança alheia | RLS por vínculo, respostas mínimas e testes com IDs conhecidos |
| Professora acessa outra turma | Atribuição por evento/turma, validade, RLS e revogação Realtime |
| Administração cruza unidades | FKs compostas, contexto de unidade e ausência de superadmin implícito |
| Código adivinhado ou reutilizado | Aleatoriedade, assinatura/digest protegido, expiração, limites e consumo atômico |
| QR compartilhado com terceiro | Conferência presencial obrigatória de pessoa autorizada |
| Sessão roubada por armazenamento | Cookie HttpOnly, sessão no servidor e tokens curtos só em memória quando necessários |
| XSS e CSRF | Escape de conteúdo, sem HTML arbitrário, CSP e validação de origem/token CSRF |
| Abuso de chamados/login | Rate limit por ator/unidade/origem, cooldown, deduplicação e respostas não enumeráveis |
| Log ou push revela saúde | Templates discretos, redaction e logs por allowlist |
| Worker duplica envio | Outbox, lease, idempotência e classificação de resultado ambíguo |
| Apagamento de evidência | Auditoria sem mutação por usuário, backups e política de retenção |
| Dependência comprometida | Lockfile, revisão de dependências, CI e ausência de segredos no bundle |

## Navegador e endpoints

Não persistir dados pessoais, credenciais ou respostas autenticadas em Local Storage, IndexedDB, Cache Storage ou mecanismos de persistência de biblioteca. Sessão via cookie protegido conforme arquitetura; memória limpa no logout/troca de unidade.

Respostas autenticadas e endpoints de sessão usam `Cache-Control: no-store`; CDN e service worker não as armazenam. Políticas de referência evitam vazar identificadores em navegações externas. Códigos secretos não ficam em query strings, logs de acesso, URLs de analytics ou eventos de erro.

Validar tamanho, formato e semântica dos campos. Limitar texto livre, frequência de requisições e tentativas de retirada. Limites iniciais serão definidos a partir do fluxo e testados para não bloquear a equipe em rede compartilhada; evitar limitação exclusivamente por IP.

Chaves administrativas nunca chegam ao navegador. Separar secrets por ambiente, permitir rotação e não publicar `.env` real. Telas administrativas poderão acionar provisionamento seguro, mas não ler segredos existentes.

## Acesso e auditoria

Auditar check-in, recebimento, cancelamento, reemissão de credencial, check-out, exceções, chamados, ocorrências, alterações de permissões e configurações. Acesso a detalhes especialmente restritos também deve ter rastreabilidade proporcional, sem registrar o conteúdo visualizado.

Auditoria armazena ator, unidade, ação, entidade, horário, resultado e correlação. Revisões médicas pertencem ao domínio restrito de cuidados/ocorrências, não à tabela geral de logs. Operações negadas relevantes geram evento seguro sem revelar dados ao solicitante.

MFA para administração, timeout de sessão e procedimento de recuperação da equipe precisam ser validados. Não criar contas compartilhadas de professoras: autoria deve ser individual.

## Retenção e direitos

| Categoria | Política a fechar antes de produção |
| --- | --- |
| Cadastro e vínculos | Enquanto necessários ao vínculo ativo; revisão após inatividade e atendimento de solicitações |
| Saúde/cuidados | Revisão frequente, atualização pela família e redução quando cessar a necessidade |
| Presenças/retiradas | Prazo justificado para segurança e histórico, seguido de anonimização quando possível |
| Ocorrências | Prazo específico conforme finalidade e necessidade, com acesso mais restrito |
| Consentimentos | Evidência pelo período juridicamente necessário, com versão do texto |
| Tentativas e logs técnicos | Prazo curto definido por necessidade operacional; erros saneados |
| Sessões e tokens | Expiração curta/revogação; remoção segura após validade operacional |
| Credenciais de retirada | Invalidar na saída; remover material de validação conforme prazo técnico mínimo |
| Backups | Janela definida, acesso restrito e expiração que alcance dados excluídos |

Não inventar um prazo universal. Responsável institucional e assessoria jurídica devem aprovar a tabela final. Exclusão lógica é reversível e útil à operação, mas não satisfaz sozinha uma solicitação legítima de eliminação.

Pedidos de acesso, correção e exclusão exigem confirmação da identidade e registro de análise/resposta. Definir responsável institucional, canal, prazos aplicáveis e procedimento quando houver múltiplos responsáveis ou divergência sobre vínculo.

## Continuidade e incidentes

Backups e restauração serão testados antes de uso real; RPO/RTO dependem do plano escolhido e precisam ser acordados. Nunca restaurar dados de produção em desenvolvimento.

Em falha de rede, a aplicação informa indisponibilidade e não inventa sucesso. A igreja precisa de procedimento presencial de recebimento/retirada e reconciliação posterior, com autoria e indicação de registro posterior. A ferramenta não autoriza liberar criança sem conferência durante falhas.

Em suspeita de acesso indevido: revogar sessões/credenciais, preservar evidências mínimas, conter o acesso, avaliar impacto e seguir procedimento institucional/jurídico de comunicação quando aplicável. Nenhum envio a terceiros ou órgão será automatizado nesta fase.
