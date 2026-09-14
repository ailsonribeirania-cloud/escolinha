# Escolinha — PWA do ministério infantil

Sistema planejado para cadastro de famílias, organização de eventos e turmas, presença das crianças, chamados aos responsáveis e retirada segura.

## Estado do projeto

Há uma aplicação React/TypeScript navegável com dados inteiramente fictícios em memória. Ela cobre as jornadas de responsáveis, professoras e administração, incluindo check-in, recebimento, chamados, retirada com credencial temporária e configurações de privacidade.

O repositório também contém o backend preparado, migrations Supabase, worker de notificações e adaptadores de e-mail, push e Holyrics. Esses recursos permanecem desativados ou sem configuração por padrão; a demonstração não envia dados, não persiste informações pessoais e não chama serviços externos.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Requisitos](docs/requisitos.md) | Escopo, telas e critérios de aceite |
| [Arquitetura](docs/arquitetura.md) | Componentes, sessões, ambientes e decisões técnicas |
| [Modelo de dados](docs/modelo-de-dados.md) | Entidades, relações, restrições e índices |
| [Permissões e RLS](docs/permissoes-e-rls.md) | Matriz de acesso e regras do backend |
| [Fluxos operacionais](docs/fluxos-operacionais.md) | Estados, transações e exceções |
| [Notificações](docs/notificacoes.md) | Canais, fila, retentativas e acompanhamento |
| [Segurança e privacidade](docs/seguranca-e-privacidade.md) | Proteção, consentimentos, retenção e contingência |
| [PWA](docs/pwa.md) | Instalação, cache, offline e atualização |
| [Holyrics](docs/integracoes-holyrics.md) | Contrato futuro, sem integração real |
| [Plano de testes](docs/plano-de-testes.md) | Casos de aceite, segurança e validação |
| [Roadmap](docs/roadmap.md) | Entregas e limites de cada fase |
| [Decisões pendentes](docs/decisoes-pendentes.md) | Propostas e validações necessárias |

## Como executar e revisar

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. A aplicação inicia em modo demonstrativo; alterne o perfil no menu para percorrer as jornadas.

Para validar o projeto:

```sh
npm run check
npm run test:e2e
```

Para validar o banco localmente, com Docker disponível:

```sh
supabase start
supabase db reset
supabase db lint --local
```

O `supabase/seed.sql` cria somente duas unidades, documentos fictícios e configurações padrão. Contas, crianças e contatos usados nos testes são criados em fixtures isoladas; nenhuma credencial real deve ser adicionada ao seed.

O backend local, usado apenas ao configurar a fase funcional, pode ser iniciado com `npm run dev:server`. Copie `.env.example` para `.env` e mantenha os segredos somente no ambiente servidor. Não habilite notificações, e-mail ou Holyrics sem a aprovação e a configuração correspondentes.

Os diagramas usam Mermaid. Os documentos também podem ser lidos como Markdown sem renderizar os diagramas.

## Limites de autorização

- Implementar uma fase por vez e aguardar autorização antes da seguinte.
- Não executar migrations em produção sem autorização específica.
- Não chamar serviços externos reais sem autorização. Consultar documentação pública não é enviar dados operacionais a um serviço.
- Não utilizar dados reais de crianças em desenvolvimento, testes, demonstrações ou capturas de tela.
- Holyrics real está reservado à Fase 7 e exige autorização específica.

As decisões propostas neste conjunto de documentos não substituem validação operacional ou jurídica onde indicada.
