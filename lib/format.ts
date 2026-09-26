const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatarBRL(n: number): string {
  return moeda.format(n);
}

export function formatarNumeroBR(n: number): string {
  return numero.format(n);
}
