'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { CheckSquare, Plus, Edit, Trash2, Loader2, CheckCircle2, ShieldCheck, Package, AlertTriangle, FileText, Image as ImageIcon, Search } from 'lucide-react';
import { VehicleSelect } from '@/components/ui/VehicleSelect';
import { getVehicles, getChecklists, createChecklist, updateChecklist, deleteChecklist, updateVehicle } from '@/services/supabaseService';
import { Vehicle, Checklist, TipoViagem } from '@/services/types';
import { FileUpload } from '@/components/ui/FileUpload';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { parseBRL, getLocalDateISO } from '@/lib/utils';

const MOTORISTAS = ['Santana', 'Rodrigo', 'Marcos', 'Renato', 'Silvio'];
const TIPOS_VIAGEM: TipoViagem[] = ['Entrega', 'Coleta', 'Transferência'];

const DEFAULT_ITENS = {
  pneus_ok: false, freios_ok: false, luzes_ok: false,
  limpador_ok: false, retrovisores_ok: false, oleo_ok: false,
  carga_conferida: false, amarracao_ok: false, bau_fechado: false,
  extintor_ok: false, triangulo_ok: false, macaco_ok: false,
  documentos_ok: false,
};

interface ChecklistFormData {
  vehicle_id: string;
  data: string;
  motorista: string;
  km_atual: number | string;
  tipo_viagem: TipoViagem;
  itens_check: typeof DEFAULT_ITENS;
  observacoes: string;
  comprovante_url?: string;
}

const DEFAULT_FORM: ChecklistFormData = {
  vehicle_id: '',
  data: getLocalDateISO(),
  motorista: '',
  km_atual: '',
  tipo_viagem: 'Entrega',
  itens_check: { ...DEFAULT_ITENS },
  observacoes: '',
  comprovante_url: '',
};

// ─── Grupos de checkboxes ────────────────────────────────────────────────────
const GRUPOS = [
  {
    label: 'Segurança do veículo',
    icon: ShieldCheck,
    color: 'text-blue-400',
    items: [
      { key: 'pneus_ok',       label: 'Pneus OK' },
      { key: 'freios_ok',      label: 'Freios OK' },
      { key: 'luzes_ok',       label: 'Luzes OK (farol, seta, freio)' },
      { key: 'limpador_ok',    label: 'Limpador de para-brisa OK' },
      { key: 'retrovisores_ok',label: 'Retrovisores OK' },
      { key: 'oleo_ok',        label: 'Nível de óleo OK' },
    ],
  },
  {
    label: 'Operação de transporte',
    icon: Package,
    color: 'text-orange-400',
    items: [
      { key: 'carga_conferida', label: 'Carga conferida' },
      { key: 'amarracao_ok',    label: 'Amarração da carga OK' },
      { key: 'bau_fechado',     label: 'Baú fechado/travado' },
    ],
  },
  {
    label: 'Itens obrigatórios',
    icon: AlertTriangle,
    color: 'text-yellow-400',
    items: [
      { key: 'extintor_ok',  label: 'Kit de segurança OK' },
      { key: 'triangulo_ok', label: 'Triângulo presente' },
      { key: 'macaco_ok',    label: 'Macaco e chave de roda' },
    ],
  },
  {
    label: 'Documentação',
    icon: FileText,
    color: 'text-green-400',
    items: [
      { key: 'documentos_ok', label: 'Documentos OK' },
    ],
  },
] as const;

type ItemKey = keyof typeof DEFAULT_ITENS;

export default function ChecklistPage() {
  const [logs, setLogs] = useState<Checklist[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Checklist | null>(null);
  const [formData, setFormData] = useState<ChecklistFormData>({ ...DEFAULT_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mData, vData] = await Promise.all([getChecklists(), getVehicles()]);
      setLogs(mData);
      setVehicles(vData);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (log?: Checklist) => {
    if (log) {
      setEditingLog(log);
      setFormData({
        vehicle_id: log.vehicle_id,
        data: log.data ? log.data.substring(0, 10) : '',
        motorista: log.motorista,
        km_atual: log.km_atual,
        tipo_viagem: log.tipo_viagem,
        itens_check: { ...log.itens_check },
        observacoes: log.observacoes,
        comprovante_url: log.comprovante_url,
      });
    } else {
      setEditingLog(null);
      setFormData({ 
        ...DEFAULT_FORM, 
        vehicle_id: vehicles[0]?.id || '', 
        data: getLocalDateISO(),
        motorista: session?.name || '',
      });
    }
    setIsModalOpen(true);
  };

  const markAllOk = () => {
    const allTrue = Object.fromEntries(Object.keys(DEFAULT_ITENS).map(k => [k, true]));
    setFormData((prev: ChecklistFormData) => ({ 
      ...prev, 
      itens_check: allTrue as typeof DEFAULT_ITENS 
    }));
  };

  const toggleItem = (key: ItemKey) => {
    setFormData((prev: ChecklistFormData) => ({
      ...prev,
      itens_check: { ...prev.itens_check, [key]: !prev.itens_check[key] },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = { 
        ...formData, 
        user_id: session?.id,
        km_atual: parseBRL(formData.km_atual),
        data: formData.data || new Date().toISOString().substring(0, 10),
      };
      if (editingLog) {
        await updateChecklist(editingLog.id, payload);
        toast.success('Checklist atualizado');
      } else {
        await createChecklist(payload);
        toast.success('Checklist registrado');
      }

      // ── Sincroniza KM do veículo na frota ──────────────────────────────
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle && Number(formData.km_atual) > vehicle.km_atual) {
        await updateVehicle(vehicle.id, { km_atual: Number(formData.km_atual) });
      }
      // ───────────────────────────────────────────────────────────────────

      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar checklist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este checklist?')) return;
    try {
      await deleteChecklist(id);
      toast.success('Registro excluído');
      loadData();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const getScore = (log: Checklist) => {
    const vals = Object.values(log.itens_check);
    const ok = vals.filter(Boolean).length;
    return { ok, total: vals.length };
  };

  const fuelColor: Record<string, string> = {
    '1/4': 'text-red-400', '1/2': 'text-orange-400',
    '3/4': 'text-yellow-400', 'Cheio': 'text-green-400',
  };

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Checklist de Viagens</h1>
          <p className="text-xs text-muted-foreground">Inspeção pré-viagem obrigatória.</p>
        </div>
        <div className="flex w-full md:w-auto">
          <Button onClick={() => handleOpenModal()} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />Novo Checklist
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8">
        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-[#111827]">
                <tr>
                  {['Data/Hora', 'Veículo', 'Motorista', 'KM', 'Tipo', 'Itens', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum checklist encontrado.</td></tr>
                ) : logs.map(log => {
                  const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                  const { ok, total } = getScore(log);
                  const allOk = ok === total;
                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-[13px] border-b border-border font-medium whitespace-nowrap">
                        {format(new Date(log.data.substring(0,10) + 'T00:00'), 'dd/MM/yy')}
                      </td>
                      <td className="px-4 py-3 text-[13px] border-b border-border">{vehicle ? `${vehicle.placa}` : '—'}</td>
                      <td className="px-4 py-3 text-[13px] border-b border-border">{log.motorista}</td>
                      <td className="px-4 py-3 text-[13px] border-b border-border text-muted-foreground">{log.km_atual.toLocaleString('pt-BR')} km</td>
                      <td className="px-4 py-3 text-[13px] border-b border-border">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-500/10 text-blue-400">{log.tipo_viagem}</span>
                      </td>

                      <td className="px-4 py-3 text-[13px] border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${allOk ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${(ok / total) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{ok}/{total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] border-b border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${allOk ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {allOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {allOk ? 'Aprovado' : 'Atenção'}
                          </span>
                          {log.observacoes?.trim() && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                              title={log.observacoes}
                            >
                              ⚠️ Obs.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-border text-right">
                        <div className="flex justify-end gap-1">
                          {log.comprovante_url && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => window.open(log.comprovante_url, '_blank')}
                              title="Ver Foto/Anexo"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenModal(log)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="text-danger hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLog ? 'Editar Checklist' : 'Novo Checklist'}>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Linha 1: Veículo + Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Veículo</Label>
              <VehicleSelect 
                vehicles={vehicles} 
                value={formData.vehicle_id} 
                onChange={val => setFormData({ ...formData, vehicle_id: val })} 
                required 
              />
            </div>
            <div className="space-y-1">
              <Label>Data e Hora</Label>
              <Input required type="datetime-local" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
            </div>
          </div>

          {/* Linha 2: Motorista + Tipo de viagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Motorista</Label>
              <Select 
                required 
                value={formData.motorista} 
                onChange={e => setFormData({ ...formData, motorista: e.target.value })}
                disabled={!isAdmin}
              >
                {!isAdmin && <option value={session?.name}>{session?.name}</option>}
                {isAdmin && (
                  <>
                    <option value="" disabled>Selecione</option>
                    {MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </>
                )}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de viagem</Label>
              <Select required value={formData.tipo_viagem} onChange={e => setFormData({ ...formData, tipo_viagem: e.target.value as TipoViagem })}>
                {TIPOS_VIAGEM.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>

          {/* Linha 3: KM atual */}
          <div className="space-y-1">
            <Label>KM atual do veículo</Label>
            <Input required type="text" inputMode="numeric" placeholder="Ex: 125000" value={formData.km_atual} onChange={e => setFormData({ ...formData, km_atual: e.target.value.replace(/[^0-9]/g, '') })} />
          </div>

          {/* Itens de verificação */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Itens de Verificação</Label>
              <Button type="button" variant="outline" size="sm" onClick={markAllOk}>
                <CheckCircle2 className="h-3 w-3 mr-1" />Marcar todos OK
              </Button>
            </div>

            {GRUPOS.map(grupo => {
              const Icon = grupo.icon;
              return (
                <div key={grupo.label} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border-b border-border">
                    <Icon className={`h-3.5 w-3.5 ${grupo.color}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${grupo.color}`}>{grupo.label}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                    {grupo.items.map(item => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-muted/40 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 md:w-3.5 md:h-3.5 rounded border-border accent-primary"
                          checked={formData.itens_check[item.key as ItemKey]}
                          onChange={() => toggleItem(item.key as ItemKey)}
                        />
                        <span className="text-[14px] md:text-xs">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Observações — obrigatório se algum item não estiver OK */}
          {(() => {
            const temFalha = Object.values(formData.itens_check).some(v => !v);
            return (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label>Observações</Label>
                  {temFalha && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-1.5 py-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Obrigatório — item(s) não OK
                    </span>
                  )}
                </div>
                <textarea
                  required={temFalha}
                  className={`flex w-full rounded-md border bg-transparent px-3 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors ${
                    temFalha ? 'border-yellow-500/50 focus-visible:ring-yellow-500' : 'border-border'
                  }`}
                  rows={2}
                  placeholder={temFalha ? 'Descreva qualquer problema identificado' : 'Alguma anotação sobre o veículo ou viagem?'}
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                />

                {/* Alerta: observação preenchida gera aviso para o admin */}
                {formData.observacoes.trim() && (
                  <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/25 rounded-md px-3 py-2 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-yellow-300/90 leading-relaxed">
                      <span className="font-semibold">Aviso enviado ao administrador.</span> Sua observação será registrada e o gestor será notificado para analisar antes da próxima viagem.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          <FileUpload 
            bucket="checklists"
            label="Foto do Veículo / Problema (Opcional)"
            value={formData.comprovante_url}
            onChange={(url) => setFormData({ ...formData, comprovante_url: url })}
          />

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
    </div>
  );
}
