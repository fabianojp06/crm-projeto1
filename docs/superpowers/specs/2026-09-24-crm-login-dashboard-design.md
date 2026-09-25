# CRM com Login e Dashboard — Design

**Data:** 2026-09-24
**Status:** aguardando revisão

## 1. Objetivo

Sistema web de estudo: o usuário cria uma conta, faz login e acessa um dashboard de CRM
com visão geral, cadastro de clientes e funil de vendas (kanban).

**Critérios de sucesso**
- Cadastro, login, logout e proteção de rotas funcionando.
- Cada usuário vê e altera somente os próprios dados (garantido pelo banco via RLS).
- CRUD de clientes e funil com arrastar-e-soltar persistindo no banco.
- Projeto publicável na Vercel e compreensível para quem está estudando.

**Premissas:** dados de exemplo (não é uso real); autenticação por e-mail e senha;
confirmação de e-mail desligada no Supabase.

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Autenticação e banco | Supabase (Auth + Postgres), biblioteca `@supabase/ssr` |
| UI | Tailwind CSS + shadcn/ui |
| Gráfico | componente Chart do shadcn (Recharts) |
| Arrastar e soltar | dnd-kit |
| Validação | Zod |
| Testes | Vitest (unidade), Playwright (ponta a ponta) |
| Deploy | Vercel |

**Abordagem:** Server Components para leitura de dados e Server Actions para todas as
escritas. Não há API REST própria. O `proxy.ts` (antigo `middleware.ts`, renomeado no
Next.js 16) protege as rotas.

**Variáveis de ambiente**
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: usadas pelo app.
- `SUPABASE_SERVICE_ROLE_KEY`: usada **só** pelos testes E2E para limpeza. Nunca com prefixo
  `NEXT_PUBLIC_` e nunca configurada na Vercel.

## 3. Páginas e navegação

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | todos | redireciona para `/dashboard` (que manda para `/login` se não houver sessão) |
| `/login` | visitante | e-mail, senha, link para cadastro |
| `/cadastro` | visitante | nome, e-mail, senha |
| `/dashboard` | logado | 4 cards de indicadores + gráfico de barras |
| `/dashboard/clientes` | logado | tabela com busca; criar/editar em modal; excluir com confirmação |
| `/dashboard/funil` | logado | kanban de negócios com 5 colunas |

O layout de `/dashboard` tem menu lateral (Visão geral, Clientes, Funil) e topo com o nome
do usuário e o botão "Sair".

## 4. Fluxo de autenticação

1. Cadastro: `supabase.auth.signUp` com `options.data.nome`; o usuário é logado e
   redirecionado para `/dashboard`.
2. `proxy.ts` (export `proxy`), executado antes de cada rota, segue o padrão `updateSession`
   do `@supabase/ssr`:
   - cria o `createServerClient` com `cookies.getAll`/`setAll` lendo da `request` e
     escrevendo na `response`, e devolve essa mesma `response` (é assim que a sessão é
     renovada);
   - valida o usuário com `supabase.auth.getClaims()`, nunca com `getSession()`;
   - rota `/dashboard/*` sem sessão → redireciona para `/login`;
   - `/login` ou `/cadastro` com sessão → redireciona para `/dashboard`;
   - `matcher` exclui `_next/static`, `_next/image`, `favicon.ico` e arquivos de imagem.
3. Defesa em profundidade: `dashboard/layout.tsx` e **toda** Server Action também obtêm o
   usuário com `getClaims()`. Sem usuário, o layout redireciona para `/login` e a action
   devolve o erro "Sessão expirada, faça login novamente". O RLS continua sendo a garantia
   final sobre os dados.
4. "Sair" encerra a sessão e redireciona para `/login`.
5. A sessão fica em cookies gerenciados pelo `@supabase/ssr`, com um cliente para o servidor
   e outro para o navegador em `lib/supabase/`.

## 5. Estrutura de pastas

```
app/
  (auth)/login/page.tsx
  (auth)/cadastro/page.tsx
  dashboard/layout.tsx
  dashboard/page.tsx
  dashboard/clientes/page.tsx
  dashboard/funil/page.tsx
  dashboard/error.tsx
lib/supabase/            clientes Supabase (server.ts, client.ts, proxy.ts com updateSession)
lib/metrics.ts           cálculo dos indicadores (função pura)
lib/schemas.ts           schemas Zod
components/ui/           componentes shadcn
components/crm/          componentes do CRM (tabela, formulários, kanban, cards)
app/page.tsx             redireciona para /dashboard
app/error.tsx            erro genérico para o que escapar do layout do dashboard
proxy.ts
supabase/migrations/     SQL de tabelas, RLS e trigger
tests/unit/, tests/e2e/
```

## 6. Banco de dados

### `profiles`
| campo | tipo | regra |
|---|---|---|
| `id` | uuid PK | referencia `auth.users(id)`, `on delete cascade` |
| `nome` | text | not null |

### `clientes`
| campo | tipo | regra |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid | not null, default `auth.uid()`, referencia `auth.users(id)` `on delete cascade` |
| `nome` | text | not null |
| `email` | text | opcional |
| `telefone` | text | opcional |
| `empresa` | text | opcional |
| `created_at` | timestamptz | default `now()` |

Restrição extra: `unique (id, user_id)`, usada pela FK composta de `negocios`.

### `negocios`
| campo | tipo | regra |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid | not null, default `auth.uid()`, referencia `auth.users(id)` `on delete cascade` |
| `cliente_id` | uuid | not null |
| `titulo` | text | not null |
| `valor` | numeric(12,2) | not null, `>= 0` |
| `etapa` | text | not null, check em (`contato`, `proposta`, `negociacao`, `fechado`, `perdido`) |
| `posicao` | int | not null |
| `created_at` | timestamptz | default `now()` |

Restrição extra: FK composta `(cliente_id, user_id) references clientes(id, user_id)
on delete cascade`. Assim um negócio **só pode** apontar para um cliente do mesmo dono. A
checagem de FK ignora o RLS, então sem essa restrição daria para ligar um negócio ao cliente
de outro usuário.

**Índices:** `clientes(user_id)`, `negocios(user_id, etapa, posicao)`, `negocios(cliente_id)`.

### Segurança (RLS)
- RLS ligado nas três tabelas. Todas as políticas usam `to authenticated` e
  `(select auth.uid())`.
- `clientes` e `negocios`: política para select/insert/update/delete com
  `user_id = (select auth.uid())` (em `using` e em `with check`).
- `profiles`: só select/update com `id = (select auth.uid())`. A ausência de insert/delete é
  **intencional**: o trigger cria a linha e o cascade a remove.

### Automação
- Função `public.handle_new_user()` com `security definer set search_path = ''` e nomes
  qualificados (`public.profiles`), disparada por um trigger `after insert on auth.users`.
- O nome vem de `coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))`,
  para que usuários criados pelo painel ou pela API de admin não quebrem o cadastro.

## 7. Telas do CRM

**Visão geral** — indicadores calculados por `lib/metrics.ts`:
- Total de clientes.
- Negócios em aberto: etapa diferente de `fechado` e `perdido`.
- Valor em aberto: soma de `valor` dos negócios em aberto.
- Valor ganho: soma de `valor` dos negócios em `fechado`.
- Gráfico de barras: soma de `valor` por etapa, mostrando as 5 etapas (inclusive as zeradas
  e "Perdido") na mesma ordem do kanban.

Sem dados (zero clientes **e** zero negócios): mensagem de estado vazio e botão "Gerar dados
de exemplo". A Server Action insere 10 clientes num único insert, depois 15 negócios num
único insert usando os ids retornados, distribuídos entre as etapas, com `posicao` definida
explicitamente (0, 1, 2… dentro de cada etapa). O botão fica desabilitado
durante o envio, e a action não faz nada se a conta já tiver clientes.

**Clientes:** tabela ordenada por nome, com busca por nome feita no servidor
(`?q=` em `searchParams` + `ilike`). Os modais de criar e editar usam o mesmo formulário. Ao
excluir, a confirmação avisa que os negócios do cliente também serão excluídos.

**Funil:** 5 colunas na ordem Contato → Proposta → Negociação → Fechado → Perdido, cada uma
com o total em R$ no topo. Os cards mostram título, nome do cliente e valor em BRL.
- **Ordem:** a consulta usa `order by posicao, created_at`.
- **Arrastar:** vale mover entre colunas e reordenar dentro da mesma coluna. Ao soltar, a tela
  se atualiza na hora (atualização otimista) e é chamada a Server Action
  `moverNegocio(id, etapaDestino, idsOrdenadosDestino[])`. Ela chama a função SQL
  `public.mover_negocio` (`security invoker`, portanto sujeita ao RLS), que numa única
  transação atualiza a `etapa` do negócio e renumera `posicao` (0..n-1) de **todas** as
  linhas da coluna de destino: primeiro os ids na ordem recebida, depois qualquer outro
  negócio da coluna que não veio na lista (por exemplo, criado em outra aba), em
  `posicao, created_at`. Assim nunca ficam duas posições iguais. A coluna de origem não é
  renumerada: os buracos não afetam a ordem.
- **Novo negócio:** modal com título, valor, cliente (select) e etapa inicial. Entra no fim
  da coluna: `posicao = coalesce(max(posicao), -1) + 1` (em coluna vazia, `max` é nulo e o
  resultado é 0). Se não houver clientes, o modal mostra "Cadastre um
  cliente primeiro" com link para `/dashboard/clientes`.
- **Editar e excluir:** clicar no card abre o mesmo formulário preenchido, com o botão
  "Excluir" (que pede confirmação).

**Atualização da tela:** toda Server Action que escreve chama `revalidatePath` na rota
afetada e em `/dashboard`, para que os indicadores fiquem sempre corretos.

## 8. Validação e tratamento de erros

- Schemas Zod em `lib/schemas.ts`, aplicados nas Server Actions. Os erros por campo voltam
  para o formulário.
  - Cliente: `nome` obrigatório; `email` em formato válido quando informado.
  - Negócio: `titulo` obrigatório; `valor` entre 0 e 9.999.999.999,99; `etapa` dentro da
    lista; `cliente_id` uuid.
  - **Valor:** campo de texto convertido por `parseValorBRL(texto)` em `lib/schemas.ts`,
    uma função pura, antes de passar pelo Zod. Os espaços e o prefixo "R$" são removidos, e
    só estes formatos são aceitos:
    - vazio → erro "Valor é obrigatório". Nunca vira 0;
    - só dígitos: `1500` → 1500;
    - vírgula decimal, com ou sem ponto de milhar em grupos de 3: `1500,5`, `1.500,50`,
      `1.500` → 1500,5 / 1500,50 / 1500;
    - ponto decimal com 1 ou 2 casas e sem vírgula: `1500.5`, `1500.50` → 1500,5 / 1500,50;
    - qualquer outra coisa → erro "Valor inválido. Use o formato 1.500,50".

    Um ponto seguido de exatamente 3 dígitos é tratado como milhar (`1.500` = 1500), nunca
    como decimal. Assim nenhuma entrada é multiplicada em silêncio.
  - Cadastro: `nome` obrigatório; `email` válido; `senha` com no mínimo 6 caracteres.
- Os erros do Supabase Auth são traduzidos pelo `error.code`, não pela mensagem em inglês:
  `invalid_credentials` → "E-mail ou senha incorretos"; `user_already_exists` → "Este e-mail
  já está cadastrado". Qualquer outro código vira uma mensagem genérica.
- Se a movimentação no kanban falhar, o card volta à posição anterior e aparece um toast de
  erro.
- `dashboard/error.tsx` (componente `'use client'`) mostra uma mensagem amigável e o botão
  "Tentar novamente", que chama `reset()`. Ele só cobre as **páginas** do dashboard, não o
  `dashboard/layout.tsx`. Por isso:
  - o layout não lança erro: sem usuário, redireciona para `/login`; se a busca do perfil
    falhar, mostra o e-mail no lugar do nome;
  - um `app/error.tsx` com a mesma mensagem cobre qualquer erro que escape do layout.

## 9. Testes

**Vitest (unidade)**
- `lib/metrics.ts`: lista vazia, mistura de etapas, soma de valores decimais.
- `lib/schemas.ts`: casos válidos e inválidos de cada schema; `parseValorBRL` com todos os
  formatos da seção 8, incluindo vazio, `1.500`, `1500.50`, `1.500,50` e entradas inválidas.

**Playwright (ponta a ponta)**

*Ambiente:* Supabase local (`supabase start`, com as migrations de `supabase/migrations/`
aplicadas), para não esbarrar no limite de cadastros do projeto na nuvem nem acumular lixo.
- E-mails únicos por execução: `e2e+<timestamp>-<n>@exemplo.com`.
- `globalSetup` cria os usuários A e B pela API de admin (com `nome` no metadado) e salva o
  `storageState` de cada um. Os testes que não são de cadastro reutilizam esse estado.
- `globalTeardown` lista os usuários com `auth.admin.listUsers` e apaga com
  `auth.admin.deleteUser` **todos** cujo e-mail começa com `e2e+`. Isso inclui o usuário
  criado pela tela no cenário 1, e também sobras de execuções interrompidas. Usa
  `SUPABASE_SERVICE_ROLE_KEY`. O cascade remove perfis, clientes e negócios.

*Cenários:*
1. Cadastro pela tela → dashboard → sair → volta para `/login`.
2. Acesso a `/dashboard` sem sessão → redireciona para `/login`.
3. Criar cliente, criar negócio e mover o negócio de etapa; depois de recarregar a página,
   ele continua na nova etapa.
4. Isolamento: o usuário A cria um cliente; o usuário B não vê esse cliente, e uma tentativa
   de B de criar um negócio apontando para o cliente de A é recusada pelo banco.

## 10. Fora do escopo

Login social, recuperação de senha, confirmação de e-mail, equipes e dados compartilhados,
histórico de atividades, exportação CSV, tema escuro configurável.
