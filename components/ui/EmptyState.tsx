'use client';

import React from 'react';
import { SearchX, WifiOff, ShieldX, RefreshCw } from 'lucide-react';

type EmptyVariant = 'empty' | 'error' | 'no-permission';

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const variants = {
  empty: {
    icon: SearchX,
    defaultTitle: 'Nenhum registro encontrado',
    defaultMessage: 'Ainda não há dados para exibir nesta seção.',
    color: 'text-muted-foreground',
    bg: 'bg-muted/20',
  },
  error: {
    icon: WifiOff,
    defaultTitle: 'Erro ao carregar dados',
    defaultMessage: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    color: 'text-red-400',
    bg: 'bg-red-500/5',
  },
  'no-permission': {
    icon: ShieldX,
    defaultTitle: 'Acesso restrito',
    defaultMessage: 'Você não tem permissão para acessar este conteúdo.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/5',
  },
};

export function EmptyState({ 
  variant = 'empty', 
  title, 
  message, 
  onRetry 
}: EmptyStateProps) {
  const v = variants[variant];
  const Icon = v.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`w-16 h-16 rounded-full ${v.bg} flex items-center justify-center mb-4 border border-border/30`}>
        <Icon className={`h-7 w-7 ${v.color}`} />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">
        {title || v.defaultTitle}
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        {message || v.defaultMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar Novamente
        </button>
      )}
    </div>
  );
}
