'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { Fuel, Plus, Edit, Trash2, Loader2, FileDown } from 'lucide-react';
import { getVehicles, getFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog, updateVehicle } from '@/services/supabaseService';
import { Vehicle, FuelLog } from '@/services/types';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

const MOTORISTAS = ['Santana', 'Rodrigo', 'Marcos', 'Renato', 'Silvio'];

export default function CombustivelPage() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    motorista: '',
    data: new Date().toISOString().substring(0, 10),
    litros: 0,
    valor_total: 0,
    km_no_abastecimento: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  // Filtro de mês — padrão: mês atual
  const [mesFilter, setMesFilter] = useState<string>(
    () => new Date().toISOString().substring(0, 7)
  );

  // Mêses disponíveis nos dados
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(logs.map(l => l.data.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [logs]);

  // Registros filtrados pelo mês selecionado
  const filteredLogs = useMemo(() => {
    if (!mesFilter) return logs;
    return logs.filter(l => l.data.substring(0, 7) === mesFilter);
  }, [logs, mesFilter]);


  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fLogs, vData] = await Promise.all([getFuelLogs(), getVehicles()]);
      setLogs(fLogs);
      setVehicles(vData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (log?: FuelLog) => {
    if (log) {
      setEditingLog(log);
      setFormData({
        vehicle_id: log.vehicle_id,
        motorista: log.motorista ?? '',
        data: new Date(log.data).toISOString().substring(0, 10),
        litros: log.litros,
        valor_total: log.valor_total,
        km_no_abastecimento: log.km_no_abastecimento
      });
    } else {
      setEditingLog(null);
      setFormData({
        vehicle_id: vehicles[0]?.id || '',
        motorista: '',
        data: new Date().toISOString().substring(0, 10),
        litros: 0,
        valor_total: 0,
        km_no_abastecimento: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLog) {
        await updateFuelLog(editingLog.id, {
          ...formData,
          data: new Date(formData.data).toISOString()
        });
        toast.success('Registro atualizado');
      } else {
        await createFuelLog({
          ...formData,
          data: new Date(formData.data).toISOString()
        });
        toast.success('Abastecimento registrado');
      }

      // ── Sincroniza KM do veículo na frota ──────────────────────────────
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle && formData.km_no_abastecimento > vehicle.km_atual) {
        await updateVehicle(vehicle.id, { km_atual: formData.km_no_abastecimento });
      }
      // ───────────────────────────────────────────────────────────────────

      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar registro');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      await deleteFuelLog(id);
      toast.success('Registro excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir registro');
    }
  };

  const exportExcel = () => {
    if (filteredLogs.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const sorted = [...filteredLogs].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    const rows = sorted.map((log, _, arr) => {
      const vehicle = vehicles.find(v => v.id === log.vehicle_id);
      const vehicleLogs = arr.filter(l => l.vehicle_id === log.vehicle_id);
      const idx = vehicleLogs.findIndex(l => l.id === log.id);
      let media = '-';
      if (idx > 0) {
        const prev = vehicleLogs[idx - 1];
        const dist = log.km_no_abastecimento - prev.km_no_abastecimento;
        if (dist > 0 && log.litros > 0) media = (dist / log.litros).toFixed(2) + ' km/l';
      }
      return {
        'Data': format(new Date(log.data), 'dd/MM/yyyy'),
        'Veículo (Placa)': vehicle?.placa ?? '',
        'Veículo (Modelo)': vehicle ? `${vehicle.marca} ${vehicle.modelo}` : '',
        'Motorista': log.motorista ?? '',
        'KM no Abastecimento': log.km_no_abastecimento,
        'Litros': log.litros,
        'Valor Total (R$)': log.valor_total,
        'Média (km/l)': media,
      };
    });
    const label = mesFilter || 'todos';
    exportToExcel(rows, `combustivel_${label}`, 'Abastecimentos');
    toast.success('Exportado com sucesso!');
  };

  const calculateAvg = (current: FuelLog) => {
    // Find the previous fuel log for the same vehicle
    const vehicleLogs = logs.filter(l => l.vehicle_id === current.vehicle_id).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    const currentIndex = vehicleLogs.findIndex(l => l.id === current.id);
    if (currentIndex > 0) {
      const prev = vehicleLogs[currentIndex - 1];
      const distance = current.km_no_abastecimento - prev.km_no_abastecimento;
      if (distance > 0 && current.litros > 0) {
        return (distance / current.litros).toFixed(2) + ' km/l';
      }
    }
    return '-';
  };

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Controle de Combustível</h1>
          <p className="text-xs text-muted-foreground">Registre os abastecimentos da frota.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Filtro de mês */}
          <select
            value={mesFilter}
            onChange={e => setMesFilter(e.target.value)}
            className="h-11 md:h-9 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-auto"
          >
            <option value="">Todos os meses</option>
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
            <Button variant="outline" onClick={exportExcel} className="w-full">
              <FileDown className="h-4 w-4 mr-2" />Exportar
            </Button>
            <Button onClick={() => handleOpenModal()} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Veículo</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Motorista</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">KM</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Litros</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Valor Total</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Média (Estimada)</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground border-b border-border">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                    return (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-[13px] border-b border-border font-medium">
                          {format(new Date(log.data), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{vehicle ? `${vehicle.placa} - ${vehicle.modelo}` : 'Desconhecido'}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{log.motorista || '—'}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{log.km_no_abastecimento.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{log.litros} L</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground font-medium">R$ {log.valor_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-muted-foreground">{calculateAvg(log)}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-right">
                          <div className="flex justify-end gap-2">
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(log)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="text-danger hover:text-danger hover:bg-danger/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingLog ? 'Editar Registro' : 'Novo Abastecimento'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select 
              required
              value={formData.vehicle_id} 
              onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
            >
              <option value="" disabled>Selecione um veículo</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motorista Responsável</Label>
            <Select
              required
              value={formData.motorista}
              onChange={e => setFormData({...formData, motorista: e.target.value})}
            >
              <option value="" disabled>Selecione o motorista</option>
              {MOTORISTAS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                required 
                type="date"
                value={formData.data} 
                onChange={e => setFormData({...formData, data: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>KM no Painel</Label>
              <Input 
                required 
                type="number"
                min="0"
                value={formData.km_no_abastecimento} 
                onChange={e => setFormData({...formData, km_no_abastecimento: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Litros</Label>
              <Input 
                required 
                type="number"
                min="0.1" step="0.1"
                value={formData.litros} 
                onChange={e => setFormData({...formData, litros: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total (R$)</Label>
              <Input 
                required 
                type="number"
                min="0.01" step="0.01"
                value={formData.valor_total} 
                onChange={e => setFormData({...formData, valor_total: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 sticky bottom-0 bg-card py-3 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
