'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/forms';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar envio',
  message = 'Tem certeza? Após o envio não será possível cancelar ou editar este registro.',
  confirmLabel = 'Sim, enviar',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-sm rounded-xl border border-yellow-500/30 bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold border-0"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
