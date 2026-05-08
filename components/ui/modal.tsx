import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/components/AppLayout';

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative z-50 w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Card({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow", className)}>
      {children}
    </div>
  );
}
