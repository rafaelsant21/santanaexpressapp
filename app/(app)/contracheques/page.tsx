'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Label } from '@/components/ui/forms';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Eye,
  Loader2,
  Upload,
  Calendar,
  User,
  FileCheck,
  AlertCircle,
  ChevronDown,
  Search,
  Edit,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  getContracheques,
  createContracheque,
  updateContracheque,
  deleteContracheque,
  uploadContracheque,
  getContrachequeUrl,
  getProfilesForContracheque,
} from '@/services/supabaseService';
import { Contracheque } from '@/services/types';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDeleteModal, useConfirmDelete } from '@/components/ui/confirm-modal';

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => ANO_ATUAL - i);

interface Profile {
  id: string;
  name: string;
  role: string;
}

interface FormData {
  motorista_id: string;
  motorista_nome: string;
  mes: number;
  ano: number;
  observacoes: string;
  arquivo_pdf: File | null;
}

const DEFAULT_FORM: FormData = {
  motorista_id: '',
  motorista_nome: '',
  mes: new Date().getMonth() + 1,
  ano: ANO_ATUAL,
  observacoes: '',
  arquivo_pdf: null,
};

export default function ContrachequeesPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  const [contracheques, setContracheques] = useState<Contracheque[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });

  // Filtros
  const [filterMes, setFilterMes] = useState<string>('');
  const [filterAno, setFilterAno] = useState<string>(String(ANO_ATUAL));
  const [filterMotorista, setFilterMotorista] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Ações de PDF em andamento
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<Contracheque | null>(null);
  const { confirmProps, openConfirm } = useConfirmDelete({
    onConfirm: async () => {
      if (!deleteTarget) return;
      await deleteContracheque(deleteTarget.id, deleteTarget.arquivo_pdf);
      toast.success('Contracheque excluído');
      loadData();
      setDeleteTarget(null);
    },
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [getContracheques()];
      if (isAdmin) promises.push(getProfilesForContracheque());

      const [docs, profs] = await Promise.all(promises);
      setContracheques(docs ?? []);
      if (isAdmin && profs) setProfiles(profs);
    } catch {
      toast.error('Erro ao carregar contracheques');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtros aplicados
  const filteredContracheques = useMemo(() => {
    return contracheques.filter(c => {
      if (filterMes && c.mes !== Number(filterMes)) return false;
      if (filterAno && c.ano !== Number(filterAno)) return false;
      if (filterMotorista && c.motorista_id !== filterMotorista) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          c.motorista_nome.toLowerCase().includes(search) ||
          MESES[c.mes - 1]?.label.toLowerCase().includes(search) ||
          String(c.ano).includes(search)
        );
      }
      return true;
    });
  }, [contracheques, filterMes, filterAno, filterMotorista, searchTerm]);

  const handleOpenModal = useCallback((doc?: Contracheque) => {
    if (doc) {
      setEditingId(doc.id);
      setFormData({
        motorista_id: doc.motorista_id,
        motorista_nome: doc.motorista_nome,
        mes: doc.mes,
        ano: doc.ano,
        observacoes: doc.observacoes ?? '',
        arquivo_pdf: null, // Não reutiliza arquivo existente
      });
    } else {
      setEditingId(null);
      setFormData({ ...DEFAULT_FORM });
    }
    setIsModalOpen(true);
  }, []);

  const handleMotoristaChange = useCallback((motoristaId: string) => {
    const profile = profiles.find(p => p.id === motoristaId);
    setFormData(prev => ({
      ...prev,
      motorista_id: motoristaId,
      motorista_nome: profile?.name ?? '',
    }));
  }, [profiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }
    setFormData(prev => ({ ...prev, arquivo_pdf: file }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motorista_id) {
      toast.error('Selecione o motorista');
      return;
    }
    if (!editingId && !formData.arquivo_pdf) {
      toast.error('Selecione o arquivo PDF');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Editar: só atualiza campos de texto
        const updates: any = {
          mes: formData.mes,
          ano: formData.ano,
          motorista_id: formData.motorista_id,
          motorista_nome: formData.motorista_nome,
          observacoes: formData.observacoes,
        };
        // Se novo arquivo for selecionado, faz upload
        if (formData.arquivo_pdf) {
          const filePath = await uploadContracheque(formData.arquivo_pdf, formData.motorista_id);
          updates.arquivo_pdf = filePath;
        }
        await updateContracheque(editingId, updates);
        toast.success('Contracheque atualizado!');
      } else {
        // Criar: faz upload do PDF e cria registro
        const filePath = await uploadContracheque(formData.arquivo_pdf!, formData.motorista_id);
        await createContracheque({
          motorista_id: formData.motorista_id,
          motorista_nome: formData.motorista_nome,
          mes: formData.mes,
          ano: formData.ano,
          arquivo_pdf: filePath,
          observacoes: formData.observacoes,
          data_envio: new Date().toISOString(),
        });
        toast.success('Contracheque enviado com sucesso!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar contracheque');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingId, loadData]);

  const handleDelete = useCallback((doc: Contracheque) => {
    setDeleteTarget(doc);
    openConfirm();
  }, [openConfirm]);

  const handleVisualize = useCallback(async (doc: Contracheque) => {
    setLoadingPdf(doc.id + '_view');
    try {
      const url = await getContrachequeUrl(doc.arquivo_pdf);
      window.open(url, '_blank');
    } catch {
      toast.error('Erro ao abrir o arquivo');
    } finally {
      setLoadingPdf(null);
    }
  }, []);

  const handleDownload = useCallback(async (doc: Contracheque) => {
    setLoadingPdf(doc.id + '_download');
    try {
      const url = await getContrachequeUrl(doc.arquivo_pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contracheque_${doc.motorista_nome.replace(/\s+/g, '_')}_${MESES[doc.mes - 1]?.label}_${doc.ano}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Erro ao baixar o arquivo');
    } finally {
      setLoadingPdf(null);
    }
  }, []);

  // Agrupar por motorista para exibição
  const groupedByMotorista = useMemo(() => {
    if (!isAdmin) return null;
    const map = new Map<string, { nome: string; docs: Contracheque[] }>();
    for (const doc of filteredContracheques) {
      if (!map.has(doc.motorista_id)) {
        map.set(doc.motorista_id, { nome: doc.motorista_nome, docs: [] });
      }
      map.get(doc.motorista_id)!.docs.push(doc);
    }
    return map;
  }, [filteredContracheques, isAdmin]);

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      {/* Header */}
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contracheques
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'Gerencie e envie contracheques para os motoristas.' : 'Visualize seus contracheques e holerites.'}
          </p>
        </div>

        {/* Filtros e ação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 pl-8 pr-3 text-sm rounded-md border border-border bg-[#1e293b] text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-36"
            />
          </div>

          {/* Filtro Mês */}
          <select
            value={filterMes}
            onChange={e => setFilterMes(e.target.value)}
            className="h-11 md:h-9 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos os meses</option>
            {MESES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Filtro Ano */}
          <select
            value={filterAno}
            onChange={e => setFilterAno(e.target.value)}
            className="h-11 md:h-9 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos os anos</option>
            {ANOS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Filtro Motorista (só admin) */}
          {isAdmin && profiles.length > 0 && (
            <select
              value={filterMotorista}
              onChange={e => setFilterMotorista(e.target.value)}
              className="h-11 md:h-9 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] md:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos os motoristas</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {isAdmin && (
            <Button onClick={() => handleOpenModal()} className="hidden md:flex shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Enviar Contracheque
            </Button>
          )}
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 space-y-6">
        {isLoading ? (
          <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
            <TableSkeleton cols={5} rows={5} />
          </Card>
        ) : filteredContracheques.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Nenhum contracheque encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {isAdmin
                ? 'Clique em "Enviar Contracheque" para adicionar o primeiro documento.'
                : 'Seus contracheques aparecerão aqui quando forem enviados pelo administrador.'}
            </p>
          </div>
        ) : isAdmin && groupedByMotorista ? (
          // Vista Admin: agrupado por motorista
          <div className="space-y-6">
            {Array.from(groupedByMotorista.entries()).map(([motoristaId, { nome, docs }]) => (
              <div key={motoristaId}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">{nome}</h2>
                  <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                    {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {docs.map(doc => (
                    <ContrachequeCard
                      key={doc.id}
                      doc={doc}
                      isAdmin={isAdmin}
                      loadingPdf={loadingPdf}
                      onVisualize={handleVisualize}
                      onDownload={handleDownload}
                      onEdit={handleOpenModal}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Vista Motorista: todos os próprios documentos
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContracheques.map(doc => (
              <ContrachequeCard
                key={doc.id}
                doc={doc}
                isAdmin={isAdmin}
                loadingPdf={loadingPdf}
                onVisualize={handleVisualize}
                onDownload={handleDownload}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de envio/edição (admin only) */}
      {isAdmin && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Editar Contracheque' : 'Enviar Contracheque'}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Motorista */}
            <div className="space-y-1.5">
              <Label>Motorista *</Label>
              <select
                required
                value={formData.motorista_id}
                onChange={e => handleMotoristaChange(e.target.value)}
                className="w-full h-11 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>Selecione o motorista</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Mês e Ano */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mês de Referência *</Label>
                <select
                  required
                  value={formData.mes}
                  onChange={e => setFormData(prev => ({ ...prev, mes: Number(e.target.value) }))}
                  className="w-full h-11 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {MESES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano *</Label>
                <select
                  required
                  value={formData.ano}
                  onChange={e => setFormData(prev => ({ ...prev, ano: Number(e.target.value) }))}
                  className="w-full h-11 rounded-md border border-border bg-[#1e293b] px-3 text-[16px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ANOS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload PDF */}
            <div className="space-y-1.5">
              <Label>{editingId ? 'Novo Arquivo PDF (opcional)' : 'Arquivo PDF *'}</Label>
              <label className={`
                flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                ${formData.arquivo_pdf
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5'}
              `}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {formData.arquivo_pdf ? (
                  <div className="flex flex-col items-center gap-1.5 text-center px-4">
                    <FileCheck className="h-8 w-8 text-green-400" />
                    <p className="text-sm font-medium text-green-400 truncate max-w-full">
                      {formData.arquivo_pdf.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(formData.arquivo_pdf.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center px-4">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <span className="text-primary font-medium">Clique para selecionar</span> o PDF
                    </p>
                    <p className="text-xs text-muted-foreground">PDF até 10MB</p>
                  </div>
                )}
              </label>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <textarea
                value={formData.observacoes}
                onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Ex: Contracheque com desconto de vale-transporte"
                rows={3}
                className="w-full rounded-md border border-border bg-[#1e293b] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Aviso de arquivo */}
            {editingId && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Se não selecionar um novo arquivo, o PDF atual será mantido.</span>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2 sticky bottom-0 z-10 bg-card py-4 px-4 sm:px-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> {editingId ? 'Salvar' : 'Enviar'}</>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* FAB Mobile (admin only) */}
      {isAdmin && (
        <button
          onClick={() => handleOpenModal()}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all z-40"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <ConfirmDeleteModal
        {...confirmProps}
        itemName={deleteTarget ? `Contracheque de ${deleteTarget.motorista_nome} — ${MESES[deleteTarget.mes - 1]?.label} ${deleteTarget.ano}` : undefined}
      />
    </div>
  );
}

// ─── Card de Contracheque ─────────────────────────────────────────────────────

interface ContrachequeCardProps {
  doc: Contracheque;
  isAdmin: boolean;
  loadingPdf: string | null;
  onVisualize: (doc: Contracheque) => void;
  onDownload: (doc: Contracheque) => void;
  onEdit: (doc: Contracheque) => void;
  onDelete: (doc: Contracheque) => void;
}

const ContrachequeCard = React.memo(function ContrachequeCard({
  doc,
  isAdmin,
  loadingPdf,
  onVisualize,
  onDownload,
  onEdit,
  onDelete,
}: ContrachequeCardProps) {
  const mesLabel = MESES[doc.mes - 1]?.label ?? '-';
  const dataEnvio = doc.data_envio
    ? format(new Date(doc.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '-';

  const isViewLoading = loadingPdf === doc.id + '_view';
  const isDownloadLoading = loadingPdf === doc.id + '_download';

  return (
    <div className="group bg-[#1e293b] border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      {/* Ícone + Info */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">
            {mesLabel} / {doc.ano}
          </p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <User className="h-3 w-3 inline mr-1" />
              {doc.motorista_nome}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            {dataEnvio}
          </p>
        </div>
      </div>

      {/* Observações */}
      {doc.observacoes && (
        <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg px-2.5 py-1.5 line-clamp-2">
          {doc.observacoes}
        </p>
      )}

      {/* Ações */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={() => onVisualize(doc)}
          disabled={!!loadingPdf}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {isViewLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Eye className="h-3.5 w-3.5" />}
          Visualizar
        </button>
        <button
          onClick={() => onDownload(doc)}
          disabled={!!loadingPdf}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-semibold rounded-lg bg-muted/30 text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          {isDownloadLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Download className="h-3.5 w-3.5" />}
          Baixar
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => onEdit(doc)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              title="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(doc)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
});
