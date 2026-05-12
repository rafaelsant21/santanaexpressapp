import { useState, useEffect, useRef } from 'react';
import { TripEvent } from '@/services/types';

export type AlertLevel = 'normal' | 'aviso' | 'critico';

interface TripTimerResult {
  tempoLiquidoMs: number;
  tempoLiquidoStr: string;
  emPausa: boolean;
  aguardandoDescarga: boolean;
  nivelAlerta: AlertLevel;
  minutosParaAlerta: number;
}

const AVISO_MS = 2.5 * 60 * 60 * 1000;  // 2h30m
const CRITICO_MS = 3 * 60 * 60 * 1000;  // 3h00m

function calcTempoLiquido(
  saidaTs: number | null,   // epoch ms
  events: TripEvent[],
  emPausa: boolean,
  aguardandoDescarga: boolean,
): number {
  if (!saidaTs || saidaTs <= 0) return 0;

  const now = Date.now();
  if (saidaTs > now) return 0;

  // Garantir ordem cronológica dos eventos para o cálculo
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalParadoMs = 0;
  let pausaInicio: number | null = null;
  let esperaInicio: number | null = null;

  for (const ev of sortedEvents) {
    const ts = new Date(ev.timestamp).getTime();
    if (isNaN(ts)) continue;

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

  return Math.max(0, now - saidaTs - totalParadoMs);
}

function parseHoraSaida(horaSaida: string | null): number | null {
  if (!horaSaida) return null;

  // Se já é ISO completo ou tem fuso horário
  if (horaSaida.includes('Z') || /[\+\-]\d{2}:\d{2}$/.test(horaSaida)) {
    const t = new Date(horaSaida).getTime();
    return isNaN(t) ? null : t;
  }

  // Se for YYYY-MM-DDTHH:mm (local)
  if (horaSaida.includes('T')) {
    const d = new Date(horaSaida); // O JS interpreta como local se não houver sufixo Z
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  return null;
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
  createdAt?: string | null,
): TripTimerResult {
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== 'Em andamento') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setTick(t => t + 1), 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  let saidaTs = parseHoraSaida(horaSaida);
  if (!saidaTs && createdAt) {
    const t = new Date(createdAt).getTime();
    saidaTs = isNaN(t) ? null : t;
  }

  void tick;

  const tempoLiquidoMs = calcTempoLiquido(saidaTs, events, emPausa, aguardandoDescarga);
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
