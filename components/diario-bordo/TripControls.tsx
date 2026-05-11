'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/forms';
import { 
  PauseCircle, PlayCircle, Package, CheckCircle2, 
  Loader2, MapPin
} from 'lucide-react';

interface TripControlsProps {
  logbookId: string;
  emPausa: boolean;
  aguardandoDescarga: boolean;
  onIniciarPausa: (obs?: string) => Promise<void>;
  onRetomarViagem: () => Promise<void>;
  onIniciarEspera: (local?: string) => Promise<void>;
  onFinalizarEspera: () => Promise<void>;
}

export function TripControls({
  emPausa,
  aguardandoDescarga,
  onIniciarPausa,
  onRetomarViagem,
  onIniciarEspera,
  onFinalizarEspera,
}: TripControlsProps) {
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  };

  if (emPausa) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-[11px] text-blue-300 font-semibold flex items-center gap-1.5">
          <PauseCircle className="h-3.5 w-3.5" /> Parada de descanso em andamento
        </p>
        <Button
          type="button"
          disabled={loading}
          onClick={() => run(onRetomarViagem)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Retomar Viagem
        </Button>
      </div>
    );
  }

  if (aguardandoDescarga) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
        <p className="text-[11px] text-orange-300 font-semibold flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" /> Aguardando descarregamento
        </p>
        <Button
          type="button"
          disabled={loading}
          onClick={() => run(onFinalizarEspera)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Descarga Finalizada
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          disabled={loading}
          onClick={() => run(() => onIniciarPausa())}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
          Iniciar Pausa
        </Button>

        <Button
          type="button"
          disabled={loading}
          onClick={() => run(() => onIniciarEspera(local || undefined))}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-3 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
          Iniciar Espera
        </Button>
      </div>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Local (opcional)"
          value={local}
          onChange={e => setLocal(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
