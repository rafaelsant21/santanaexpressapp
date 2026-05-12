'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, Modal } from '@/components/ui/modal';
import { Button, Input, Select, Label } from '@/components/ui/forms';
import { 
  Receipt, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  FileDown, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter,
  MapPin,
  Image as ImageIcon,
  AlertTriangle,
  Truck
} from 'lucide-react';
import { getVehicles, getExpenses, createExpense, updateExpense, deleteExpense } from '@/services/supabaseService';
import { Vehicle, Expense, ExpenseType, PaymentMethod, ExpenseStatus } from '@/services/types';
import { FileUpload } from '@/components/ui/FileUpload';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { parseBRL } from '@/lib/utils';

const MOTORISTAS = ['Santana', 'Rodrigo', 'Marcos', 'Renato', 'Silvio'];
const TIPOS_DESPESA: ExpenseType[] = [
  'Pedágio',
  'Alimentação',
  'Combustível',
  'Estacionamento',
  'Hotel/Pernoite',
  'Lavagem',
  'Manutenção emergencial',
  'Multa',
  'Adiantamento',
  'Outros'
];

const FORMAS_PAGAMENTO: PaymentMethod[] = [
  'Dinheiro',
  'PIX',
  'Cartão',
  'Empresa',
  'Outro'
];

const STATUS_DESPESA: ExpenseStatus[] = [
  'Pendente',
  'Aprovada',
  'Reembolsada',
  'Recusada'
];

interface ExpenseFormData {
  vehicle_id: string;
  motorista: string;
  data: string;
  hora: string;
  tipo: ExpenseType;
  valor: number | string;
  forma_pagamento: PaymentMethod;
  cidade: string;
  estado: string;
  observacoes: string;
  status: ExpenseStatus;
  comprovante_url?: string;
}

const DEFAULT_FORM: ExpenseFormData = {
  vehicle_id: '',
  motorista: '',
  data: new Date().toISOString().substring(0, 10),
  hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  tipo: 'Outros',
  valor: '',
  forma_pagamento: 'Dinheiro',
  cidade: '',
  estado: '',
  observacoes: '',
  status: 'Pendente',
  comprovante_url: ''
};

export default function DespesasOperacionaisPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({ ...DEFAULT_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<string>('');

  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eData, vData] = await Promise.all([getExpenses(), getVehicles()]);
      setExpenses(eData);
      setVehicles(vData);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        ...expense,
        data: new Date(expense.data).toISOString().substring(0, 10),
        valor: expense.valor
      });
    } else {
      setEditingExpense(null);
      setFormData({ 
        ...DEFAULT_FORM, 
        vehicle_id: vehicles[0]?.id || '',
        motorista: session?.name || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validação Extra
      if (!formData.vehicle_id || !formData.motorista || !formData.tipo || !formData.valor) {
        toast.error('Por favor, preencha todos os campos obrigatórios');
        setIsSubmitting(false);
        return;
      }

      if (!formData.cidade || !formData.estado) {
        toast.error('Localização (Cidade/Estado) é obrigatória');
        setIsSubmitting(false);
        return;
      }

      const payload: Omit<Expense, 'id'> = {
        ...formData,
        valor: parseBRL(formData.valor),
        data: formData.data || new Date().toISOString().substring(0, 10),
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload as Partial<Expense>);
        toast.success('Despesa atualizada com sucesso!');
      } else {
        await createExpense(payload);
        toast.success('Despesa registrada com sucesso!');
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    try {
      await deleteExpense(id);
      toast.success('Despesa excluída');
      loadData();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
      const matchesSearch = 
        exp.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle?.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.tipo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter ? exp.status === statusFilter : true;
      const matchesTipo = tipoFilter ? exp.tipo === tipoFilter : true;

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [expenses, vehicles, searchTerm, statusFilter, tipoFilter]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.data);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalMonth = monthExpenses.reduce((acc, e) => acc + e.valor, 0);
    const pendingCount = expenses.filter(e => e.status === 'Pendente').length;
    
    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      categories[e.tipo] = (categories[e.tipo] || 0) + e.valor;
    });
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { totalMonth, pendingCount, topCategory };
  }, [expenses]);

  const statusStyles: Record<ExpenseStatus, string> = {
    'Pendente': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Aprovada': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Reembolsada': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Recusada': 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const statusIcons: Record<ExpenseStatus, any> = {
    'Pendente': Clock,
    'Aprovada': CheckCircle2,
    'Reembolsada': CheckCircle2,
    'Recusada': XCircle
  };

  const exportExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    const rows = filteredExpenses.map(exp => {
      const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
      return {
        'Data': format(new Date(exp.data), 'dd/MM/yyyy'),
        'Hora': exp.hora,
        'Motorista': exp.motorista,
        'Veículo': vehicle?.placa || '',
        'Tipo': exp.tipo,
        'Valor (R$)': exp.valor,
        'Pagamento': exp.forma_pagamento,
        'Local': `${exp.cidade} - ${exp.estado}`,
        'Status': exp.status,
        'Observações': exp.observacoes
      };
    });
    exportToExcel(rows, `despesas_operacionais_${format(new Date(), 'yyyyMMdd')}`, 'Despesas');
    toast.success('Exportado com sucesso!');
  };

  return (
    <div className="flex flex-col min-h-0 bg-background h-full overflow-hidden">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Despesas Operacionais</h1>
          <p className="text-xs text-muted-foreground">Controle financeiro de viagens e operações.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Button variant="outline" onClick={exportExcel} className="flex-1 md:flex-none">
            <FileDown className="h-4 w-4 mr-2" />Exportar
          </Button>
          <Button onClick={() => handleOpenModal()} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />Nova Despesa
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 space-y-6 scroll-smooth">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gasto no Mês</p>
              <h3 className="text-2xl font-bold">R$ {stats.totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </Card>
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aguardando Aprovação</p>
              <h3 className="text-2xl font-bold">{stats.pendingCount} pendentes</h3>
            </div>
          </Card>
          <Card className="p-4 bg-[#1e293b] border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Maior Categoria</p>
              <h3 className="text-2xl font-bold">{stats.topCategory}</h3>
            </div>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 bg-[#0f172b] p-4 rounded-xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por motorista, placa, cidade..." 
              className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} className="w-[140px]">
              <option value="">Todos os Tipos</option>
              {TIPOS_DESPESA.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-[140px]">
              <option value="">Todos os Status</option>
              {STATUS_DESPESA.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {/* Expenses List */}
        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[900px]">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Motorista/Veículo</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Tipo/Pagamento</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Valor</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Localização</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhuma despesa encontrada.</td></tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
                    const SIcon = statusIcons[exp.status];
                    return (
                      <tr key={exp.id} className="hover:bg-white/5 transition-colors border-b border-border last:border-0">
                        <td className="px-4 py-4 text-[13px]">
                          <div className="font-medium text-foreground">{format(new Date(exp.data), 'dd/MM/yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{exp.hora}</div>
                        </td>
                        <td className="px-4 py-4 text-[13px]">
                          <div className="font-medium text-foreground">{exp.motorista}</div>
                          <div className="text-xs text-muted-foreground">{vehicle?.placa || '—'}</div>
                        </td>
                        <td className="px-4 py-4 text-[13px]">
                          <div className="font-medium text-foreground">{exp.tipo}</div>
                          <div className="text-xs text-muted-foreground">{exp.forma_pagamento}</div>
                        </td>
                        <td className="px-4 py-4 text-[13px]">
                          <div className="font-bold text-red-400">R$ {exp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-4 py-4 text-[13px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {exp.cidade}, {exp.estado}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[13px]">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusStyles[exp.status]}`}>
                            <SIcon className="h-3 w-3" />
                            {exp.status}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {exp.comprovante_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => window.open(exp.comprovante_url, '_blank')}
                                title="Visualizar Comprovante"
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(exp)}><Edit className="h-4 w-4" /></Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)} className="text-danger hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></Button>
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
        title={editingExpense ? 'Editar Despesa' : 'Registrar Nova Despesa'}
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto overflow-x-hidden pr-1">
          {/* Sessão 1: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80 flex items-center gap-2">
              <Truck className="h-4 w-4" /> Informações da Viagem
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Motorista</Label>
                <Select required value={formData.motorista} onChange={e => setFormData({ ...formData, motorista: e.target.value })}>
                  <option value="" disabled>Selecione</option>
                  {MOTORISTAS.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Veículo</Label>
                <Select required value={formData.vehicle_id} onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}>
                  <option value="" disabled>Selecione</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input required type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input required type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Sessão 2: Detalhes da Despesa */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Detalhes Financeiros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Despesa</Label>
                <Select required value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as ExpenseType })}>
                  {TIPOS_DESPESA.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor Total (R$)</Label>
                <Input 
                  required 
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00" 
                  value={formData.valor} 
                  onChange={e => {
                    // Permite apenas números, vírgula e ponto
                    const val = e.target.value.replace(/[^0-9,.]/g, '');
                    setFormData({ ...formData, valor: val });
                  }} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select required value={formData.forma_pagamento} onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value as PaymentMethod })}>
                {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
          </div>

          {/* Sessão 3: Localização */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input required value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} placeholder="Ex: São Paulo" />
              </div>
              <div className="space-y-1">
                <Label>Estado (UF)</Label>
                <Input required value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value.toUpperCase() })} maxLength={2} placeholder="Ex: SP" />
              </div>
            </div>
          </div>

          {/* Sessão 4: Comprovante e Obs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Comprovante & Observações
              </h3>
              <div className="space-y-2">
                <Label>Descrição / Motivo</Label>
                <textarea 
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                  placeholder="Detalhes adicionais sobre a despesa..."
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
              <FileUpload 
                bucket="despesas"
                label="Foto do Recibo / Nota Fiscal"
                value={formData.comprovante_url}
                onChange={(url) => setFormData({ ...formData, comprovante_url: url })}
              />
            </div>

          {/* Status (Apenas Admin) */}
          {isAdmin && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground/80 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" /> Gerenciamento Administrativo
              </h3>
              <div className="space-y-1">
                <Label>Status da Despesa</Label>
                <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ExpenseStatus })}>
                  {STATUS_DESPESA.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 sticky bottom-0 z-10 bg-card py-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingExpense ? 'Atualizar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mobile FAB */}
      <button
        onClick={() => handleOpenModal()}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all z-40"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
