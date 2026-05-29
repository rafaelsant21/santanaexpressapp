'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { Truck, Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/services/supabaseService';
import { Vehicle, VehicleStatus } from '@/services/types';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/ui/Skeleton';

export default function FrotaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const [formData, setFormData] = useState<any>({
    placa: '',
    modelo: '',
    marca: '',
    ano: new Date().getFullYear() as number | string,
    status: 'ativo' as VehicleStatus,
    km_atual: '' as number | string
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      toast.error('Erro ao carregar veículos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = useCallback((vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        placa: vehicle.placa,
        modelo: vehicle.modelo,
        marca: vehicle.marca,
        ano: vehicle.ano,
        status: vehicle.status,
        km_atual: vehicle.km_atual
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        placa: '',
        modelo: '',
        marca: '',
        ano: new Date().getFullYear() as number | string,
        status: 'ativo',
        km_atual: '' as number | string
      });
    }
    setIsModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        ano: Number(formData.ano) || 0,
        km_atual: Number(formData.km_atual) || 0
      };

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
        toast.success('Veículo atualizado com sucesso');
      } else {
        await createVehicle(payload);
        toast.success('Veículo adicionado com sucesso');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar veículo');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingVehicle, loadData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Deseja realmente excluir este veículo?')) return;
    try {
      await deleteVehicle(id);
      toast.success('Veículo excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir veículo');
    }
  }, [loadData]);

  const filteredVehicles = useMemo(() => vehicles.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase())
  ), [vehicles, searchTerm]);

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Frota de Veículos</h1>
          <p className="text-xs text-muted-foreground">Gerencie seus veículos e status.</p>
        </div>
        <div className="flex w-full md:w-auto">
          <Button onClick={() => handleOpenModal()} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            Novo Veículo
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-6">
        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2 bg-card">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar placa, modelo ou marca..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="bg-[#111827]">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Placa</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Veículo</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Ano</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">KM Atual</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={6} rows={5} />
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground border-b border-border">
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 text-[13px] border-b border-border font-medium">{v.placa}</td>
                    <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{v.marca} {v.modelo}</td>
                    <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{v.ano}</td>
                    <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">{v.km_atual.toLocaleString()} km</td>
                    <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">
                      {v.status === 'ativo' && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/20 text-[#86efac]">Ativo</span>}
                      {v.status === 'manutenção' && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-danger/20 text-[#fca5a5]">Manutenção</span>}
                      {v.status === 'inativo' && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300">Inativo</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] border-b border-border text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(v)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-danger hover:text-danger hover:bg-danger/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input 
                required 
                placeholder="ABC-1234"
                value={formData.placa} 
                onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input 
                required 
                type="number"
                min="1990" max="2100"
                value={formData.ano} 
                onChange={e => setFormData({...formData, ano: e.target.value === '' ? '' : parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input 
                required 
                placeholder="Ex: Mercedes-Benz"
                value={formData.marca} 
                onChange={e => setFormData({...formData, marca: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input 
                required 
                placeholder="Ex: Sprinter 314"
                value={formData.modelo} 
                onChange={e => setFormData({...formData, modelo: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>KM Atual</Label>
              <Input 
                required 
                type="number"
                min="0"
                value={formData.km_atual} 
                onChange={e => setFormData({...formData, km_atual: e.target.value === '' ? '' : parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as VehicleStatus})}
              >
                <option value="ativo">Ativo</option>
                <option value="manutenção">Em Manutenção</option>
                <option value="inativo">Inativo</option>
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
      </div>

      {/* Botão Flutuante Mobile (FAB) */}
      <button
        onClick={() => handleOpenModal()}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all z-40"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
