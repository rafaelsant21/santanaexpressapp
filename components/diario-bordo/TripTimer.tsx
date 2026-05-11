'use client';

import { clsx } from 'clsx';
function cn(...args: (string | boolean | undefined | null)[]) { return args.filter(Boolean).join(' '); }
import { AlertLevel } from '@/hooks/use-trip-timer';
import { Clock, PauseCircle, Package } from 'lucide-react';

interface TripTimerProps {
  tempoStr: string;
  nivelAlerta: AlertLevel;
  emPausa: boolean;
  aguardandoDescarga: boolean;
  minutosParaAlerta: number;
}

export function TripTimer({ tempoStr, nivelAlerta, emPausa, aguardandoDescarga, minutosParaAlerta }: TripTimerProps) {
  if (emPausa) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-blue-500/10 border-blue-500/20 text-blue-400">
        <PauseCircle className="h-3 w-3" />
        Em Pausa
      </span>
    );
  }

  if (aguardandoDescarga) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-orange-500/10 border-orange-500/20 text-orange-400">
        <Package className="h-3 w-3" />
        Aguardando Descarga
      </span>
    );
  }

  const colorMap = {
    normal: 'bg-green-500/10 border-green-500/20 text-green-400',
    aviso: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    critico: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold',
      colorMap[nivelAlerta],
      nivelAlerta === 'critico' && 'animate-pulse'
    )}>
      <Clock className="h-3 w-3" />
      {tempoStr} dirigindo
      {nivelAlerta === 'aviso' && (
        <span className="text-[9px] opacity-70">({minutosParaAlerta}m p/ alerta)</span>
      )}
    </span>
  );
}
