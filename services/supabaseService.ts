import { supabase } from '../lib/supabase';
import { Vehicle, FuelLog, Maintenance, Checklist, Logbook, Expense, TripEvent } from './types';
import { withRetry, warnLog, devLog } from '@/lib/utils';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function handleError(error: any, context: string): never {
  const message = error?.message || error?.details || String(error);
  warnLog('Supabase Error', `${context}: ${message}`);
  throw new Error(`Erro em ${context}: ${message}`);
}

// ─── CACHE SYSTEM ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

const cache: {
  vehicles: CacheEntry<Vehicle[]> | null;
  fuelLogs: CacheEntry<FuelLog[]> | null;
  maintenances: CacheEntry<Maintenance[]> | null;
  checklists: CacheEntry<Checklist[]> | null;
  logbooks: CacheEntry<Logbook[]> | null;
  expenses: CacheEntry<Expense[]> | null;
  profiles: CacheEntry<any[]> | null;
} = {
  vehicles: null,
  fuelLogs: null,
  maintenances: null,
  checklists: null,
  logbooks: null,
  expenses: null,
  profiles: null,
};

type CacheKey = keyof typeof cache;

function getCached<T>(key: CacheKey): T | null {
  const entry = cache[key];
  if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) {
    devLog('Cache', `Hit: ${key}`);
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: CacheKey, data: T): void {
  (cache as any)[key] = { data, timestamp: Date.now() };
}

/** Invalida o cache de uma ou todas as entidades */
export function invalidateCache(key?: CacheKey): void {
  if (key) {
    cache[key] = null;
    devLog('Cache', `Invalidated: ${key}`);
  } else {
    Object.keys(cache).forEach(k => (cache as any)[k] = null);
    devLog('Cache', 'Invalidated: ALL');
  }
}

// ─── SAFE QUERY WRAPPER ─────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 20000; // 20s — mobile-friendly

/**
 * Executa uma query Supabase de forma segura.
 * GARANTE que sempre resolve — nunca fica pendurado.
 */
async function call<T>(
  promise: PromiseLike<{ data: T | null; error: any }>, 
  context: string, 
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> {
  try {
    const result = await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        if (timeoutMs > 0) {
          setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs);
        }
      }),
    ]);

    const { data, error } = result;
    if (error) handleError(error, context);
    
    if (data === null) {
      // For GET operations, return empty array instead of throwing
      if (context.toLowerCase().includes('get')) {
        return [] as any;
      }
      throw new Error(`Nenhum dado retornado em ${context}`);
    }
    return data as T;
  } catch (error: any) {
    if (error.message === 'TIMEOUT_EXCEEDED') {
      warnLog('Timeout', `${context} excedeu ${timeoutMs}ms`);
      // For GET operations, return empty array on timeout
      if (context.toLowerCase().includes('get')) return [] as any;
    }
    throw error;
  }
}

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

export const uploadFile = async (bucket: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) handleError(error, 'uploadFile');

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

// ─── VEÍCULOS ────────────────────────────────────────────────────────────────

export const getVehicles = async (): Promise<Vehicle[]> => {
  const cached = getCached<Vehicle[]>('vehicles');
  if (cached) return cached;

  const data = await call<Vehicle[]>(
    supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
    'getVehicles'
  );
  setCache('vehicles', data);
  return data;
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  const result = await call<Vehicle>(
    supabase.from('vehicles').insert([vehicle]).select().single(),
    'createVehicle'
  );
  invalidateCache('vehicles');
  return result;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
  const result = await call<Vehicle>(
    supabase.from('vehicles').update(updates).eq('id', id).select().single(),
    'updateVehicle'
  );
  invalidateCache('vehicles');
  return result;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await call(
    supabase.from('vehicles').delete().eq('id', id),
    'deleteVehicle',
    0
  );
  invalidateCache('vehicles');
};

// ─── ABASTECIMENTOS ──────────────────────────────────────────────────────────

export const getFuelLogs = async (): Promise<FuelLog[]> => {
  const cached = getCached<FuelLog[]>('fuelLogs');
  if (cached) return cached;

  const data = await call<FuelLog[]>(
    supabase.from('fuel_logs').select('*').order('created_at', { ascending: false }).limit(200),
    'getFuelLogs'
  );
  setCache('fuelLogs', data);
  return data;
};

export const createFuelLog = async (log: Omit<FuelLog, 'id'>): Promise<FuelLog> => {
  const result = await withRetry(async () => {
    return call<FuelLog>(
      supabase.from('fuel_logs').insert([log]).select().single(),
      'createFuelLog'
    );
  }, 2);
  invalidateCache('fuelLogs');
  return result;
};

export const updateFuelLog = async (id: string, updates: Partial<FuelLog>): Promise<FuelLog> => {
  const result = await call<FuelLog>(
    supabase.from('fuel_logs').update(updates).eq('id', id).select().single(),
    'updateFuelLog'
  );
  invalidateCache('fuelLogs');
  return result;
};

export const deleteFuelLog = async (id: string): Promise<void> => {
  await call(
    supabase.from('fuel_logs').delete().eq('id', id),
    'deleteFuelLog',
    0
  );
  invalidateCache('fuelLogs');
};

// ─── MANUTENÇÕES ─────────────────────────────────────────────────────────────

export const getMaintenances = async (): Promise<Maintenance[]> => {
  const cached = getCached<Maintenance[]>('maintenances');
  if (cached) return cached;

  const data = await call<Maintenance[]>(
    supabase.from('maintenances').select('*').order('created_at', { ascending: false }).limit(200),
    'getMaintenances'
  );
  setCache('maintenances', data);
  return data;
};

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  const result = await call<Maintenance>(
    supabase.from('maintenances').insert([maintenance]).select().single(),
    'createMaintenance'
  );
  invalidateCache('maintenances');
  return result;
};

export const updateMaintenance = async (id: string, updates: Partial<Maintenance>): Promise<Maintenance> => {
  const result = await call<Maintenance>(
    supabase.from('maintenances').update(updates).eq('id', id).select().single(),
    'updateMaintenance'
  );
  invalidateCache('maintenances');
  return result;
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  await call(
    supabase.from('maintenances').delete().eq('id', id),
    'deleteMaintenance',
    0 // Sem timeout para delete
  );
  invalidateCache('maintenances');
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
  const cached = getCached<Checklist[]>('checklists');
  if (cached) return cached;

  const data = await call<ChecklistRow[]>(
    supabase.from('checklists').select('*').order('created_at', { ascending: false }).limit(200),
    'getChecklists'
  );
  const result = (data ?? []).map(rowToChecklist);
  setCache('checklists', result);
  return result;
};

export const createChecklist = async (checklist: Omit<Checklist, 'id'>): Promise<Checklist> => {
  const row = checklistToRow(checklist);
  const data = await call<ChecklistRow>(
    supabase.from('checklists').insert([row]).select().single(),
    'createChecklist'
  );
  invalidateCache('checklists');
  return rowToChecklist(data);
};

export const updateChecklist = async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
  const flat: any = { ...updates };
  if (updates.itens_check) {
    Object.assign(flat, updates.itens_check);
    delete flat.itens_check;
  }
  const data = await call<ChecklistRow>(
    supabase.from('checklists').update(flat).eq('id', id).select().single(),
    'updateChecklist'
  );
  invalidateCache('checklists');
  return rowToChecklist(data);
};

export const deleteChecklist = async (id: string): Promise<void> => {
  await call(
    supabase.from('checklists').delete().eq('id', id),
    'deleteChecklist',
    0
  );
  invalidateCache('checklists');
};

export const marcarAvisoRevisado = async (id: string): Promise<void> => {
  await supabase.from('checklists').update({ aviso_revisado: true }).eq('id', id);
  invalidateCache('checklists');
};

// ─── DIÁRIO DE BORDO ──────────────────────────────────────────────────────────

export const getLogbooks = async (): Promise<Logbook[]> => {
  const cached = getCached<Logbook[]>('logbooks');
  if (cached) return cached;

  const data = await call<Logbook[]>(
    supabase.from('logbooks').select('*').order('created_at', { ascending: false }).limit(200),
    'getLogbooks'
  );
  setCache('logbooks', data);
  return data;
};

export const createLogbook = async (logbook: Omit<Logbook, 'id'>): Promise<Logbook> => {
  const result = await call<Logbook>(
    supabase.from('logbooks').insert([logbook]).select().single(),
    'createLogbook'
  );
  invalidateCache('logbooks');
  return result;
};

export const updateLogbook = async (id: string, updates: Partial<Logbook>): Promise<Logbook> => {
  const result = await call<Logbook>(
    supabase.from('logbooks').update(updates).eq('id', id).select().single(),
    'updateLogbook'
  );
  invalidateCache('logbooks');
  return result;
};

export const deleteLogbook = async (id: string): Promise<void> => {
  await call(
    supabase.from('logbooks').delete().eq('id', id),
    'deleteLogbook',
    0
  );
  invalidateCache('logbooks');
};

// ─── DESPESAS OPERACIONAIS ───────────────────────────────────────────────────

export const getExpenses = async (): Promise<Expense[]> => {
  const cached = getCached<Expense[]>('expenses');
  if (cached) return cached;

  const data = await call<Expense[]>(
    supabase.from('expenses').select('*').order('data', { ascending: false }).limit(200),
    'getExpenses'
  );
  setCache('expenses', data);
  return data;
};

export const createExpense = async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
  const result = await call<Expense>(
    supabase.from('expenses').insert([expense]).select().single(),
    'createExpense'
  );
  invalidateCache('expenses');
  return result;
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<Expense> => {
  const result = await call<Expense>(
    supabase.from('expenses').update(updates).eq('id', id).select().single(),
    'updateExpense'
  );
  invalidateCache('expenses');
  return result;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await call(
    supabase.from('expenses').delete().eq('id', id),
    'deleteExpense',
    0
  );
  invalidateCache('expenses');
};

// ─── EVENTOS DE VIAGEM (PAUSAS / ESPERAS) ────────────────────────────────────

export const getTripEvents = async (logbook_id: string): Promise<TripEvent[]> => {
  return call<TripEvent[]>(
    supabase.from('trip_events').select('*').eq('logbook_id', logbook_id).order('timestamp', { ascending: true }),
    'getTripEvents'
  );
};

export const createTripEvent = async (event: Omit<TripEvent, 'id' | 'created_at'>): Promise<TripEvent> => {
  return withRetry(async () => {
    return call<TripEvent>(
      supabase.from('trip_events').insert([event]).select().single(),
      'createTripEvent'
    );
  }, 2);
};

export const deleteTripEvent = async (id: string): Promise<void> => {
  await call(
    supabase.from('trip_events').delete().eq('id', id),
    'deleteTripEvent'
  );
};

// ─── PERFIS (USUÁRIOS) ────────────────────────────────────────────────────────

export const getProfiles = async () => {
  const cached = getCached<any[]>('profiles');
  if (cached) return cached;

  const data = await call<any[]>(
    supabase.from('profiles').select('*').order('name', { ascending: true }),
    'getProfiles'
  );
  const result = data ?? [];
  setCache('profiles', result);
  return result;
};

export const updateProfileRole = async (id: string, role: 'admin' | 'motorista') => {
  const result = await call<any>(
    supabase.from('profiles').update({ role }).eq('id', id).select().single(),
    'updateProfileRole'
  );
  invalidateCache('profiles');
  return result;
};
