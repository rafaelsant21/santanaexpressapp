'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { Wrench, Plus, Edit, Trash2, CheckSquare, Loader2, FileDown, Search } from 'lucide-react';
import { VehicleSelect } from '@/components/ui/VehicleSelect';
import { getVehicles, getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance, updateVehicle } from '@/services/supabaseService';
import { Vehicle, Maintenance, MaintenanceStatus, MaintenanceType } from '@/services/types';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDeleteModal, useConfirmDelete } from '@/components/ui/confirm-modal';

import { parseBRL, getLocalDateOnly } from '@/lib/utils';

const MOTORISTAS = ['Santana', 'Rodrigo', 'Marcos', 'Renato', 'Silvio'];

export default function ManutencaoPage() {
  const [logs, setLogs] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Maintenance | null>(null);
  
  const [formData, setFormData] = useState<any>({
    vehicle_id: '',
    motorista: '',
    tipo: 'preventiva' as MaintenanceType,
    descricao: '',
    custo: '' as number | string,
    data: getLocalDateOnly(),
    km: '' as number | string,
    status: 'pendente' as MaintenanceStatus
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<Maintenance | null>(null);
  const { confirmProps, openConfirm } = useConfirmDelete({
    onConfirm: async () => {
      if (!deleteTarget) return;
      await deleteMaintenance(deleteTarget.id);
      toast.success('Registro excluído');
      loadData();
      setDeleteTarget(null);
    },
  });

  // Filtro de mês — padrão: mês atual
  const [mesFilter, setMesFilter] = useState<string>(
    () => getLocalDateOnly().substring(0, 7)
  );

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(logs.map(l => l.data.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!mesFilter) return logs;
    return logs.filter(l => l.data.substring(0, 7) === mesFilter);
  }, [logs, mesFilter]);


  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mData, vData] = await Promise.all([getMaintenances(), getVehicles()]);
      setLogs(mData);
      setVehicles(vData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = useCallback((log?: Maintenance) => {
    if (log) {
      setEditingLog(log);
      setFormData({
        vehicle_id: log.vehicle_id,
        motorista: log.motorista,
        tipo: log.tipo,
        descricao: log.descricao,
        custo: log.custo,
        data: log.data ? log.data.substring(0, 10) : '',
        km: log.km,
        status: log.status
      });
    } else {
      setEditingLog(null);
      setFormData({
        vehicle_id: vehicles[0]?.id || '',
        motorista: session?.name || '',
        tipo: 'preventiva',
        descricao: '',
        custo: '' as number | string,
        data: getLocalDateOnly(),
        km: '' as number | string,
        status: 'pendente'
      });
    }
    setIsModalOpen(true);
  }, [vehicles, session?.name]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        user_id: session?.id,
        custo: parseBRL(formData.custo),
        km: parseBRL(formData.km),
        data: formData.data || new Date().toISOString().substring(0, 10),
      };

      if (editingLog) {
        await updateMaintenance(editingLog.id, payload);
        toast.success('Manutenção atualizada');
      } else {
        await createMaintenance(payload);
        toast.success('Manutenção agendada/registrada');
      }

      // ── Sincroniza KM do veículo na frota (não-bloqueante) ─────────────────
      try {
        const kmRegistrado = Number(formData.km) || 0;
        if (kmRegistrado > 0 && formData.status === 'concluída') {
          const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
          if (vehicle && kmRegistrado > vehicle.km_atual) {
            await updateVehicle(vehicle.id, { km_atual: kmRegistrado });
          }
        }
      } catch {
        // Falha silenciosa — a manutenção já foi salva com sucesso
      }
      // ───────────────────────────────────────────────────────────────────────
      // ─────────────────────────────────────────────────────────────────────────

      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar manutenção');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingLog, session?.id, vehicles, loadData]);

  const handleDelete = useCallback((log: Maintenance) => {
    setDeleteTarget(log);
    openConfirm();
  }, [openConfirm]);

  const handleToggleStatus = useCallback(async (log: Maintenance) => {
    try {
      const newStatus = log.status === 'pendente' ? 'concluída' : 'pendente';
      await updateMaintenance(log.id, { status: newStatus });
      toast.success(`Marcado como ${newStatus}`);

      // ── Sincroniza KM quando manutenção é concluída ──────────────────────
      if (newStatus === 'concluída' && log.km > 0) {
        const vehicle = vehicles.find(v => v.id === log.vehicle_id);
        if (vehicle && log.km > vehicle.km_atual) {
          await updateVehicle(vehicle.id, { km_atual: log.km });
        }
      }
      // ────────────────────────────────────────────────────────────────────

      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  }, [vehicles, loadData]);

  const exportExcel = useCallback(() => {
    if (filteredLogs.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const rows = filteredLogs.map(log => {
      const vehicle = vehicles.find(v => v.id === log.vehicle_id);
      return {
        'Data': format(new Date(log.data.substring(0,10) + 'T00:00'), 'dd/MM/yyyy'),
        'Veículo (Placa)': vehicle?.placa ?? '',
        'Veículo (Modelo)': vehicle ? `${vehicle.marca} ${vehicle.modelo}` : '',
        'Motorista': log.motorista,
        'Descrição': log.descricao,
        'Tipo': log.tipo,
        'KM': log.km,
        'Custo (R$)': log.custo,
        'Status': log.status,
      };
    });
    const label = mesFilter || 'todos';
    exportToExcel(rows, `manutencoes_${label}`, 'Manutencoes');
    toast.success('Exportado com sucesso!');
  }, [filteredLogs, vehicles, mesFilter]);

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Manutenção</h1>
          <p className="text-xs text-muted-foreground">Controle preventivo e corretivo.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
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
          <div className="flex w-full md:w-auto gap-2">
            <Button variant="outline" onClick={exportExcel} className="flex-1 md:flex-none">
              <FileDown className="h-4 w-4 mr-2" />Exportar
            </Button>
            <Button onClick={() => handleOpenModal()} className="hidden md:flex">
              <Plus className="h-4 w-4 mr-2" />
              Nova Manutenção
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-6">
        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Veículo</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Motorista</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Custo</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton cols={7} rows={5} />
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground border-b border-border">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                    return (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-[13px] border-b border-border font-medium">
                          {format(new Date(log.data.substring(0,10) + 'T00:00'), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{vehicle ? `${vehicle.placa} - ${vehicle.modelo}` : 'Desconhecido'}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{log.motorista || '—'}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border">
                          <div className="font-medium text-foreground">{log.descricao}</div>
                          <div className="text-xs text-muted-foreground">{log.tipo} • KM: {log.km.toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">R$ {log.custo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-border">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            log.status === 'concluída' ? 'bg-success/20 text-[#86efac]' : 'bg-danger/20 text-[#fca5a5]'
                          }`}>
                            {log.status === 'concluída' ? 'Concluída' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-right">
                          <div className="flex justify-end gap-2">
                            {isAdmin && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Alternar Status"
                                  onClick={() => handleToggleStatus(log)}
                                  className={log.status === 'pendente' ? "text-success hover:text-success hover:bg-success/10" : ""}
                                >
                                  <CheckSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(log)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(log)} className="text-danger hover:text-danger hover:bg-danger/10">
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
        title={editingLog ? 'Editar Manutenção' : 'Nova Manutenção'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Veículo</Label>
            <VehicleSelect 
              vehicles={vehicles} 
              value={formData.vehicle_id} 
              onChange={val => setFormData({ ...formData, vehicle_id: val })} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>Motorista Responsável</Label>
            <Select
              required
              value={formData.motorista}
              onChange={e => setFormData({...formData, motorista: e.target.value})}
              disabled={!isAdmin}
            >
              {!isAdmin && <option value={session?.name}>{session?.name}</option>}
              {isAdmin && (
                <>
                  <option value="" disabled>Selecione o motorista</option>
                  {MOTORISTAS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </>
              )}
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data (Agendada/Realizada)</Label>
              <Input 
                required 
                type="date"
                value={formData.data} 
                onChange={e => setFormData({...formData, data: e.target.value})}
              />
            </div>
            <div className="space-y-1">
                <Label>KM no Serviço</Label>
                <Input 
                  required 
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 125000" 
                  value={formData.km} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, km: val });
                  }} 
                />
              </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Input 
              required 
              placeholder="Ex: Troca de óleo, Reparo de freio..."
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.tipo} 
                onChange={e => setFormData({...formData, tipo: e.target.value as MaintenanceType})}
              >
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
              </Select>
            </div>
            <div className="space-y-1">
                <Label>Custo (R$)</Label>
                <Input 
                  required 
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00" 
                  value={formData.custo} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9,]/g, '');
                    setFormData({ ...formData, custo: val });
                  }} 
                />
              </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as MaintenanceStatus})}
              >
                <option value="pendente">Pendente</option>
                <option value="concluída">Concluída</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 sticky bottom-0 z-10 bg-card py-4 px-4 sm:px-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Botão Flutuante Mobile (FAB) */}
      <button
        onClick={() => handleOpenModal()}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all z-40"
      >
        <Plus className="h-7 w-7" />
      </button>

      <ConfirmDeleteModal
        {...confirmProps}
        itemName={deleteTarget ? `Manutenção — ${deleteTarget.descricao?.substring(0,40)}` : undefined}
      />
    </div>
  );
}
