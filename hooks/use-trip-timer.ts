import { useState, useEffect, useCallback } from 'react';
import { TripEvent } from '@/services/types';

export type AlertLevel = 'normal' | 'aviso' | 'critico';

interface TripTimerResult {
  tempoLiquidoMs: number;       // Tempo real de direção em ms
  tempoLiquidoStr: string;      // Ex: "2h 45m"
  emPausa: boolean;
  aguardandoDescarga: boolean;
  nivelAlerta: AlertLevel;
  minutosParaAlerta: number;    // Minutos restantes para próximo alerta
}

const AVISO_MS = 2.5 * 60 * 60 * 1000;  // 2h30m
const CRITICO_MS = 3 * 60 * 60 * 1000;  // 3h00m

function calcTempoLiquido(
  horaSaida: string | null,
  events: TripEvent[],
  emPausa: boolean,
  aguardandoDescarga: boolean,
): number {
  if (!horaSaida) return 0;

  const now = Date.now();
  const saida = new Date(horaSaida).getTime();
  if (isNaN(saida) || saida > now) return 0;

  let totalParadoMs = 0;
  let pausaInicio: number | null = null;
  let esperaInicio: number | null = null;

  for (const ev of events) {
    const ts = new Date(ev.timestamp).getTime();
    if (ev.tipo === 'pausa_inicio') pausaInicio = ts;
    if (ev.tipo === 'pausa_fim' && pausaInicio !== null) {
      totalParadoMs += ts - pausaInicio;
      pausaInicio = null;
    }
    if (ev.tipo === 'espera_inicio') esperaInicio = ts;
    if (ev.tipo === 'espera_fim' && esperaInicio !== null) {
      totalParadoMs += ts - esperaInicio;
      esperaInicio = null;
    }
  }

  // Pausa ou espera ainda em andamento
  if (emPausa && pausaInicio !== null) totalParadoMs += now - pausaInicio;
  if (aguardandoDescarga && esperaInicio !== null) totalParadoMs += now - esperaInicio;

  return Math.max(0, now - saida - totalParadoMs);
}

function formatMs(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function useTripTimer(
  horaSaida: string | null,
  status: string,
  events: TripEvent[],
  emPausa: boolean,
  aguardandoDescarga: boolean,
): TripTimerResult {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== 'Em andamento') return;
    const id = setInterval(() => setNow(Date.now()), 30000); // Atualiza a cada 30s
    return () => clearInterval(id);
  }, [status]);

  const calc = useCallback(() => {
    return calcTempoLiquido(horaSaida, events, emPausa, aguardandoDescarga);
  }, [horaSaida, events, emPausa, aguardandoDescarga, now]); // eslint-disable-line

  const tempoLiquidoMs = calc();
  const tempoLiquidoStr = formatMs(tempoLiquidoMs);

  let nivelAlerta: AlertLevel = 'normal';
  if (tempoLiquidoMs >= CRITICO_MS) nivelAlerta = 'critico';
  else if (tempoLiquidoMs >= AVISO_MS) nivelAlerta = 'aviso';

  const minutosParaAlerta = Math.max(0, Math.ceil((CRITICO_MS - tempoLiquidoMs) / 60000));

  return {
    tempoLiquidoMs,
    tempoLiquidoStr,
    emPausa,
    aguardandoDescarga,
    nivelAlerta,
    minutosParaAlerta,
  };
}

export { formatMs, calcTempoLiquido };
