/**
 * Converte uma string formatada em padrão brasileiro (ex: 1.500,44) 
 * para um número válido em JavaScript (ex: 1500.44).
 */
export function parseBRL(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleanValue = value
    .replace(/\./g, '')
    .replace(',', '.');
    
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata um número para o padrão brasileiro (ex: 1500.44 -> 1.500,44).
 */
export function formatBRL(value: number): string {
  if (value === undefined || value === null) return '0,00';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
