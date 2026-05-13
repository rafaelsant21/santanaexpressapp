'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { Vehicle } from '@/services/types';
import { cn } from '@/components/AppLayout';

interface VehicleSelectProps {
  vehicles: Vehicle[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  onlyActive?: boolean;
  placeholder?: string;
}

export function VehicleSelect({ 
  vehicles, 
  value, 
  onChange, 
  required, 
  disabled, 
  onlyActive = true,
  placeholder = "Selecione um veículo"
}: VehicleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === value), [vehicles, value]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const searchStr = `${v.placa} ${v.modelo} ${v.marca}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      // Se for admin, talvez queira ver todos, mas por padrão filtramos ativos
      const matchesActive = onlyActive ? v.status === 'ativo' : true;
      
      return matchesSearch && matchesActive;
    });
  }, [vehicles, searchTerm, onlyActive]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (vId: string) => {
    onChange(vId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 md:h-9 w-full items-center justify-between rounded-md border border-border bg-[#0f172b] px-3 py-2 md:py-1 text-[16px] md:text-sm shadow-sm transition-all duration-200 cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "border-primary ring-1 ring-primary/20 bg-[#1e293b]"
        )}
      >
        <span className={cn("truncate font-medium", !selectedVehicle && "text-muted-foreground font-normal")}>
          {selectedVehicle ? `${selectedVehicle.placa} — ${selectedVehicle.modelo}` : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full rounded-lg border border-border bg-[#1e293b] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center border-b border-border px-3 py-2 bg-[#0f172b]">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              autoFocus
              type="text"
              className="flex-1 bg-transparent border-none text-[16px] md:text-sm focus:outline-none placeholder:text-muted-foreground text-foreground"
              placeholder="Buscar placa, modelo ou marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
                if (e.key === 'Enter' && filteredVehicles.length > 0) {
                  handleSelect(filteredVehicles[0].id);
                }
              }}
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          
          <div className="max-h-[280px] overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#1e293b]">
            {filteredVehicles.length === 0 ? (
              <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Nenhum veículo encontrado.</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredVehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 md:py-2.5 cursor-pointer hover:bg-primary/10 transition-all border-l-4 border-transparent",
                      value === v.id ? "bg-primary/5 text-primary border-primary" : "text-foreground"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase tracking-tight text-[15px] md:text-sm">{v.placa}</span>
                        {v.status === 'manutenção' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase">Oficina</span>
                        )}
                      </div>
                      <span className="text-[11px] md:text-xs text-muted-foreground font-medium">{v.marca} {v.modelo}</span>
                    </div>
                    {value === v.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Hidden input for form validation compatibility */}
      <input 
        type="text" 
        className="sr-only"
        value={value} 
        required={required} 
        onChange={() => {}}
        tabIndex={-1}
      />
    </div>
  );
}
