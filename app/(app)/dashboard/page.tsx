'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Truck, Wrench, Fuel, AlertTriangle, Loader2, 
  DollarSign, Activity, Clock, Receipt, User, CheckSquare
} from 'lucide-react';
import { 
  getVehicles, getFuelLogs, getMaintenances, 
  getChecklists, getLogbooks, getExpenses, marcarAvisoRevisado 
} from '@/services/supabaseService';
import { Vehicle, FuelLog, Maintenance, Checklist, Logbook, Expense } from '@/services/types';
import { format, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

// Lazy load Recharts — this is the biggest performance win for mobile
const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const LazyArea = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false });
const LazyXAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const LazyYAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const LazyCartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false });
const LazyTooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false });
const LazyResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [logbooks, setLogbooks] = useState<Logbook[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(false);
    try {
      const [v, f, m, c, l, e] = await Promise.all([
        getVehicles(), getFuelLogs(), getMaintenances(), 
        getChecklists(), getLogbooks(), getExpenses()
      ]);
      setVehicles(v); setFuelLogs(f); setMaintenances(m);
      setChecklists(c); setLogbooks(l); setExpenses(e);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setLoadError(true);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const avisosPendentes = useMemo(
    () => checklists.filter(c => c.observacoes?.trim() && !c.aviso_revisado),
    [checklists]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const isCurrentMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const fuelCostMonth = fuelLogs.filter(l => isCurrentMonth(l.data)).reduce((acc, l) => acc + l.valor_total, 0);
    const maintCostMonth = maintenances.filter(m => m.status === 'concluída' && isCurrentMonth(m.data)).reduce((acc, m) => acc + m.custo, 0);
    const expenseCostMonth = expenses.filter(e => e.status !== 'Recusada' && isCurrentMonth(e.data)).reduce((acc, e) => acc + e.valor, 0);
    const kmRodadosMonth = logbooks.filter(l => l.status === 'Finalizada' && l.data_chegada && isCurrentMonth(l.data_chegada)).reduce((acc, l) => acc + (l.km_final - l.km_inicial), 0);

    return {
      totalVehicles: vehicles.length,
      ativos: vehicles.filter(v => v.status === 'ativo').length,
      emManutencao: vehicles.filter(v => v.status === 'manutenção').length,
      checklistsPendentes: checklists.filter(c => !c.aviso_revisado && c.observacoes).length,
      fuelCostMonth, maintCostMonth, expenseCostMonth,
      totalGastosMonth: fuelCostMonth + maintCostMonth + expenseCostMonth,
      kmRodadosMonth,
      viagensRealizadas: logbooks.filter(l => l.status === 'Finalizada' && l.data_chegada && isCurrentMonth(l.data_chegada)).length,
    };
  }, [vehicles, fuelLogs, maintenances, expenses, logbooks, checklists]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const monthLabel = format(d, 'MMM', { locale: ptBR });
      const f = fuelLogs.filter(l => isSameMonth(new Date(l.data), d)).reduce((a, l) => a + l.valor_total, 0);
      const m = maintenances.filter(m => m.status === 'concluída' && isSameMonth(new Date(m.data), d)).reduce((a, m) => a + m.custo, 0);
      const e = expenses.filter(exp => exp.status !== 'Recusada' && isSameMonth(new Date(exp.data), d)).reduce((a, exp) => a + exp.valor, 0);
      data.push({ name: monthLabel, Combustível: f, Manutenção: m, Despesas: e });
    }
    return data;
  }, [fuelLogs, maintenances, expenses]);

  const recentActivities = useMemo(() => {
    return [
      ...fuelLogs.map(l => ({ ...l, type: 'abastecimento', timestamp: l.data ? new Date(l.data).getTime() : 0 })),
      ...maintenances.map(m => ({ ...m, type: 'manutencao', timestamp: m.data ? new Date(m.data).getTime() : 0 })),
      ...checklists.map(c => ({ ...c, type: 'checklist', timestamp: c.data ? new Date(c.data).getTime() : 0 })),
      ...logbooks.map(l => ({ ...l, type: 'viagem', timestamp: l.data_saida ? new Date(l.data_saida).getTime() : 0 })),
      ...expenses.map(e => ({ ...e, type: 'despesa', timestamp: e.data ? new Date(e.data).getTime() : 0 })),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  }, [fuelLogs, maintenances, checklists, logbooks, expenses]);

  const revisarAviso = useCallback(async (id: string) => {
    await marcarAvisoRevisado(id);
    setChecklists(prev => prev.map(c => c.id === id ? { ...c, aviso_revisado: true } : c));
  }, []);

  return (
    <div className="flex flex-col min-h-0 h-full bg-background overflow-hidden">
      <header className="border-b border-border bg-[#0f172b] flex items-center px-4 py-4 md:px-8 h-16 shrink-0 justify-between">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Dashboard Estratégico
          </h1>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-medium">Santana Express • Gestão de Frota</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-foreground">{format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}</span>
            <span className="text-[10px] text-muted-foreground">Sistema Operacional Online</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 custom-scrollbar">
        
        {/* Avisos Críticos */}
        {avisosPendentes.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden shadow-lg shadow-red-500/5">
            <div className="px-6 py-3 border-b border-red-500/20 flex items-center gap-3 bg-red-500/5">
              <div className="p-1.5 bg-red-500/20 rounded-lg"><AlertTriangle className="h-4 w-4 text-red-400" /></div>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-tight">Alertas Críticos</h2>
              <span className="ml-auto text-[11px] font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                {avisosPendentes.length} pendência{avisosPendentes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-red-500/10 max-h-[300px] overflow-y-auto">
              {avisosPendentes.map(c => {
                const vehicle = vehicles.find(v => v.id === c.vehicle_id);
                return (
                  <div key={c.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-red-500/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
                        <span className="text-sm font-black text-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">{vehicle?.placa ?? '—'}</span>
                        <span className="text-xs font-medium text-muted-foreground">{vehicle?.modelo}</span>
                        <span className="text-xs text-muted-foreground/60 flex items-center gap-1"><User className="h-3 w-3" /> {c.motorista}</span>
                        <span className="text-xs text-muted-foreground/60 flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(c.data), 'dd/MM/yy HH:mm')}</span>
                      </div>
                      <p className="text-[13px] text-red-300/90 leading-relaxed font-medium">{c.observacoes}</p>
                    </div>
                    <button onClick={() => revisarAviso(c.id)} className="shrink-0 flex items-center justify-center gap-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg px-4 py-2 transition-all active:scale-95 shadow-md shadow-red-900/20">
                      Marcar como Revisado
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Frota Santana" value={stats.totalVehicles} sub={`${stats.ativos} ativos • ${stats.emManutencao} oficina`} icon={Truck} color="red" />
            <StatCard label="Financeiro (Mês)" value={`R$ ${fmt(stats.totalGastosMonth)}`} sub="Comb + Manut + Desp" icon={DollarSign} color="blue" />
            <StatCard label="Performance" value={`${stats.kmRodadosMonth.toLocaleString()} km`} sub={`${stats.viagensRealizadas} viagens concluídas`} icon={Activity} color="green" />
            <StatCard label="Checklists" value={stats.checklistsPendentes} sub="Aguardando revisão" icon={CheckSquare} color="yellow" isAlert={stats.checklistsPendentes > 0} />
          </div>
        )}

        {/* Gráfico */}
        <div className="bg-[#1e293b] rounded-2xl border border-border/60 flex flex-col shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 bg-white/[0.01]">
            <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">Evolução de Gastos Operacionais</h2>
          </div>
          <div className="p-6">
            {isLoading ? <ChartSkeleton /> : (
              <>
                <div className="h-[320px] w-full pt-4">
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyAreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorF" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      </defs>
                      <LazyCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
                      <LazyXAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <LazyYAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={70} tickFormatter={(v: number) => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : `R$ ${v}`} />
                      <LazyTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]} />
                      <LazyArea type="monotone" dataKey="Combustível" stroke="#ef4444" fillOpacity={1} fill="url(#colorF)" strokeWidth={3} />
                      <LazyArea type="monotone" dataKey="Manutenção" stroke="#3b82f6" fillOpacity={1} fill="url(#colorM)" strokeWidth={3} />
                      <LazyArea type="monotone" dataKey="Despesas" stroke="#10b981" fillOpacity={1} fill="url(#colorE)" strokeWidth={3} />
                    </LazyAreaChart>
                  </LazyResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 pb-2">
                  <LegendItem color="#ef4444" label="Combustível" />
                  <LegendItem color="#3b82f6" label="Manutenção" />
                  <LegendItem color="#10b981" label="Despesas" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Atividades Recentes */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Atividades Recentes</h2>
            </div>
            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
              {isLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
              ) : recentActivities.map((act: any, idx) => (
                <div key={`${act.id}-${idx}`} className="relative pl-10 group">
                  <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border border-border flex items-center justify-center z-10 ${
                    act.type === 'abastecimento' ? 'bg-red-500/10' : act.type === 'manutencao' ? 'bg-blue-500/10' : act.type === 'checklist' ? 'bg-yellow-500/10' : act.type === 'viagem' ? 'bg-green-500/10' : 'bg-purple-500/10'
                  }`}>
                    <ActivityIcon type={act.type} />
                  </div>
                  <div className="bg-[#1e293b] p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-foreground capitalize">{act.type}</span>
                      <span className="text-[9px] text-muted-foreground">{act.timestamp > 0 ? format(new Date(act.timestamp), 'HH:mm') : ''}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground line-clamp-1">
                      {act.motorista} • <span className="text-foreground font-medium">{vehicles.find(v => v.id === act.vehicle_id)?.placa || 'Veículo'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Veículos */}
          <div className="bg-[#1e293b] rounded-2xl border border-border/60 flex flex-col shadow-xl overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-border/40 bg-white/[0.01]">
              <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">Análise Financeira por Veículo</h2>
            </div>
            <div className="p-6 overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-sm text-left min-w-[700px]">
                <thead className="border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Veículo</th>
                    <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Status</th>
                    <th className="px-4 py-3 text-[10px] text-yellow-400/70 uppercase tracking-widest font-bold">Combustível</th>
                    <th className="px-4 py-3 text-[10px] text-blue-400/70 uppercase tracking-widest font-bold">Manutenção</th>
                    <th className="px-4 py-3 text-[10px] text-orange-400/70 uppercase tracking-widest font-bold">Despesas</th>
                    <th className="px-4 py-3 text-[10px] text-green-400/70 uppercase tracking-widest font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {isLoading ? <TableSkeleton cols={6} rows={4} /> : vehicles.map(v => {
                    const vFuel = fuelLogs.filter(l => l.vehicle_id === v.id).reduce((a, l) => a + l.valor_total, 0);
                    const vMaint = maintenances.filter(m => m.vehicle_id === v.id && m.status === 'concluída').reduce((a, m) => a + m.custo, 0);
                    const vExp = expenses.filter(e => e.vehicle_id === v.id && e.status !== 'Recusada').reduce((a, e) => a + e.valor, 0);
                    const total = vFuel + vMaint + vExp;
                    return (
                      <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4"><span className="font-black text-foreground uppercase">{v.placa}</span><br/><span className="text-[11px] text-muted-foreground">{v.marca} {v.modelo}</span></td>
                        <td className="px-4 py-4"><StatusBadge status={v.status} /></td>
                        <td className="px-4 py-4"><span className="font-semibold text-yellow-400">R$ {fmt(vFuel)}</span></td>
                        <td className="px-4 py-4"><span className="font-semibold text-blue-400">R$ {fmt(vMaint)}</span></td>
                        <td className="px-4 py-4"><span className="font-semibold text-orange-400">R$ {fmt(vExp)}</span></td>
                        <td className="px-4 py-4"><span className="font-bold text-lg text-foreground">R$ {fmt(total)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTES AUXILIARES ──────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, isAlert }: any) {
  const colorMap: any = { red: 'text-red-400', blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400' };
  return (
    <div className={`relative bg-[#1e293b] rounded-2xl p-5 border border-border/60 overflow-hidden group shadow-lg hover:-translate-y-1 transition-transform duration-200 ${isAlert ? 'border-red-500/40' : ''}`}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-[#0f172b] border border-border/40">
            <Icon className={`h-5 w-5 ${colorMap[color]}`} />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
        </div>
        <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
        <p className="text-[11px] text-muted-foreground font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    ativo: 'bg-green-500/10 text-green-400 border-green-500/20',
    manutenção: 'bg-red-500/10 text-red-400 border-red-500/20',
    inativo: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  const labels: any = { ativo: 'Operacional', manutenção: 'Oficina', inativo: 'Parado' };
  return <span className={`text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-full border ${map[status]}`}>{labels[status]}</span>;
}

function ActivityIcon({ type }: { type: string }) {
  const icons: any = {
    abastecimento: <Fuel className="h-4 w-4 text-red-400" />,
    manutencao: <Wrench className="h-4 w-4 text-blue-400" />,
    checklist: <CheckSquare className="h-4 w-4 text-yellow-400" />,
    viagem: <Truck className="h-4 w-4 text-green-400" />,
    despesa: <Receipt className="h-4 w-4 text-purple-400" />,
  };
  return icons[type] || <Activity className="h-4 w-4" />;
}
