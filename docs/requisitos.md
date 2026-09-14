# Requisitos e critérios de aceite

## Objetivo e escopo

Organizar a operação da Escolinha durante cultos e eventos, permitindo saber quem está presente, qual equipe está responsável e quem pode retirar cada criança. A versão inicial funcional abrange as fases 1 a 6; a Fase 2 isolada será somente um protótipo.

O produto terá três áreas autenticadas: responsável, professora e administração. Uma mesma pessoa poderá exercer mais de um perfil em uma unidade. A unidade é o limite de isolamento de dados e permissões.

## Requisitos verificáveis

| ID | Requisito | Critério de aceite da versão funcional |
| --- | --- | --- |
| RF-01 | Acesso público e autenticação | QR público abre a unidade; usuário pode cadastrar conta, entrar, sair e recuperar acesso sem expor existência de contas |
| RF-02 | Cadastro do responsável | Telefone e e-mail podem ser confirmados/atualizados conforme mecanismo definido; operações restritas exigem sessão válida |
| RF-03 | Crianças e vínculos | Responsável cria e edita crianças sob sua gestão; outro usuário não consegue ler nem alterar esses registros |
| RF-04 | Cuidados especiais | Alergias, medicamentos e necessidades ficam disponíveis somente a pessoas autorizadas, separados de logs e notificações |
| RF-05 | Retirada autorizada | Cada criança tem pessoas autorizadas com validade e revogação; autorização para retirar não concede acesso à conta |
| RF-06 | Consentimentos | Versão do documento, finalidade, manifestação e data são registradas separadamente de permissão de push |
| RF-07 | Estrutura | Administração gerencia eventos, salas, turmas, faixas etárias, capacidade e equipe da unidade |
| RF-08 | Check-in | Backend valida regras e impede duas presenças ativas da mesma criança no mesmo evento, inclusive sob concorrência |
| RF-09 | Comprovante | Mostra criança, turma/sala, horário e código público; credencial de retirada é obtida apenas em contexto autenticado autorizado |
| RF-10 | Painel da professora | Lista e pesquisa crianças da turma autorizada, mostra alertas necessários e diferencia solicitação de presença confirmada |
| RF-11 | Chamados | Professora abre chamado, escolhe motivo e acompanha resposta sem criar duplicata por duplo clique |
| RF-12 | Resposta | Responsável destinatário visualiza detalhes e confirma recebimento ou informa que está a caminho |
| RF-13 | Ocorrências | Equipe registra ocorrência vinculada à presença; correções preservam histórico e acesso restrito |
| RF-14 | Check-out | Código válido e confirmação presencial de pessoa autorizada precedem a conclusão única e auditada |
| RF-15 | Notificações | Notificação interna, push e e-mail complementar têm tentativas, erros saneados e estados distintos do chamado |
| RF-16 | Realtime | Mudanças autorizadas atualizam painéis; reconexão reconcilia o estado com o backend |
| RF-17 | Administração | Gerencia equipe/permissões, desativa cadastros e consulta auditoria respeitando a unidade |
| RF-18 | Histórico e relatórios | Consulta por período com filtros autorizados e métricas definidas, sem exportação obrigatória |
| RF-19 | PWA | Manifesto, ícones, instalação orientada, offline seguro, atualização controlada e estados de permissão funcionam em plataformas testadas |
| RF-20 | Integrações futuras | Contrato, configuração e logs previstos; Holyrics desativado e sem chamadas reais |
| RF-21 | Privacidade | Solicitações de atualização/exclusão têm acompanhamento; retenção é definida antes de uso real |

## Inventário de telas

| Área | Telas previstas |
| --- | --- |
| Pública | Inicial por unidade/QR, login, cadastro, recuperação e redefinição de acesso, termos, privacidade |
| Responsável | Início, meus filhos, cadastro/edição da criança, pessoas autorizadas, seleção do evento/check-in, comprovante, chamado e resposta, retirada, histórico, preferências, instalação, perfil |
| Professora | Login compartilhado, seleção de evento/turma, presentes e busca, detalhes/cuidados, chamado, ocorrência, acompanhamento dos canais, validação de retirada, histórico autorizado |
| Administração | Dashboard, eventos, salas/turmas, professoras, permissões, responsáveis, crianças, autorizados, presenças, histórico, ocorrências, notificações, relatórios, e-mail, push, integração futura, logs, configurações |

Login não será duplicado por perfil: a autorização após login determina as áreas disponíveis. Guardas de rota servem à experiência; o backend aplica as permissões.

## Requisitos não funcionais

- Interface em português do Brasil, responsiva, com navegação inferior para responsáveis e ações urgentes facilmente acessíveis.
- Estados de carregamento, vazio, erro, sucesso, conexão perdida e sessão expirada.
- Meta de acessibilidade WCAG 2.2 AA; foco visível, navegação por teclado, rótulos, mensagens compreensíveis e alvos de toque amplos.
- Nenhum dado pessoal, médico ou credencial de retirada em cache persistente do aplicativo.
- Backend valida entradas, autorização e transições; horário do servidor é a referência.
- Operações críticas online, idempotentes e transacionais, com auditoria na mesma transação.
- Segredos exclusivamente no backend; logs sem senhas, tokens, códigos secretos ou textos médicos.
- Ambiente de desenvolvimento isolado, fixtures fictícias e verificação de build a partir da existência de aplicação.
- Meta de desempenho será definida com volume e conectividade reais previstos, sem inventar capacidade garantida.

## Relatórios e definições

| Indicador | Definição proposta |
| --- | --- |
| Crianças por culto | Crianças distintas com recebimento confirmado no evento; exibir total de entradas separadamente se houver reentrada |
| Quantidade por sala/faixa | Agrupar pela sala e faixa no momento da presença, preservando histórico após alterações cadastrais |
| Ainda presentes | Check-ins em `present` ou `pickup_requested` |
| Horários | Entrada solicitada, recebimento confirmado e saída efetiva, apresentados no fuso da unidade |
| Chamados enviados | Chamados distintos com ao menos uma tentativa aceita por um provedor, separados dos apenas internos |
| Chamados confirmados | Chamados com confirmação explícita; informar denominador e período |
| Tempo médio de resposta | Intervalo entre criação e primeira confirmação, somente dos confirmados; informar quantidade sem resposta |
| Falhas e canais | Tentativas falhas por canal e notificações sem sucesso; não contar cada retentativa como um chamado novo |
| Ocorrências | Quantidade por período e categoria com acesso restrito ao detalhamento |

## Fora da primeira versão

Integração real com Holyrics, exportação PDF/CSV, biometria, reconhecimento facial, pagamento, operação crítica offline e armazenamento de fotos/documentos sem necessidade validada.
