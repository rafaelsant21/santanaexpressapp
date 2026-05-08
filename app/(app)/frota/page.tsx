'use client';

import { useEffect, useState } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { Truck, Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/services/supabaseService';
import { Vehicle, VehicleStatus } from '@/services/types';
import { toast } from 'sonner';

export default function FrotaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const [formData, setFormData] = useState({
    placa: '',
    modelo: '',
    marca: '',
    ano: new Date().getFullYear(),
    status: 'ativo' as VehicleStatus,
    km_atual: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      toast.error('Erro ao carregar veículos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (vehicle?: Vehicle) => {
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
        ano: new Date().getFullYear(),
        status: 'ativo',
        km_atual: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData);
        toast.success('Veículo atualizado com sucesso');
      } else {
        await createVehicle(formData);
        toast.success('Veículo adicionado com sucesso');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar veículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este veículo?')) return;
    try {
      await deleteVehicle(id);
      toast.success('Veículo excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir veículo');
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Frota de Veículos</h1>
          <p className="text-xs text-muted-foreground">Gerencie seus veículos e status.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 w-full md:flex md:w-auto md:items-center">
          <Button onClick={() => handleOpenModal()} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Novo Veículo
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
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
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
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
                onChange={e => setFormData({...formData, ano: parseInt(e.target.value) || 0})}
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
                onChange={e => setFormData({...formData, km_atual: parseInt(e.target.value) || 0})}
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

          <div className="pt-4 flex justify-end gap-2 sticky bottom-0 bg-card py-3 border-t border-border mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  );
}
