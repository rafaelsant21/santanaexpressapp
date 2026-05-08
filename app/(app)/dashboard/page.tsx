'use client';

import { useEffect, useState, useMemo } from 'react';
import { Truck, Wrench, Fuel, AlertTriangle, CheckCircle2, Loader2, Bell, X } from 'lucide-react';
import { getVehicles, getFuelLogs, getMaintenances, getChecklists, marcarAvisoRevisado } from '@/services/supabaseService';
import { Vehicle, FuelLog, Maintenance, Checklist } from '@/services/types';
import { format } from 'date-fns';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = () =>
    Promise.all([getVehicles(), getFuelLogs(), getMaintenances(), getChecklists()]).then(([v, f, m, c]) => {
      setVehicles(v);
      setFuelLogs(f);
      setMaintenances(m);
      setChecklists(c);
      setIsLoading(false);
    });

  useEffect(() => { loadAll(); }, []);

  const avisosPendentes = useMemo(
    () => checklists.filter(c => c.observacoes?.trim() && !c.aviso_revisado),
    [checklists]
  );

  const revisarAviso = async (id: string) => {
    await marcarAvisoRevisado(id);
    setChecklists(prev => prev.map(c => c.id === id ? { ...c, aviso_revisado: true } : c));
  };

  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const fuelCostMonth = fuelLogs
      .filter(l => new Date(l.data).getMonth() === currentMonth)
      .reduce((acc, l) => acc + l.valor_total, 0);
    const maintCostTotal = maintenances
      .filter(m => m.status === 'concluída')
      .reduce((acc, m) => acc + m.custo, 0);
    return {
      total: vehicles.length,
      ativos: vehicles.filter(v => v.status === 'ativo').length,
      fuelCostMonth,
      maintCostTotal,
      pendentes: maintenances.filter(m => m.status === 'pendente').length,
    };
  }, [vehicles, fuelLogs, maintenances]);

  const vehicleCosts = useMemo(() =>
    vehicles.map(v => ({
      vehicle: v,
      fuel: fuelLogs.filter(l => l.vehicle_id === v.id).reduce((a, l) => a + l.valor_total, 0),
      maint: maintenances.filter(m => m.vehicle_id === v.id && m.status === 'concluída').reduce((a, m) => a + m.custo, 0),
    })).sort((a, b) => (b.fuel + b.maint) - (a.fuel + a.maint)),
  [vehicles, fuelLogs, maintenances]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full bg-background">
      {/* Header */}
      <header className="border-b border-border bg-[#0f172b] flex flex-col justify-center px-4 py-4 md:px-8 md:h-16 shrink-0 gap-1">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Visão Geral</h1>
          <p className="text-xs text-muted-foreground">Painel de controle operacional</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* ── Avisos de Checklist ─────────────────────────────────────────── */}
        {avisosPendentes.length > 0 && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-yellow-500/20 flex items-center gap-2">
              <Bell className="h-4 w-4 text-yellow-400" />
              <h2 className="text-sm font-medium text-yellow-400">Avisos de Checklist</h2>
              <span className="ml-auto text-[11px] text-yellow-400/70 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                {avisosPendentes.length} pendente{avisosPendentes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-yellow-500/10">
              {avisosPendentes.map(c => {
                const vehicle = vehicles.find(v => v.id === c.vehicle_id);
                return (
                  <div key={c.id} className="px-5 py-3.5 flex items-start gap-4">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{vehicle?.placa ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{vehicle?.modelo}</span>
                        <span className="text-xs text-muted-foreground">• {c.motorista}</span>
                        <span className="text-xs text-muted-foreground">• {format(new Date(c.data), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <p className="text-xs text-yellow-300/90 bg-yellow-400/5 border border-yellow-400/10 rounded px-2 py-1 mt-1">
                        {c.observacoes}
                      </p>
                    </div>
                    <button
                      onClick={() => revisarAviso(c.id)}
                      title="Marcar como revisado"
                      className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-green-400 border border-border hover:border-green-500/30 hover:bg-green-500/5 rounded px-2 py-1 transition-colors"
                    >
                      <X className="h-3 w-3" /> Revisei
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Frota',            value: stats.total,             sub: 'veículos',    icon: Truck },
            { label: 'Ativos',                 value: stats.ativos,            sub: 'em operação', icon: Truck },
            { label: 'Combustível (mês)',       value: `R$ ${fmt(stats.fuelCostMonth)}`,  sub: 'mês atual',   icon: Fuel },
            { label: 'Manutenção (total)',      value: `R$ ${fmt(stats.maintCostTotal)}`, sub: 'concluídas',  icon: Wrench },
            { label: 'Manutenções Pendentes',  value: stats.pendentes,         sub: 'aguardando',  icon: AlertTriangle },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-[#1e293b] rounded-xl p-4 border border-border/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
                <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <span className="text-xl font-bold leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>

        {/* ── Tabelas ─────────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Últimos Abastecimentos */}
          <div className="bg-[#1e293b] rounded-xl border border-border/60 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/60">
              <h2 className="text-sm font-medium">Últimos Abastecimentos</h2>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['Veículo', 'Data', 'Litros', 'Valor'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[11px] text-muted-foreground font-medium text-left last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fuelLogs.slice(0, 5).map(log => {
                  const v = vehicles.find(v => v.id === log.vehicle_id);
                  return (
                    <tr key={log.id} className="border-b border-border/30 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-[13px] font-medium">
                        {v?.placa} <span className="text-muted-foreground font-normal text-xs">({v?.modelo?.split(' ')[0]})</span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-muted-foreground">{format(new Date(log.data), 'dd/MM')}</td>
                      <td className="px-5 py-3 text-[13px]">{log.litros}L</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-right">R$ {fmt(log.valor_total)}</td>
                    </tr>
                  );
                })}
                {fuelLogs.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhum registro.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Manutenções Pendentes */}
          <div className="bg-[#1e293b] rounded-xl border border-border/60 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/60">
              <h2 className="text-sm font-medium">Manutenções Pendentes</h2>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['Veículo', 'Serviço', 'Status'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[11px] text-muted-foreground font-medium text-left last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maintenances.filter(m => m.status === 'pendente').slice(0, 5).map(m => {
                  const v = vehicles.find(v => v.id === m.vehicle_id);
                  return (
                    <tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-[13px] font-medium">{v?.placa}</td>
                      <td className="px-5 py-3 text-[13px] text-muted-foreground truncate max-w-[160px]">{m.descricao}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-[11px] font-medium bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">Pendente</span>
                      </td>
                    </tr>
                  );
                })}
                {maintenances.filter(m => m.status === 'pendente').length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhuma pendência.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* ── Gastos por Veículo ───────────────────────────────────────────── */}
        <div className="bg-[#1e293b] rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/60">
            <h2 className="text-sm font-medium">Gastos por Veículo</h2>
          </div>
          {vehicleCosts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground text-center">Nenhum dado disponível.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['Veículo', 'Status', 'KM Atual', 'Combustível', 'Manutenção', 'Total'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[11px] text-muted-foreground font-medium text-left last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleCosts.map(({ vehicle, fuel, maint }) => {
                  const total = fuel + maint;
                  const statusMap: Record<string, string> = {
                    ativo: 'bg-green-500/10 text-green-400',
                    manutenção: 'bg-red-500/10 text-red-400',
                    inativo: 'bg-slate-500/10 text-slate-400',
                  };
                  const statusLabel: Record<string, string> = {
                    ativo: 'Ativo',
                    manutenção: 'Manutenção',
                    inativo: 'Inativo',
                  };
                  return (
                    <tr key={vehicle.id} className="border-b border-border/30 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-[13px]">
                        <span className="font-semibold">{vehicle.placa}</span>
                        <span className="text-muted-foreground text-xs ml-2">{vehicle.marca} {vehicle.modelo}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusMap[vehicle.status]}`}>
                          {statusLabel[vehicle.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{vehicle.km_atual.toLocaleString('pt-BR')} km</td>
                      <td className="px-5 py-3.5 text-[13px]">R$ {fmt(fuel)}</td>
                      <td className="px-5 py-3.5 text-[13px]">R$ {fmt(maint)}</td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-right">R$ {fmt(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* ── Rodapé ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          <span>Todos os veículos com checklist em dia.</span>
        </div>

      </div>
    </div>
  );
}
