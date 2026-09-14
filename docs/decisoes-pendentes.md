# Decisões e validações pendentes

A autorização recebida foi para executar a Fase 1 documental. Recomendações abaixo orientam o desenho, mas não representam aprovação automática de políticas operacionais, contratação, publicação ou uso real.

## Arquitetura de referência

React/TypeScript/Vite, React Router, Tailwind, Supabase, sessão protegida por servidor no mesmo domínio, Web Push e adaptador de e-mail Resend compõem a proposta. Versões e compatibilidade serão verificadas na implementação. Sem dados reais, serviços pagos ou Holyrics ativo no protótipo.

## Decisões abertas

| ID | Tema | Recomendação | Quem valida / quando |
| --- | --- | --- | --- |
| D-01 | Unidades | Uma unidade inicial, isolamento preparado desde o banco | Administração / antes da Fase 3 |
| D-02 | Presença física | Solicitação pelo responsável e recebimento pela equipe | Coordenação / antes da Fase 4; protótipo demonstra essa proposta |
| D-03 | Sessão | BFF com cookie protegido, refresh token no servidor e Realtime em memória | Responsável técnico / teste técnico na Fase 3 |
| D-04 | Vínculo familiar compartilhado | Convite validado e permissões por vínculo; disputa tratada pela administração | Coordenação / antes da Fase 3 |
| D-05 | Contato do evento | Escolher responsável de contato no check-in; alternativa explicitamente autorizada | Coordenação / antes da Fase 4 |
| D-06 | Turmas e vagas | Faixas em meses, limites sem sobreposição, vagas incluindo solicitações pendentes | Coordenação / antes da Fase 3/4 |
| D-07 | Pendência de recebimento | Expiração configurável e cancelamento pela equipe | Coordenação / antes da Fase 4 |
| D-08 | Reentrada/transferência | Reentrada gera novo registro; transferência depende de comando específico se necessária | Coordenação / antes da Fase 4 |
| D-09 | Identificação na retirada | Conferência presencial da pessoa autorizada, sem guardar cópia de documento por padrão | Coordenação / antes da Fase 4 |
| D-10 | Retirada sem credencial | Exceção restrita, motivo e auditoria; definir quem pode aprovar | Coordenação / antes da Fase 4 |
| D-11 | Códigos | Público aleatório e nunca reatribuído; segredo distinto, curto prazo e uso único | Responsável técnico / antes da Fase 4 |
| D-12 | Chamados duplicados | Um ativo por criança/ocorrência; geral ativo reutilizado quando não há incidente | Coordenação / antes da Fase 4 |
| D-13 | Escalonamento | Prazos configuráveis; 2/5 minutos apenas para simulação | Coordenação / antes da Fase 5 |
| D-14 | Urgências | Procedimento presencial que não aguarde confirmação digital | Coordenação / antes do piloto |
| D-15 | Ocorrências/saúde | Acesso específico; compartilhar com família apenas conteúdo autorizado | Coordenação e assessoria jurídica / antes da Fase 4 |
| D-16 | Histórico da professora | Janela por atribuição; revogação impede acesso futuro a cuidados | Coordenação / antes da Fase 3/4 |
| D-17 | Consentimento e retenção | Finalidade/base legal por categoria, prazo aprovado, tratamento de pedidos e backups | Responsável institucional e assessoria jurídica / antes de uso real |
| D-18 | Fotos/documentos | Não coletar inicialmente | Coordenação / se surgir necessidade |
| D-19 | MFA e recuperação | MFA para administradores; avaliar equipe e recuperação sem conta compartilhada | Coordenação / antes do piloto |
| D-20 | Infraestrutura/custos | Vercel + Supabase; validar limites, região, orçamento e domínio | Administração / antes de provisionar serviços reais |
| D-21 | E-mail e push reais | Remetente/domínio e dispositivos autorizados de homologação | Administração / antes de ativar os canais |
| D-22 | Rede e contingência | Procedimento presencial e reconciliação auditada | Coordenação / antes do piloto |
| D-23 | Backup e disponibilidade | Definir volume, concorrência, RPO/RTO e testar restauração | Administração e responsável técnico / antes de produção |
| D-24 | Holyrics | Investigar conectividade local e ações oficiais somente na fase autorizada | Mídia e responsável técnico / Fase 7 |
| D-25 | Encerramento de evento | Impedir encerramento normal com crianças presentes; exceção explicitamente auditada | Coordenação / antes da Fase 4 |
| D-26 | Documentos institucionais | Texto provisório identificado como rascunho; versão final e canal de privacidade aprovados | Igreja e assessoria jurídica / antes de uso real |

## O que não bloqueia o protótipo

Nome/logotipo final, cores oficiais, domínio, provedor contratado, prazos definitivos de retenção e configuração real de envio podem permanecer pendentes na Fase 2. Usar identidade provisória e dados fictícios, com propostas claramente identificadas.

Decisões que afetam segurança operacional precisam estar resolvidas antes do respectivo fluxo funcional/piloto. Não transformar uma escolha visual do protótipo em política de retirada aprovada.

## Fontes consultadas na proposta

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Supabase: sessões](https://supabase.com/docs/guides/auth/sessions).
- [Supabase: autenticação avançada](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
- [WebKit: Web Push em iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
- [Apple: envio de Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers?language=objc).
- [ANPD: tratamento de dados de crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).

Essas referências fundamentam a proposta; não substituem revisão de versões na implementação ou análise jurídica. Nenhuma garantia sobre ações do Holyrics foi inferida sem verificar a documentação na Fase 7.
