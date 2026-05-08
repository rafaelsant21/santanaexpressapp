import { Vehicle, FuelLog, Maintenance, Checklist } from './types';

// Helper for simulated delay
const delay = () => new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 300));

// LocalStorage helpers
const getStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(`santana-express-${key}`);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`santana-express-${key}`, JSON.stringify(value));
};

// Seed initial data
const seedData = () => {
  if (typeof window === 'undefined') return;
  
  const hasSeeded = localStorage.getItem('santana-express-seeded');
  if (hasSeeded) return;

  const initialVehicles: Vehicle[] = [
    { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter 314', marca: 'Mercedes-Benz', ano: 2021, status: 'ativo', km_atual: 145000 },
    { id: 'v2', placa: 'DEF-5678', modelo: 'Daily 35-150', marca: 'Iveco', ano: 2019, status: 'ativo', km_atual: 210000 },
    { id: 'v3', placa: 'GHI-9012', modelo: 'Master', marca: 'Renault', ano: 2020, status: 'manutenção', km_atual: 180500 },
  ];
  
  const initialFuelLogs: FuelLog[] = [
    { id: 'f1', vehicle_id: 'v1', data: new Date(Date.now() - 5 * 86400000).toISOString(), litros: 60, valor_total: 350, km_no_abastecimento: 144500 },
    { id: 'f2', vehicle_id: 'v1', data: new Date(Date.now() - 1 * 86400000).toISOString(), litros: 50, valor_total: 295, km_no_abastecimento: 144950 },
    { id: 'f3', vehicle_id: 'v2', data: new Date(Date.now() - 10 * 86400000).toISOString(), litros: 80, valor_total: 460, km_no_abastecimento: 209200 },
    { id: 'f4', vehicle_id: 'v2', data: new Date(Date.now() - 2 * 86400000).toISOString(), litros: 75, valor_total: 440, km_no_abastecimento: 209800 },
    { id: 'f5', vehicle_id: 'v3', data: new Date(Date.now() - 15 * 86400000).toISOString(), litros: 65, valor_total: 380, km_no_abastecimento: 180100 },
  ];

  const initialMaintenances: Maintenance[] = [
    { id: 'm1', vehicle_id: 'v1', tipo: 'preventiva', descricao: 'Troca de óleo e filtros', custo: 450, data: new Date(Date.now() - 30 * 86400000).toISOString(), km: 140000, status: 'concluída' },
    { id: 'm2', vehicle_id: 'v2', tipo: 'corretiva', descricao: 'Troca de pastilhas de freio', custo: 800, data: new Date(Date.now() - 5 * 86400000).toISOString(), km: 209500, status: 'concluída' },
    { id: 'm3', vehicle_id: 'v3', tipo: 'preventiva', descricao: 'Revisão geral', custo: 1200, data: new Date(Date.now() - 2 * 86400000).toISOString(), km: 180500, status: 'pendente' },
    { id: 'm4', vehicle_id: 'v1', tipo: 'preventiva', descricao: 'Alinhamento e balanceamento', custo: 250, data: new Date().toISOString(), km: 145000, status: 'pendente' },
  ];

  const initialChecklists: Checklist[] = [
    { id: 'c1', vehicle_id: 'v1', data: new Date(Date.now() - 86400000).toISOString(), motorista: 'Carlos Silva', itens_check: { pneus_ok: true, oleo_ok: true, combustivel_ok: true, documentos_ok: true }, observacoes: 'Tudo ok.' },
    { id: 'c2', vehicle_id: 'v2', data: new Date(Date.now() - 2 * 86400000).toISOString(), motorista: 'Roberto Souza', itens_check: { pneus_ok: true, oleo_ok: true, combustivel_ok: false, documentos_ok: true }, observacoes: 'Abastecer na próxima parada.' },
    { id: 'c3', vehicle_id: 'v3', data: new Date(Date.now() - 15 * 86400000).toISOString(), motorista: 'João Paulo', itens_check: { pneus_ok: false, oleo_ok: true, combustivel_ok: true, documentos_ok: false }, observacoes: 'Pneu traseiro esquerdo careca, doc vencido.' },
  ];

  setStorage('vehicles', initialVehicles);
  setStorage('fuelLogs', initialFuelLogs);
  setStorage('maintenances', initialMaintenances);
  setStorage('checklists', initialChecklists);
  localStorage.setItem('santana-express-seeded', 'true');
};

// Initialize seed
if (typeof window !== 'undefined') {
  seedData();
}

// Generate ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// --- VEHICLES ---
export const getVehicles = async (): Promise<Vehicle[]> => {
  await delay();
  return getStorage<Vehicle[]>('vehicles', []);
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  await delay();
  const vehicles = getStorage<Vehicle[]>('vehicles', []);
  const newVehicle: Vehicle = { ...vehicle, id: generateId() };
  setStorage('vehicles', [...vehicles, newVehicle]);
  return newVehicle;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
  await delay();
  const vehicles = getStorage<Vehicle[]>('vehicles', []);
  const index = vehicles.findIndex(v => v.id === id);
  if (index === -1) throw new Error('Veículo não encontrado');
  const updatedVehicle = { ...vehicles[index], ...updates };
  vehicles[index] = updatedVehicle;
  setStorage('vehicles', vehicles);
  return updatedVehicle;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await delay();
  const vehicles = getStorage<Vehicle[]>('vehicles', []);
  setStorage('vehicles', vehicles.filter(v => v.id !== id));
};

// --- FUEL LOGS ---
export const getFuelLogs = async (): Promise<FuelLog[]> => {
  await delay();
  return getStorage<FuelLog[]>('fuelLogs', []).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

export const createFuelLog = async (log: Omit<FuelLog, 'id'>): Promise<FuelLog> => {
  await delay();
  
  // also update vehicle km
  const vehicles = getStorage<Vehicle[]>('vehicles', []);
  const vehicleIndex = vehicles.findIndex(v => v.id === log.vehicle_id);
  if (vehicleIndex > -1 && log.km_no_abastecimento > vehicles[vehicleIndex].km_atual) {
     vehicles[vehicleIndex].km_atual = log.km_no_abastecimento;
     setStorage('vehicles', vehicles);
  }

  const logs = getStorage<FuelLog[]>('fuelLogs', []);
  const newLog: FuelLog = { ...log, id: generateId() };
  setStorage('fuelLogs', [...logs, newLog]);
  return newLog;
};

export const updateFuelLog = async (id: string, updates: Partial<FuelLog>): Promise<FuelLog> => {
  await delay();
  const logs = getStorage<FuelLog[]>('fuelLogs', []);
  const index = logs.findIndex(v => v.id === id);
  if (index === -1) throw new Error('Abastecimento não encontrado');
  const updatedLog = { ...logs[index], ...updates };
  logs[index] = updatedLog;
  setStorage('fuelLogs', logs);
  return updatedLog;
};

export const deleteFuelLog = async (id: string): Promise<void> => {
  await delay();
  const logs = getStorage<FuelLog[]>('fuelLogs', []);
  setStorage('fuelLogs', logs.filter(v => v.id !== id));
};

// --- MAINTENANCES ---
export const getMaintenances = async (): Promise<Maintenance[]> => {
  await delay();
  return getStorage<Maintenance[]>('maintenances', []).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  await delay();
  const maintenances = getStorage<Maintenance[]>('maintenances', []);
  const newMaintenance: Maintenance = { ...maintenance, id: generateId() };
  setStorage('maintenances', [...maintenances, newMaintenance]);
  return newMaintenance;
};

export const updateMaintenance = async (id: string, updates: Partial<Maintenance>): Promise<Maintenance> => {
  await delay();
  const maintenances = getStorage<Maintenance[]>('maintenances', []);
  const index = maintenances.findIndex(v => v.id === id);
  if (index === -1) throw new Error('Manutenção não encontrada');
  const updatedMaintenance = { ...maintenances[index], ...updates };
  maintenances[index] = updatedMaintenance;
  setStorage('maintenances', maintenances);
  return updatedMaintenance;
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  await delay();
  const maintenances = getStorage<Maintenance[]>('maintenances', []);
  setStorage('maintenances', maintenances.filter(v => v.id !== id));
};

// --- CHECKLISTS ---
export const getChecklists = async (): Promise<Checklist[]> => {
  await delay();
  return getStorage<Checklist[]>('checklists', []).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

export const createChecklist = async (checklist: Omit<Checklist, 'id'>): Promise<Checklist> => {
  await delay();
  const checklists = getStorage<Checklist[]>('checklists', []);
  const newChecklist: Checklist = { ...checklist, id: generateId() };
  setStorage('checklists', [...checklists, newChecklist]);
  return newChecklist;
};

export const updateChecklist = async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
  await delay();
  const checklists = getStorage<Checklist[]>('checklists', []);
  const index = checklists.findIndex(v => v.id === id);
  if (index === -1) throw new Error('Checklist não encontrado');
  const updatedChecklist = { ...checklists[index], ...updates };
  checklists[index] = updatedChecklist;
  setStorage('checklists', checklists);
  return updatedChecklist;
};

export const deleteChecklist = async (id: string): Promise<void> => {
  await delay();
  const checklists = getStorage<Checklist[]>('checklists', []);
  setStorage('checklists', checklists.filter(v => v.id !== id));
};
