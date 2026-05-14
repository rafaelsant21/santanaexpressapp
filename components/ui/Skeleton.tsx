'use client';

import React from 'react';
import { cn } from '@/components/AppLayout';

/** Componente genérico de skeleton loading */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/50',
        className
      )}
      style={style}
    />
  );
}

/** Skeleton para uma linha de tabela */
function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton para uma tabela completa */
export function TableSkeleton({ cols = 6, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  );
}

/** Skeleton para um card de KPI/stat */
export function CardSkeleton() {
  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-border/60 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-14 ml-auto" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

/** Skeleton para o gráfico do dashboard */
export function ChartSkeleton() {
  return (
    <div className="bg-[#1e293b] rounded-2xl border border-border/60 overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-border/40">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-6">
        <div className="h-[320px] flex items-end gap-2 px-4">
          {[40, 65, 45, 80, 55, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1">
              <Skeleton className={`w-full rounded-t`} style={{ height: `${h}%` }} />
              <Skeleton className="h-3 w-8 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
