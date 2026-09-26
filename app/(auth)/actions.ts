'use server';

import { redirect } from 'next/navigation';
import { lerCampos, type EstadoForm } from '@/lib/acoes';
import { decidirPosCadastro } from '@/lib/auth/cadastro';
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
  const { data, error } = await supabase.auth.signUp({
    email: r.data.email,
    password: r.data.senha,
    options: { data: { nome: r.data.nome } },
  });
  if (error) return { ok: false, mensagem: traduzirErroAuth(error.code), valores: devolver };

  // Sem sessão (Supabase hospedado com confirmação de e-mail ligada), mandar para
  // /dashboard faria o proxy devolver a pessoa ao /login sem explicação.
  const decisao = decidirPosCadastro(data);
  if (decisao.tipo === 'confirmar') return { ok: true, mensagem: decisao.mensagem };

  redirect('/dashboard');
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
