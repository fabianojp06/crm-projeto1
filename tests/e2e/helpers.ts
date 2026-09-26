import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Page } from '@playwright/test';

config({ path: '.env.local' });

export const URL_BASE = 'http://localhost:3000';
export const SENHA = 'senha-teste-123';
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Os testes criam e apagam usuários com a service role. Se o .env.local apontar para um
// Supabase hospedado, isso mexe em dados reais: então só rodamos contra o Supabase local.
export function exigirSupabaseLocal() {
  const host = new URL(URL_SUPABASE).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `Os testes só rodam contra o Supabase local. NEXT_PUBLIC_SUPABASE_URL aponta para "${host}".`,
    );
  }
}

export const admin = createClient(
  URL_SUPABASE,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  opcoes,
);

export function clienteAnonimo() {
  return createClient(URL_SUPABASE, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opcoes);
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
