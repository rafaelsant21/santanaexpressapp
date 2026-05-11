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
  saidaTs: number | null,   // epoch ms — pode vir de qualquer fonte
  events: TripEvent[],
  emPausa: boolean,
  aguardandoDescarga: boolean,
): number {
  if (!saidaTs || saidaTs <= 0) return 0;

  const now = Date.now();
  if (saidaTs > now) return 0;   // viagem no futuro — segurança

  let totalParadoMs = 0;
  let pausaInicio: number | null = null;
  let esperaInicio: number | null = null;

  for (const ev of events) {
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

  // Já é ISO completo (ex: "2026-05-11T20:00:00Z")
  if (horaSaida.includes('Z') || horaSaida.includes('+')) {
    const t = new Date(horaSaida).getTime();
    return isNaN(t) ? null : t;
  }

  // Formato "YYYY-MM-DDTHH:MM" — tratar como horário LOCAL
  if (horaSaida.includes('T')) {
    // Adicionar segundos se necessário e interpretar como local
    const parts = horaSaida.split('T');
    const dateParts = parts[0].split('-').map(Number);
    const timeParts = parts[1].split(':').map(Number);
    const d = new Date(
      dateParts[0], dateParts[1] - 1, dateParts[2],
      timeParts[0] || 0, timeParts[1] || 0, 0
    );
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
  horaSaida: string | null,       // "YYYY-MM-DDTHH:MM" ou ISO completo
  status: string,
  events: TripEvent[],
  emPausa: boolean,
  aguardandoDescarga: boolean,
  createdAt?: string | null,      // fallback se hora_saida for vazio
): TripTimerResult {
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== 'Em andamento') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    // Atualiza a cada 60 segundos
    intervalRef.current = setInterval(() => setTick(t => t + 1), 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  // Determinar o timestamp de saída — prioridade: horaSaida > createdAt
  let saidaTs = parseHoraSaida(horaSaida);
  if (!saidaTs && createdAt) {
    const t = new Date(createdAt).getTime();
    saidaTs = isNaN(t) ? null : t;
  }

  // tick é usado só para forçar re-render no intervalo
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
