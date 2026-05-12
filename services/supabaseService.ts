import { supabase } from '../lib/supabase';
import { Vehicle, FuelLog, Maintenance, Checklist, Logbook, Expense, TripEvent } from './types';
import { withTimeout, withRetry } from '@/lib/utils';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Supabase Error] ${context}:`, error);
  throw new Error(`Erro em ${context}: ${message}`);
}

// Wrapper padrão para todas as chamadas Supabase com timeout de 15s
const call = <T>(promise: Promise<T>, context: string) => 
  withTimeout(promise, 15000).catch(err => {
    if (err.message === 'TIMEOUT_EXCEEDED') {
      throw new Error(`O tempo de resposta expirou ao tentar ${context}. Verifique sua conexão.`);
    }
    handleError(err, context);
  });

export const uploadFile = async (bucket: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await call(
    supabase.storage.from(bucket).upload(filePath, file),
    `uploadFile (${bucket})`
  );

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

// ─── VEÍCULOS ────────────────────────────────────────────────────────────────

export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await call(
    supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
    'getVehicles'
  );
  return (data ?? []) as Vehicle[];
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  const { data, error } = await call(
    supabase.from('vehicles').insert([vehicle]).select().single(),
    'createVehicle'
  );
  return data as Vehicle;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
  const { data, error } = await call(
    supabase.from('vehicles').update(updates).eq('id', id).select().single(),
    'updateVehicle'
  );
  return data as Vehicle;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await call(
    supabase.from('vehicles').delete().eq('id', id),
    'deleteVehicle'
  );
};

// ─── ABASTECIMENTOS ──────────────────────────────────────────────────────────

export const getFuelLogs = async (): Promise<FuelLog[]> => {
  const { data } = await call(
    supabase.from('fuel_logs').select('*').order('created_at', { ascending: false }),
    'getFuelLogs'
  );
  return (data ?? []) as FuelLog[];
};

export const createFuelLog = async (log: Omit<FuelLog, 'id'>): Promise<FuelLog> => {
  // Abastecimento tem Retry automático por ser crítico e apresentar erro intermitente
  return withRetry(async () => {
    const { data, error } = await call(
      supabase.from('fuel_logs').insert([log]).select().single(),
      'createFuelLog'
    );
    return data as FuelLog;
  }, 2);
};

export const updateFuelLog = async (id: string, updates: Partial<FuelLog>): Promise<FuelLog> => {
  const { data } = await call(
    supabase.from('fuel_logs').update(updates).eq('id', id).select().single(),
    'updateFuelLog'
  );
  return data as FuelLog;
};

export const deleteFuelLog = async (id: string): Promise<void> => {
  await call(
    supabase.from('fuel_logs').delete().eq('id', id),
    'deleteFuelLog'
  );
};

// ─── MANUTENÇÕES ─────────────────────────────────────────────────────────────

export const getMaintenances = async (): Promise<Maintenance[]> => {
  const { data } = await call(
    supabase.from('maintenances').select('*').order('created_at', { ascending: false }),
    'getMaintenances'
  );
  return (data ?? []) as Maintenance[];
};

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  const { data } = await call(
    supabase.from('maintenances').insert([maintenance]).select().single(),
    'createMaintenance'
  );
  return data as Maintenance;
};

export const updateMaintenance = async (id: string, updates: Partial<Maintenance>): Promise<Maintenance> => {
  const { data } = await call(
    supabase.from('maintenances').update(updates).eq('id', id).select().single(),
    'updateMaintenance'
  );
  return data as Maintenance;
};

// ─── CHECKLISTS ──────────────────────────────────────────────────────────────

type ChecklistRow = {
  id: string;
  vehicle_id: string;
  user_id?: string;
  data: string;
  motorista: string;
  km_atual: number;
  tipo_viagem: string;
  pneus_ok: boolean;
  freios_ok: boolean;
  luzes_ok: boolean;
  limpador_ok: boolean;
  retrovisores_ok: boolean;
  oleo_ok: boolean;
  carga_conferida: boolean;
  amarracao_ok: boolean;
  bau_fechado: boolean;
  extintor_ok: boolean;
  triangulo_ok: boolean;
  macaco_ok: boolean;
  documentos_ok: boolean;
  observacoes: string;
  aviso_revisado: boolean;
  comprovante_url?: string;
};

function rowToChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    user_id: row.user_id,
    data: row.data,
    motorista: row.motorista,
    km_atual: row.km_atual,
    tipo_viagem: row.tipo_viagem as Checklist['tipo_viagem'],
    itens_check: {
      pneus_ok: row.pneus_ok,
      freios_ok: row.freios_ok,
      luzes_ok: row.luzes_ok,
      limpador_ok: row.limpador_ok,
      retrovisores_ok: row.retrovisores_ok,
      oleo_ok: row.oleo_ok,
      carga_conferida: row.carga_conferida,
      amarracao_ok: row.amarracao_ok,
      bau_fechado: row.bau_fechado,
      extintor_ok: row.extintor_ok,
      triangulo_ok: row.triangulo_ok,
      macaco_ok: row.macaco_ok,
      documentos_ok: row.documentos_ok,
    },
    observacoes: row.observacoes,
    aviso_revisado: row.aviso_revisado,
    comprovante_url: row.comprovante_url,
  };
}

function checklistToRow(c: Omit<Checklist, 'id'>): Omit<ChecklistRow, 'id'> {
  return {
    vehicle_id: c.vehicle_id,
    user_id: c.user_id,
    data: c.data,
    motorista: c.motorista,
    km_atual: c.km_atual,
    tipo_viagem: c.tipo_viagem,
    pneus_ok: c.itens_check.pneus_ok,
    freios_ok: c.itens_check.freios_ok,
    luzes_ok: c.itens_check.luzes_ok,
    limpador_ok: c.itens_check.limpador_ok,
    retrovisores_ok: c.itens_check.retrovisores_ok,
    oleo_ok: c.itens_check.oleo_ok,
    carga_conferida: c.itens_check.carga_conferida,
    amarracao_ok: c.itens_check.amarracao_ok,
    bau_fechado: c.itens_check.bau_fechado,
    extintor_ok: c.itens_check.extintor_ok,
    triangulo_ok: c.itens_check.triangulo_ok,
    macaco_ok: c.itens_check.macaco_ok,
    documentos_ok: c.itens_check.documentos_ok,
    observacoes: c.observacoes,
    aviso_revisado: c.aviso_revisado ?? false,
    comprovante_url: c.comprovante_url,
  };
}

export const getChecklists = async (): Promise<Checklist[]> => {
  const { data } = await call(
    supabase.from('checklists').select('*').order('created_at', { ascending: false }),
    'getChecklists'
  );
  return (data as ChecklistRow[]).map(rowToChecklist);
};

export const createChecklist = async (checklist: Omit<Checklist, 'id'>): Promise<Checklist> => {
  const row = checklistToRow(checklist);
  const { data } = await call(
    supabase.from('checklists').insert([row]).select().single(),
    'createChecklist'
  );
  return rowToChecklist(data as ChecklistRow);
};

export const updateChecklist = async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
  const flat: any = { ...updates };
  if (updates.itens_check) {
    Object.assign(flat, updates.itens_check);
    delete flat.itens_check;
  }
  const { data } = await call(
    supabase.from('checklists').update(flat).eq('id', id).select().single(),
    'updateChecklist'
  );
  return rowToChecklist(data as ChecklistRow);
};

// ─── DIÁRIO DE BORDO ──────────────────────────────────────────────────────────

export const getLogbooks = async (): Promise<Logbook[]> => {
  const { data } = await call(
    supabase.from('logbooks').select('*').order('created_at', { ascending: false }),
    'getLogbooks'
  );
  return (data ?? []) as Logbook[];
};

export const createLogbook = async (logbook: Omit<Logbook, 'id'>): Promise<Logbook> => {
  const { data } = await call(
    supabase.from('logbooks').insert([logbook]).select().single(),
    'createLogbook'
  );
  return data as Logbook;
};

export const updateLogbook = async (id: string, updates: Partial<Logbook>): Promise<Logbook> => {
  const { data } = await call(
    supabase.from('logbooks').update(updates).eq('id', id).select().single(),
    'updateLogbook'
  );
  return data as Logbook;
};

// ─── DESPESAS OPERACIONAIS ───────────────────────────────────────────────────

export const getExpenses = async (): Promise<Expense[]> => {
  const { data } = await call(
    supabase.from('expenses').select('*').order('data', { ascending: false }),
    'getExpenses'
  );
  return (data ?? []) as Expense[];
};

export const createExpense = async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
  const { data } = await call(
    supabase.from('expenses').insert([expense]).select().single(),
    'createExpense'
  );
  return data as Expense;
};

// ─── EVENTOS DE VIAGEM (PAUSAS / ESPERAS) ────────────────────────────────────

export const getTripEvents = async (logbook_id: string): Promise<TripEvent[]> => {
  const { data } = await call(
    supabase.from('trip_events').select('*').eq('logbook_id', logbook_id).order('timestamp', { ascending: true }),
    'getTripEvents'
  );
  return (data ?? []) as TripEvent[];
};

export const createTripEvent = async (event: Omit<TripEvent, 'id' | 'created_at'>): Promise<TripEvent> => {
  return withRetry(async () => {
    const { data } = await call(
      supabase.from('trip_events').insert([event]).select().single(),
      'createTripEvent'
    );
    return data as TripEvent;
  }, 2);
};

// ─── PERFIS (USUÁRIOS) ────────────────────────────────────────────────────────

export const getProfiles = async () => {
  const { data } = await call(
    supabase.from('profiles').select('*').order('name', { ascending: true }),
    'getProfiles'
  );
  return data;
};

export const updateProfileRole = async (id: string, role: 'admin' | 'motorista') => {
  const { data } = await call(
    supabase.from('profiles').update({ role }).eq('id', id).select().single(),
    'updateProfileRole'
  );
  return data;
};
