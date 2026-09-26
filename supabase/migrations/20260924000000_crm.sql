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
