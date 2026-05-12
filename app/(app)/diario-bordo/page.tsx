'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { BookOpen, Plus, Edit, Trash2, Loader2, FileDown, Route, CheckCircle2, Clock, XCircle, MapPin, Image as ImageIcon, Bell } from 'lucide-react';
import { getVehicles, getLogbooks, createLogbook, updateLogbook, deleteLogbook, getTripEvents, createTripEvent } from '@/services/supabaseService';
import { Vehicle, Logbook, TipoViagem, TripEvent } from '@/services/types';
import { FileUpload } from '@/components/ui/FileUpload';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { parseBRL } from '@/lib/utils';
import { TripTimer } from '@/components/diario-bordo/TripTimer';
import { TripControls } from '@/components/diario-bordo/TripControls';
import { TripTimeline } from '@/components/diario-bordo/TripTimeline';
import { RestAlert } from '@/components/diario-bordo/RestAlert';
import { useTripTimer } from '@/hooks/use-trip-timer';
import { useTripNotifications } from '@/hooks/use-trip-notifications';

const MOTORISTAS = ['Santana', 'Rodrigo', 'Marcos', 'Renato', 'Silvio'];
const TIPOS_VIAGEM: TipoViagem[] = ['Entrega', 'Coleta', 'Transferência'];

const DEFAULT_FORM: any = {
  vehicle_id: '',
  motorista: '',
  tipo_viagem: 'Entrega',
  cidade_origem: '',
  cidade_destino: '',
  data_saida: new Date().toISOString().substring(0, 10),
  hora_saida: '',
  data_chegada: '',
  hora_chegada: '',
  km_inicial: '' as number | string,
  km_final: '' as number | string,
  abastecimento: false,
  valor_abastecido: '' as number | string,
  litros_abastecidos: '' as number | string,
  ocorrencias: '',
  status: 'Em andamento',
  comprovante_url: '',
};

// Badge de status para viagem ativa na tabela
function ActiveTripBadge({ log }: { log: Logbook }) {
  if (log.em_pausa) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
        ⏸ Em Pausa
      </span>
    );
  }
  if (log.aguardando_descarga) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400">
        📦 Aguard. Descarga
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
      🚛 Dirigindo
    </span>
  );
}

export default function DiarioBordoPage() {
  const [logs, setLogs] = useState<Logbook[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Logbook | null>(null);
  const [formData, setFormData] = useState<any>({ ...DEFAULT_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Trip control state
  const [selectedLog, setSelectedLog] = useState<Logbook | null>(null);
  const [tripEvents, setTripEvents] = useState<TripEvent[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState<Record<string, boolean>>({});
  const notifSentRef = useRef<Record<string, boolean>>({});

  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';
  const { requestPermission, sendRestAlert } = useTripNotifications();

  // Timer for selected active trip
  const activeLog = selectedLog?.status === 'Em andamento' ? selectedLog : null;
  // Build departure timestamp: prefer data_saida+hora_saida, fall back to created_at
  const horaSaidaStr = activeLog
    ? (activeLog.data_saida && activeLog.hora_saida
        ? `${activeLog.data_saida}T${activeLog.hora_saida}`
        : null)
    : null;
  const timer = useTripTimer(
    horaSaidaStr,
    activeLog?.status ?? '',
    tripEvents,
    activeLog?.em_pausa ?? false,
    activeLog?.aguardando_descarga ?? false,
    activeLog?.created_at ?? null,
  );

  // Monitor all active trips for rest alerts
  useEffect(() => {
    if (!activeLog) return;
    if (timer.nivelAlerta === 'critico' && !notifSentRef.current[activeLog.id] && !activeLog.notificacao_enviada) {
      notifSentRef.current[activeLog.id] = true;
      sendRestAlert();
      updateLogbook(activeLog.id, { notificacao_enviada: true }).catch(() => {});
    }
  }, [timer.nivelAlerta, activeLog?.id]);

  const loadTripEvents = async (logId: string) => {
    try {
      const evs = await getTripEvents(logId);
      setTripEvents(evs);
    } catch { setTripEvents([]); }
  };

  const openDetail = (log: Logbook) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
    loadTripEvents(log.id);
    if (log.status === 'Em andamento') requestPermission();
  };

  const handleIniciarPausa = async () => {
    if (!selectedLog) return;
    await createTripEvent({ logbook_id: selectedLog.id, tipo: 'pausa_inicio', timestamp: new Date().toISOString() });
    const updated = await updateLogbook(selectedLog.id, { em_pausa: true });
    setSelectedLog(updated);
    setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    await loadTripEvents(selectedLog.id);
    toast.success('Parada registrada!');
  };

  const handleRetomarViagem = async () => {
    if (!selectedLog) return;
    await createTripEvent({ logbook_id: selectedLog.id, tipo: 'pausa_fim', timestamp: new Date().toISOString() });
    const updated = await updateLogbook(selectedLog.id, { em_pausa: false, notificacao_enviada: false });
    notifSentRef.current[selectedLog.id] = false;
    setSelectedLog(updated);
    setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    await loadTripEvents(selectedLog.id);
    toast.success('Viagem retomada!');
  };

  const handleIniciarEspera = async (local?: string) => {
    if (!selectedLog) return;
    await createTripEvent({ logbook_id: selectedLog.id, tipo: 'espera_inicio', timestamp: new Date().toISOString(), local });
    const updated = await updateLogbook(selectedLog.id, { aguardando_descarga: true });
    setSelectedLog(updated);
    setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    await loadTripEvents(selectedLog.id);
    toast.success('Espera registrada!');
  };

  const handleFinalizarEspera = async () => {
    if (!selectedLog) return;
    await createTripEvent({ logbook_id: selectedLog.id, tipo: 'espera_fim', timestamp: new Date().toISOString() });
    const updated = await updateLogbook(selectedLog.id, { aguardando_descarga: false });
    setSelectedLog(updated);
    setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    await loadTripEvents(selectedLog.id);
    toast.success('Descarga finalizada!');
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lData, vData] = await Promise.all([getLogbooks(), getVehicles()]);
      setLogs(lData);
      setVehicles(vData);
    } catch {
      toast.error('Erro ao carregar dados do Diário de Bordo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (log?: Logbook) => {
    if (log) {
      setEditingLog(log);
      setFormData({
        ...log,
        data_saida: log.data_saida ? new Date(log.data_saida).toISOString().substring(0, 10) : '',
        data_chegada: log.data_chegada ? new Date(log.data_chegada).toISOString().substring(0, 10) : '',
      });
    } else {
      setEditingLog(null);
      setFormData({
        ...DEFAULT_FORM,
        vehicle_id: vehicles[0]?.id || '',
        data_saida: new Date().toISOString().substring(0, 10),
        motorista: session?.name || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.km_final > 0 && formData.km_final < formData.km_inicial) {
      toast.error('KM final não pode ser menor que o KM inicial.');
      setIsSubmitting(false);
      return;
    }

    if (formData.status === 'Finalizada') {
      if (!formData.data_chegada || !formData.hora_chegada) {
        toast.error('Preencha a data e hora de chegada para finalizar a viagem.');
        setIsSubmitting(false);
        return;
      }
      if (formData.km_final <= 0) {
        toast.error('Preencha o KM final para finalizar a viagem.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload: any = {
        ...formData,
        user_id: session?.id,
        km_inicial: parseBRL(formData.km_inicial),
        km_final: parseBRL(formData.km_final),
        valor_abastecido: parseBRL(formData.valor_abastecido),
        litros_abastecidos: parseBRL(formData.litros_abastecidos),
        data_saida: formData.data_saida || null,
        hora_saida: formData.hora_saida || null,
        data_chegada: formData.data_chegada || null,
        hora_chegada: formData.hora_chegada || null,
      };

      if (editingLog) {
        await updateLogbook(editingLog.id, payload);
        toast.success('Diário atualizado com sucesso!');
      } else {
        await createLogbook(payload);
        toast.success('Novo Diário de Bordo criado!');
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error('Erro ao salvar o Diário de Bordo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este diário de bordo?')) return;
    try {
      await deleteLogbook(id);
      toast.success('Registro excluído');
      loadData();
    } catch {
      toast.error('Erro ao excluir registro');
    }
  };

  const exportExcel = () => {
    if (logs.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    const rows = logs.map(log => {
      const vehicle = vehicles.find(v => v.id === log.vehicle_id);
      return {
        'Data Saída': log.data_saida ? format(new Date(log.data_saida), 'dd/MM/yyyy') : '',
        'Hora Saída': log.hora_saida || '',
        'Motorista': log.motorista,
        'Veículo (Placa)': vehicle?.placa ?? '',
        'Veículo (Modelo)': vehicle ? `${vehicle.marca} ${vehicle.modelo}` : '',
        'Tipo': log.tipo_viagem,
        'Origem': log.cidade_origem,
        'Destino': log.cidade_destino,
        'KM Inicial': log.km_inicial,
        'KM Final': log.km_final,
        'KM Percorrido': Math.max(0, log.km_final - log.km_inicial),
        'Status': log.status,
        'Abastecimento': log.abastecimento ? 'Sim' : 'Não',
        'Litros': log.litros_abastecidos,
        'Valor (R$)': log.valor_abastecido,
        'Ocorrências': log.ocorrencias,
      };
    });
    exportToExcel(rows, `diario_bordo_${format(new Date(), 'yyyyMMdd')}`, 'DiarioDeBordo');
    toast.success('Exportado com sucesso!');
  };

  // Dashboard Stats
  const totalViagens = logs.length;
  const emAndamento = logs.filter(l => l.status === 'Em andamento').length;
  const aguardandoDescarga = logs.filter(l => l.aguardando_descarga).length;
  const kmMes = logs
    .filter(l => l.data_saida && new Date(l.data_saida).getMonth() === new Date().getMonth())
    .reduce((acc, log) => acc + Math.max(0, log.km_final - log.km_inicial), 0);

  const StatusIcon: Record<string, any> = {
    'Finalizada': CheckCircle2,
    'Em andamento': Clock,
    'Cancelada': XCircle,
  };

  const StatusColors: Record<string, string> = {
    'Finalizada': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Em andamento': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Cancelada': 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Diário de Bordo</h1>
          <p className="text-xs text-muted-foreground">Histórico detalhado das viagens operacionais.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Button variant="outline" onClick={exportExcel} className="flex-1 md:flex-none">
            <FileDown className="h-4 w-4 mr-2" />Exportar
          </Button>
          <Button onClick={() => handleOpenModal()} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-6">
        {/* Dashboard Rápido */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Route className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <h3 className="text-xl font-bold">{totalViagens}</h3>
            </div>
          </Card>
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Em Andamento</p>
              <h3 className="text-xl font-bold">{emAndamento}</h3>
            </div>
          </Card>
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Aguard. Descarga</p>
              <h3 className="text-xl font-bold">{aguardandoDescarga}</h3>
            </div>
          </Card>
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">KM no Mês</p>
              <h3 className="text-xl font-bold">{(kmMes/1000).toFixed(1)}k</h3>
            </div>
          </Card>
        </div>

        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Data/Saída</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Motorista/Veículo</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Rota</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Distância</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Status / Tempo</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground border-b border-border">
                      Nenhum registro encontrado no diário de bordo.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                    const dist = Math.max(0, log.km_final - log.km_inicial);
                    const SIcon = StatusIcon[log.status];

                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-[13px] border-b border-border">
                          <div className="font-medium text-foreground">{log.data_saida ? format(new Date(log.data_saida.substring(0,10) + 'T00:00'), 'dd/MM/yyyy') : '—'}</div>
                          <div className="text-xs text-muted-foreground">{log.hora_saida || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border">
                          <div className="font-medium text-foreground">{log.motorista}</div>
                          <div className="text-xs text-muted-foreground">{vehicle?.placa || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border">
                          <div className="font-medium text-foreground whitespace-normal" title={`${log.cidade_origem} → ${log.cidade_destino}`}>
                            {log.cidade_origem} <span className="text-muted-foreground">→</span> {log.cidade_destino}
                          </div>
                          <div className="text-xs text-muted-foreground">{log.tipo_viagem}</div>
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-foreground">
                          {log.km_final > 0 ? `${dist} km` : '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border">
                          <div className="flex flex-col gap-1.5">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold w-fit ${StatusColors[log.status]}`}>
                              <SIcon className="h-3 w-3" />
                              {log.status}
                            </div>
                            {log.status === 'Em andamento' && (
                              <ActiveTripBadge log={log} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-border text-right">
                          <div className="flex justify-end gap-1">
                            {log.status === 'Em andamento' && (
                              <Button variant="ghost" size="icon" onClick={() => openDetail(log)} title="Controles da Viagem" className="text-primary hover:bg-primary/10">
                                <Bell className="h-4 w-4" />
                              </Button>
                            )}
                            {log.comprovante_url && (
                              <Button variant="ghost" size="icon" onClick={() => window.open(log.comprovante_url, '_blank')} title="Ver Anexo" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            )}
                            {(isAdmin || log.status === 'Em andamento') && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(log)}><Edit className="h-4 w-4" /></Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="text-danger hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></Button>
                                )}
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

      {/* Rest Alert global */}
      <RestAlert
        visible={!!(activeLog && timer.nivelAlerta === 'critico' && !alertDismissed[activeLog.id])}
        tempoStr={timer.tempoLiquidoStr}
        onIniciarPausa={() => { handleIniciarPausa(); setAlertDismissed(prev => ({ ...prev, [activeLog!.id]: true })); }}
        onDismiss={() => activeLog && setAlertDismissed(prev => ({ ...prev, [activeLog.id]: true }))}
      />

      {/* Detail Modal — Controles da Viagem */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Controles — ${selectedLog?.motorista ?? ''}`}>
        <div className="space-y-5">
          {selectedLog && (
            <>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Tempo em direção</p>
                  <p className="text-lg font-bold">{timer.tempoLiquidoStr}</p>
                </div>
                {timer.nivelAlerta === 'critico' && <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">PAUSA NECESSÁRIA</span>}
                {timer.nivelAlerta === 'aviso' && <span className="ml-auto text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">{timer.minutosParaAlerta}min p/ alerta</span>}
              </div>
              <TripControls
                logbookId={selectedLog.id}
                emPausa={selectedLog.em_pausa ?? false}
                aguardandoDescarga={selectedLog.aguardando_descarga ?? false}
                onIniciarPausa={handleIniciarPausa}
                onRetomarViagem={handleRetomarViagem}
                onIniciarEspera={handleIniciarEspera}
                onFinalizarEspera={handleFinalizarEspera}
              />
              <TripTimeline
                events={tripEvents}
                horaSaida={selectedLog.data_saida && selectedLog.hora_saida ? `${selectedLog.data_saida}T${selectedLog.hora_saida}` : null}
                horaChegada={selectedLog.data_chegada && selectedLog.hora_chegada ? `${selectedLog.data_chegada}T${selectedLog.hora_chegada}` : null}
                status={selectedLog.status}
              />
            </>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingLog ? 'Editar Diário de Bordo' : 'Novo Diário de Bordo'}
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-2">
          
          {/* SEÇÃO 1: Info Viagem */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80">Informações da Viagem</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select required value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                  <option value="" disabled>Selecione um veículo</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
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
                      {MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}
                    </>
                  )}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Viagem</Label>
                <Select value={formData.tipo_viagem} onChange={e => setFormData({...formData, tipo_viagem: e.target.value as TipoViagem})}>
                  {TIPOS_VIAGEM.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origem (Cidade)</Label>
                <Input required value={formData.cidade_origem} onChange={e => setFormData({...formData, cidade_origem: e.target.value})} placeholder="Ex: São Paulo, SP" />
              </div>
              <div className="space-y-2">
                <Label>Destino (Cidade)</Label>
                <Input required value={formData.cidade_destino} onChange={e => setFormData({...formData, cidade_destino: e.target.value})} placeholder="Ex: Campinas, SP" />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Horários */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80">Horários</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
              <div className="space-y-2">
                <Label>Data de Saída</Label>
                <Input type="date" value={formData.data_saida || ''} onChange={e => setFormData({...formData, data_saida: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Hora de Saída</Label>
                <Input type="time" value={formData.hora_saida || ''} onChange={e => setFormData({...formData, hora_saida: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
              <div className="space-y-2">
                <Label>Data de Chegada</Label>
                <Input type="date" value={formData.data_chegada || ''} onChange={e => setFormData({...formData, data_chegada: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Hora de Chegada</Label>
                <Input type="time" value={formData.hora_chegada || ''} onChange={e => setFormData({...formData, hora_chegada: e.target.value})} />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Kilometragem */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80">Quilometragem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>KM Inicial</Label>
                <Input required type="text" inputMode="numeric" placeholder="Ex: 125000" value={formData.km_inicial} onChange={e => setFormData({...formData, km_inicial: e.target.value.replace(/[^0-9]/g, '')})} />
              </div>
              <div className="space-y-2">
                <Label>KM Final</Label>
                <Input type="text" inputMode="numeric" placeholder="Ex: 125000" value={formData.km_final} onChange={e => setFormData({...formData, km_final: e.target.value.replace(/[^0-9]/g, '')})} />
              </div>
              <div className="space-y-2">
                <Label>Distância</Label>
                <Input disabled value={formData.km_final > 0 ? Math.max(0, formData.km_final - formData.km_inicial) + ' km' : '—'} className="bg-muted" />
              </div>
            </div>
          </div>



          {/* SEÇÃO 5: Ocorrências e Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80">Ocorrências & Status</h3>
            <div className="space-y-2">
              <Label>Ocorrências (Multas, problemas, atrasos...)</Label>
              <textarea
                className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                rows={3}
                placeholder="Descreva se houve alguma ocorrência relevante..."
                value={formData.ocorrencias}
                onChange={e => setFormData({...formData, ocorrencias: e.target.value})}
              />
            </div>
            <div className="space-y-2 pt-2">
              <Label>Status da Viagem</Label>
              <Select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                <option value="Em andamento">Em andamento</option>
                <option value="Finalizada">Finalizada</option>
                <option value="Cancelada">Cancelada</option>
              </Select>
            </div>
          </div>

          <FileUpload 
            bucket="diario-bordo"
            label="Anexo de Viagem (Opcional)"
            value={formData.comprovante_url}
            onChange={(url) => setFormData({ ...formData, comprovante_url: url })}
          />

          <div className="flex justify-end gap-2 sticky bottom-0 z-10 bg-card py-4 px-4 sm:px-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Registro
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
