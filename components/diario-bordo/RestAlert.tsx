'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, PauseCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/forms';

interface RestAlertProps {
  visible: boolean;
  tempoStr: string;
  onIniciarPausa: () => void;
  onDismiss: () => void;
}

export function RestAlert({ visible, tempoStr, onIniciarPausa, onDismiss }: RestAlertProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
    }
  }, [visible]);

  if (!show || !visible) return null;

  return (
    <>
      {/* Overlay sutil pulsante */}
      <div className="fixed inset-0 pointer-events-none z-40 animate-pulse bg-red-500/5" />

      {/* Banner inferior fixo */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-50">
        <div className="relative bg-[#1a0d0d] border-2 border-red-500/60 rounded-2xl shadow-2xl shadow-red-500/20 overflow-hidden">
          {/* Linha animada no topo */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/20 rounded-full shrink-0 animate-bounce">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Bell className="h-3 w-3 text-red-400" />
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Pausa Obrigatória</p>
                </div>
                <p className="text-sm font-semibold text-white mt-1">
                  Você está há <span className="text-red-400">{tempoStr}</span> em viagem contínua
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Por segurança, realize uma parada para descanso antes de continuar.
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                onClick={onIniciarPausa}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-xl"
              >
                <PauseCircle className="h-4 w-4" />
                Registrar Parada Agora
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
