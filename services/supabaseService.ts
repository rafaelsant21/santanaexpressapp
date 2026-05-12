import { supabase } from '../lib/supabase';
import { Vehicle, FuelLog, Maintenance, Checklist, Logbook, Expense, TripEvent } from './types';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`[supabaseService] ${context}: ${message}`);
}

export const uploadFile = async (bucket: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) handleError(uploadError, `uploadFile (${bucket})`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

// ─── VEÍCULOS ────────────────────────────────────────────────────────────────

export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleError(error, 'getVehicles');
  return (data ?? []) as Vehicle[];
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([vehicle])
    .select()
    .single();

  if (error) handleError(error, 'createVehicle');
  return data as Vehicle;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateVehicle');
  return data as Vehicle;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) handleError(error, 'deleteVehicle');
};

// ─── ABASTECIMENTOS ──────────────────────────────────────────────────────────

export const getFuelLogs = async (): Promise<FuelLog[]> => {
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleError(error, 'getFuelLogs');
  return (data ?? []) as FuelLog[];
};

export const createFuelLog = async (log: Omit<FuelLog, 'id'>): Promise<FuelLog> => {
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert([log])
    .select()
    .single();

  if (error) handleError(error, 'createFuelLog');
  return data as FuelLog;
};

export const updateFuelLog = async (id: string, updates: Partial<FuelLog>): Promise<FuelLog> => {
  const { data, error } = await supabase
    .from('fuel_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateFuelLog');
  return data as FuelLog;
};

export const deleteFuelLog = async (id: string): Promise<void> => {
  const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
  if (error) handleError(error, 'deleteFuelLog');
};

// ─── MANUTENÇÕES ─────────────────────────────────────────────────────────────

export const getMaintenances = async (): Promise<Maintenance[]> => {
  const { data, error } = await supabase
    .from('maintenances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleError(error, 'getMaintenances');
  return (data ?? []) as Maintenance[];
};

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  const { data, error } = await supabase
    .from('maintenances')
    .insert([maintenance])
    .select()
    .single();

  if (error) handleError(error, 'createMaintenance');
  return data as Maintenance;
};

export const updateMaintenance = async (id: string, updates: Partial<Maintenance>): Promise<Maintenance> => {
  const { data, error } = await supabase
    .from('maintenances')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateMaintenance');
  return data as Maintenance;
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  const { error } = await supabase.from('maintenances').delete().eq('id', id);
  if (error) handleError(error, 'deleteMaintenance');
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
  // Segurança
  pneus_ok: boolean;
  freios_ok: boolean;
  luzes_ok: boolean;
  limpador_ok: boolean;
  retrovisores_ok: boolean;
  oleo_ok: boolean;
  // Operação
  carga_conferida: boolean;
  amarracao_ok: boolean;
  bau_fechado: boolean;
  // Itens obrigatórios
  extintor_ok: boolean;
  triangulo_ok: boolean;
  macaco_ok: boolean;
  // Documentação
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
  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleError(error, 'getChecklists');
  return (data as ChecklistRow[]).map(rowToChecklist);
};

export const createChecklist = async (checklist: Omit<Checklist, 'id'>): Promise<Checklist> => {
  const row = checklistToRow(checklist);
  const { data, error } = await supabase
    .from('checklists')
    .insert([row])
    .select()
    .single();

  if (error) handleError(error, 'createChecklist');
  return rowToChecklist(data as ChecklistRow);
};

export const updateChecklist = async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
  const flat: Partial<ChecklistRow> = {
    vehicle_id: updates.vehicle_id,
    user_id: updates.user_id,
    data: updates.data,
    motorista: updates.motorista,
    km_atual: updates.km_atual,
    tipo_viagem: updates.tipo_viagem,
    observacoes: updates.observacoes,
    comprovante_url: updates.comprovante_url,
    ...(updates.itens_check ?? {}),
  };

  const { data, error } = await supabase
    .from('checklists')
    .update(flat)
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateChecklist');
  return rowToChecklist(data as ChecklistRow);
};

export const deleteChecklist = async (id: string): Promise<void> => {
  const { error } = await supabase.from('checklists').delete().eq('id', id);
  if (error) handleError(error, 'deleteChecklist');
};

export const marcarAvisoRevisado = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('checklists')
    .update({ aviso_revisado: true })
    .eq('id', id);
  if (error) handleError(error, 'marcarAvisoRevisado');
};

// ─── DIÁRIO DE BORDO ──────────────────────────────────────────────────────────

export const getLogbooks = async (): Promise<Logbook[]> => {
  const { data, error } = await supabase
    .from('logbooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleError(error, 'getLogbooks');
  return (data ?? []) as Logbook[];
};

export const createLogbook = async (logbook: Omit<Logbook, 'id'>): Promise<Logbook> => {
  const { data, error } = await supabase
    .from('logbooks')
    .insert([logbook])
    .select()
    .single();

  if (error) handleError(error, 'createLogbook');
  return data as Logbook;
};

export const updateLogbook = async (id: string, updates: Partial<Logbook>): Promise<Logbook> => {
  const { data, error } = await supabase
    .from('logbooks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateLogbook');
  return data as Logbook;
};

export const deleteLogbook = async (id: string): Promise<void> => {
  const { error } = await supabase.from('logbooks').delete().eq('id', id);
  if (error) handleError(error, 'deleteLogbook');
};

// ─── DESPESAS OPERACIONAIS ───────────────────────────────────────────────────

export const getExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('data', { ascending: false });

  if (error) handleError(error, 'getExpenses');
  return (data ?? []) as Expense[];
};

export const createExpense = async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expense])
    .select()
    .single();

  if (error) handleError(error, 'createExpense');
  return data as Expense;
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateExpense');
  return data as Expense;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) handleError(error, 'deleteExpense');
};

// ─── EVENTOS DE VIAGEM (PAUSAS / ESPERAS) ────────────────────────────────────

export const getTripEvents = async (logbook_id: string): Promise<TripEvent[]> => {
  const { data, error } = await supabase
    .from('trip_events')
    .select('*')
    .eq('logbook_id', logbook_id)
    .order('timestamp', { ascending: true });

  if (error) handleError(error, 'getTripEvents');
  return (data ?? []) as TripEvent[];
};

export const createTripEvent = async (event: Omit<TripEvent, 'id' | 'created_at'>): Promise<TripEvent> => {
  const { data, error } = await supabase
    .from('trip_events')
    .insert([event])
    .select()
    .single();

  if (error) handleError(error, 'createTripEvent');
  return data as TripEvent;
};

export const deleteTripEvent = async (id: string): Promise<void> => {
  const { error } = await supabase.from('trip_events').delete().eq('id', id);
  if (error) handleError(error, 'deleteTripEvent');
};

// ─── PERFIS (USUÁRIOS) ────────────────────────────────────────────────────────

export const getProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) handleError(error, 'getProfiles');
  return data;
};

export const updateProfileRole = async (id: string, role: 'admin' | 'motorista') => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single();

  if (error) handleError(error, 'updateProfileRole');
  return data;
};
