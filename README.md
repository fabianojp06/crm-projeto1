# Mini CRM — projeto de estudo

Login com e-mail e senha + dashboard de CRM (visão geral, clientes e funil kanban).
Stack: Next.js 16, Supabase, Tailwind + shadcn/ui, dnd-kit, Zod, Vitest e Playwright.
Publicado no EasyPanel a partir do `Dockerfile` da raiz.

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

`test:db` e `test:e2e` criam e apagam usuários com a service role, então recusam rodar se
`NEXT_PUBLIC_SUPABASE_URL` não apontar para `127.0.0.1` ou `localhost`.

## Publicar no EasyPanel

O app vai como imagem Docker (`Dockerfile` na raiz, Next.js em `output: 'standalone'`).

1. **Banco:** crie um projeto em https://supabase.com — ou suba um Supabase self-hosted no
   próprio EasyPanel. Em Authentication → Sign In / Providers → Email,
   **desligue "Confirm email"**. Num projeto hospedado essa opção vem **ligada** por padrão,
   e é a causa mais provável de estranheza no primeiro deploy: com ela ligada o cadastro não
   devolve sessão. O app trata isso mostrando "Confirme o e-mail que enviamos" em vez de
   fingir que entrou — mas, para o fluxo deste projeto de estudo, o certo é desligar.
2. Envie as migrations para ele:
   ```bash
   npx supabase login
   npx supabase link --project-ref <id-do-projeto>
   npx supabase db push
   ```
3. No EasyPanel, crie um **App** no seu projeto e aponte a origem para este repositório Git
   (branch `main`). Em **Build**, escolha **Dockerfile** (`./Dockerfile`).
4. Em **Environment**, cadastre **só** estas duas variáveis, **antes do primeiro build**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
   (estão em Project Settings → API Keys do Supabase). Elas são embutidas no bundle durante o
   build, por isso precisam existir antes dele — se você mudá-las depois, refaça o deploy.
   **Nunca** cadastre `SUPABASE_SERVICE_ROLE_KEY` aqui: ela ignora o RLS e só é usada pelos
   testes locais.
5. Em **Domains**, exponha a porta **3000** e ative o HTTPS (Let's Encrypt).
6. Clique em **Deploy**. Para acompanhar, use a aba Logs do serviço.

## Como a segurança funciona

- `proxy.ts` renova a sessão e redireciona quem não está logado.
- Cada página e cada Server Action checam o usuário de novo (`exigirUsuario` / `obterUsuario`).
- O banco é a garantia final: RLS em todas as tabelas e uma FK composta
  `(cliente_id, user_id)` que impede ligar um negócio ao cliente de outra pessoa.
