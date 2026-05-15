"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useData } from "@/components/data/DataProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { buildMonthlySummary } from "@/utils/calculations";
import { formatCurrency, monthName } from "@/utils/formatters";

export default function DashboardPage() {
  const { user } = useAuth();
  const { workers, workSites, clients, attendances, economicRecords, config } = useData();

  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const summaries = useMemo(
    () => workers.map((w) => buildMonthlySummary(w, year, month, attendances, economicRecords, config)),
    [workers, year, month, attendances, economicRecords, config]
  );

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, s) => ({
          totalGenerated: acc.totalGenerated + s.totalGenerated,
          advances: acc.advances + s.advances,
          salariesPaid: acc.salariesPaid + s.salariesPaid,
          finalBalance: acc.finalBalance + s.finalBalance,
          daysWorked: acc.daysWorked + s.daysWorked,
          extraHours: acc.extraHours + s.extraHours,
          pendingDebt: acc.pendingDebt + (s.pendingDebt ?? 0),
        }),
        { totalGenerated: 0, advances: 0, salariesPaid: 0, finalBalance: 0, daysWorked: 0, extraHours: 0, pendingDebt: 0 }
      ),
    [summaries]
  );

  const activeWorkers = workers.filter((w) => w.active).length;
  const activeWorkSites = workSites.filter((w) => w.status === "activa").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">
          Hola {user?.name}, hoy es{" "}
          {today.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          Resumen de {monthName(month)} {year}
        </h2>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total generado" value={formatCurrency(totals.totalGenerated)} hint="Días + horas extra" accent />
        <StatCard label="Adelantos" value={formatCurrency(totals.advances)} />
        <StatCard label="Sueldos pagados" value={formatCurrency(totals.salariesPaid)} />
        <StatCard label="Saldo pendiente" value={formatCurrency(totals.finalBalance)} hint="Tras todos los movimientos" />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Trabajadores activos" value={activeWorkers} />
        <StatCard label="Obras activas" value={activeWorkSites} />
        <StatCard label="Clientes" value={clients.length} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Accesos rápidos" description="Las tareas habituales del día" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickLink href="/dashboard/asistencias" label="Rellenar días" />
            <QuickLink href="/dashboard/registros" label="Agregar registro" />
            <QuickLink href="/dashboard/resumen" label="Ver resumen mensual" />
            <QuickLink href="/dashboard/obras" label="Gestionar obras" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Resumen rápido" description="Métricas operativas del mes" />
          <dl className="divide-y divide-slate-100">
            <Row label="Días trabajados (acumulado)" value={totals.daysWorked} />
            <Row label="Horas extra del mes" value={`${totals.extraHours} h`} />
            <Row label="Trabajadores con saldo > 0" value={summaries.filter((s) => s.finalBalance > 0).length} />
            <Row label="Deuda acumulada (banco)" value={formatCurrency(totals.pendingDebt)} />
          </dl>
        </Card>
      </section>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-900 hover:bg-slate-50"
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
