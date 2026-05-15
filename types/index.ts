// ============================================================================
// TIPOS DEL DOMINIO - Sistema de Salarios
// ============================================================================

export type Role = "admin" | "encargado";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export type DocumentType = "DNI" | "NIE" | "Pasaporte" | "CIF" | "Otro";
export type PaymentMethod = "banco" | "efectivo";

export interface SalaryHistoryEntry {
  date: string;
  amount: number;
}

export interface JobPosition {
  id: string;
  name: string;
  location: string;
  mapsUrl?: string;
  active: boolean;
}

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email?: string;
  phone?: string;
  birthYear?: number;
  jobPositionId: string;
  paymentMethod: PaymentMethod;
  iban?: string;
  dailySalary: number;
  bankAmount?: number; // Importe que el trabajador cobra mensualmente por banco
  active: boolean;
  notes?: string;
  salaryHistory: SalaryHistoryEntry[];
}

export interface Client {
  id: string;
  businessName: string;
  lastName?: string;
  documentType: DocumentType;
  documentNumber: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export type WorkSiteStatus =
  | "no_iniciada"
  | "activa"
  | "en_pausa"
  | "finalizada";

export interface WorkSite {
  id: string;
  name: string;
  status: WorkSiteStatus;
  clientId: string;
  startDate?: string;
  estimatedEndDate?: string;
  budget?: number;
  mapsUrl?: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  date: string;
  workerId: string;
  workSiteId: string;
  hoursWorked: number;
  extraHours: number;
  notes?: string;
}

export type EconomicRecordType = "adelanto" | "pago_adelanto" | "sueldo";

export interface PaymentPlace {
  id: string;
  name: string;
}

export interface EconomicRecord {
  id: string;
  date: string;
  workerId: string;
  type: EconomicRecordType;
  amount: number;
  placeId: string;
  description?: string;
}

export interface MonthlySummary {
  workerId: string;
  year: number;
  month: number;
  daysWorked: number;
  hoursWorked: number;
  extraHours: number;
  dailyPay: number;
  extraPay: number;
  totalGenerated: number;
  advances: number;
  advancePayments: number;
  salariesPaid: number;
  finalBalance: number;
  // Lógica de pago por banco (sección 12)
  bankAmount?: number;
  cashDifference?: number;
  pendingDebt?: number;
}

export type MonthStatus = "abierto" | "cerrado";

export interface MonthClosure {
  id: string;
  year: number;
  month: number;
  status: MonthStatus;
  closedAt?: string;
  closedBy?: string;
}

export interface GlobalConfig {
  extraHourPrice: number;
  fullDayHours: number;
}

// Estado global persistido en localStorage
export interface AppState {
  workers: Worker[];
  jobPositions: JobPosition[];
  clients: Client[];
  workSites: WorkSite[];
  attendances: Attendance[];
  economicRecords: EconomicRecord[];
  paymentPlaces: PaymentPlace[];
  monthClosures: MonthClosure[];
  config: GlobalConfig;
}
