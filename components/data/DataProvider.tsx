"use client";

// ============================================================================
// DATA PROVIDER
// Estado global de la app. Persiste en localStorage. Sustituible por Supabase.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AppState,
  Attendance,
  Client,
  EconomicRecord,
  GlobalConfig,
  JobPosition,
  PaymentPlace,
  Worker,
  WorkSite,
} from "@/types";
import { seedData } from "@/data/seed";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { generateId } from "@/utils/id";

const STORAGE_KEY = "salarios_app_data";

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "HYDRATE"; payload: AppState }
  // Workers
  | { type: "WORKER_CREATE"; payload: Omit<Worker, "id" | "salaryHistory"> & { salaryHistory?: Worker["salaryHistory"] } }
  | { type: "WORKER_UPDATE"; payload: Worker }
  | { type: "WORKER_DELETE"; payload: { id: string } }
  // Job positions
  | { type: "JOB_CREATE"; payload: Omit<JobPosition, "id"> }
  | { type: "JOB_UPDATE"; payload: JobPosition }
  | { type: "JOB_DELETE"; payload: { id: string } }
  // Clients
  | { type: "CLIENT_CREATE"; payload: Omit<Client, "id"> }
  | { type: "CLIENT_UPDATE"; payload: Client }
  | { type: "CLIENT_DELETE"; payload: { id: string } }
  // Work sites
  | { type: "WORKSITE_CREATE"; payload: Omit<WorkSite, "id"> }
  | { type: "WORKSITE_UPDATE"; payload: WorkSite }
  | { type: "WORKSITE_DELETE"; payload: { id: string } }
  // Attendances
  | { type: "ATTENDANCE_CREATE"; payload: Omit<Attendance, "id"> }
  | { type: "ATTENDANCE_UPDATE"; payload: Attendance }
  | { type: "ATTENDANCE_DELETE"; payload: { id: string } }
  // Economic records
  | { type: "RECORD_CREATE"; payload: Omit<EconomicRecord, "id"> }
  | { type: "RECORD_UPDATE"; payload: EconomicRecord }
  | { type: "RECORD_DELETE"; payload: { id: string } }
  // Payment places
  | { type: "PLACE_CREATE"; payload: Omit<PaymentPlace, "id"> }
  | { type: "PLACE_DELETE"; payload: { id: string } }
  // Config
  | { type: "CONFIG_UPDATE"; payload: GlobalConfig }
  // Reset
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;

    case "WORKER_CREATE": {
      const worker: Worker = {
        ...action.payload,
        id: generateId("w"),
        salaryHistory:
          action.payload.salaryHistory ?? [
            { date: new Date().toISOString().slice(0, 10), amount: action.payload.dailySalary },
          ],
      };
      return { ...state, workers: [...state.workers, worker] };
    }
    case "WORKER_UPDATE": {
      return {
        ...state,
        workers: state.workers.map((w) => {
          if (w.id !== action.payload.id) return w;
          // Mantén histórico si el salario cambia.
          const salaryChanged = w.dailySalary !== action.payload.dailySalary;
          return {
            ...action.payload,
            salaryHistory: salaryChanged
              ? [
                  ...w.salaryHistory,
                  { date: new Date().toISOString().slice(0, 10), amount: action.payload.dailySalary },
                ]
              : w.salaryHistory,
          };
        }),
      };
    }
    case "WORKER_DELETE":
      return { ...state, workers: state.workers.filter((w) => w.id !== action.payload.id) };

    case "JOB_CREATE":
      return { ...state, jobPositions: [...state.jobPositions, { ...action.payload, id: generateId("jp") }] };
    case "JOB_UPDATE":
      return {
        ...state,
        jobPositions: state.jobPositions.map((j) => (j.id === action.payload.id ? action.payload : j)),
      };
    case "JOB_DELETE":
      return { ...state, jobPositions: state.jobPositions.filter((j) => j.id !== action.payload.id) };

    case "CLIENT_CREATE":
      return { ...state, clients: [...state.clients, { ...action.payload, id: generateId("c") }] };
    case "CLIENT_UPDATE":
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case "CLIENT_DELETE":
      return { ...state, clients: state.clients.filter((c) => c.id !== action.payload.id) };

    case "WORKSITE_CREATE":
      return { ...state, workSites: [...state.workSites, { ...action.payload, id: generateId("ws") }] };
    case "WORKSITE_UPDATE":
      return {
        ...state,
        workSites: state.workSites.map((ws) => (ws.id === action.payload.id ? action.payload : ws)),
      };
    case "WORKSITE_DELETE":
      return { ...state, workSites: state.workSites.filter((ws) => ws.id !== action.payload.id) };

    case "ATTENDANCE_CREATE":
      return { ...state, attendances: [...state.attendances, { ...action.payload, id: generateId("a") }] };
    case "ATTENDANCE_UPDATE":
      return {
        ...state,
        attendances: state.attendances.map((a) => (a.id === action.payload.id ? action.payload : a)),
      };
    case "ATTENDANCE_DELETE":
      return { ...state, attendances: state.attendances.filter((a) => a.id !== action.payload.id) };

    case "RECORD_CREATE":
      return { ...state, economicRecords: [...state.economicRecords, { ...action.payload, id: generateId("er") }] };
    case "RECORD_UPDATE":
      return {
        ...state,
        economicRecords: state.economicRecords.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case "RECORD_DELETE":
      return { ...state, economicRecords: state.economicRecords.filter((r) => r.id !== action.payload.id) };

    case "PLACE_CREATE":
      return { ...state, paymentPlaces: [...state.paymentPlaces, { ...action.payload, id: generateId("pp") }] };
    case "PLACE_DELETE":
      return { ...state, paymentPlaces: state.paymentPlaces.filter((p) => p.id !== action.payload.id) };

    case "CONFIG_UPDATE":
      return { ...state, config: action.payload };

    case "RESET":
      return seedData;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface DataContextValue extends AppState {
  // Workers
  createWorker: (data: Omit<Worker, "id" | "salaryHistory">) => void;
  updateWorker: (data: Worker) => void;
  deleteWorker: (id: string) => void;
  // Jobs
  createJobPosition: (data: Omit<JobPosition, "id">) => void;
  updateJobPosition: (data: JobPosition) => void;
  deleteJobPosition: (id: string) => void;
  // Clients
  createClient: (data: Omit<Client, "id">) => void;
  updateClient: (data: Client) => void;
  deleteClient: (id: string) => void;
  // Work sites
  createWorkSite: (data: Omit<WorkSite, "id">) => void;
  updateWorkSite: (data: WorkSite) => void;
  deleteWorkSite: (id: string) => void;
  // Attendances
  createAttendance: (data: Omit<Attendance, "id">) => void;
  updateAttendance: (data: Attendance) => void;
  deleteAttendance: (id: string) => void;
  // Records
  createRecord: (data: Omit<EconomicRecord, "id">) => void;
  updateRecord: (data: EconomicRecord) => void;
  deleteRecord: (id: string) => void;
  // Places
  createPlace: (data: Omit<PaymentPlace, "id">) => void;
  deletePlace: (id: string) => void;
  // Config
  updateConfig: (data: GlobalConfig) => void;
  // Reset
  resetData: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seedData);

  // Hidratar desde localStorage al montar.
  useEffect(() => {
    const stored = loadFromStorage<AppState>(STORAGE_KEY);
    if (stored) dispatch({ type: "HYDRATE", payload: stored });
  }, []);

  // Persistir en localStorage en cada cambio.
  useEffect(() => {
    saveToStorage(STORAGE_KEY, state);
  }, [state]);

  // Action creators
  const createWorker = useCallback((data: Omit<Worker, "id" | "salaryHistory">) => dispatch({ type: "WORKER_CREATE", payload: data }), []);
  const updateWorker = useCallback((data: Worker) => dispatch({ type: "WORKER_UPDATE", payload: data }), []);
  const deleteWorker = useCallback((id: string) => dispatch({ type: "WORKER_DELETE", payload: { id } }), []);

  const createJobPosition = useCallback((data: Omit<JobPosition, "id">) => dispatch({ type: "JOB_CREATE", payload: data }), []);
  const updateJobPosition = useCallback((data: JobPosition) => dispatch({ type: "JOB_UPDATE", payload: data }), []);
  const deleteJobPosition = useCallback((id: string) => dispatch({ type: "JOB_DELETE", payload: { id } }), []);

  const createClient = useCallback((data: Omit<Client, "id">) => dispatch({ type: "CLIENT_CREATE", payload: data }), []);
  const updateClient = useCallback((data: Client) => dispatch({ type: "CLIENT_UPDATE", payload: data }), []);
  const deleteClient = useCallback((id: string) => dispatch({ type: "CLIENT_DELETE", payload: { id } }), []);

  const createWorkSite = useCallback((data: Omit<WorkSite, "id">) => dispatch({ type: "WORKSITE_CREATE", payload: data }), []);
  const updateWorkSite = useCallback((data: WorkSite) => dispatch({ type: "WORKSITE_UPDATE", payload: data }), []);
  const deleteWorkSite = useCallback((id: string) => dispatch({ type: "WORKSITE_DELETE", payload: { id } }), []);

  const createAttendance = useCallback((data: Omit<Attendance, "id">) => dispatch({ type: "ATTENDANCE_CREATE", payload: data }), []);
  const updateAttendance = useCallback((data: Attendance) => dispatch({ type: "ATTENDANCE_UPDATE", payload: data }), []);
  const deleteAttendance = useCallback((id: string) => dispatch({ type: "ATTENDANCE_DELETE", payload: { id } }), []);

  const createRecord = useCallback((data: Omit<EconomicRecord, "id">) => dispatch({ type: "RECORD_CREATE", payload: data }), []);
  const updateRecord = useCallback((data: EconomicRecord) => dispatch({ type: "RECORD_UPDATE", payload: data }), []);
  const deleteRecord = useCallback((id: string) => dispatch({ type: "RECORD_DELETE", payload: { id } }), []);

  const createPlace = useCallback((data: Omit<PaymentPlace, "id">) => dispatch({ type: "PLACE_CREATE", payload: data }), []);
  const deletePlace = useCallback((id: string) => dispatch({ type: "PLACE_DELETE", payload: { id } }), []);

  const updateConfig = useCallback((data: GlobalConfig) => dispatch({ type: "CONFIG_UPDATE", payload: data }), []);
  const resetData = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      createWorker, updateWorker, deleteWorker,
      createJobPosition, updateJobPosition, deleteJobPosition,
      createClient, updateClient, deleteClient,
      createWorkSite, updateWorkSite, deleteWorkSite,
      createAttendance, updateAttendance, deleteAttendance,
      createRecord, updateRecord, deleteRecord,
      createPlace, deletePlace,
      updateConfig, resetData,
    }),
    [
      state,
      createWorker, updateWorker, deleteWorker,
      createJobPosition, updateJobPosition, deleteJobPosition,
      createClient, updateClient, deleteClient,
      createWorkSite, updateWorkSite, deleteWorkSite,
      createAttendance, updateAttendance, deleteAttendance,
      createRecord, updateRecord, deleteRecord,
      createPlace, deletePlace,
      updateConfig, resetData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData debe usarse dentro de un DataProvider");
  return ctx;
}
