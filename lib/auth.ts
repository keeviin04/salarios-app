// ============================================================================
// AUTENTICACIÓN MOCK - se sustituirá por Supabase Auth en producción.
// ============================================================================

import type { Role, User } from "@/types";
import { loadFromStorage, saveToStorage, clearStorage } from "@/lib/storage";

const SESSION_KEY = "salarios_app_session";

export const mockUsers: User[] = [
  {
    id: "u-001",
    email: "admin@empresa.com",
    password: "admin123",
    name: "Administrador",
    role: "admin",
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "u-002",
    email: "encargado@empresa.com",
    password: "encargado123",
    name: "Encargado de Obra",
    role: "encargado",
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function authenticate(
  email: string,
  password: string
): SessionUser | null {
  const u = mockUsers.find(
    (m) =>
      m.email.toLowerCase() === email.trim().toLowerCase() &&
      m.password === password &&
      m.active
  );
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export function getSession(): SessionUser | null {
  return loadFromStorage<SessionUser>(SESSION_KEY);
}

export function saveSession(user: SessionUser): void {
  saveToStorage(SESSION_KEY, user);
}

export function clearSession(): void {
  clearStorage(SESSION_KEY);
}
