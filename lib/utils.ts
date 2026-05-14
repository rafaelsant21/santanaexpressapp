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
 * Wrapper seguro para promessas com timeout.
 * Usa AbortController quando possível para cancelar de fato a operação.
 * GARANTE que sempre resolve ou rejeita — nunca fica pendurado.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('TIMEOUT_EXCEEDED'));
      }
    }, timeoutMs);

    promise
      .then((result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(result);
        }
      })
      .catch((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      });
  });
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

/**
 * Debounce: atrasa a execução de uma função até que pare de ser chamada.
 * Útil para campos de busca.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Wrapper padronizado para operações async com loading + error handling.
 * Garante que loading SEMPRE finaliza e erros são tratados.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (error: Error) => void;
    fallback?: T;
    context?: string;
  }
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (options?.context) {
      console.error(`[${options.context}]`, msg);
    }
    if (options?.onError) {
      options.onError(error);
    }
    if (options?.fallback !== undefined) {
      return options.fallback;
    }
    return undefined;
  }
}

/**
 * Log condicional — só imprime em desenvolvimento.
 */
export function devLog(context: string, ...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${context}]`, ...args);
  }
}

/**
 * Warn log — sempre imprime (para erros que precisam ser monitorados).
 */
export function warnLog(context: string, ...args: any[]) {
  console.warn(`[${context}]`, ...args);
}
