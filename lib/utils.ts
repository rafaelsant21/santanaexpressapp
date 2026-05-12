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

/**
 * Retorna a data e hora atual formatada para inputs (YYYY-MM-DDTHH:mm)
 * ajustada para o fuso horário local.
 */
export function getLocalDateISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Retorna apenas a data atual formatada para inputs (YYYY-MM-DD)
 * ajustada para o fuso horário local.
 */
export function getLocalDateOnly(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Retorna a data e hora atual em formato ISO UTC (padrão banco de dados).
 */
export function getUTCISO(): string {
  return new Date().toISOString();
}

/**
 * Wrapper para promessas com timeout de segurança.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('TIMEOUT_EXCEEDED'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Wrapper para promessas com retry automático em caso de falha.
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  retries: number = 2, 
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}
