"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/data/DataProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { buildMonthlySummary } from "@/utils/calculations";
import { formatCurrency, monthName } from "@/utils/formatters";
import type { MonthlySummary, Worker } from "@/types";

export default function ResumenPage() {
  const { workers, attendances, economicRecords, config, jobPositions } = useData();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [detail, setDetail] = useState<{ worker: Worker; summary: MonthlySummary } | null>(null);

  const jobMap = new Map(jobPositions.map((j) => [j.id, j.name]));

  const rows = useMemo(
    () =>
      workers
        .filter((w) => w.active)
        .map((w) => ({
          worker: w,
          summary: buildMonthlySummary(w, year, month, attendances, economicRecords, config),
        }))
        .sort((a, b) =>
          `${a.worker.firstName} ${a.worker.lastName}`.localeCompare(
            `${b.worker.firstName} ${b.worker.lastName}`
          )
        ),
    [workers, year, month, attendances, economicRecords, config]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, { summary: s }) => ({
          daysWorked: acc.daysWorked + s.daysWorked,
          hoursWorked: acc.hoursWorked + s.hoursWorked,
          extraHours: acc.extraHours + s.extraHours,
          dailyPay: acc.dailyPay + s.dailyPay,
          extraPay: acc.extraPay + s.extraPay,
          totalGenerated: acc.totalGenerated + s.totalGenerated,
          advances: acc.advances + s.advances,
          advancePayments: acc.advancePayments + s.advancePayments,
          salariesPaid: acc.salariesPaid + s.salariesPaid,
          finalBalance: acc.finalBalance + s.finalBalance,
          cashDifference: acc.cashDifference + (s.cashDifference ?? 0),
          pendingDebt: acc.pendingDebt + (s.pendingDebt ?? 0),
        }),
        {
          daysWorked: 0, hoursWorked: 0, extraHours: 0,
          dailyPay: 0, extraPay: 0, totalGenerated: 0,
          advances: 0, advancePayments: 0, salariesPaid: 0,
          finalBalance: 0, cashDifference: 0, pendingDebt: 0,
        }
      ),
    [rows]
  );

  return (
    <>
      <PageHeader
        title="Resumen mensual"
        description="Total generado, adelantos, sueldos pagados y saldo final por trabajador."
        action={
          <>
            <Button variant="secondary" disabled title="Próximamente">Exportar Excel</Button>
            <Button variant="secondary" disabled title="Próximamente">Exportar PDF</Button>
          </>
        }
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total generado" value={formatCurrency(totals.totalGenerated)} hint="Días + horas extra" accent />
        <StatCard label="Adelantos" value={formatCurrency(totals.advances)} />
        <StatCard label="Sueldos pagados" value={formatCurrency(totals.salariesPaid)} />
        <StatCard
          label="Saldo final agregado"
          value={formatCurrency(totals.finalBalance)}
          hint={totals.pendingDebt > 0 ? `Deuda banco: ${formatCurrency(totals.pendingDebt)}` : undefined}
        />
      </section>

      <Card>
        <CardHeader
          title={`Resumen de ${monthName(month)} ${year}`}
          description={`${rows.length} trabajadores activos`}
          action={
            <div className="flex gap-2">
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-auto">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{monthName(m)}</option>
                ))}
              </Select>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
                min="2020"
                max="2050"
              />
            </div>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title="No hay trabajadores activos"
            description="Activa trabajadores para ver el resumen mensual."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th className="text-right">Días</th>
                  <th className="text-right">Horas</th>
                  <th className="text-right">H. extra</th>
                  <th className="text-right">Pago días</th>
                  <th className="text-right">Pago extra</th>
                  <th className="text-right">Total generado</th>
                  <th className="text-right">Adelantos</th>
                  <th className="text-right">Pagos adel.</th>
                  <th className="text-right">Sueldos</th>
                  <th className="text-right">Saldo final</th>
                  <th>Banco</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ worker, summary: s }) => (
                  <tr key={worker.id}>
                    <td>
                      <p className="font-medium">{worker.firstName} {worker.lastName}</p>
                      <p className="text-xs text-slate-500">{jobMap.get(worker.jobPositionId) ?? "—"}</p>
                    </td>
                    <td className="text-right">{s.daysWorked}</td>
                    <td className="text-right">{s.hoursWorked}</td>
                    <td className="text-right">{s.extraHours}</td>
                    <td className="text-right">{formatCurrency(s.dailyPay)}</td>
                    <td className="text-right">{formatCurrency(s.extraPay)}</td>
                    <td className="text-right font-semibold">{formatCurrency(s.totalGenerated)}</td>
                    <td className="text-right text-red-700">{formatCurrency(s.advances)}</td>
                    <td className="text-right text-blue-700">{formatCurrency(s.advancePayments)}</td>
                    <td className="text-right">{formatCurrency(s.salariesPaid)}</td>
                    <td
                      className={`text-right font-semibold ${
                        s.finalBalance > 0
                          ? "text-green-700"
                          : s.finalBalance < 0
                            ? "text-red-700"
                            : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(s.finalBalance)}
                    </td>
                    <td>
                      {worker.paymentMethod === "banco" && s.bankAmount != null ? (
                        s.cashDifference && s.cashDifference > 0 ? (
                          <Badge tone="yellow">
                            +{formatCurrency(s.cashDifference)} efectivo
                          </Badge>
                        ) : s.pendingDebt && s.pendingDebt > 0 ? (
                          <Badge tone="red">
                            Deuda {formatCurrency(s.pendingDebt)}
                          </Badge>
                        ) : (
                          <Badge tone="green">Cuadrado</Badge>
                        )
                      ) : (
                        <Badge tone="neutral">Efectivo</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetail({ worker, summary: s })}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td>TOTALES</td>
                  <td className="text-right">{totals.daysWorked}</td>
                  <td className="text-right">{totals.hoursWorked}</td>
                  <td className="text-right">{totals.extraHours}</td>
                  <td className="text-right">{formatCurrency(totals.dailyPay)}</td>
                  <td className="text-right">{formatCurrency(totals.extraPay)}</td>
                  <td className="text-right">{formatCurrency(totals.totalGenerated)}</td>
                  <td className="text-right text-red-700">{formatCurrency(totals.advances)}</td>
                  <td className="text-right text-blue-700">{formatCurrency(totals.advancePayments)}</td>
                  <td className="text-right">{formatCurrency(totals.salariesPaid)}</td>
                  <td className="text-right">{formatCurrency(totals.finalBalance)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Total generado = pago días + pago horas extra · Saldo final = total generado − adelantos + pagos
          de adelanto − sueldos pagados.
        </p>
      </Card>

      {/* Detalle individual */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.worker.firstName} ${detail.worker.lastName}` : ""}
        description={detail ? `Resumen de ${monthName(detail.summary.month)} ${detail.summary.year}` : ""}
        size="md"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Salario diario" value={formatCurrency(detail.worker.dailySalary)} />
              <Field label="Forma de pago" value={detail.worker.paymentMethod === "banco" ? "Banco" : "Efectivo"} />
              <Field label="Días trabajados" value={detail.summary.daysWorked} />
              <Field label="Horas trabajadas" value={`${detail.summary.hoursWorked} h`} />
              <Field label="Horas extra" value={`${detail.summary.extraHours} h`} />
              <Field label="Jornada completa" value={`${config.fullDayHours} h`} />
            </dl>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cálculo</p>
              <dl className="space-y-1.5">
                <Line label="Pago por días trabajados" value={detail.summary.dailyPay} />
                <Line label="Pago por horas extra" value={detail.summary.extraPay} positive />
                <Line label="Total generado" value={detail.summary.totalGenerated} bold />
                <Line label="− Adelantos" value={-detail.summary.advances} negative />
                <Line label="+ Pagos de adelanto" value={detail.summary.advancePayments} positive />
                <Line label="− Sueldos pagados" value={-detail.summary.salariesPaid} negative />
                <div className="my-2 border-t border-slate-300" />
                <Line label="SALDO FINAL" value={detail.summary.finalBalance} bold large />
              </dl>
            </div>

            {detail.worker.paymentMethod === "banco" && detail.summary.bankAmount != null && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Liquidación por banco
                </p>
                <dl className="space-y-1.5">
                  <Line label="Total generado" value={detail.summary.totalGenerated} />
                  <Line label="Ingreso bancario" value={detail.summary.bankAmount} />
                  {detail.summary.cashDifference != null && detail.summary.cashDifference > 0 && (
                    <Line
                      label="A pagar en efectivo (diferencia)"
                      value={detail.summary.cashDifference}
                      positive
                      bold
                    />
                  )}
                  {detail.summary.pendingDebt != null && detail.summary.pendingDebt > 0 && (
                    <Line
                      label="Deuda para el mes siguiente"
                      value={detail.summary.pendingDebt}
                      negative
                      bold
                    />
                  )}
                  {(detail.summary.cashDifference ?? 0) === 0 && (detail.summary.pendingDebt ?? 0) === 0 && (
                    <p className="text-xs text-slate-600">El total generado coincide con el ingreso bancario.</p>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function Line({
  label,
  value,
  bold = false,
  large = false,
  positive = false,
  negative = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  large?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${large ? "text-base" : "text-sm"}`}>
      <dt className={bold ? "font-semibold text-slate-900" : "text-slate-600"}>{label}</dt>
      <dd
        className={`${bold ? "font-bold" : "font-medium"} ${
          positive ? "text-green-700" : negative ? "text-red-700" : "text-slate-900"
        }`}
      >
        {formatCurrency(value)}
      </dd>
    </div>
  );
}
