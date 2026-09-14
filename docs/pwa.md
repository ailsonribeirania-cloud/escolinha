# PWA, experiência e acessibilidade

## Identidade provisória

Interface acolhedora e limpa, com base clara, azul/verde predominante e acentos quentes. Tokens de cor, tipografia, espaçamento, raio e elevação permitirão substituir a identidade sem refazer telas. Cores finais serão validadas por contraste; não presumir acessibilidade de uma paleta apenas por aparência.

Responsável terá navegação inferior com início, crianças, chamados e perfil. Retirada e check-in aparecem no contexto da criança. Professora terá lista de presentes, busca visível, alertas de cuidado e ações de chamado/retirada a poucos passos. Administração terá navegação lateral no desktop e alternativa compacta no celular.

Alertas não dependerão apenas de cor ou som. Modais gerenciam foco e retorno ao acionador; formulários têm rótulos, erros associados e resumo quando necessário. Usar animações discretas e respeitar preferência por movimento reduzido.

## Instalação

Manifesto incluirá nome, short_name, id estável, start_url pública, scope, display standalone, theme_color, background_color e ícones adequados, incluindo maskable. Ícones e marca serão provisórios, sem dados pessoais.

Exibir orientação de instalação contextual. Onde houver evento de instalação suportado, oferecer botão após ação do usuário; em outras plataformas, mostrar instrução manual. Não simular prompt nativo nem solicitar repetidamente após recusa.

Para iOS/iPadOS, planejar instruções de adicionar à tela inicial e solicitar push a partir de interação na aplicação instalada em versões compatíveis. Não prometer o mesmo comportamento em todos os navegadores internos de aplicativos. Referências: [WebKit: Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) e [Apple: envio de Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers?language=objc).

A matriz exata de versões suportadas será confirmada na implementação e no teste físico; suporte documentado não substitui teste em dispositivo.

## Matriz de cache

| Recurso | Estratégia |
| --- | --- |
| JS/CSS/fontes/ícones públicos versionados | Precache explícito com revisão por build |
| Página offline e instruções públicas | Cache de conteúdo seguro e versionado |
| Documento público de termos/privacidade | Versão identificada; backend exige versão vigente para novos aceites |
| Navegação de interface | Shell público sem dados embutidos; offline apresenta bloqueio das ações críticas |
| APIs autenticadas, Auth, BFF e funções | Network only e `no-store`, sem fallback de dados antigos |
| Dados de crianças/saúde/ocorrências | Somente memória durante sessão autorizada |
| QR e comprovantes de retirada | Sem persistência, sem download automático e sem cache |
| Storage privado | Sem cache persistente no aplicativo; respostas e URLs restritas |

Não registrar rotas amplas de runtime cache que capturem Supabase, BFF ou APIs. Não persistir TanStack Query. Limpar caches antigos por versão sem apagar uma operação em andamento.

## Offline e reconexão

Página offline explica a ausência de conexão e orienta procurar a equipe. `navigator.onLine` é apenas indício: sucesso depende da resposta do backend. Botões críticos ficam indisponíveis quando a operação não puder ser confirmada.

Não usar Background Sync para check-in, check-out ou chamados. Não guardar comandos críticos para enviá-los silenciosamente depois. Se houve timeout, consultar o recurso pela chave de idempotência antes de nova ação.

Na reconexão, renovar sessão se possível, reabrir assinaturas e consultar estado atual. Mostrar indicador de atualização e evitar apresentar uma lista antiga como se fosse confirmada.

## Atualização de versão

Nova versão gera aviso “Atualização disponível”. Não recarregar durante leitura de QR, envio ou confirmação. Ativação ocorre em momento seguro com recuperação de estado no backend. Caso exista incompatibilidade crítica de API, orientar atualização obrigatória antes de nova operação, preservando informação sobre resultado pendente.

Bundles estáticos são versionados; backend deve suportar transição controlada entre clientes antigos e novos. Não executar `skipWaiting` com reload indiscriminado no meio de uma retirada.

## Push e som

Permissão solicitada depois de explicação e clique. Estados: não suportado, não solicitado, permitido, bloqueado, inscrição ausente/inválida. Preferência do usuário no banco é distinta da permissão local do navegador.

Push abre rota autenticada, sem autorização por URL. Logout revoga a associação da inscrição com a sessão/conta no dispositivo compartilhado e impede exposição de novas mensagens dessa conta; login de outra pessoa não herda a inscrição sem associação explícita.

Som do painel é habilitado por interação da professora. Interface informa se está desativado e mantém alerta visual. Falha de push ou falta de instalação não elimina notificações internas.

## Verificação prevista

Testar Android e iPhone físicos, navegador e modo instalado, permissão negada, sessão expirada, troca de usuário, rede lenta, offline, retorno da conexão e atualização durante fluxo. Inspecionar Cache Storage, IndexedDB, Local Storage, cabeçalhos e tráfego para confirmar ausência de dados sensíveis persistidos. Se não houver dispositivo disponível, registrar lacuna; emulação não será descrita como teste físico.
