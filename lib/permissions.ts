// ============================================================================
// PERMISOS POR ROL - Regla 19 del documento funcional
// ============================================================================

import type { Role } from "@/types";

export type Permission =
  | "workers.read"
  | "workers.write"
  | "workers.delete"
  | "clients.read"
  | "clients.write"
  | "clients.delete"
  | "worksites.read"
  | "worksites.write"
  | "worksites.delete"
  | "jobpositions.read"
  | "jobpositions.write"
  | "jobpositions.delete"
  | "attendances.read"
  | "attendances.write"
  | "attendances.delete"
  | "records.read"
  | "records.write"
  | "records.delete"
  | "places.create"
  | "places.delete"
  | "summary.read"
  | "closure.close"
  | "closure.reopen"
  | "users.manage"
  | "history.read"
  | "config.write";

const PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "workers.read", "workers.write", "workers.delete",
    "clients.read", "clients.write", "clients.delete",
    "worksites.read", "worksites.write", "worksites.delete",
    "jobpositions.read", "jobpositions.write", "jobpositions.delete",
    "attendances.read", "attendances.write", "attendances.delete",
    "records.read", "records.write", "records.delete",
    "places.create", "places.delete",
    "summary.read",
    "closure.close", "closure.reopen",
    "users.manage",
    "history.read",
    "config.write",
  ],
  encargado: [
    "workers.read",
    "clients.read",
    "worksites.read", "worksites.write",
    "jobpositions.read", "jobpositions.write",
    "attendances.read", "attendances.write",
    "records.read", "records.write",
    "places.create",
    "summary.read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}
