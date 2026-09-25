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
| Framework | Next.js (App Router), TypeScript |
| Autenticação e banco | Supabase (Auth + Postgres), biblioteca `@supabase/ssr` |
| UI | Tailwind CSS + shadcn/ui |
| Gráfico | componente Chart do shadcn (Recharts) |
| Arrastar e soltar | dnd-kit |
| Validação | Zod |
| Testes | Vitest (unidade), Playwright (ponta a ponta) |
| Deploy | Vercel |

**Abordagem:** Server Components para leitura de dados e Server Actions para todas as
escritas. Não há API REST própria. O middleware protege as rotas.

## 3. Páginas e navegação

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/login` | visitante | e-mail, senha, link para cadastro |
| `/cadastro` | visitante | nome, e-mail, senha |
| `/dashboard` | logado | 4 cards de indicadores + gráfico de barras |
| `/dashboard/clientes` | logado | tabela com busca; criar/editar em modal; excluir com confirmação |
| `/dashboard/funil` | logado | kanban de negócios com 5 colunas |

O layout de `/dashboard` tem menu lateral (Visão geral, Clientes, Funil) e topo com o nome
do usuário e o botão "Sair".

## 4. Fluxo de autenticação

1. Cadastro: o Supabase cria a conta, o usuário é logado e redirecionado para `/dashboard`.
2. Middleware (`middleware.ts`), executado antes de cada rota:
   - rota `/dashboard/*` sem sessão → redireciona para `/login`;
   - `/login` ou `/cadastro` com sessão → redireciona para `/dashboard`.
3. "Sair" encerra a sessão e redireciona para `/login`.
4. A sessão fica em cookies gerenciados pelo `@supabase/ssr`, com um cliente para o servidor
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
lib/supabase/            clientes Supabase (server.ts, client.ts, middleware.ts)
lib/metrics.ts           cálculo dos indicadores (função pura)
lib/schemas.ts           schemas Zod
components/ui/           componentes shadcn
components/crm/          componentes do CRM (tabela, formulários, kanban, cards)
middleware.ts
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
| `user_id` | uuid | not null, default `auth.uid()`, referencia `auth.users(id)` |
| `nome` | text | not null |
| `email` | text | opcional |
| `telefone` | text | opcional |
| `empresa` | text | opcional |
| `created_at` | timestamptz | default `now()` |

### `negocios`
| campo | tipo | regra |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid | not null, default `auth.uid()` |
| `cliente_id` | uuid | not null, referencia `clientes(id)`, `on delete cascade` |
| `titulo` | text | not null |
| `valor` | numeric(12,2) | not null, `>= 0` |
| `etapa` | text | not null, check em (`contato`, `proposta`, `negociacao`, `fechado`, `perdido`) |
| `posicao` | int | not null, default 0 |
| `created_at` | timestamptz | default `now()` |

### Segurança (RLS)
- RLS ligado nas três tabelas.
- `clientes` e `negocios`: política para select/insert/update/delete com `user_id = auth.uid()`
  (em `using` e em `with check`).
- `profiles`: select/update com `id = auth.uid()`.

### Automação
- Trigger em `auth.users` (after insert) cria a linha em `profiles`, com `nome` vindo de
  `raw_user_meta_data->>'nome'`, que é enviado no cadastro.

## 7. Telas do CRM

**Visão geral** — indicadores calculados por `lib/metrics.ts`:
- Total de clientes.
- Negócios em aberto: etapa diferente de `fechado` e `perdido`.
- Valor em aberto: soma de `valor` dos negócios em aberto.
- Valor ganho: soma de `valor` dos negócios em `fechado`.
- Gráfico de barras: soma de `valor` por etapa.

Sem dados: mensagem de estado vazio e botão "Gerar dados de exemplo", uma Server Action que
insere 10 clientes e 15 negócios, distribuídos entre as etapas, para o usuário logado.

**Clientes:** tabela com busca por nome, filtrada na página. Os modais de criar e editar
usam o mesmo formulário. Ao excluir, a confirmação avisa que os negócios do cliente também
serão excluídos.

**Funil:** 5 colunas na ordem Contato → Proposta → Negociação → Fechado → Perdido, cada uma
com o total em R$ no topo. Os cards mostram título, nome do cliente e valor em BRL. Ao soltar
um card, a tela se atualiza na hora (atualização otimista) e uma Server Action salva a `etapa`
e renumera `posicao` na coluna de destino. O modal "Novo negócio" tem título, valor, cliente
(select) e etapa inicial.

## 8. Validação e tratamento de erros

- Schemas Zod em `lib/schemas.ts`, aplicados nas Server Actions. Os erros por campo voltam
  para o formulário.
  - Cliente: `nome` obrigatório; `email` em formato válido quando informado.
  - Negócio: `titulo` obrigatório; `valor` ≥ 0; `etapa` dentro da lista; `cliente_id` uuid.
  - Cadastro: `nome` obrigatório; `email` válido; `senha` com no mínimo 6 caracteres.
- Os erros do Supabase Auth são traduzidos para português ("E-mail ou senha incorretos",
  "Este e-mail já está cadastrado"); qualquer outro erro vira uma mensagem genérica.
- Se a movimentação no kanban falhar, o card volta à posição anterior e aparece um toast de
  erro.
- `dashboard/error.tsx` mostra uma mensagem amigável e o botão "Tentar novamente".

## 9. Testes

**Vitest (unidade)**
- `lib/metrics.ts`: lista vazia, mistura de etapas, soma de valores decimais.
- `lib/schemas.ts`: casos válidos e inválidos de cada schema.

**Playwright (ponta a ponta)**, contra um projeto Supabase de desenvolvimento:
1. Cadastro → dashboard → sair → volta para `/login`.
2. Acesso a `/dashboard` sem sessão → redireciona para `/login`.
3. Criar cliente, criar negócio e mover o negócio de etapa; depois de recarregar a página,
   ele continua na nova etapa.
4. Isolamento: o usuário A cria um cliente; o usuário B loga e não vê esse cliente.

## 10. Fora do escopo

Login social, recuperação de senha, confirmação de e-mail, equipes e dados compartilhados,
histórico de atividades, exportação CSV, tema escuro configurável.
