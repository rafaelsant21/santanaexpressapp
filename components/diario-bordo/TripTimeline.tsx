'use client';

import { TripEvent } from '@/services/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Truck, PauseCircle, PlayCircle, Package, CheckCircle2, 
  Flag, Clock
} from 'lucide-react';

interface TripTimelineProps {
  events: TripEvent[];
  horaSaida?: string | null;
  horaChegada?: string | null;
  status: string;
}

const EVENT_CONFIG = {
  viagem_inicio: { icon: Truck, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Viagem iniciada' },
  pausa_inicio:  { icon: PauseCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Parada de descanso' },
  pausa_fim:     { icon: PlayCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Retorno da viagem' },
  espera_inicio: { icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', label: 'Aguardando descarregamento' },
  espera_fim:    { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Descarga finalizada' },
  viagem_fim:    { icon: Flag, color: 'text-primary', bg: 'bg-primary/10 border-primary/30', label: 'Viagem encerrada' },
};

function formatTs(ts: string) {
  try {
    return format(new Date(ts), 'HH:mm', { locale: ptBR });
  } catch {
    return '--:--';
  }
}

export function TripTimeline({ events, horaSaida, horaChegada, status }: TripTimelineProps) {
  if (events.length === 0 && !horaSaida) return null;

  // Montar lista de itens da timeline
  const items: Array<{ tipo: keyof typeof EVENT_CONFIG; timestamp: string; obs?: string; local?: string }> = [];

  if (horaSaida) {
    items.push({ tipo: 'viagem_inicio', timestamp: horaSaida });
  }

  for (const ev of events) {
    if (ev.tipo in EVENT_CONFIG) {
      items.push({ tipo: ev.tipo as keyof typeof EVENT_CONFIG, timestamp: ev.timestamp, obs: ev.observacoes ?? undefined, local: ev.local ?? undefined });
    }
  }

  if (horaChegada && status !== 'Em andamento') {
    items.push({ tipo: 'viagem_fim', timestamp: horaChegada });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-3">
        <Clock className="h-3 w-3" /> Timeline da Viagem
      </h4>
      <div className="relative pl-6">
        {/* Linha vertical */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border/60" />

        <div className="space-y-3">
          {items.map((item, idx) => {
            const cfg = EVENT_CONFIG[item.tipo];
            const Icon = cfg.icon;
            return (
              <div key={idx} className="relative flex items-start gap-3">
                {/* Dot */}
                <div className={`absolute -left-[18px] flex items-center justify-center w-5 h-5 rounded-full border ${cfg.bg} shrink-0 mt-0.5`}>
                  <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{formatTs(item.timestamp)}</span>
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {item.local && (
                      <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                        📍 {item.local}
                      </span>
                    )}
                  </div>
                  {item.obs && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">{item.obs}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
