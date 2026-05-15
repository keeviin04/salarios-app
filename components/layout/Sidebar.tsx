"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Permission } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  permission: Permission;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "summary.read" },
  { href: "/dashboard/trabajadores", label: "Trabajadores", permission: "workers.read" },
  { href: "/dashboard/puestos", label: "Puestos", permission: "jobpositions.read" },
  { href: "/dashboard/clientes", label: "Clientes", permission: "clients.read" },
  { href: "/dashboard/obras", label: "Obras", permission: "worksites.read" },
  { href: "/dashboard/asistencias", label: "Rellenar días", permission: "attendances.write" },
  { href: "/dashboard/registros", label: "Registros", permission: "records.write" },
  { href: "/dashboard/resumen", label: "Resumen mensual", permission: "summary.read" },
  { href: "/dashboard/control-mensual", label: "Control mensual", permission: "summary.read" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { can, user } = useAuth();

  const visibleItems = navItems.filter((item) => can(item.permission));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Salarios</p>
            <p className="text-xs text-slate-500">Gestión integral</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Sesión</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{user?.name ?? "—"}</p>
          <p className="text-xs text-slate-500">
            {user?.role === "admin" ? "Administrador" : "Encargado"}
          </p>
        </div>
      </aside>
    </>
  );
}
