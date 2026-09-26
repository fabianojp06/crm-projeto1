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
