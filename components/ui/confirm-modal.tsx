'use client';

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/forms';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Nome/descrição do item que será excluído — aparece em destaque */
  itemName?: string;
  /** Substitui a mensagem padrão */
  message?: string;
  /** Enquanto a exclusão estiver processando */
  isDeleting?: boolean;
}

/**
 * Modal de confirmação de exclusão padronizado.
 * Use em TODAS as ações destrutivas do sistema.
 *
 * @example
 * <ConfirmDeleteModal
 *   isOpen={confirmOpen}
 *   onCancel={() => setConfirmOpen(false)}
 *   onConfirm={handleConfirmedDelete}
 *   itemName="Abastecimento de 15/06/2025"
 * />
 */
export function ConfirmDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  itemName,
  message,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  // Fechar com ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    },
    [onCancel, isDeleting]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isDeleting && onCancel()}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#1a1f2e] shadow-2xl">
        {/* Botão fechar */}
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Ícone */}
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>

          {/* Texto */}
          <div>
            <h2
              id="confirm-delete-title"
              className="text-base font-bold text-foreground mb-2"
            >
              Confirmar Exclusão
            </h2>
            {message ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                ⚠️ Você tem certeza que deseja excluir
                {itemName ? (
                  <> <span className="text-foreground font-semibold">"{itemName}"</span>?</>
                ) : (
                  ' este item?'
                )}
                <br />
                <span className="text-red-400 font-medium">Esta ação não poderá ser desfeita.</span>
              </p>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hook utilitário ────────────────────────────────────────────────────────

interface UseConfirmDeleteOptions {
  onConfirm: () => Promise<void> | void;
}

/**
 * Hook para gerenciar o estado do ConfirmDeleteModal.
 *
 * @example
 * const { confirmProps, openConfirm } = useConfirmDelete({
 *   onConfirm: () => handleDelete(selectedId),
 * });
 *
 * // Na JSX:
 * <ConfirmDeleteModal {...confirmProps} itemName={selectedName} />
 * <Button onClick={() => openConfirm()}>Excluir</Button>
 */
export function useConfirmDelete({ onConfirm }: UseConfirmDeleteOptions) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const openConfirm = useCallback(() => setIsOpen(true), []);
  const closeConfirm = useCallback(() => {
    if (!isDeleting) setIsOpen(false);
  }, [isDeleting]);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  }, [onConfirm]);

  return {
    confirmProps: {
      isOpen,
      onConfirm: handleConfirm,
      onCancel: closeConfirm,
      isDeleting,
    },
    openConfirm,
    closeConfirm,
  };
}

// Alias para retrocompatibilidade
export { ConfirmDeleteModal as ConfirmModal };
