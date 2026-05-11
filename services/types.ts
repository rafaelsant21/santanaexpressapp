export type VehicleStatus = 'ativo' | 'manutenção' | 'inativo';

export interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  status: VehicleStatus;
  km_atual: number;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  motorista: string;
  data: string;
  litros: number;
  valor_total: number;
  km_no_abastecimento: number;
}

export type MaintenanceType = 'preventiva' | 'corretiva';
export type MaintenanceStatus = 'pendente' | 'concluída';

export interface Maintenance {
  id: string;
  vehicle_id: string;
  motorista: string;
  tipo: MaintenanceType;
  descricao: string;
  custo: number;
  data: string;
  km: number;
  status: MaintenanceStatus;
}

export type TipoViagem = 'Entrega' | 'Coleta' | 'Transferência';

export interface Checklist {
  id: string;
  vehicle_id: string;
  data: string;
  motorista: string;
  km_atual: number;
  tipo_viagem: TipoViagem;
  itens_check: {
    // Segurança do veículo
    pneus_ok: boolean;
    freios_ok: boolean;
    luzes_ok: boolean;
    limpador_ok: boolean;
    retrovisores_ok: boolean;
    oleo_ok: boolean;
    // Operação de transporte
    carga_conferida: boolean;
    amarracao_ok: boolean;
    bau_fechado: boolean;
    // Itens obrigatórios
    extintor_ok: boolean;
    triangulo_ok: boolean;
    macaco_ok: boolean;
    // Documentação
    documentos_ok: boolean;
  };
  observacoes: string;
  aviso_revisado?: boolean;
  comprovante_url?: string;
}

export interface Logbook {
  id: string;
  vehicle_id: string;
  motorista: string;
  tipo_viagem: TipoViagem;
  cidade_origem: string;
  cidade_destino: string;
  data_saida: string | null;
  hora_saida: string | null;
  data_chegada: string | null;
  hora_chegada: string | null;
  km_inicial: number;
  km_final: number;
  abastecimento: boolean;
  valor_abastecido: number;
  litros_abastecidos: number;
  ocorrencias: string;
  status: 'Em andamento' | 'Finalizada' | 'Cancelada';
  comprovante_url?: string;
}

export type UserRole = 'admin' | 'driver';

export interface UserSession {
  email: string;
  name: string;
  role: UserRole;
  isLoggedIn: boolean;
}

// ─── DESPESAS OPERACIONAIS ───────────────────────────────────────────────────

export type ExpenseType = 
  | 'Pedágio' 
  | 'Alimentação' 
  | 'Combustível' 
  | 'Estacionamento' 
  | 'Hotel/Pernoite' 
  | 'Lavagem' 
  | 'Manutenção emergencial' 
  | 'Multa' 
  | 'Adiantamento' 
  | 'Outros';

export type PaymentMethod = 
  | 'Dinheiro' 
  | 'PIX' 
  | 'Cartão' 
  | 'Empresa' 
  | 'Outro';

export type ExpenseStatus = 
  | 'Pendente' 
  | 'Aprovada' 
  | 'Reembolsada' 
  | 'Recusada';

export interface Expense {
  id: string;
  vehicle_id: string;
  motorista: string;
  data: string;
  hora: string;
  tipo: ExpenseType;
  valor: number;
  forma_pagamento: PaymentMethod;
  cidade: string;
  estado: string;
  observacoes: string;
  comprovante_url?: string;
  status: ExpenseStatus;
}
