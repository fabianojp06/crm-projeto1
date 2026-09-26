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
