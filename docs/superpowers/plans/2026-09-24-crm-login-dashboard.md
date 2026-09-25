# CRM com Login e Dashboard — Plano de Implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** construir um app web de estudo em que o usuário cria conta, faz login e usa um CRM próprio, com visão geral, clientes e um funil kanban com arrastar e soltar.

**Arquitetura:** Next.js 16 (App Router), com Server Components para ler dados e Server Actions para toda escrita. O Supabase cuida do login (cookies via `@supabase/ssr`) e do Postgres. O isolamento por usuário é garantido pelo banco, com RLS e uma FK composta. O `proxy.ts` protege as rotas, e as páginas e actions checam o usuário de novo. As regras de negócio ficam em funções puras em `lib/`, testadas com Vitest. As regras do banco (RLS, trigger, funções SQL) são testadas contra o Supabase local. O fluxo completo é testado com Playwright.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), Recharts (via chart do shadcn), dnd-kit, Zod 4, Supabase (`@supabase/ssr`, `@supabase/supabase-js`, Supabase CLI), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-24-crm-login-dashboard-design.md`. Leia a spec junto com este plano: ela é a fonte das regras, e este plano diz como implementá-las.

## Restrições globais

- Framework: **Next.js 16** (App Router). O arquivo de rotas protegidas é `proxy.ts` com `export async function proxy`, **nunca** `middleware.ts`.
- Variáveis do app: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` é usada **só** em testes (`tests/db`, `tests/e2e`). Nunca com prefixo `NEXT_PUBLIC_`, nunca importada em `app/`, `components/` ou `lib/`, nunca configurada na Vercel.
- O usuário é validado com `supabase.auth.getClaims()`, **nunca** com `getSession()`.
- Etapas, nesta ordem: `contato`, `proposta`, `negociacao`, `fechado`, `perdido`. Rótulos: Contato, Proposta, Negociação, Fechado, Perdido.
- Ordenação de negócios: sempre `posicao, created_at, id`.
- `valor`: `numeric(12,2)`, de 0 a 9.999.999.999,99.
- Senha: mínimo de 6 caracteres.
- Textos da interface em português do Brasil. As mensagens fixas estão copiadas da spec e devem ser usadas exatamente como aparecem:
  - "Sessão expirada, faça login novamente"
  - "Este negócio não existe mais"
  - "Não foi possível mover o negócio, tente de novo"
  - "E-mail ou senha incorretos"
  - "Este e-mail já está cadastrado"
  - "Valor é obrigatório"
  - "Valor inválido. Use o formato 1.500,50"
  - "Cadastre um cliente primeiro"
- Toda Server Action que escreve chama `revalidatePath` em `/dashboard`, `/dashboard/clientes` e `/dashboard/funil`.
- Pré-requisitos da máquina: Node.js 22 ou mais novo, e **Docker Desktop rodando**, que o Supabase local exige.

## Foco da revisão

Situações que a spec implica e que uma pessoa usando o sistema vai encontrar. Cada uma tem teste na tarefa indicada.

1. **A pessoa erra um campo do formulário.** Ela espera ver o erro sem perder o que já digitou nos outros campos. Teste E2E na Tarefa 14.
2. **A pessoa arrasta um card para uma coluna vazia.** O card deve ficar lá e ganhar `posicao` 0. Testes unitários em `aplicarMovimento`/`localizarDestino` (Tarefa 12) e teste de banco em `mover_negocio` (Tarefa 5).
3. **A pessoa solta o card no mesmo lugar de onde saiu.** Nada deve ser gravado e nenhuma action deve ser chamada. Teste unitário de `aplicarMovimento`, que retorna `null` (Tarefa 12).
4. **A pessoa exclui um cliente que tem negócios.** Os negócios somem junto. Teste de banco do cascade (Tarefa 4).
5. **Uma pessoa já logada abre `/login` ou `/cadastro`.** Ela é levada ao dashboard. Teste unitário de `decidirRota` (Tarefa 6).

---

## Mapa de arquivos

```
app/
  layout.tsx                      (modificado) lang pt-BR + <Toaster/>
  page.tsx                        (substituído) redirect('/dashboard')
  error.tsx                       erro global
  (auth)/layout.tsx               moldura centralizada das telas públicas
  (auth)/actions.ts               entrar, cadastrar, sair
  (auth)/login/page.tsx
  (auth)/cadastro/page.tsx
  dashboard/layout.tsx            menu lateral + topo (nome, Sair)
  dashboard/error.tsx
  dashboard/actions.ts            gerarDadosExemplo
  dashboard/page.tsx              visão geral
  dashboard/clientes/actions.ts   salvarCliente, excluirCliente
  dashboard/clientes/page.tsx
  dashboard/funil/actions.ts      salvarNegocio, excluirNegocio, moverNegocio
  dashboard/funil/page.tsx
components/
  ui/*                            gerados pelo shadcn
  auth/form-login.tsx
  auth/form-cadastro.tsx
  crm/campo.tsx                   Label + Input + erro
  crm/tela-erro.tsx               usado pelos dois error.tsx
  crm/menu-lateral.tsx
  crm/confirmar-exclusao.tsx      AlertDialog reutilizável
  crm/cards-indicadores.tsx
  crm/grafico-etapas.tsx
  crm/estado-vazio.tsx
  crm/busca-clientes.tsx
  crm/tabela-clientes.tsx
  crm/form-cliente.tsx
  crm/kanban.tsx
  crm/coluna-kanban.tsx
  crm/card-negocio.tsx
  crm/form-negocio.tsx
lib/
  etapas.ts                       ETAPAS, Etapa, ROTULO_ETAPA
  format.ts                       formatarBRL, formatarNumeroBR
  schemas.ts                      parseValorBRL, escaparBusca, schemas Zod
  acoes.ts                        EstadoForm, lerCampos, mensagens fixas
  metrics.ts                      calcularIndicadores, somarValores
  kanban.ts                       NegocioCard, agruparPorEtapa, localizarDestino, aplicarMovimento, mensagemErroMover
  tipos.ts                        Cliente
  auth/erros.ts                   traduzirErroAuth
  auth/rotas.ts                   decidirRota
  supabase/client.ts
  supabase/server.ts              createClient, obterUsuario, exigirUsuario
  supabase/proxy.ts               updateSession
proxy.ts
supabase/config.toml              (gerado)
supabase/migrations/20260924000000_crm.sql
tests/unit/*.test.ts
tests/db/env.ts, tests/db/helpers.ts, tests/db/*.test.ts
tests/e2e/helpers.ts, auth.setup.ts, global-teardown.ts, *.spec.ts
vitest.config.mts
playwright.config.ts
.env.example
README.md
```

---

### Tarefa 1: Estrutura do projeto e ferramentas de teste

**Arquivos:**
- Criar: todo o esqueleto do Next.js (via CLI), `vitest.config.mts`, `.env.example`
- Modificar: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Consome: nada.
- Produz:
  - alias `@/*` → raiz do projeto;
  - `npm test` (Vitest, projeto `unit`), `npm run test:db` (Vitest, projeto `db`), `npm run test:e2e` (Playwright);
  - componentes shadcn em `components/ui/`;
  - `cn()` em `lib/utils.ts`.

- [ ] **Passo 1: Criar o app Next.js na pasta atual**

A pasta já tem `docs/` e `.git/`, e o `create-next-app` aceita os dois.

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
```

Esperado: termina com "Success!", e `app/page.tsx`, `app/layout.tsx` e `package.json` existem. Confira em `package.json` que `next` está em `16.x`.

- [ ] **Passo 2: Instalar as dependências**

```bash
npm i @supabase/supabase-js @supabase/ssr zod @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm i -D vitest @playwright/test dotenv supabase
npx playwright install chromium
```

- [ ] **Passo 3: Inicializar o shadcn e adicionar os componentes**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card table dialog alert-dialog sonner chart badge
```

Se o CLI perguntar qual biblioteca de primitivas usar, escolha **Radix UI**, porque este plano usa `asChild`. Esperado: arquivos em `components/ui/` e `lib/utils.ts` com `cn`.

- [ ] **Passo 4: Configurar o Vitest com dois projetos**

Crie `vitest.config.mts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/db/env.ts'],
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
```

- [ ] **Passo 5: Scripts, `.gitignore` e `.env.example`**

Em `package.json`, dentro de `"scripts"`, acrescente as linhas abaixo e mantenha `dev`, `build`, `start` e `lint`:

```json
"test": "vitest run --project unit",
"test:db": "vitest run --project db",
"test:e2e": "playwright test"
```

Acrescente ao fim de `.gitignore`:

```
# testes
/test-results
/playwright-report
/tests/e2e/.auth
# supabase
/supabase/.temp
/supabase/.branches
```

Crie `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=cole-aqui-a-publishable-key
# Só para testes (tests/db e tests/e2e). Nunca usar no app nem na Vercel.
SUPABASE_SERVICE_ROLE_KEY=cole-aqui-a-service-role-key
```

- [ ] **Passo 6: Verificar**

```bash
npx vitest run --project unit --passWithNoTests
npm run build
```

Esperado: o Vitest sai com código 0 ("No test files found"), e o build termina sem erro.

- [ ] **Passo 7: Commit**

```bash
git add -A
git commit -m "chore: estrutura Next.js 16 com shadcn, Vitest e Playwright"
```

---

### Tarefa 2: Etapas, formatação e parser de valor

**Arquivos:**
- Criar: `lib/etapas.ts`, `lib/format.ts`
- Criar: `lib/schemas.ts`, só `parseValorBRL` e `escaparBusca` nesta tarefa
- Teste: `tests/unit/format.test.ts`, `tests/unit/valor.test.ts`

**Interfaces:**
- Produz:
  - `ETAPAS: readonly ['contato','proposta','negociacao','fechado','perdido']`
  - `type Etapa`
  - `ROTULO_ETAPA: Record<Etapa, string>`
  - `formatarBRL(n: number): string`, por exemplo "R$ 1.500,50" (com espaço não separável)
  - `formatarNumeroBR(n: number): string`, por exemplo "1.500,50"
  - `type ResultadoValor = { ok: true; valor: number } | { ok: false; erro: string }`
  - `parseValorBRL(texto: string): ResultadoValor`
  - `escaparBusca(q: string): string`

- [ ] **Passo 1: Escrever os testes que falham**

`tests/unit/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ETAPAS, ROTULO_ETAPA } from '@/lib/etapas';
import { formatarBRL, formatarNumeroBR } from '@/lib/format';

const semNbsp = (s: string) => s.replace(/\s/g, ' ');

describe('etapas', () => {
  it('estão na ordem do kanban', () => {
    expect(ETAPAS).toEqual(['contato', 'proposta', 'negociacao', 'fechado', 'perdido']);
    expect(ETAPAS.map((e) => ROTULO_ETAPA[e])).toEqual([
      'Contato', 'Proposta', 'Negociação', 'Fechado', 'Perdido',
    ]);
  });
});

describe('formatarBRL', () => {
  it('formata em reais com duas casas', () => {
    expect(semNbsp(formatarBRL(1500.5))).toBe('R$ 1.500,50');
    expect(semNbsp(formatarBRL(0))).toBe('R$ 0,00');
  });
});

describe('formatarNumeroBR', () => {
  it('formata sem símbolo, para preencher o campo de valor', () => {
    expect(formatarNumeroBR(1500.5)).toBe('1.500,50');
    expect(formatarNumeroBR(3)).toBe('3,00');
  });
});
```

`tests/unit/valor.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { escaparBusca, parseValorBRL } from '@/lib/schemas';

const ok = (valor: number) => ({ ok: true, valor });

describe('parseValorBRL', () => {
  it.each([
    ['1500', 1500],
    ['1500,5', 1500.5],
    ['1.500,50', 1500.5],
    ['1.500', 1500],
    ['2.500', 2500],
    ['0,50', 0.5],
    ['1500.5', 1500.5],
    ['1500.50', 1500.5],
    ['0.50', 0.5],
    ['0', 0],
    ['R$ 1.234.567,89', 1234567.89],
    ['  12,3  ', 12.3],
  ])('aceita %s', (texto, esperado) => {
    expect(parseValorBRL(texto)).toEqual(ok(esperado));
  });

  it.each(['', '   ', 'R$'])('vazio (%j) é obrigatório, nunca vira 0', (texto) => {
    expect(parseValorBRL(texto)).toEqual({ ok: false, erro: 'Valor é obrigatório' });
  });

  it.each(['0.500', '01.500', '1,999', '1.50,5', '1.5000', 'abc', '-10', '1,2,3', '12.34.56'])(
    'rejeita %s',
    (texto) => {
      expect(parseValorBRL(texto)).toEqual({
        ok: false,
        erro: 'Valor inválido. Use o formato 1.500,50',
      });
    },
  );
});

describe('escaparBusca', () => {
  it('escapa \\, % e _', () => {
    expect(escaparBusca('50%_off\\x')).toBe('50\\%\\_off\\\\x');
  });
  it('mantém texto comum', () => {
    expect(escaparBusca('Ana Souza')).toBe('Ana Souza');
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode: `npm test`
Esperado: FAIL com "Failed to resolve import '@/lib/etapas'".

- [ ] **Passo 3: Implementar**

`lib/etapas.ts`:

```ts
export const ETAPAS = ['contato', 'proposta', 'negociacao', 'fechado', 'perdido'] as const;

export type Etapa = (typeof ETAPAS)[number];

export const ROTULO_ETAPA: Record<Etapa, string> = {
  contato: 'Contato',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};
```

`lib/format.ts`:

```ts
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatarBRL(n: number): string {
  return moeda.format(n);
}

export function formatarNumeroBR(n: number): string {
  return numero.format(n);
}
```

`lib/schemas.ts`:

```ts
// Formatos aceitos para o campo de valor (spec, seção 8).
const RE_BR = /^(0|[1-9]\d*|[1-9]\d{0,2}(\.\d{3})+)(,\d{1,2})?$/;
const RE_PONTO = /^(0|[1-9]\d*)\.\d{1,2}$/;

export type ResultadoValor = { ok: true; valor: number } | { ok: false; erro: string };

export function parseValorBRL(texto: string): ResultadoValor {
  const limpo = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (limpo === '') return { ok: false, erro: 'Valor é obrigatório' };
  if (RE_PONTO.test(limpo)) return { ok: true, valor: Number(limpo) };
  if (RE_BR.test(limpo)) {
    return { ok: true, valor: Number(limpo.replace(/\./g, '').replace(',', '.')) };
  }
  return { ok: false, erro: 'Valor inválido. Use o formato 1.500,50' };
}

// Escapa os curingas do ILIKE. O `*` não é tratado: limitação aceita na spec.
export function escaparBusca(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}
```

- [ ] **Passo 4: Rodar e ver passar**

Rode: `npm test`
Esperado: PASS em todos os testes de `format.test.ts` e `valor.test.ts`.

- [ ] **Passo 5: Commit**

```bash
git add lib/etapas.ts lib/format.ts lib/schemas.ts tests/unit
git commit -m "feat: etapas, formatação BRL e parser de valor"
```

---

### Tarefa 3: Schemas Zod, estado de formulário, indicadores e erros de login

**Arquivos:**
- Modificar: `lib/schemas.ts`, acrescentando os schemas
- Criar: `lib/acoes.ts`, `lib/metrics.ts`, `lib/auth/erros.ts`, `lib/tipos.ts`
- Teste: `tests/unit/schemas.test.ts`, `tests/unit/metrics.test.ts`, `tests/unit/erros.test.ts`

**Interfaces:**
- Consome: `ETAPAS`, `Etapa`, `ROTULO_ETAPA`, `parseValorBRL`.
- Produz:
  - `clienteSchema`: saída `{ nome: string; email: string|null; telefone: string|null; empresa: string|null }`
  - `negocioSchema`: saída `{ titulo: string; valor: number; etapa: Etapa; cliente_id: string }`
  - `loginSchema` → `{ email; senha }`; `cadastroSchema` → `{ nome; email; senha }`
  - `moverSchema` → `{ id: string; etapa: Etapa; ids: string[] }`
  - `errosDeCampo(erro: z.ZodError): Record<string, string[] | undefined>`
  - `type EstadoForm = { ok: boolean; mensagem?: string; erros?: Record<string, string[] | undefined>; valores?: Record<string, string> }`
  - `ESTADO_INICIAL: EstadoForm`
  - `lerCampos(fd: FormData, nomes: readonly string[]): Record<string, string>`
  - mensagens fixas: `SESSAO_EXPIRADA`, `NEGOCIO_NAO_EXISTE`, `FALHA_MOVER`
  - `type Indicadores`; `calcularIndicadores(totalClientes: number, negocios: { etapa: Etapa; valor: number }[]): Indicadores`
  - `somarValores(valores: number[]): number`
  - `traduzirErroAuth(codigo?: string): string`
  - `type Cliente = { id: string; nome: string; email: string|null; telefone: string|null; empresa: string|null }`

- [ ] **Passo 1: Escrever os testes que falham**

`tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lerCampos } from '@/lib/acoes';
import {
  cadastroSchema, clienteSchema, errosDeCampo, loginSchema, moverSchema, negocioSchema,
} from '@/lib/schemas';

const U1 = '3f1e9c2a-8b7d-4c1e-9a2b-1c2d3e4f5a6b';
const U2 = '7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d';

describe('clienteSchema', () => {
  it('aceita só o nome e converte opcionais vazios em null', () => {
    const r = clienteSchema.parse({ nome: '  Ana ', email: '', telefone: '', empresa: '' });
    expect(r).toEqual({ nome: 'Ana', email: null, telefone: null, empresa: null });
  });
  it('exige nome', () => {
    const r = clienteSchema.safeParse({ nome: '  ', email: '', telefone: '', empresa: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).nome).toEqual(['Nome é obrigatório']);
  });
  it('valida e-mail quando informado', () => {
    const r = clienteSchema.safeParse({ nome: 'Ana', email: 'ana@', telefone: '', empresa: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).email).toEqual(['E-mail inválido']);
  });
});

describe('negocioSchema', () => {
  const base = { titulo: 'Site', valor: '1.500,50', etapa: 'contato', cliente_id: U1 };
  it('converte o valor pelo parseValorBRL', () => {
    expect(negocioSchema.parse(base)).toEqual({ ...base, valor: 1500.5 });
  });
  it('valor vazio é obrigatório', () => {
    const r = negocioSchema.safeParse({ ...base, valor: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).valor).toEqual(['Valor é obrigatório']);
  });
  it('rejeita valor acima do máximo', () => {
    const r = negocioSchema.safeParse({ ...base, valor: '10.000.000.000,00' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).valor).toEqual(['Valor máximo é 9.999.999.999,99']);
  });
  it('aceita o valor máximo', () => {
    expect(negocioSchema.parse({ ...base, valor: '9.999.999.999,99' }).valor).toBe(9999999999.99);
  });
  it('rejeita etapa desconhecida, título vazio e cliente ausente', () => {
    const r = negocioSchema.safeParse({ titulo: '', valor: '1', etapa: 'ganho', cliente_id: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = errosDeCampo(r.error);
      expect(e.titulo).toEqual(['Título é obrigatório']);
      expect(e.etapa).toEqual(['Etapa inválida']);
      expect(e.cliente_id).toEqual(['Selecione um cliente']);
    }
  });
});

describe('login e cadastro', () => {
  it('cadastro exige nome, e-mail válido e senha de 6+', () => {
    const r = cadastroSchema.safeParse({ nome: '', email: 'x', senha: '12345' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = errosDeCampo(r.error);
      expect(e.nome).toEqual(['Nome é obrigatório']);
      expect(e.email).toEqual(['E-mail inválido']);
      expect(e.senha).toEqual(['A senha precisa ter pelo menos 6 caracteres']);
    }
  });
  it('login aceita credenciais preenchidas', () => {
    expect(loginSchema.parse({ email: 'a@b.com', senha: 'x' })).toEqual({ email: 'a@b.com', senha: 'x' });
  });
});

describe('moverSchema', () => {
  it('aceita lista única que contém o id', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U2, U1] }).success).toBe(true);
  });
  it('rejeita ids repetidos', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U1, U2, U1] }).success).toBe(false);
  });
  it('rejeita lista sem o id movido', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U2] }).success).toBe(false);
  });
  it('rejeita item que não é uuid', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U1, 'x'] }).success).toBe(false);
  });
});

describe('lerCampos', () => {
  it('lê strings e usa "" para ausentes', () => {
    const fd = new FormData();
    fd.set('nome', 'Ana');
    expect(lerCampos(fd, ['nome', 'email'])).toEqual({ nome: 'Ana', email: '' });
  });
});
```

`tests/unit/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calcularIndicadores, somarValores } from '@/lib/metrics';

describe('calcularIndicadores', () => {
  it('lista vazia zera tudo e mostra as 5 etapas', () => {
    const r = calcularIndicadores(0, []);
    expect(r).toMatchObject({ totalClientes: 0, negociosAbertos: 0, valorAberto: 0, valorGanho: 0 });
    expect(r.porEtapa.map((p) => [p.etapa, p.rotulo, p.valor])).toEqual([
      ['contato', 'Contato', 0],
      ['proposta', 'Proposta', 0],
      ['negociacao', 'Negociação', 0],
      ['fechado', 'Fechado', 0],
      ['perdido', 'Perdido', 0],
    ]);
  });

  it('separa abertos, ganhos e perdidos', () => {
    const r = calcularIndicadores(3, [
      { etapa: 'contato', valor: 100 },
      { etapa: 'proposta', valor: 200 },
      { etapa: 'negociacao', valor: 300 },
      { etapa: 'fechado', valor: 1000 },
      { etapa: 'perdido', valor: 5000 },
    ]);
    expect(r.totalClientes).toBe(3);
    expect(r.negociosAbertos).toBe(3);
    expect(r.valorAberto).toBe(600);
    expect(r.valorGanho).toBe(1000);
    expect(r.porEtapa.find((p) => p.etapa === 'perdido')?.valor).toBe(5000);
  });

  it('soma decimais sem erro de ponto flutuante', () => {
    const r = calcularIndicadores(1, [
      { etapa: 'contato', valor: 0.1 },
      { etapa: 'contato', valor: 0.2 },
    ]);
    expect(r.valorAberto).toBe(0.3);
    expect(somarValores([1500.5, 0.25, 0.25])).toBe(1501);
  });
});
```

`tests/unit/erros.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { traduzirErroAuth } from '@/lib/auth/erros';

describe('traduzirErroAuth', () => {
  it('traduz pelos códigos conhecidos', () => {
    expect(traduzirErroAuth('invalid_credentials')).toBe('E-mail ou senha incorretos');
    expect(traduzirErroAuth('user_already_exists')).toBe('Este e-mail já está cadastrado');
  });
  it('usa mensagem genérica para o resto', () => {
    expect(traduzirErroAuth('over_request_rate_limit')).toBe('Não foi possível concluir. Tente novamente.');
    expect(traduzirErroAuth(undefined)).toBe('Não foi possível concluir. Tente novamente.');
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode: `npm test`
Esperado: FAIL com imports não resolvidos (`@/lib/acoes`, `@/lib/metrics`, `@/lib/auth/erros`) e `clienteSchema` inexistente.

- [ ] **Passo 3: Implementar**

Acrescente ao **fim** de `lib/schemas.ts`, colocando o `import` no topo do arquivo:

```ts
import { z } from 'zod';
import { ETAPAS } from '@/lib/etapas';
```

```ts
const opcional = z.string().trim().transform((v) => (v === '' ? null : v));

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.email('E-mail inválido').nullable()),
  telefone: opcional,
  empresa: opcional,
});

export const negocioSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  valor: z
    .string()
    .transform((texto, ctx) => {
      const r = parseValorBRL(texto);
      if (!r.ok) {
        ctx.addIssue({ code: 'custom', message: r.erro });
        return z.NEVER;
      }
      return r.valor;
    })
    .pipe(z.number().min(0).max(9999999999.99, 'Valor máximo é 9.999.999.999,99')),
  etapa: z.enum(ETAPAS, 'Etapa inválida'),
  cliente_id: z.uuid('Selecione um cliente'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail'),
  senha: z.string().min(1, 'Informe a senha'),
});

export const cadastroSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().pipe(z.email('E-mail inválido')),
  senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

export const moverSchema = z
  .object({
    id: z.uuid(),
    etapa: z.enum(ETAPAS),
    ids: z.array(z.uuid()).refine((a) => new Set(a).size === a.length, 'Lista com ids repetidos'),
  })
  .refine((d) => d.ids.includes(d.id), 'A lista precisa conter o negócio movido');

export function errosDeCampo(erro: z.ZodError): Record<string, string[] | undefined> {
  return z.flattenError(erro).fieldErrors as Record<string, string[] | undefined>;
}
```

`lib/acoes.ts`:

```ts
export type EstadoForm = {
  ok: boolean;
  mensagem?: string;
  erros?: Record<string, string[] | undefined>;
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoForm = { ok: false };

export const SESSAO_EXPIRADA = 'Sessão expirada, faça login novamente';
export const NEGOCIO_NAO_EXISTE = 'Este negócio não existe mais';
export const FALHA_MOVER = 'Não foi possível mover o negócio, tente de novo';

export function lerCampos(fd: FormData, nomes: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    nomes.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );
}
```

`lib/metrics.ts`:

```ts
import { ETAPAS, ROTULO_ETAPA, type Etapa } from '@/lib/etapas';

export type Indicadores = {
  totalClientes: number;
  negociosAbertos: number;
  valorAberto: number;
  valorGanho: number;
  porEtapa: { etapa: Etapa; rotulo: string; valor: number }[];
};

// Soma em centavos para não acumular erro de ponto flutuante.
export function somarValores(valores: number[]): number {
  return valores.reduce((c, v) => c + Math.round(v * 100), 0) / 100;
}

const ABERTAS: Etapa[] = ['contato', 'proposta', 'negociacao'];

export function calcularIndicadores(
  totalClientes: number,
  negocios: { etapa: Etapa; valor: number }[],
): Indicadores {
  const abertos = negocios.filter((n) => ABERTAS.includes(n.etapa));
  return {
    totalClientes,
    negociosAbertos: abertos.length,
    valorAberto: somarValores(abertos.map((n) => n.valor)),
    valorGanho: somarValores(negocios.filter((n) => n.etapa === 'fechado').map((n) => n.valor)),
    porEtapa: ETAPAS.map((etapa) => ({
      etapa,
      rotulo: ROTULO_ETAPA[etapa],
      valor: somarValores(negocios.filter((n) => n.etapa === etapa).map((n) => n.valor)),
    })),
  };
}
```

`lib/auth/erros.ts`:

```ts
const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos',
  user_already_exists: 'Este e-mail já está cadastrado',
};

export function traduzirErroAuth(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || 'Não foi possível concluir. Tente novamente.';
}
```

`lib/tipos.ts`:

```ts
export type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
};
```

- [ ] **Passo 4: Rodar e ver passar**

Rode: `npm test`
Esperado: PASS em todos os arquivos de `tests/unit`.

- [ ] **Passo 5: Commit**

```bash
git add lib tests/unit
git commit -m "feat: schemas Zod, indicadores e tradução de erros de login"
```

---

### Tarefa 4: Supabase local, tabelas, RLS e trigger de perfil

**Arquivos:**
- Criar: `supabase/` (via `supabase init`), `supabase/migrations/20260924000000_crm.sql`, `.env.local`
- Teste: `tests/db/env.ts`, `tests/db/helpers.ts`, `tests/db/schema.test.ts`

**Interfaces:**
- Produz:
  - as tabelas `public.profiles`, `public.clientes` e `public.negocios`, exatamente como na seção 6 da spec;
  - os helpers de teste:
    - `admin` (service role);
    - `novoUsuario(metadata?)`, que devolve `{ id, email, cliente }`, onde `cliente` é um SupabaseClient logado;
    - `apagarUsuario(id)`;
    - `novoCliente(cliente, nome?)`, que devolve o `id`;
    - `novoNegocio(cliente, { cliente_id, etapa, posicao, titulo?, valor? })`, que devolve o `id`.

- [ ] **Passo 1: Iniciar o Supabase local** (o Docker Desktop precisa estar aberto)

```bash
npx supabase init
npx supabase start
npx supabase status -o env
```

Crie `.env.local` com os valores impressos:
- `NEXT_PUBLIC_SUPABASE_URL`: valor de `API_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: valor de `PUBLISHABLE_KEY` ou, se o CLI não mostrar esse campo, de `ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`: valor de `SERVICE_ROLE_KEY`.

O `.env.local` já é ignorado pelo `.gitignore` do Next.

Confira em `supabase/config.toml` que, na seção `[auth.email]`, está `enable_confirmations = false`. Esse é o padrão local.

- [ ] **Passo 2: Escrever os helpers e os testes que falham**

`tests/db/env.ts`:

```ts
import { config } from 'dotenv';

config({ path: '.env.local' });
```

`tests/db/helpers.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opcoes);

export const SENHA = 'senha-teste-123';

export async function novoUsuario(metadata: Record<string, unknown> = { nome: 'Pessoa Teste' }) {
  const email = `e2e+db-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@exemplo.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  const cliente = createClient(url, publishable, opcoes);
  const login = await cliente.auth.signInWithPassword({ email, password: SENHA });
  if (login.error) throw login.error;
  return { id: data.user.id, email, cliente };
}

export async function apagarUsuario(id: string) {
  await admin.auth.admin.deleteUser(id);
}

export async function novoCliente(cliente: SupabaseClient, nome = 'Cliente Teste') {
  const { data, error } = await cliente.from('clientes').insert({ nome }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function novoNegocio(
  cliente: SupabaseClient,
  n: { cliente_id: string; etapa: string; posicao: number; titulo?: string; valor?: number },
) {
  const { data, error } = await cliente
    .from('negocios')
    .insert({ titulo: 'Negócio', valor: 100, ...n })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
```

`tests/db/schema.test.ts`:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import { admin, apagarUsuario, novoCliente, novoNegocio, novoUsuario } from './helpers';

const criados: string[] = [];
async function usuario(metadata?: Record<string, unknown>) {
  const u = await novoUsuario(metadata);
  criados.push(u.id);
  return u;
}
afterAll(async () => {
  for (const id of criados) await apagarUsuario(id);
});

describe('trigger de perfil', () => {
  it('usa o nome do metadado', async () => {
    const u = await usuario({ nome: 'Ana Souza' });
    const { data } = await u.cliente.from('profiles').select('nome').single();
    expect(data?.nome).toBe('Ana Souza');
  });

  it('nome em branco ou ausente vira o começo do e-mail', async () => {
    const branco = await usuario({ nome: '   ' });
    const semNome = await usuario({});
    const p1 = await branco.cliente.from('profiles').select('nome').single();
    const p2 = await semNome.cliente.from('profiles').select('nome').single();
    expect(p1.data?.nome).toBe(branco.email.split('@')[0]);
    expect(p2.data?.nome).toBe(semNome.email.split('@')[0]);
  });
});

describe('isolamento por usuário (RLS)', () => {
  it('B não lê nem altera clientes de A', async () => {
    const a = await usuario();
    const b = await usuario();
    const idA = await novoCliente(a.cliente, 'Secreto de A');

    const leitura = await b.cliente.from('clientes').select('id').eq('id', idA);
    expect(leitura.data).toEqual([]);

    const alteracao = await b.cliente.from('clientes').update({ nome: 'hack' }).eq('id', idA).select();
    expect(alteracao.data).toEqual([]);

    const { data } = await admin.from('clientes').select('nome').eq('id', idA).single();
    expect(data?.nome).toBe('Secreto de A');
  });

  it('B não consegue ligar um negócio ao cliente de A (FK composta)', async () => {
    const a = await usuario();
    const b = await usuario();
    const idA = await novoCliente(a.cliente);
    const { data, error } = await b.cliente
      .from('negocios')
      .insert({ cliente_id: idA, titulo: 'Invasão', valor: 1, etapa: 'contato', posicao: 0 })
      .select();
    expect(error?.code).toBe('23503');
    expect(data).toBeNull();
  });

  it('user_id é preenchido pelo banco', async () => {
    const a = await usuario();
    const id = await novoCliente(a.cliente);
    const { data } = await admin.from('clientes').select('user_id').eq('id', id).single();
    expect(data?.user_id).toBe(a.id);
  });
});

describe('regras das tabelas', () => {
  it('excluir cliente apaga os negócios dele', async () => {
    const a = await usuario();
    const c = await novoCliente(a.cliente);
    const n = await novoNegocio(a.cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });
    await a.cliente.from('clientes').delete().eq('id', c);
    const { data } = await admin.from('negocios').select('id').eq('id', n);
    expect(data).toEqual([]);
  });

  it('rejeita valor negativo e etapa desconhecida', async () => {
    const a = await usuario();
    const c = await novoCliente(a.cliente);
    const negativo = await a.cliente
      .from('negocios')
      .insert({ cliente_id: c, titulo: 'x', valor: -1, etapa: 'contato', posicao: 0 });
    const etapa = await a.cliente
      .from('negocios')
      .insert({ cliente_id: c, titulo: 'x', valor: 1, etapa: 'ganho', posicao: 0 });
    expect(negativo.error?.code).toBe('23514');
    expect(etapa.error?.code).toBe('23514');
  });

  it('excluir o usuário apaga perfil, clientes e negócios', async () => {
    const a = await novoUsuario();
    const c = await novoCliente(a.cliente);
    await novoNegocio(a.cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });
    await apagarUsuario(a.id);
    const perfis = await admin.from('profiles').select('id').eq('id', a.id);
    const clientes = await admin.from('clientes').select('id').eq('user_id', a.id);
    const negocios = await admin.from('negocios').select('id').eq('user_id', a.id);
    expect([perfis.data, clientes.data, negocios.data]).toEqual([[], [], []]);
  });
});
```

- [ ] **Passo 3: Rodar e ver falhar**

Rode: `npm run test:db`
Esperado: FAIL, com erros como `relation "public.profiles" does not exist` ou `Could not find the table 'public.clientes'`.

- [ ] **Passo 4: Escrever a migration**

`supabase/migrations/20260924000000_crm.sql`:

```sql
-- ============ Tabelas ============
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  empresa text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id uuid not null,
  titulo text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  etapa text not null check (etapa in ('contato', 'proposta', 'negociacao', 'fechado', 'perdido')),
  posicao int not null,
  created_at timestamptz not null default now(),
  -- Garante que o cliente do negócio é do mesmo dono (a FK ignora o RLS).
  foreign key (cliente_id, user_id) references public.clientes (id, user_id) on delete cascade
);

create index clientes_user_id_idx on public.clientes (user_id);
create index negocios_user_etapa_posicao_idx on public.negocios (user_id, etapa, posicao);
create index negocios_cliente_id_idx on public.negocios (cliente_id);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.negocios enable row level security;

-- profiles: sem insert/delete de propósito (o trigger cria e o cascade remove).
create policy "perfil: dono lê" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil: dono altera" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "clientes: dono gerencia" on public.clientes
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "negocios: dono gerencia" on public.negocios
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============ Perfil automático ============
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Usuário'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Passo 5: Aplicar a migration e rodar os testes**

```bash
npx supabase db reset
npm run test:db
```

Esperado: o reset termina com "Finished supabase db reset", e todos os testes de `schema.test.ts` passam.

- [ ] **Passo 6: Commit**

```bash
git add supabase tests/db
git commit -m "feat(db): tabelas, RLS com FK composta e trigger de perfil"
```

---

### Tarefa 5: Funções SQL `mover_negocio` e `gerar_dados_exemplo`

**Arquivos:**
- Criar: `supabase/migrations/20260924000100_funcoes.sql`
- Teste: `tests/db/funcoes.test.ts`

**Interfaces:**
- Consome: as tabelas da Tarefa 4 e os helpers de `tests/db/helpers.ts`.
- Produz:
  - RPC `mover_negocio(p_id uuid, p_etapa text, p_ids uuid[])`, que devolve `void`. Se o negócio não existir para o usuário, lança erro com `errcode 'P0002'`;
  - RPC `gerar_dados_exemplo()`, que devolve `void`.

- [ ] **Passo 1: Escrever os testes que falham**

`tests/db/funcoes.test.ts`:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apagarUsuario, novoCliente, novoNegocio, novoUsuario } from './helpers';

const criados: string[] = [];
async function usuario() {
  const u = await novoUsuario();
  criados.push(u.id);
  return u;
}
afterAll(async () => {
  for (const id of criados) await apagarUsuario(id);
});

async function coluna(cliente: SupabaseClient, etapa: string) {
  const { data } = await cliente
    .from('negocios')
    .select('id, posicao')
    .eq('etapa', etapa)
    .order('posicao')
    .order('created_at')
    .order('id');
  return data ?? [];
}

describe('mover_negocio', () => {
  it('muda a etapa e renumera a coluna de destino na ordem recebida', async () => {
    const { cliente } = await usuario();
    const c = await novoCliente(cliente);
    const x = await novoNegocio(cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });
    const p1 = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 0 });
    const p2 = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 1 });

    const { error } = await cliente.rpc('mover_negocio', {
      p_id: x, p_etapa: 'proposta', p_ids: [p1, x, p2],
    });
    expect(error).toBeNull();
    expect(await coluna(cliente, 'proposta')).toEqual([
      { id: p1, posicao: 0 }, { id: x, posicao: 1 }, { id: p2, posicao: 2 },
    ]);
    expect(await coluna(cliente, 'contato')).toEqual([]);
  });

  it('coluna vazia: o card fica na posição 0', async () => {
    const { cliente } = await usuario();
    const c = await novoCliente(cliente);
    const x = await novoNegocio(cliente, { cliente_id: c, etapa: 'contato', posicao: 5 });
    await cliente.rpc('mover_negocio', { p_id: x, p_etapa: 'fechado', p_ids: [x] });
    expect(await coluna(cliente, 'fechado')).toEqual([{ id: x, posicao: 0 }]);
  });

  it('deduplica a lista, ignora ids de outra coluna e põe os que faltam no fim', async () => {
    const { cliente } = await usuario();
    const c = await novoCliente(cliente);
    const x = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 0 });
    const y = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 1 });
    const novo = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 0 });
    const outra = await novoNegocio(cliente, { cliente_id: c, etapa: 'perdido', posicao: 7 });

    // Lista desatualizada: y repetido, "outra" é de outra coluna, "novo" ficou de fora.
    await cliente.rpc('mover_negocio', { p_id: y, p_etapa: 'proposta', p_ids: [y, outra, x, y] });

    expect(await coluna(cliente, 'proposta')).toEqual([
      { id: y, posicao: 0 }, { id: x, posicao: 1 }, { id: novo, posicao: 2 },
    ]);
    expect(await coluna(cliente, 'perdido')).toEqual([{ id: outra, posicao: 7 }]);
  });

  it('negócio inexistente ou de outro usuário devolve P0002', async () => {
    const a = await usuario();
    const b = await usuario();
    const c = await novoCliente(a.cliente);
    const deA = await novoNegocio(a.cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });

    const r = await b.cliente.rpc('mover_negocio', { p_id: deA, p_etapa: 'fechado', p_ids: [deA] });
    expect(r.error?.code).toBe('P0002');
    expect(await coluna(a.cliente, 'contato')).toEqual([{ id: deA, posicao: 0 }]);
  });
});

describe('gerar_dados_exemplo', () => {
  it('cria 10 clientes e 15 negócios com posições 0..n-1 por etapa', async () => {
    const { cliente } = await usuario();
    const { error } = await cliente.rpc('gerar_dados_exemplo');
    expect(error).toBeNull();

    const clientes = await cliente.from('clientes').select('id');
    const negocios = await cliente.from('negocios').select('etapa, posicao');
    expect(clientes.data).toHaveLength(10);
    expect(negocios.data).toHaveLength(15);

    const porEtapa = new Map<string, number[]>();
    for (const n of negocios.data ?? []) {
      porEtapa.set(n.etapa, [...(porEtapa.get(n.etapa) ?? []), n.posicao]);
    }
    expect(porEtapa.size).toBe(5);
    for (const posicoes of porEtapa.values()) {
      expect([...posicoes].sort((p, q) => p - q)).toEqual(posicoes.map((_, i) => i));
    }
  });

  it('não faz nada se a conta já tem clientes, nem com chamadas simultâneas', async () => {
    const { cliente } = await usuario();
    await Promise.all([cliente.rpc('gerar_dados_exemplo'), cliente.rpc('gerar_dados_exemplo')]);
    await cliente.rpc('gerar_dados_exemplo');
    const { data } = await cliente.from('clientes').select('id');
    expect(data).toHaveLength(10);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode: `npm run test:db`
Esperado: os testes de `funcoes.test.ts` falham com `Could not find the function public.mover_negocio`.

- [ ] **Passo 3: Escrever a migration das funções**

`supabase/migrations/20260924000100_funcoes.sql`:

```sql
-- Move um negócio para uma etapa e renumera a coluna de destino (0..n-1).
-- security invoker: roda com as permissões de quem chama, então o RLS vale.
create function public.mover_negocio(p_id uuid, p_etapa text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'nao_autenticado' using errcode = '42501';
  end if;

  -- Fila por usuário: movimentos simultâneos rodam um depois do outro (sem deadlock).
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  update public.negocios set etapa = p_etapa where id = p_id;
  if not found then
    raise exception 'negocio_nao_encontrado' using errcode = 'P0002';
  end if;

  with lista as (
    -- deduplica mantendo a primeira ocorrência
    select u.id, min(u.ord) as ord
    from unnest(p_ids) with ordinality as u (id, ord)
    group by u.id
  ),
  ordenado as (
    -- só linhas que estão de fato na coluna de destino
    select n.id,
           row_number() over (
             order by (l.ord is null), l.ord, n.posicao, n.created_at, n.id
           ) - 1 as nova_posicao
    from public.negocios n
    left join lista l on l.id = n.id
    where n.etapa = p_etapa
  )
  update public.negocios n
  set posicao = o.nova_posicao
  from ordenado o
  where n.id = o.id;
end;
$$;

-- Popula a conta vazia com 10 clientes e 15 negócios, tudo numa transação.
create function public.gerar_dados_exemplo()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'nao_autenticado' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  if exists (select 1 from public.clientes where user_id = auth.uid()) then
    return;
  end if;

  with novos as (
    insert into public.clientes (nome, email, telefone, empresa)
    values
      ('Ana Souza', 'ana@acme.com.br', '(11) 98888-1001', 'Acme Ltda'),
      ('Bruno Lima', 'bruno@lima.dev', '(21) 97777-2002', 'Lima Dev'),
      ('Carla Mendes', 'carla@verde.com', '(31) 96666-3003', 'Verde Alimentos'),
      ('Diego Rocha', 'diego@rocha.eng', '(41) 95555-4004', 'Rocha Engenharia'),
      ('Elisa Prado', 'elisa@prado.adv.br', '(51) 94444-5005', 'Prado Advocacia'),
      ('Felipe Costa', 'felipe@costa.io', '(61) 93333-6006', 'Costa Tech'),
      ('Gabriela Nunes', 'gabi@nunes.art', '(71) 92222-7007', 'Ateliê Nunes'),
      ('Henrique Alves', 'henrique@alves.com', '(81) 91111-8008', 'Alves Transportes'),
      ('Isabela Ramos', 'isabela@ramos.edu', '(85) 90000-9009', 'Escola Ramos'),
      ('João Pereira', 'joao@pereira.agr', '(62) 98765-1010', 'Pereira Agro')
    returning id
  )
  select array_agg(id order by id) into ids from novos;

  insert into public.negocios (cliente_id, titulo, valor, etapa, posicao)
  select ids[v.i], v.titulo, v.valor, v.etapa, v.posicao
  from (values
    (1, 'Site institucional', 8500.00, 'contato', 0),
    (2, 'App de delivery', 32000.00, 'contato', 1),
    (3, 'Consultoria de SEO', 4200.00, 'contato', 2),
    (4, 'Automação de relatórios', 12500.00, 'contato', 3),
    (5, 'Portal do cliente', 27800.00, 'proposta', 0),
    (6, 'Loja virtual', 18900.00, 'proposta', 1),
    (7, 'Identidade visual', 6300.00, 'proposta', 2),
    (8, 'Sistema de frota', 45000.00, 'negociacao', 0),
    (9, 'Plataforma EAD', 38500.00, 'negociacao', 1),
    (10, 'Integração ERP', 21000.00, 'negociacao', 2),
    (1, 'Manutenção mensal', 3600.00, 'fechado', 0),
    (3, 'Cardápio digital', 2900.00, 'fechado', 1),
    (6, 'Dashboard de vendas', 15400.00, 'fechado', 2),
    (2, 'Chatbot de atendimento', 9700.00, 'perdido', 0),
    (9, 'App do aluno', 26000.00, 'perdido', 1)
  ) as v (i, titulo, valor, etapa, posicao);
end;
$$;
```

- [ ] **Passo 4: Aplicar e rodar**

```bash
npx supabase db reset
npm run test:db
```

Esperado: os testes de `schema.test.ts` e de `funcoes.test.ts` passam.

- [ ] **Passo 5: Commit**

```bash
git add supabase/migrations tests/db
git commit -m "feat(db): funções mover_negocio e gerar_dados_exemplo"
```

---

### Tarefa 6: Clientes Supabase, decisão de rotas e `proxy.ts`

**Arquivos:**
- Criar: `lib/auth/rotas.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `proxy.ts`
- Teste: `tests/unit/rotas.test.ts`

**Interfaces:**
- Produz:
  - `decidirRota(e: { pathname: string; logado: boolean; ehServerAction: boolean }): { tipo: 'seguir' } | { tipo: 'redirecionar'; para: '/login' | '/dashboard' }`
  - `createClient()` do navegador (`lib/supabase/client.ts`)
  - `createClient(): Promise<SupabaseClient>` do servidor (`lib/supabase/server.ts`)
  - `type Usuario = { id: string; email: string }`
  - `obterUsuario(): Promise<Usuario | null>`, para as actions
  - `exigirUsuario(): Promise<Usuario>`, para as páginas; redireciona para `/login` se não houver usuário
  - `updateSession(request: NextRequest): Promise<NextResponse>`

- [ ] **Passo 1: Escrever o teste que falha**

`tests/unit/rotas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decidirRota } from '@/lib/auth/rotas';

const rota = (pathname: string, logado: boolean, ehServerAction = false) =>
  decidirRota({ pathname, logado, ehServerAction });

describe('decidirRota', () => {
  it.each(['/dashboard', '/dashboard/', '/dashboard/clientes', '/dashboard/funil'])(
    'sem sessão em %s vai para /login',
    (p) => expect(rota(p, false)).toEqual({ tipo: 'redirecionar', para: '/login' }),
  );

  it.each(['/login', '/cadastro'])('logado em %s vai para /dashboard', (p) => {
    expect(rota(p, true)).toEqual({ tipo: 'redirecionar', para: '/dashboard' });
  });

  it('não confunde /dashboardx com o dashboard', () => {
    expect(rota('/dashboardx', false)).toEqual({ tipo: 'seguir' });
  });

  it('páginas públicas seguem para visitante', () => {
    expect(rota('/login', false)).toEqual({ tipo: 'seguir' });
    expect(rota('/cadastro', false)).toEqual({ tipo: 'seguir' });
  });

  it('dashboard segue para quem está logado', () => {
    expect(rota('/dashboard/funil', true)).toEqual({ tipo: 'seguir' });
  });

  it('Server Action nunca é redirecionada, mesmo sem sessão', () => {
    expect(rota('/dashboard/funil', false, true)).toEqual({ tipo: 'seguir' });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode: `npm test`
Esperado: FAIL com "Failed to resolve import '@/lib/auth/rotas'".

- [ ] **Passo 3: Implementar `decidirRota`**

`lib/auth/rotas.ts`:

```ts
export type Decisao = { tipo: 'seguir' } | { tipo: 'redirecionar'; para: '/login' | '/dashboard' };

export function decidirRota(e: {
  pathname: string;
  logado: boolean;
  ehServerAction: boolean;
}): Decisao {
  // Actions só renovam a sessão; a própria action devolve "Sessão expirada".
  if (e.ehServerAction) return { tipo: 'seguir' };

  const protegida = e.pathname === '/dashboard' || e.pathname.startsWith('/dashboard/');
  if (protegida && !e.logado) return { tipo: 'redirecionar', para: '/login' };

  const telaDeEntrada = e.pathname === '/login' || e.pathname === '/cadastro';
  if (telaDeEntrada && e.logado) return { tipo: 'redirecionar', para: '/dashboard' };

  return { tipo: 'seguir' };
}
```

- [ ] **Passo 4: Rodar e ver passar**

Rode: `npm test`
Esperado: PASS em `rotas.test.ts`.

- [ ] **Passo 5: Clientes Supabase e proxy**

`lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

`lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Usuario = { id: string; email: string };

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: quem renova a sessão é o proxy.
          }
        },
      },
    },
  );
}

export async function obterUsuario(): Promise<Usuario | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
}

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect('/login');
  return usuario;
}
```

`lib/supabase/proxy.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { decidirRota } from '@/lib/auth/rotas';

export async function updateSession(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers?: Record<string, string>) {
          // (a) a página desta mesma requisição já lê o token renovado
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          // (b) o navegador recebe os cookies novos
          cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => resposta.headers.set(k, v));
        },
      },
    },
  );

  // Não coloque código entre createServerClient e getClaims.
  const { data } = await supabase.auth.getClaims();

  const decisao = decidirRota({
    pathname: request.nextUrl.pathname,
    logado: Boolean(data?.claims),
    ehServerAction: request.method === 'POST' && request.headers.has('next-action'),
  });
  if (decisao.tipo === 'seguir') return resposta;

  const url = request.nextUrl.clone();
  url.pathname = decisao.para;
  url.search = '';
  const redirecionamento = NextResponse.redirect(url);
  // Copia os cookies renovados para o redirecionamento, senão o usuário é deslogado.
  resposta.cookies.getAll().forEach((c) => redirecionamento.cookies.set(c));
  for (const h of ['cache-control', 'expires', 'pragma']) {
    const v = resposta.headers.get(h);
    if (v) redirecionamento.headers.set(h, v);
  }
  return redirecionamento;
}
```

`proxy.ts`, na raiz:

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Passo 6: Verificar tipos e build**

```bash
npm test
npm run build
```

Esperado: os testes passam e o build termina sem erro de tipo. Se o `setAll` reclamar do segundo parâmetro, a versão instalada do `@supabase/ssr` não o envia. Nesse caso, remova o parâmetro `headers` e a linha `Object.entries(...)`.

- [ ] **Passo 7: Commit**

```bash
git add lib proxy.ts tests/unit
git commit -m "feat(auth): clientes Supabase, decidirRota e proxy.ts"
```

---

### Tarefa 7: Telas de login e cadastro e o botão Sair

**Arquivos:**
- Criar: `app/(auth)/layout.tsx`, `app/(auth)/actions.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/cadastro/page.tsx`, `components/auth/form-login.tsx`, `components/auth/form-cadastro.tsx`, `components/crm/campo.tsx`
- Modificar: `app/layout.tsx`
- Substituir: `app/page.tsx`

**Interfaces:**
- Consome:
  - `loginSchema`, `cadastroSchema`, `errosDeCampo` (Tarefa 3);
  - `EstadoForm`, `ESTADO_INICIAL`, `lerCampos` (Tarefa 3);
  - `traduzirErroAuth` (Tarefa 3);
  - `createClient` do servidor (Tarefa 6).
- Produz:
  - as actions `entrar(prev: EstadoForm, fd: FormData)`, `cadastrar(prev, fd)` e `sair()` em `app/(auth)/actions.ts`;
  - o componente `<Campo nome rotulo tipo? padrao? erros? />`.

- [ ] **Passo 1: Layout raiz, `/` e o componente `Campo`**

`app/layout.tsx`: substitua o conteúdo inteiro. Mantenha as fontes que o `create-next-app` gerou, caso queira, trocando só `lang`, `metadata` e o `<Toaster />`.

```tsx
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini CRM',
  description: 'Projeto de estudo: login e dashboard de CRM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

`app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

`components/crm/campo.tsx`:

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Campo({
  nome,
  rotulo,
  tipo = 'text',
  padrao,
  erros,
  autoComplete,
}: {
  nome: string;
  rotulo: string;
  tipo?: string;
  padrao?: string;
  erros?: string[];
  autoComplete?: string;
}) {
  const idErro = `${nome}-erro`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={nome}>{rotulo}</Label>
      <Input
        id={nome}
        name={nome}
        type={tipo}
        defaultValue={padrao}
        autoComplete={autoComplete}
        aria-invalid={erros ? true : undefined}
        aria-describedby={erros ? idErro : undefined}
      />
      {erros && (
        <p id={idErro} className="text-sm text-destructive">
          {erros[0]}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Passo 2: Actions de autenticação**

`app/(auth)/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { lerCampos, type EstadoForm } from '@/lib/acoes';
import { traduzirErroAuth } from '@/lib/auth/erros';
import { cadastroSchema, errosDeCampo, loginSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

export async function entrar(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = lerCampos(fd, ['email', 'senha']);
  const r = loginSchema.safeParse(valores);
  if (!r.success) return { ok: false, erros: errosDeCampo(r.error), valores: { email: valores.email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.senha });
  if (error) return { ok: false, mensagem: traduzirErroAuth(error.code), valores: { email: valores.email } };

  redirect('/dashboard');
}

export async function cadastrar(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = lerCampos(fd, ['nome', 'email', 'senha']);
  const devolver = { nome: valores.nome, email: valores.email };
  const r = cadastroSchema.safeParse(valores);
  if (!r.success) return { ok: false, erros: errosDeCampo(r.error), valores: devolver };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: r.data.email,
    password: r.data.senha,
    options: { data: { nome: r.data.nome } },
  });
  if (error) return { ok: false, mensagem: traduzirErroAuth(error.code), valores: devolver };

  redirect('/dashboard');
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Passo 3: Formulários e páginas**

`components/auth/form-login.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { entrar } from '@/app/(auth)/actions';
import { Campo } from '@/components/crm/campo';
import { Button } from '@/components/ui/button';
import { ESTADO_INICIAL } from '@/lib/acoes';

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrar, ESTADO_INICIAL);
  return (
    <form action={acao} className="space-y-4">
      <Campo nome="email" rotulo="E-mail" tipo="email" autoComplete="email" padrao={estado.valores?.email} erros={estado.erros?.email} />
      <Campo nome="senha" rotulo="Senha" tipo="password" autoComplete="current-password" erros={estado.erros?.senha} />
      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta? <Link href="/cadastro" className="underline">Cadastre-se</Link>
      </p>
    </form>
  );
}
```

`components/auth/form-cadastro.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { cadastrar } from '@/app/(auth)/actions';
import { Campo } from '@/components/crm/campo';
import { Button } from '@/components/ui/button';
import { ESTADO_INICIAL } from '@/lib/acoes';

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, ESTADO_INICIAL);
  return (
    <form action={acao} className="space-y-4">
      <Campo nome="nome" rotulo="Nome" autoComplete="name" padrao={estado.valores?.nome} erros={estado.erros?.nome} />
      <Campo nome="email" rotulo="E-mail" tipo="email" autoComplete="email" padrao={estado.valores?.email} erros={estado.erros?.email} />
      <Campo nome="senha" rotulo="Senha" tipo="password" autoComplete="new-password" erros={estado.erros?.senha} />
      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Criando conta…' : 'Criar conta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta? <Link href="/login" className="underline">Entrar</Link>
      </p>
    </form>
  );
}
```

`app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">{children}</main>;
}
```

`app/(auth)/login/page.tsx`:

```tsx
import { FormLogin } from '@/components/auth/form-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse o seu CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <FormLogin />
      </CardContent>
    </Card>
  );
}
```

`app/(auth)/cadastro/page.tsx`:

```tsx
import { FormCadastro } from '@/components/auth/form-cadastro';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CadastroPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cada conta tem o seu próprio CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <FormCadastro />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Passo 4: Verificar manualmente**

Rode `npm run dev`, com o Supabase local rodando, e confira:
1. `http://localhost:3000/` leva a `/login`.
2. Clicar em "Criar conta" com os campos vazios mostra os três erros, cada um embaixo do seu campo.
3. Um cadastro válido leva a `/dashboard`. A página ainda não existe e mostra 404: isso é esperado nesta tarefa.
4. Voltar para `/login` já logado leva a `/dashboard`.

Rode: `npm run build`
Esperado: o build termina sem erros.

- [ ] **Passo 5: Commit**

```bash
git add app components lib
git commit -m "feat(auth): telas de login e cadastro com Server Actions"
```

---

### Tarefa 8: Layout do dashboard, telas de erro e menu

**Arquivos:**
- Criar: `app/dashboard/layout.tsx`, `app/dashboard/error.tsx`, `app/error.tsx`, `components/crm/tela-erro.tsx`, `components/crm/menu-lateral.tsx`

**Interfaces:**
- Consome: `exigirUsuario`, `createClient` (Tarefa 6); `sair` (Tarefa 7).
- Produz: o layout com o menu (Visão geral, Clientes, Funil) e o topo (nome e botão "Sair").

- [ ] **Passo 1: Tela de erro compartilhada**

`components/crm/tela-erro.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';

export function TelaErro({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground">Não foi possível carregar esta página.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
```

`app/dashboard/error.tsx` e `app/error.tsx` têm o mesmo conteúdo:

```tsx
'use client';

import { TelaErro } from '@/components/crm/tela-erro';

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <TelaErro reset={reset} />;
}
```

- [ ] **Passo 2: Menu lateral e layout**

`components/crm/menu-lateral.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITENS = [
  { href: '/dashboard', rotulo: 'Visão geral' },
  { href: '/dashboard/clientes', rotulo: 'Clientes' },
  { href: '/dashboard/funil', rotulo: 'Funil' },
];

export function MenuLateral() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu principal" className="flex gap-1 md:flex-col">
      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-2 text-sm hover:bg-muted',
            pathname === item.href && 'bg-muted font-medium',
          )}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
```

`app/dashboard/layout.tsx`:

```tsx
import { sair } from '@/app/(auth)/actions';
import { MenuLateral } from '@/components/crm/menu-lateral';
import { Button } from '@/components/ui/button';
import { createClient, exigirUsuario } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Aqui o usuário serve só para exibir o nome; cada página faz a própria checagem.
  const usuario = await exigirUsuario();
  const supabase = await createClient();
  const { data: perfil } = await supabase.from('profiles').select('nome').eq('id', usuario.id).maybeSingle();
  const nome = perfil?.nome ?? usuario.email; // se o perfil falhar, mostra o e-mail

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b p-4 md:border-b-0 md:border-r">
        <p className="mb-4 px-3 text-lg font-bold">Mini CRM</p>
        <MenuLateral />
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-end gap-4 border-b px-6 py-3">
          <span className="text-sm">{nome}</span>
          <form action={sair}>
            <Button type="submit" variant="outline" size="sm">Sair</Button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Passo 3: Verificar**

Rode: `npm run build`
Esperado: termina sem erros. As páginas do dashboard ainda não existem.

- [ ] **Passo 4: Commit**

```bash
git add app components
git commit -m "feat(dashboard): layout com menu, topo e telas de erro"
```

---

### Tarefa 9: Visão geral, com indicadores, gráfico e dados de exemplo

**Arquivos:**
- Criar: `app/dashboard/page.tsx`, `app/dashboard/actions.ts`, `components/crm/cards-indicadores.tsx`, `components/crm/grafico-etapas.tsx`, `components/crm/estado-vazio.tsx`

**Interfaces:**
- Consome:
  - `calcularIndicadores`, `Indicadores` (Tarefa 3);
  - `formatarBRL` (Tarefa 2);
  - `exigirUsuario`, `obterUsuario`, `createClient` (Tarefa 6);
  - a RPC `gerar_dados_exemplo` (Tarefa 5).
- Produz: a action `gerarDadosExemplo(): Promise<EstadoForm>`.

- [ ] **Passo 1: Action**

`app/dashboard/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { SESSAO_EXPIRADA, type EstadoForm } from '@/lib/acoes';
import { createClient, obterUsuario } from '@/lib/supabase/server';

export async function gerarDadosExemplo(): Promise<EstadoForm> {
  if (!(await obterUsuario())) return { ok: false, mensagem: SESSAO_EXPIRADA };
  const supabase = await createClient();
  const { error } = await supabase.rpc('gerar_dados_exemplo');
  if (error) return { ok: false, mensagem: 'Não foi possível gerar os dados de exemplo' };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/funil');
  return { ok: true };
}
```

- [ ] **Passo 2: Componentes**

`components/crm/cards-indicadores.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatarBRL } from '@/lib/format';
import type { Indicadores } from '@/lib/metrics';

export function CardsIndicadores({ indicadores }: { indicadores: Indicadores }) {
  const cards = [
    { titulo: 'Total de clientes', valor: String(indicadores.totalClientes) },
    { titulo: 'Negócios em aberto', valor: String(indicadores.negociosAbertos) },
    { titulo: 'Valor em aberto', valor: formatarBRL(indicadores.valorAberto) },
    { titulo: 'Valor ganho', valor: formatarBRL(indicadores.valorGanho) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.titulo}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.valor}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

`components/crm/grafico-etapas.tsx`:

```tsx
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';
import { formatarBRL } from '@/lib/format';
import type { Indicadores } from '@/lib/metrics';

const config = { valor: { label: 'Valor', color: 'var(--chart-1)' } } satisfies ChartConfig;

export function GraficoEtapas({ dados }: { dados: Indicadores['porEtapa'] }) {
  return (
    <ChartContainer config={config} className="h-72 w-full">
      <BarChart data={dados} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
        <YAxis width={96} tickFormatter={(v: number) => formatarBRL(v)} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatarBRL(Number(v))} />} />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
```

`components/crm/estado-vazio.tsx`:

```tsx
'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { gerarDadosExemplo } from '@/app/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function EstadoVazio() {
  const [pendente, iniciar] = useTransition();

  function gerar() {
    iniciar(async () => {
      try {
        const r = await gerarDadosExemplo();
        if (!r.ok) toast.error(r.mensagem);
      } catch {
        toast.error('Não foi possível gerar os dados de exemplo');
      }
    });
  }

  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardHeader>
        <CardTitle>Seu CRM está vazio</CardTitle>
        <CardDescription>
          Cadastre clientes ou gere dados de exemplo para explorar o dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={gerar} disabled={pendente}>
          {pendente ? 'Gerando…' : 'Gerar dados de exemplo'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Passo 3: Página**

`app/dashboard/page.tsx`:

```tsx
import { CardsIndicadores } from '@/components/crm/cards-indicadores';
import { EstadoVazio } from '@/components/crm/estado-vazio';
import { GraficoEtapas } from '@/components/crm/grafico-etapas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Etapa } from '@/lib/etapas';
import { calcularIndicadores } from '@/lib/metrics';
import { createClient, exigirUsuario } from '@/lib/supabase/server';

export default async function VisaoGeralPage() {
  await exigirUsuario();
  const supabase = await createClient();
  const [clientes, negocios] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('negocios').select('etapa, valor'),
  ]);
  if (clientes.error || negocios.error) throw new Error('Falha ao carregar a visão geral');

  const totalClientes = clientes.count ?? 0;
  const lista = negocios.data ?? [];
  if (totalClientes === 0 && lista.length === 0) return <EstadoVazio />;

  const indicadores = calcularIndicadores(
    totalClientes,
    lista.map((n) => ({ etapa: n.etapa as Etapa, valor: Number(n.valor) })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visão geral</h1>
      <CardsIndicadores indicadores={indicadores} />
      <Card>
        <CardHeader>
          <CardTitle>Valor por etapa do funil</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoEtapas dados={indicadores.porEtapa} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Passo 4: Verificar manualmente**

Rode `npm run dev`. Com uma conta nova:
1. `/dashboard` mostra "Seu CRM está vazio".
2. Clique em "Gerar dados de exemplo". O botão fica desabilitado, e depois aparecem os 4 cards e o gráfico com as 5 etapas.
3. Os valores dos cards devem ser:
   - Total de clientes: 10;
   - Negócios em aberto: 10;
   - Valor em aberto: R$ 214.700,00;
   - Valor ganho: R$ 21.900,00.

Rode: `npm run build`
Esperado: termina sem erros.

- [ ] **Passo 5: Commit**

```bash
git add app components
git commit -m "feat(dashboard): visão geral com indicadores, gráfico e dados de exemplo"
```

---

### Tarefa 10: Clientes (lista, busca, criar, editar e excluir)

**Arquivos:**
- Criar: `app/dashboard/clientes/actions.ts`, `app/dashboard/clientes/page.tsx`, `components/crm/busca-clientes.tsx`, `components/crm/tabela-clientes.tsx`, `components/crm/form-cliente.tsx`, `components/crm/confirmar-exclusao.tsx`

**Interfaces:**
- Consome:
  - `clienteSchema`, `errosDeCampo`, `escaparBusca` (Tarefas 2 e 3);
  - `EstadoForm`, `ESTADO_INICIAL`, `lerCampos`, `SESSAO_EXPIRADA` (Tarefa 3);
  - `Cliente` (Tarefa 3);
  - `Campo` (Tarefa 7);
  - `exigirUsuario`, `obterUsuario`, `createClient` (Tarefa 6).
- Produz:
  - as actions `salvarCliente(prev: EstadoForm, fd: FormData): Promise<EstadoForm>` e `excluirCliente(id: string): Promise<EstadoForm>`;
  - o componente `<ConfirmarExclusao titulo descricao aoConfirmar desabilitado? />`, reutilizado na Tarefa 11.

- [ ] **Passo 1: Actions**

`app/dashboard/clientes/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { lerCampos, SESSAO_EXPIRADA, type EstadoForm } from '@/lib/acoes';
import { clienteSchema, errosDeCampo } from '@/lib/schemas';
import { createClient, obterUsuario } from '@/lib/supabase/server';

function revalidar() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/funil');
}

export async function salvarCliente(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!(await obterUsuario())) return { ok: false, mensagem: SESSAO_EXPIRADA };
  const valores = lerCampos(fd, ['id', 'nome', 'email', 'telefone', 'empresa']);
  const r = clienteSchema.safeParse(valores);
  if (!r.success) return { ok: false, erros: errosDeCampo(r.error), valores };

  const supabase = await createClient();
  const { error } = valores.id
    ? await supabase.from('clientes').update(r.data).eq('id', valores.id)
    : await supabase.from('clientes').insert(r.data);
  if (error) return { ok: false, mensagem: 'Não foi possível salvar o cliente', valores };

  revalidar();
  return { ok: true };
}

export async function excluirCliente(id: string): Promise<EstadoForm> {
  if (!(await obterUsuario())) return { ok: false, mensagem: SESSAO_EXPIRADA };
  const supabase = await createClient();
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) return { ok: false, mensagem: 'Não foi possível excluir o cliente' };
  revalidar();
  return { ok: true };
}
```

- [ ] **Passo 2: Componentes**

`components/crm/confirmar-exclusao.tsx`:

```tsx
'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function ConfirmarExclusao({
  titulo,
  descricao,
  aoConfirmar,
  desabilitado,
}: {
  titulo: string;
  descricao: string;
  aoConfirmar: () => void;
  desabilitado?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={desabilitado}>
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={aoConfirmar}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`components/crm/form-cliente.tsx`:

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { salvarCliente } from '@/app/dashboard/clientes/actions';
import { Campo } from '@/components/crm/campo';
import { Button } from '@/components/ui/button';
import { ESTADO_INICIAL } from '@/lib/acoes';
import type { Cliente } from '@/lib/tipos';

export function FormCliente({ cliente, aoConcluir }: { cliente?: Cliente; aoConcluir: () => void }) {
  const [estado, acao, pendente] = useActionState(salvarCliente, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.ok) {
      toast.success('Cliente salvo');
      aoConcluir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // Depois de um erro, reexibe o que a pessoa digitou.
  const v = (campo: 'nome' | 'email' | 'telefone' | 'empresa') =>
    estado.valores?.[campo] ?? cliente?.[campo] ?? '';

  return (
    <form action={acao} className="space-y-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Campo nome="nome" rotulo="Nome" padrao={v('nome')} erros={estado.erros?.nome} />
      <Campo nome="email" rotulo="E-mail" tipo="email" padrao={v('email')} erros={estado.erros?.email} />
      <Campo nome="telefone" rotulo="Telefone" padrao={v('telefone')} erros={estado.erros?.telefone} />
      <Campo nome="empresa" rotulo="Empresa" padrao={v('empresa')} erros={estado.erros?.empresa} />
      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}
      <Button type="submit" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Button>
    </form>
  );
}
```

`components/crm/busca-clientes.tsx`. É um formulário GET comum, que funciona mesmo sem JavaScript:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function BuscaClientes({ q }: { q: string }) {
  return (
    <form method="get" className="flex max-w-sm gap-2" role="search">
      <Input name="q" defaultValue={q} placeholder="Buscar por nome" aria-label="Buscar por nome" />
      <Button type="submit" variant="outline">Buscar</Button>
    </form>
  );
}
```

`components/crm/tabela-clientes.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { excluirCliente } from '@/app/dashboard/clientes/actions';
import { ConfirmarExclusao } from '@/components/crm/confirmar-exclusao';
import { FormCliente } from '@/components/crm/form-cliente';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Cliente } from '@/lib/tipos';

export function TabelaClientes({ clientes }: { clientes: Cliente[] }) {
  const [editando, setEditando] = useState<Cliente | 'novo' | null>(null);
  const [excluindo, iniciar] = useTransition();

  function excluir(c: Cliente) {
    iniciar(async () => {
      try {
        const r = await excluirCliente(c.id);
        if (r.ok) toast.success('Cliente excluído');
        else toast.error(r.mensagem);
      } catch {
        toast.error('Não foi possível excluir o cliente');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')}>Novo cliente</Button>
      </div>

      {clientes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.email ?? '—'}</TableCell>
                <TableCell>{c.telefone ?? '—'}</TableCell>
                <TableCell>{c.empresa ?? '—'}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditando(c)}>Editar</Button>
                  <ConfirmarExclusao
                    titulo={`Excluir ${c.nome}?`}
                    descricao="Os negócios deste cliente também serão excluídos. Esta ação não pode ser desfeita."
                    aoConfirmar={() => excluir(c)}
                    desabilitado={excluindo}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === 'novo' ? 'Novo cliente' : 'Editar cliente'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormCliente
              key={editando === 'novo' ? 'novo' : editando.id}
              cliente={editando === 'novo' ? undefined : editando}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Passo 3: Página**

`app/dashboard/clientes/page.tsx`:

```tsx
import { BuscaClientes } from '@/components/crm/busca-clientes';
import { TabelaClientes } from '@/components/crm/tabela-clientes';
import { escaparBusca } from '@/lib/schemas';
import { createClient, exigirUsuario } from '@/lib/supabase/server';
import type { Cliente } from '@/lib/tipos';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await exigirUsuario();
  const { q = '' } = await searchParams;
  const termo = q.trim();

  const supabase = await createClient();
  let consulta = supabase.from('clientes').select('id, nome, email, telefone, empresa').order('nome');
  // .ilike direto (nunca .or com interpolação); curingas escapados.
  if (termo) consulta = consulta.ilike('nome', `%${escaparBusca(termo)}%`);
  const { data, error } = await consulta;
  if (error) throw new Error('Falha ao carregar clientes');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <BuscaClientes q={termo} />
      <TabelaClientes clientes={(data ?? []) as Cliente[]} />
    </div>
  );
}
```

- [ ] **Passo 4: Verificar manualmente**

Rode `npm run dev` e confira:
1. Criar um cliente só com o nome funciona.
2. Um e-mail inválido mostra "E-mail inválido" e mantém o nome digitado.
3. Editar funciona.
4. A busca por "ana" encontra "Ana Souza".
5. A busca por "%" não traz todos os clientes.
6. Excluir pede confirmação e remove a linha.
7. Depois de excluir, os indicadores em `/dashboard` mudam.

Rode: `npm run build`
Esperado: termina sem erros.

- [ ] **Passo 5: Commit**

```bash
git add app components
git commit -m "feat(clientes): lista com busca, modal de criar/editar e exclusão"
```

---

### Tarefa 11: Funil: exibir colunas e criar, editar e excluir negócio

**Arquivos:**
- Criar: `lib/kanban.ts` (tipo e agrupamento), `app/dashboard/funil/actions.ts` (`salvarNegocio`, `excluirNegocio`), `app/dashboard/funil/page.tsx`, `components/crm/form-negocio.tsx`, `components/crm/card-negocio.tsx`, `components/crm/coluna-kanban.tsx`, `components/crm/kanban.tsx` (versão sem arrastar)
- Teste: `tests/unit/kanban.test.ts` (só agrupamento)

**Interfaces:**
- Consome:
  - `negocioSchema`, `parseValorBRL` (Tarefas 2 e 3);
  - `formatarBRL`, `formatarNumeroBR` (Tarefa 2);
  - `somarValores` (Tarefa 3);
  - `ConfirmarExclusao` (Tarefa 10);
  - `ETAPAS`, `ROTULO_ETAPA`.
- Produz:
  - `type NegocioCard = { id: string; titulo: string; valor: number; etapa: Etapa; posicao: number; cliente_id: string; clienteNome: string }`;
  - `agruparPorEtapa<T extends { etapa: Etapa }>(itens: T[]): Record<Etapa, T[]>`;
  - as actions `salvarNegocio(prev, fd)` e `excluirNegocio(id)`;
  - o componente `<Kanban negocios clientes />`.

- [ ] **Passo 1: Teste que falha**

`tests/unit/kanban.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { agruparPorEtapa } from '@/lib/kanban';

describe('agruparPorEtapa', () => {
  it('cria as 5 colunas e mantém a ordem recebida', () => {
    const r = agruparPorEtapa([
      { id: 'a', etapa: 'proposta' as const },
      { id: 'b', etapa: 'contato' as const },
      { id: 'c', etapa: 'proposta' as const },
    ]);
    expect(Object.keys(r)).toEqual(['contato', 'proposta', 'negociacao', 'fechado', 'perdido']);
    expect(r.proposta.map((n) => n.id)).toEqual(['a', 'c']);
    expect(r.fechado).toEqual([]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode: `npm test`
Esperado: FAIL com "Failed to resolve import '@/lib/kanban'".

- [ ] **Passo 3: Implementar `lib/kanban.ts` (primeira parte)**

```ts
import { ETAPAS, type Etapa } from '@/lib/etapas';

export type NegocioCard = {
  id: string;
  titulo: string;
  valor: number;
  etapa: Etapa;
  posicao: number;
  cliente_id: string;
  clienteNome: string;
};

export function agruparPorEtapa<T extends { etapa: Etapa }>(itens: T[]): Record<Etapa, T[]> {
  const colunas = Object.fromEntries(ETAPAS.map((e) => [e, [] as T[]])) as Record<Etapa, T[]>;
  for (const item of itens) colunas[item.etapa].push(item);
  return colunas;
}
```

Rode: `npm test`
Esperado: PASS.

- [ ] **Passo 4: Actions de negócio**

`app/dashboard/funil/actions.ts`:

```ts
'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { lerCampos, NEGOCIO_NAO_EXISTE, SESSAO_EXPIRADA, type EstadoForm } from '@/lib/acoes';
import type { Etapa } from '@/lib/etapas';
import { errosDeCampo, negocioSchema } from '@/lib/schemas';
import { createClient, obterUsuario } from '@/lib/supabase/server';

function revalidar() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/funil');
}

// Fim da coluna: coalesce(max(posicao), -1) + 1.
async function proximaPosicao(supabase: SupabaseClient, etapa: Etapa): Promise<number> {
  const { data } = await supabase
    .from('negocios')
    .select('posicao')
    .eq('etapa', etapa)
    .order('posicao', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? data.posicao + 1 : 0;
}

export async function salvarNegocio(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!(await obterUsuario())) return { ok: false, mensagem: SESSAO_EXPIRADA };
  const valores = lerCampos(fd, ['id', 'titulo', 'valor', 'cliente_id', 'etapa']);
  const r = negocioSchema.safeParse(valores);
  if (!r.success) return { ok: false, erros: errosDeCampo(r.error), valores };

  const supabase = await createClient();
  let erro: unknown = null;

  if (valores.id) {
    const { data: atual } = await supabase.from('negocios').select('etapa').eq('id', valores.id).maybeSingle();
    if (!atual) return { ok: false, mensagem: NEGOCIO_NAO_EXISTE, valores };
    // Mudou de etapa: vai para o fim da nova coluna. Senão, mantém a posição.
    const dados =
      atual.etapa === r.data.etapa
        ? r.data
        : { ...r.data, posicao: await proximaPosicao(supabase, r.data.etapa) };
    ({ error: erro } = await supabase.from('negocios').update(dados).eq('id', valores.id));
  } else {
    const posicao = await proximaPosicao(supabase, r.data.etapa);
    ({ error: erro } = await supabase.from('negocios').insert({ ...r.data, posicao }));
  }
  if (erro) return { ok: false, mensagem: 'Não foi possível salvar o negócio', valores };

  revalidar();
  return { ok: true };
}

export async function excluirNegocio(id: string): Promise<EstadoForm> {
  if (!(await obterUsuario())) return { ok: false, mensagem: SESSAO_EXPIRADA };
  const supabase = await createClient();
  const { error } = await supabase.from('negocios').delete().eq('id', id);
  if (error) return { ok: false, mensagem: 'Não foi possível excluir o negócio' };
  revalidar();
  return { ok: true };
}
```

- [ ] **Passo 5: Formulário de negócio**

`components/crm/form-negocio.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { excluirNegocio, salvarNegocio } from '@/app/dashboard/funil/actions';
import { Campo } from '@/components/crm/campo';
import { ConfirmarExclusao } from '@/components/crm/confirmar-exclusao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ESTADO_INICIAL } from '@/lib/acoes';
import { ETAPAS, ROTULO_ETAPA } from '@/lib/etapas';
import { formatarBRL, formatarNumeroBR } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { parseValorBRL } from '@/lib/schemas';

const classeSelect =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function FormNegocio({
  negocio,
  clientes,
  aoConcluir,
}: {
  negocio?: NegocioCard;
  clientes: { id: string; nome: string }[];
  aoConcluir: () => void;
}) {
  const [estado, acao, pendente] = useActionState(salvarNegocio, ESTADO_INICIAL);
  const [excluindo, iniciar] = useTransition();
  const [valorTexto, setValorTexto] = useState(negocio ? formatarNumeroBR(negocio.valor) : '');

  useEffect(() => {
    if (estado.ok) {
      toast.success('Negócio salvo');
      aoConcluir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!negocio && clientes.length === 0) {
    return (
      <p className="text-sm">
        Cadastre um cliente primeiro.{' '}
        <Link href="/dashboard/clientes" className="underline">Ir para Clientes</Link>
      </p>
    );
  }

  const v = (campo: 'titulo' | 'cliente_id' | 'etapa', padrao: string) => estado.valores?.[campo] ?? padrao;
  const previa = parseValorBRL(valorTexto);

  function excluir() {
    if (!negocio) return;
    iniciar(async () => {
      try {
        const r = await excluirNegocio(negocio.id);
        if (r.ok) {
          toast.success('Negócio excluído');
          aoConcluir();
        } else toast.error(r.mensagem);
      } catch {
        toast.error('Não foi possível excluir o negócio');
      }
    });
  }

  return (
    <form action={acao} className="space-y-4">
      {negocio && <input type="hidden" name="id" value={negocio.id} />}
      <Campo nome="titulo" rotulo="Título" padrao={v('titulo', negocio?.titulo ?? '')} erros={estado.erros?.titulo} />

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor</Label>
        <Input
          id="valor"
          name="valor"
          inputMode="decimal"
          placeholder="1.500,50"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
          aria-invalid={estado.erros?.valor ? true : undefined}
        />
        {previa.ok && <p className="text-xs text-muted-foreground">= {formatarBRL(previa.valor)}</p>}
        {estado.erros?.valor && <p className="text-sm text-destructive">{estado.erros.valor[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cliente_id">Cliente</Label>
        <select id="cliente_id" name="cliente_id" className={classeSelect} defaultValue={v('cliente_id', negocio?.cliente_id ?? '')}>
          <option value="" disabled>Selecione…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        {estado.erros?.cliente_id && <p className="text-sm text-destructive">{estado.erros.cliente_id[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="etapa">Etapa</Label>
        <select id="etapa" name="etapa" className={classeSelect} defaultValue={v('etapa', negocio?.etapa ?? 'contato')}>
          {ETAPAS.map((e) => (
            <option key={e} value={e}>{ROTULO_ETAPA[e]}</option>
          ))}
        </select>
      </div>

      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Button>
        {negocio && (
          <ConfirmarExclusao
            titulo={`Excluir "${negocio.titulo}"?`}
            descricao="Esta ação não pode ser desfeita."
            aoConfirmar={excluir}
            desabilitado={excluindo}
          />
        )}
      </div>
    </form>
  );
}
```

- [ ] **Passo 6: Card, coluna e kanban (ainda sem arrastar)**

`components/crm/card-negocio.tsx`:

```tsx
'use client';

import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';

export function CardNegocio({ negocio, aoAbrir }: { negocio: NegocioCard; aoAbrir: (n: NegocioCard) => void }) {
  return (
    <div
      onClick={() => aoAbrir(negocio)}
      className="cursor-pointer rounded-md border bg-background p-3 text-sm shadow-sm"
    >
      <p className="font-medium">{negocio.titulo}</p>
      <p className="text-muted-foreground">{negocio.clienteNome}</p>
      <p className="mt-1 font-semibold">{formatarBRL(negocio.valor)}</p>
    </div>
  );
}
```

`components/crm/coluna-kanban.tsx`:

```tsx
'use client';

import { CardNegocio } from '@/components/crm/card-negocio';
import { ROTULO_ETAPA, type Etapa } from '@/lib/etapas';
import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { somarValores } from '@/lib/metrics';

export function ColunaKanban({
  etapa,
  negocios,
  aoAbrir,
}: {
  etapa: Etapa;
  negocios: NegocioCard[];
  aoAbrir: (n: NegocioCard) => void;
}) {
  return (
    <section
      data-testid={`coluna-${etapa}`}
      aria-label={ROTULO_ETAPA[etapa]}
      className="flex min-h-64 flex-col gap-2 rounded-lg border bg-muted/40 p-3"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{ROTULO_ETAPA[etapa]}</h2>
        <span className="text-sm text-muted-foreground">{formatarBRL(somarValores(negocios.map((n) => n.valor)))}</span>
      </header>
      {negocios.map((n) => (
        <CardNegocio key={n.id} negocio={n} aoAbrir={aoAbrir} />
      ))}
    </section>
  );
}
```

`components/crm/kanban.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ColunaKanban } from '@/components/crm/coluna-kanban';
import { FormNegocio } from '@/components/crm/form-negocio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ETAPAS } from '@/lib/etapas';
import { agruparPorEtapa, type NegocioCard } from '@/lib/kanban';

type ClienteOpcao = { id: string; nome: string };

export function Kanban({ negocios, clientes }: { negocios: NegocioCard[]; clientes: ClienteOpcao[] }) {
  const [colunas] = useState(() => agruparPorEtapa(negocios));
  const [editando, setEditando] = useState<NegocioCard | 'novo' | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')}>Novo negócio</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {ETAPAS.map((etapa) => (
          <ColunaKanban key={etapa} etapa={etapa} negocios={colunas[etapa]} aoAbrir={setEditando} />
        ))}
      </div>
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === 'novo' ? 'Cadastrar negócio' : 'Editar negócio'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormNegocio
              key={editando === 'novo' ? 'novo' : editando.id}
              negocio={editando === 'novo' ? undefined : editando}
              clientes={clientes}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Passo 7: Página do funil**

`app/dashboard/funil/page.tsx`:

```tsx
import { Kanban } from '@/components/crm/kanban';
import type { Etapa } from '@/lib/etapas';
import type { NegocioCard } from '@/lib/kanban';
import { createClient, exigirUsuario } from '@/lib/supabase/server';

export default async function FunilPage() {
  await exigirUsuario();
  const supabase = await createClient();
  const [negociosR, clientesR] = await Promise.all([
    supabase
      .from('negocios')
      .select('id, titulo, valor, etapa, posicao, cliente_id, clientes(nome)')
      .order('posicao')
      .order('created_at')
      .order('id'),
    supabase.from('clientes').select('id, nome').order('nome'),
  ]);
  if (negociosR.error || clientesR.error) throw new Error('Falha ao carregar o funil');

  const negocios: NegocioCard[] = (negociosR.data ?? []).map((n) => ({
    id: n.id,
    titulo: n.titulo,
    valor: Number(n.valor),
    etapa: n.etapa as Etapa,
    posicao: n.posicao,
    cliente_id: n.cliente_id,
    clienteNome: (n.clientes as unknown as { nome: string } | null)?.nome ?? '—',
  }));

  // A key remonta o kanban quando os dados do servidor mudam (depois de salvar ou mover).
  const assinatura = negocios.map((n) => `${n.id}:${n.etapa}:${n.posicao}:${n.valor}:${n.titulo}:${n.clienteNome}`).join('|');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Funil de vendas</h1>
      <Kanban key={assinatura} negocios={negocios} clientes={clientesR.data ?? []} />
    </div>
  );
}
```

- [ ] **Passo 8: Verificar manualmente**

Rode `npm run dev` e confira:
1. As 5 colunas aparecem, cada uma com o total no topo.
2. "Novo negócio" numa conta sem clientes mostra "Cadastre um cliente primeiro".
3. Com clientes, digitar "2.500" no valor mostra "= R$ 2.500,00". Salvar faz o card aparecer no fim da coluna Contato.
4. Clicar no card abre a edição. Trocar a etapa para Fechado move o card para o fim de Fechado.
5. "Excluir" pede confirmação e remove o card.

Rode: `npm test && npm run build`
Esperado: os testes passam e o build termina sem erros.

- [ ] **Passo 9: Commit**

```bash
git add lib app components tests/unit
git commit -m "feat(funil): colunas, criar/editar/excluir negócio"
```

---

### Tarefa 12: Funil: arrastar e soltar

**Arquivos:**
- Modificar: `lib/kanban.ts` (acrescentar `localizarDestino`, `aplicarMovimento`, `mensagemErroMover`), `app/dashboard/funil/actions.ts` (acrescentar `moverNegocio`), `components/crm/card-negocio.tsx`, `components/crm/coluna-kanban.tsx`, `components/crm/kanban.tsx`
- Teste: `tests/unit/kanban.test.ts` (acrescentar testes)

**Interfaces:**
- Consome: `NegocioCard`, `agruparPorEtapa` (Tarefa 11); `moverSchema`, `FALHA_MOVER`, `NEGOCIO_NAO_EXISTE` (Tarefa 3); a RPC `mover_negocio` (Tarefa 5).
- Produz:
  - `localizarDestino(colunas: Record<Etapa, {id: string}[]>, overId: string): { etapa: Etapa; indice: number } | null`. Um `overId` no formato `coluna:<etapa>` indica o fim da coluna;
  - `aplicarMovimento<T extends { id: string; etapa: Etapa }>(colunas, id, etapaDestino, indiceDestino): { colunas: Record<Etapa, T[]>; idsDestino: string[] } | null`. Devolve `null` quando nada muda;
  - `mensagemErroMover(codigo?: string): string`;
  - a action `moverNegocio(id: string, etapa: Etapa, ids: string[]): Promise<EstadoForm>`.

- [ ] **Passo 1: Escrever os testes que falham**

Acrescente a `tests/unit/kanban.test.ts`. Junte os imports ao import existente do topo, ficando `import { agruparPorEtapa, aplicarMovimento, localizarDestino, mensagemErroMover } from '@/lib/kanban';`.

```ts
type Item = { id: string; etapa: 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'perdido' };
const quadro = () =>
  agruparPorEtapa<Item>([
    { id: 'a', etapa: 'contato' },
    { id: 'b', etapa: 'contato' },
    { id: 'c', etapa: 'contato' },
    { id: 'p', etapa: 'proposta' },
  ]);
const ids = (c: Record<string, Item[]>, e: string) => c[e].map((n) => n.id);

describe('localizarDestino', () => {
  it('coluna vazia ou área da coluna vai para o fim', () => {
    expect(localizarDestino(quadro(), 'coluna:fechado')).toEqual({ etapa: 'fechado', indice: 0 });
    expect(localizarDestino(quadro(), 'coluna:contato')).toEqual({ etapa: 'contato', indice: 3 });
  });
  it('sobre um card usa a posição dele', () => {
    expect(localizarDestino(quadro(), 'p')).toEqual({ etapa: 'proposta', indice: 0 });
    expect(localizarDestino(quadro(), 'c')).toEqual({ etapa: 'contato', indice: 2 });
  });
  it('id desconhecido devolve null', () => {
    expect(localizarDestino(quadro(), 'zzz')).toBeNull();
  });
});

describe('aplicarMovimento', () => {
  it('move para outra coluna antes do card de destino', () => {
    const r = aplicarMovimento(quadro(), 'a', 'proposta', 0)!;
    expect(ids(r.colunas, 'contato')).toEqual(['b', 'c']);
    expect(ids(r.colunas, 'proposta')).toEqual(['a', 'p']);
    expect(r.colunas.proposta[0].etapa).toBe('proposta');
    expect(r.idsDestino).toEqual(['a', 'p']);
  });
  it('move para coluna vazia', () => {
    const r = aplicarMovimento(quadro(), 'b', 'fechado', 0)!;
    expect(ids(r.colunas, 'fechado')).toEqual(['b']);
    expect(r.idsDestino).toEqual(['b']);
  });
  it('reordena dentro da mesma coluna (para baixo e para cima)', () => {
    expect(ids(aplicarMovimento(quadro(), 'a', 'contato', 2)!.colunas, 'contato')).toEqual(['b', 'c', 'a']);
    expect(ids(aplicarMovimento(quadro(), 'c', 'contato', 0)!.colunas, 'contato')).toEqual(['c', 'a', 'b']);
  });
  it('soltar no mesmo lugar devolve null (nada é gravado)', () => {
    expect(aplicarMovimento(quadro(), 'b', 'contato', 1)).toBeNull();
  });
  it('índice além do fim vai para o fim', () => {
    expect(ids(aplicarMovimento(quadro(), 'a', 'contato', 99)!.colunas, 'contato')).toEqual(['b', 'c', 'a']);
  });
  it('não altera o quadro original', () => {
    const q = quadro();
    aplicarMovimento(q, 'a', 'proposta', 0);
    expect(ids(q, 'contato')).toEqual(['a', 'b', 'c']);
  });
  it('id desconhecido devolve null', () => {
    expect(aplicarMovimento(quadro(), 'zzz', 'contato', 0)).toBeNull();
  });
});

describe('mensagemErroMover', () => {
  it('P0002 vira "não existe mais"; o resto é genérico', () => {
    expect(mensagemErroMover('P0002')).toBe('Este negócio não existe mais');
    expect(mensagemErroMover('40001')).toBe('Não foi possível mover o negócio, tente de novo');
    expect(mensagemErroMover(undefined)).toBe('Não foi possível mover o negócio, tente de novo');
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode: `npm test`
Esperado: FAIL com "localizarDestino is not a function" (ou export ausente).

- [ ] **Passo 3: Implementar em `lib/kanban.ts`**

Acrescente ao arquivo. O import de `FALHA_MOVER` e `NEGOCIO_NAO_EXISTE` vai no topo:

```ts
import { FALHA_MOVER, NEGOCIO_NAO_EXISTE } from '@/lib/acoes';
```

```ts
const PREFIXO_COLUNA = 'coluna:';

export function localizarDestino(
  colunas: Record<Etapa, { id: string }[]>,
  overId: string,
): { etapa: Etapa; indice: number } | null {
  if (overId.startsWith(PREFIXO_COLUNA)) {
    const etapa = overId.slice(PREFIXO_COLUNA.length) as Etapa;
    return etapa in colunas ? { etapa, indice: colunas[etapa].length } : null;
  }
  for (const etapa of ETAPAS) {
    const indice = colunas[etapa].findIndex((n) => n.id === overId);
    if (indice >= 0) return { etapa, indice };
  }
  return null;
}

export function aplicarMovimento<T extends { id: string; etapa: Etapa }>(
  colunas: Record<Etapa, T[]>,
  id: string,
  etapaDestino: Etapa,
  indiceDestino: number,
): { colunas: Record<Etapa, T[]>; idsDestino: string[] } | null {
  const origem = ETAPAS.find((e) => colunas[e].some((n) => n.id === id));
  if (!origem) return null;
  const indiceOrigem = colunas[origem].findIndex((n) => n.id === id);

  const novas = Object.fromEntries(ETAPAS.map((e) => [e, [...colunas[e]]])) as Record<Etapa, T[]>;
  const [item] = novas[origem].splice(indiceOrigem, 1);
  const destino = novas[etapaDestino];
  const indice = Math.min(Math.max(indiceDestino, 0), destino.length);

  if (origem === etapaDestino && indice === indiceOrigem) return null;

  destino.splice(indice, 0, { ...item, etapa: etapaDestino });
  return { colunas: novas, idsDestino: destino.map((n) => n.id) };
}

export function mensagemErroMover(codigo?: string): string {
  return codigo === 'P0002' ? NEGOCIO_NAO_EXISTE : FALHA_MOVER;
}
```

Rode: `npm test`
Esperado: PASS.

- [ ] **Passo 4: Action `moverNegocio`**

Acrescente a `app/dashboard/funil/actions.ts`:
- no import de `@/lib/acoes`, inclua `FALHA_MOVER`;
- no import de `@/lib/schemas`, inclua `moverSchema`;
- acrescente `import { mensagemErroMover } from '@/lib/kanban';`.

Depois acrescente a função:

```ts
export async function moverNegocio(id: string, etapa: Etapa, ids: string[]): Promise<EstadoForm> {
  if (!(await obterUsuario())) return { ok: false, mensagem: SESSAO_EXPIRADA };
  const r = moverSchema.safeParse({ id, etapa, ids });
  if (!r.success) return { ok: false, mensagem: FALHA_MOVER };

  const supabase = await createClient();
  const { error } = await supabase.rpc('mover_negocio', {
    p_id: r.data.id,
    p_etapa: r.data.etapa,
    p_ids: r.data.ids,
  });
  // Decide pelo código do erro, nunca pelo texto.
  if (error) return { ok: false, mensagem: mensagemErroMover(error.code) };

  revalidar();
  return { ok: true };
}
```

- [ ] **Passo 5: Ligar o dnd-kit nos componentes**

Substitua `components/crm/card-negocio.tsx`:

```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { cn } from '@/lib/utils';

export function CardNegocio({ negocio, aoAbrir }: { negocio: NegocioCard; aoAbrir: (n: NegocioCard) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: negocio.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => aoAbrir(negocio)}
      className={cn(
        'cursor-grab touch-none rounded-md border bg-background p-3 text-sm shadow-sm',
        isDragging && 'opacity-50',
      )}
    >
      <p className="font-medium">{negocio.titulo}</p>
      <p className="text-muted-foreground">{negocio.clienteNome}</p>
      <p className="mt-1 font-semibold">{formatarBRL(negocio.valor)}</p>
    </div>
  );
}
```

Substitua `components/crm/coluna-kanban.tsx`:

```tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardNegocio } from '@/components/crm/card-negocio';
import { ROTULO_ETAPA, type Etapa } from '@/lib/etapas';
import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { somarValores } from '@/lib/metrics';
import { cn } from '@/lib/utils';

export function ColunaKanban({
  etapa,
  negocios,
  aoAbrir,
}: {
  etapa: Etapa;
  negocios: NegocioCard[];
  aoAbrir: (n: NegocioCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `coluna:${etapa}` });
  return (
    <section
      ref={setNodeRef}
      data-testid={`coluna-${etapa}`}
      aria-label={ROTULO_ETAPA[etapa]}
      className={cn(
        'flex min-h-64 flex-col gap-2 rounded-lg border bg-muted/40 p-3',
        isOver && 'ring-2 ring-primary',
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{ROTULO_ETAPA[etapa]}</h2>
        <span className="text-sm text-muted-foreground">{formatarBRL(somarValores(negocios.map((n) => n.valor)))}</span>
      </header>
      <SortableContext id={etapa} items={negocios.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        {negocios.map((n) => (
          <CardNegocio key={n.id} negocio={n} aoAbrir={aoAbrir} />
        ))}
      </SortableContext>
    </section>
  );
}
```

Substitua `components/crm/kanban.tsx`:

```tsx
'use client';

import {
  closestCorners, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { moverNegocio } from '@/app/dashboard/funil/actions';
import { ColunaKanban } from '@/components/crm/coluna-kanban';
import { FormNegocio } from '@/components/crm/form-negocio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FALHA_MOVER } from '@/lib/acoes';
import { ETAPAS } from '@/lib/etapas';
import { agruparPorEtapa, aplicarMovimento, localizarDestino, type NegocioCard } from '@/lib/kanban';

type ClienteOpcao = { id: string; nome: string };

export function Kanban({ negocios, clientes }: { negocios: NegocioCard[]; clientes: ClienteOpcao[] }) {
  const [colunas, setColunas] = useState(() => agruparPorEtapa(negocios));
  const [editando, setEditando] = useState<NegocioCard | 'novo' | null>(null);
  const [, iniciar] = useTransition();
  const fimDoArraste = useRef(0);

  const sensores = useSensors(
    // distância mínima: um clique simples abre a edição em vez de arrastar
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function abrir(n: NegocioCard) {
    // ignora o clique que o navegador dispara logo após soltar um card
    if (Date.now() - fimDoArraste.current < 250) return;
    setEditando(n);
  }

  function aoSoltar({ active, over }: DragEndEvent) {
    fimDoArraste.current = Date.now();
    if (!over) return;
    const id = String(active.id);
    const destino = localizarDestino(colunas, String(over.id));
    if (!destino) return;
    const resultado = aplicarMovimento(colunas, id, destino.etapa, destino.indice);
    if (!resultado) return; // soltou no mesmo lugar

    const anterior = colunas;
    setColunas(resultado.colunas); // atualização otimista
    iniciar(async () => {
      try {
        const r = await moverNegocio(id, destino.etapa, resultado.idsDestino);
        if (!r.ok) {
          setColunas(anterior);
          toast.error(r.mensagem);
        }
      } catch {
        setColunas(anterior);
        toast.error(FALHA_MOVER);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')}>Novo negócio</Button>
      </div>
      <DndContext id="kanban" sensors={sensores} collisionDetection={closestCorners} onDragEnd={aoSoltar}>
        <div className="grid gap-4 md:grid-cols-5">
          {ETAPAS.map((etapa) => (
            <ColunaKanban key={etapa} etapa={etapa} negocios={colunas[etapa]} aoAbrir={abrir} />
          ))}
        </div>
      </DndContext>
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === 'novo' ? 'Cadastrar negócio' : 'Editar negócio'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormNegocio
              key={editando === 'novo' ? 'novo' : editando.id}
              negocio={editando === 'novo' ? undefined : editando}
              clientes={clientes}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Passo 6: Verificar manualmente**

Rode `npm run dev` e confira:
1. Arrastar um card para outra coluna faz o card mudar na hora. Depois de recarregar, ele continua lá.
2. Reordenar dentro da coluna e recarregar mantém a ordem nova.
3. Arrastar para uma coluna vazia funciona.
4. Um clique simples no card abre a edição.
5. Para testar a falha, pare o Supabase (`npx supabase stop`) e arraste um card. Ele deve voltar ao lugar, com um toast de erro. Depois religue com `npx supabase start`.

Rode: `npm test && npm run build`
Esperado: os testes passam e o build termina sem erros.

- [ ] **Passo 7: Commit**

```bash
git add lib app components tests/unit
git commit -m "feat(funil): arrastar e soltar com atualização otimista e rollback"
```

---

### Tarefa 13: Lint e revisão de tipos

**Arquivos:**
- Modificar: somente o que o lint apontar.

- [ ] **Passo 1: Rodar o lint**

Rode: `npm run lint`
Esperado: nenhum erro. Se aparecer erro, corrija no arquivo apontado, sem mudar comportamento, e rode de novo. Avisos sobre o `// eslint-disable-next-line react-hooks/exhaustive-deps` dos formulários são intencionais: o efeito deve rodar só quando o `estado` mudar.

- [ ] **Passo 2: Rodar tudo**

```bash
npm test
npm run test:db
npm run build
```

Esperado: tudo passa.

- [ ] **Passo 3: Commit**, se algo mudou

```bash
git add -A
git commit -m "chore: ajustes de lint"
```

---

### Tarefa 14: Testes de ponta a ponta (Playwright)

**Arquivos:**
- Criar: `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/auth.setup.ts`, `tests/e2e/global-teardown.ts`, `tests/e2e/acesso.spec.ts`, `tests/e2e/crm.spec.ts`, `tests/e2e/isolamento.spec.ts`

**Interfaces:**
- Consome:
  - as telas das Tarefas 7 a 12, com os rótulos "Nome", "E-mail", "Senha", "Criar conta", "Entrar", "Sair", "Novo cliente", "Salvar", "Novo negócio", "Título", "Valor", "Cliente";
  - os `data-testid="coluna-<etapa>"` das colunas;
  - o Supabase local.
- Produz: `npm run test:e2e` cobrindo os 4 cenários da spec e o item 1 do Foco da revisão.

Observação: a spec fala em `globalSetup`. Aqui usamos um **projeto de setup** do Playwright (`auth.setup.ts`), que é o padrão atual. Ele roda depois de o servidor subir e antes dos testes, com o mesmo efeito.

- [ ] **Passo 1: Configuração e helpers**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

`tests/e2e/helpers.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Page } from '@playwright/test';

config({ path: '.env.local' });

export const URL_BASE = 'http://localhost:3000';
export const SENHA = 'senha-teste-123';
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  opcoes,
);

export function clienteAnonimo() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opcoes);
}

let contador = 0;
export function emailUnico(rotulo: string) {
  contador += 1;
  return `e2e+${Date.now()}-${rotulo}-${contador}@exemplo.com`;
}

const DIR_AUTH = path.join('tests', 'e2e', '.auth');
export const estado = (quem: 'a' | 'b') => path.join(DIR_AUTH, `${quem}.json`);
const ARQ_USUARIOS = path.join(DIR_AUTH, 'usuarios.json');

export type UsuarioTeste = { id: string; email: string };

export function salvarUsuarios(u: Record<'a' | 'b', UsuarioTeste>) {
  fs.mkdirSync(DIR_AUTH, { recursive: true });
  fs.writeFileSync(ARQ_USUARIOS, JSON.stringify(u));
}

export function lerUsuarios(): Record<'a' | 'b', UsuarioTeste> {
  return JSON.parse(fs.readFileSync(ARQ_USUARIOS, 'utf8'));
}

export async function entrarPelaTela(page: Page, email: string) {
  await page.goto(`${URL_BASE}/login`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${URL_BASE}/dashboard`);
}
```

`tests/e2e/auth.setup.ts`:

```ts
import { test as setup } from '@playwright/test';
import { admin, emailUnico, entrarPelaTela, estado, salvarUsuarios, SENHA, type UsuarioTeste } from './helpers';

async function criar(nome: string): Promise<UsuarioTeste> {
  const email = emailUnico(nome);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true, // a API de admin não confirma sozinha
    user_metadata: { nome: `Usuário ${nome}` },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}

setup('cria os usuários A e B e salva as sessões', async ({ browser }) => {
  const usuarios = { a: await criar('A'), b: await criar('B') };
  salvarUsuarios(usuarios);
  for (const quem of ['a', 'b'] as const) {
    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await entrarPelaTela(page, usuarios[quem].email);
    await contexto.storageState({ path: estado(quem) });
    await contexto.close();
  }
});
```

`tests/e2e/global-teardown.ts`:

```ts
import { admin } from './helpers';

// Duas etapas: primeiro coleta todos os ids e só depois apaga.
// Apagar durante a paginação faria usuários pularem de página e escaparem da limpeza.
export default async function globalTeardown() {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    if (data.users.length === 0) break;
    for (const u of data.users) if (u.email?.startsWith('e2e+')) ids.push(u.id);
  }
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}
```

- [ ] **Passo 2: Cenários 1 e 2 (acesso)**

`tests/e2e/acesso.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { emailUnico, SENHA } from './helpers';

test('cadastro → dashboard → sair → volta para /login', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa Cadastro');
  await page.getByLabel('E-mail').fill(emailUnico('cadastro'));
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Pessoa Cadastro')).toBeVisible();
  await expect(page.getByText('Seu CRM está vazio')).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('sem sessão, o dashboard redireciona para /login', async ({ page }) => {
  for (const rota of ['/dashboard', '/dashboard/clientes', '/dashboard/funil', '/']) {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/login$/);
  }
});
```

- [ ] **Passo 3: Cenário 3 e Foco da revisão, item 1 (CRM)**

`tests/e2e/crm.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { estado } from './helpers';

test.use({ storageState: estado('a') });

test('erro de validação mantém o que foi digitado', async ({ page }) => {
  await page.goto('/dashboard/clientes');
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill('Nome Preservado');
  await dialogo.getByLabel('E-mail').fill('invalido@');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  await expect(dialogo.getByText('E-mail inválido')).toBeVisible();
  await expect(dialogo.getByLabel('Nome')).toHaveValue('Nome Preservado');
});

test('cria cliente e negócio, move o negócio e a mudança persiste', async ({ page }) => {
  const sufixo = Date.now();
  const nomeCliente = `Cliente ${sufixo}`;
  const titulo = `Negócio ${sufixo}`;

  await page.goto('/dashboard/clientes');
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill(nomeCliente);
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('cell', { name: nomeCliente })).toBeVisible();

  await page.goto('/dashboard/funil');
  await page.getByRole('button', { name: 'Novo negócio' }).click();
  await dialogo.getByLabel('Título').fill(titulo);
  await dialogo.getByLabel('Valor').fill('1.500,50');
  await expect(dialogo.getByText(/^=\sR\$\s1\.500,50$/)).toBeVisible(); // \s cobre o espaço não separável
  await dialogo.getByLabel('Cliente').selectOption({ label: nomeCliente });
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialogo).toBeHidden();

  const contato = page.getByTestId('coluna-contato');
  const proposta = page.getByTestId('coluna-proposta');
  const card = contato.getByText(titulo);
  await expect(card).toBeVisible();

  // arrastar com o mouse, em passos, para o dnd-kit reconhecer o movimento
  const alvo = (await proposta.boundingBox())!;
  await card.hover();
  await page.mouse.down();
  await page.mouse.move(alvo.x + alvo.width / 2, alvo.y + alvo.height / 2, { steps: 15 });
  const gravacao = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().includes('/dashboard/funil'),
  );
  await page.mouse.up();
  await gravacao;

  await page.reload();
  await expect(proposta.getByText(titulo)).toBeVisible();
  await expect(contato.getByText(titulo)).toHaveCount(0);
});
```

- [ ] **Passo 4: Cenário 4 (isolamento)**

`tests/e2e/isolamento.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { admin, clienteAnonimo, estado, lerUsuarios, SENHA, URL_BASE } from './helpers';

test('B não vê o cliente de A e o banco recusa ligar negócio a ele', async ({ browser }) => {
  const usuarios = lerUsuarios();
  const nome = `Cliente de A ${Date.now()}`;

  const ctxA = await browser.newContext({ storageState: estado('a') });
  const pageA = await ctxA.newPage();
  await pageA.goto(`${URL_BASE}/dashboard/clientes`);
  await pageA.getByRole('button', { name: 'Novo cliente' }).click();
  await pageA.getByRole('dialog').getByLabel('Nome').fill(nome);
  await pageA.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
  await expect(pageA.getByRole('cell', { name: nome })).toBeVisible();
  await ctxA.close();

  const ctxB = await browser.newContext({ storageState: estado('b') });
  const pageB = await ctxB.newPage();
  await pageB.goto(`${URL_BASE}/dashboard/clientes?q=${encodeURIComponent('Cliente de A')}`);
  await expect(pageB.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await expect(pageB.getByText(nome)).toHaveCount(0);
  await ctxB.close();

  // A tela de B nunca oferece o cliente de A, então testamos direto no banco com a sessão de B.
  const { data: doA } = await admin.from('clientes').select('id').eq('nome', nome).single();
  const b = clienteAnonimo();
  const login = await b.auth.signInWithPassword({ email: usuarios.b.email, password: SENHA });
  expect(login.error).toBeNull();

  const { data, error } = await b
    .from('negocios')
    .insert({ cliente_id: doA!.id, titulo: 'Invasão', valor: 1, etapa: 'contato', posicao: 0 })
    .select();
  expect(error?.code).toBe('23503');
  expect(data).toBeNull();

  const { count } = await admin
    .from('negocios')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', usuarios.b.id)
    .eq('titulo', 'Invasão');
  expect(count).toBe(0);
});
```

- [ ] **Passo 5: Rodar**

Com o Supabase local rodando (`npx supabase status`), rode:

```bash
npm run test:e2e
```

Esperado: 6 testes passam (1 de setup, 2 de acesso, 2 de CRM e 1 de isolamento). Depois, confira no Studio local (`http://127.0.0.1:54323`, em Authentication) que não sobrou nenhum usuário `e2e+`.

Se o teste de arrastar falhar de forma intermitente, aumente `steps` para 25 e acrescente `await page.mouse.move(alvo.x + 10, alvo.y + 10, { steps: 5 })` antes do movimento principal. O dnd-kit precisa de pelo menos 5px de movimento para começar o arraste.

- [ ] **Passo 6: Commit**

```bash
git add playwright.config.ts tests/e2e
git commit -m "test(e2e): cadastro, proteção de rotas, funil e isolamento entre usuários"
```

---

### Tarefa 15: README e publicação na Vercel

**Arquivos:**
- Criar/Substituir: `README.md`

- [ ] **Passo 1: Escrever o README**

````markdown
# Mini CRM — projeto de estudo

Login com e-mail e senha + dashboard de CRM (visão geral, clientes e funil kanban).
Stack: Next.js 16, Supabase, Tailwind + shadcn/ui, dnd-kit, Zod, Vitest e Playwright.

## Rodar localmente

Pré-requisitos: Node.js 22+ e Docker Desktop aberto.

```bash
npm install
npx supabase start          # sobe Postgres + Auth locais e aplica as migrations
npx supabase status -o env  # copie os valores para o .env.local (veja .env.example)
npm run dev                 # http://localhost:3000
```

## Testes

```bash
npm test          # unidade (regras puras em lib/)
npm run test:db   # banco: RLS, trigger e funções SQL (precisa do Supabase local)
npm run test:e2e  # ponta a ponta com Playwright (precisa do Supabase local)
```

## Publicar na Vercel

1. Crie um projeto em https://supabase.com. Em Authentication → Sign In / Providers → Email,
   **desligue "Confirm email"**.
2. Envie as migrations para ele:
   ```bash
   npx supabase login
   npx supabase link --project-ref <id-do-projeto>
   npx supabase db push
   ```
3. Importe o repositório na Vercel e configure **só** estas variáveis:
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (em Project Settings → API Keys do Supabase).
   **Nunca** configure `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
4. Faça o deploy.

## Como a segurança funciona

- `proxy.ts` renova a sessão e redireciona quem não está logado.
- Cada página e cada Server Action checam o usuário de novo (`exigirUsuario` / `obterUsuario`).
- O banco é a garantia final: RLS em todas as tabelas e uma FK composta
  `(cliente_id, user_id)` que impede ligar um negócio ao cliente de outra pessoa.
````

- [ ] **Passo 2: Verificação final**

```bash
npm test
npm run test:db
npm run test:e2e
npm run build
```

Esperado: tudo passa.

- [ ] **Passo 3: Commit**

```bash
git add README.md
git commit -m "docs: README com setup local, testes e deploy na Vercel"
```
