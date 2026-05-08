import { supabase } from '../lib/supabase';
import { Vehicle, FuelLog, Maintenance, Checklist, Logbook } from './types';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`[supabaseService] ${context}: ${message}`);
}

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
};

function rowToChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
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
  };
}

function checklistToRow(c: Omit<Checklist, 'id'>): Omit<ChecklistRow, 'id'> {
  return {
    vehicle_id: c.vehicle_id,
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
    data: updates.data,
    motorista: updates.motorista,
    km_atual: updates.km_atual,
    tipo_viagem: updates.tipo_viagem,
    observacoes: updates.observacoes,
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

