"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/data/DataProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  buildWorkerRowData,
  getDaysOfMonth,
  getWeeksOfMonth,
  sliceWorkerWeek,
  localTodayISO,
  dayToISO,
  DAY_ABBR,
  type AttendanceDetail,
  type DayCellData,
  type WorkerRowData,
  type WeekBounds,
} from "@/utils/monthly-control";
import { formatCurrency, monthName } from "@/utils/formatters";

// ---------------------------------------------------------------------------
// Holiday persistence (separate from DataProvider)
// ---------------------------------------------------------------------------

const HOLIDAYS_KEY = "salarios_app_holidays";

function loadHolidays(): Set<string> {
  try {
    const raw = localStorage.getItem(HOLIDAYS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveHolidays(h: Set<string>): void {
  try {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify([...h]));
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedCell {
  workerName: string;
  day: DayCellData;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ControlMensualPage() {
  const { workers, attendances, workSites, config } = useData();

  const now = new Date();
  const todayISO = localTodayISO();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [holidays, setHolidays] = useState<Set<string>>(() => loadHolidays());
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [tableOpen, setTableOpen] = useState(false);

  const days = useMemo(() => getDaysOfMonth(year, month), [year, month]);
  const weeks = useMemo(() => getWeeksOfMonth(days), [days]);

  const activeWorkers = useMemo(
    () =>
      workers
        .filter((w) => w.active)
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        ),
    [workers]
  );

  const rows = useMemo(
    () =>
      activeWorkers.map((w) =>
        buildWorkerRowData(w, days, attendances, workSites, config, holidays, todayISO)
      ),
    [activeWorkers, days, attendances, workSites, config, holidays, todayISO]
  );

  function toggleHoliday(isoDate: string) {
    setHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(isoDate)) {
        next.delete(isoDate);
      } else {
        next.add(isoDate);
      }
      saveHolidays(next);
      return next;
    });
  }

  function handleCellClick(row: WorkerRowData, day: DayCellData) {
    if (!day.hasAttendance) return;
    setSelectedCell({
      workerName: `${row.worker.firstName} ${row.worker.lastName}`,
      day,
    });
  }

  const COL1 = 76;
  const COL2 = 164;
  const DAY_COL = 40;

  return (
    <>
      <PageHeader
        title="Control mensual"
        description="Vista de asistencias por trabajador. Haz clic en un número de día para marcarlo como festivo."
      />

      {/* ── Collapsible monthly calendar ─────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setTableOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-slate-50"
          >
            <span className="text-base font-semibold text-slate-900">
              {monthName(month)} {year}
            </span>
            <span className="text-sm text-slate-500">
              · {activeWorkers.length} trabajadores activos
            </span>
            <span className="ml-1 text-xs text-slate-400">{tableOpen ? "▲" : "▼"}</span>
          </button>

          <div className="flex flex-shrink-0 gap-2">
            <Select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-auto"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
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
        </div>

        {tableOpen && (
          <div className="mt-4">
            {activeWorkers.length === 0 ? (
              <EmptyState
                title="No hay trabajadores activos"
                description="Activa trabajadores para ver el control mensual."
              />
            ) : (
              <div className="overflow-x-auto">
                <table
                  style={{ minWidth: COL1 + COL2 + days.length * DAY_COL + 5 * 56 }}
                  className="w-full border-collapse text-sm"
                >
                  <thead>
                    <tr>
                      <th
                        style={{ width: COL1, left: 0 }}
                        className="sticky z-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        €/día
                      </th>
                      <th
                        style={{ width: COL2, left: COL1 }}
                        className="sticky z-20 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Trabajador
                      </th>
                      {days.map((d) => {
                        const iso = dayToISO(d);
                        const dow = d.getDay();
                        const isSun = dow === 0;
                        const isHol = holidays.has(iso);
                        const bgCls = isSun
                          ? "bg-orange-50"
                          : isHol
                            ? "bg-yellow-50"
                            : "bg-slate-50";
                        return (
                          <th
                            key={iso}
                            style={{ width: DAY_COL, minWidth: DAY_COL }}
                            className={`border-b border-slate-200 p-0 text-center ${bgCls}`}
                          >
                            <div
                              className={`pt-1 text-[10px] font-medium ${isSun ? "text-orange-500" : "text-slate-400"}`}
                            >
                              {DAY_ABBR[dow]}
                            </div>
                            <button
                              type="button"
                              onClick={() => !isSun && toggleHoliday(iso)}
                              title={
                                isSun
                                  ? "Domingo"
                                  : isHol
                                    ? "Quitar festivo"
                                    : "Marcar como festivo"
                              }
                              className={`w-full pb-1 text-xs font-bold leading-none ${
                                isSun
                                  ? "cursor-default text-orange-600"
                                  : isHol
                                    ? "cursor-pointer text-yellow-700 hover:bg-yellow-100"
                                    : "cursor-pointer text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {d.getDate()}
                            </button>
                          </th>
                        );
                      })}
                      <th className="border-b border-l border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-green-700">
                        Días ✅
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-red-700">
                        Días ❌
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Horas
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        H. extra
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.worker.id} className="group">
                        <td
                          style={{ width: COL1, left: 0 }}
                          className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-2 text-right text-xs font-medium text-slate-500 group-hover:bg-slate-50"
                        >
                          {formatCurrency(row.worker.dailySalary)}
                        </td>
                        <td
                          style={{ width: COL2, left: COL1 }}
                          className="sticky z-10 border-b border-r border-slate-100 bg-white px-3 py-2 group-hover:bg-slate-50"
                        >
                          <p className="whitespace-nowrap font-medium text-slate-900">
                            {row.worker.firstName} {row.worker.lastName}
                          </p>
                        </td>
                        {row.days.map((day) => {
                          const { bg, icon, extra } = getCellDisplay(day);
                          return (
                            <td
                              key={day.isoDate}
                              onClick={() => handleCellClick(row, day)}
                              className={`border-b border-slate-100 p-0 text-center align-middle ${bg} ${
                                day.hasAttendance ? "cursor-pointer hover:opacity-75" : ""
                              }`}
                              style={{ width: DAY_COL, minWidth: DAY_COL, height: 40 }}
                              title={day.hasAttendance ? "Ver detalle" : undefined}
                            >
                              <div className="flex h-full flex-col items-center justify-center gap-0.5 py-1">
                                <span className="text-sm leading-none">{icon}</span>
                                {extra && (
                                  <span className="text-[8px] font-semibold leading-none text-emerald-700">
                                    {extra}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="border-b border-l border-slate-100 px-2 py-2 text-center text-sm font-semibold text-green-700">
                          {row.daysWorked}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-2 text-center text-sm font-semibold text-red-700">
                          {row.daysMissed}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-2 text-center text-sm text-slate-700">
                          {row.totalHoursWorked}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-2 text-center text-sm text-slate-700">
                          {row.totalExtraHours}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-2 text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(row.totalGenerated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1 text-xs text-slate-500">
              <LegendItem color="bg-green-100 border-green-200" label="Trabajado (clic para ver detalle)" />
              <LegendItem color="bg-red-100 border-red-200" label="Faltado" />
              <LegendItem color="bg-orange-100 border-orange-200" label="Domingo" />
              <LegendItem color="bg-yellow-100 border-yellow-200" label="Festivo (clic en el número para marcar/desmarcar)" />
              <LegendItem color="bg-slate-100 border-slate-200" label="Día futuro" />
            </div>
          </div>
        )}
      </Card>

      {/* ── Weekly tables ─────────────────────────────────────────────────── */}
      {activeWorkers.length > 0 && (
        <div className="mt-6 space-y-4">
          {weeks.map((week) => (
            <WeekCard key={week.index} week={week} rows={rows} days={days} />
          ))}
        </div>
      )}

      {/* ── Monthly summary ───────────────────────────────────────────────── */}
      {activeWorkers.length > 0 && (
        <div className="mt-6">
          <MonthlySummaryCard rows={rows} />
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        title={selectedCell?.workerName ?? ""}
        description={selectedCell ? formatLongDate(selectedCell.day.isoDate) : ""}
        size="md"
      >
        {selectedCell && <DayDetailContent day={selectedCell.day} />}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCellDisplay(day: DayCellData): { bg: string; icon: string; extra: string | null } {
  if (day.hasAttendance) {
    return {
      bg: "bg-green-50",
      icon: "✅",
      extra: day.totalExtraHours > 0 ? `H+ ${day.totalExtraHours}` : null,
    };
  }
  if (day.isSunday) return { bg: "bg-orange-50", icon: "D", extra: null };
  if (day.isHoliday) return { bg: "bg-yellow-50", icon: "F", extra: null };
  if (day.isFuture) return { bg: "bg-slate-50", icon: "—", extra: null };
  return { bg: "bg-red-50", icon: "❌", extra: null };
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Weekly and summary sub-components
// ---------------------------------------------------------------------------

function WeekCard({
  week,
  rows,
  days,
}: {
  week: WeekBounds;
  rows: WorkerRowData[];
  days: Date[];
}) {
  const weekDays = days.filter(
    (d) => dayToISO(d) >= week.isoStart && dayToISO(d) <= week.isoEnd
  );

  // Build iso→cell map from any row to derive holiday/sunday status for headers
  const dayMeta = new Map((rows[0]?.days ?? []).map((d) => [d.isoDate, d]));

  const COL1_W = 72;
  const COL2_W = 160;
  const SUM_W = 60;
  const TOTAL_W = 76;

  return (
    <Card>
      <CardHeader
        title={`Semana ${week.index}`}
        description={`Días ${week.startDay} – ${week.endDay}`}
      />
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          style={{
            tableLayout: "fixed",
            minWidth: COL1_W + COL2_W + weekDays.length * 32 + 4 * SUM_W + TOTAL_W,
          }}
        >
          <thead>
            <tr>
              <th
                style={{ width: COL1_W }}
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                €/día
              </th>
              <th
                style={{ width: COL2_W }}
                className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Trabajador
              </th>
              {weekDays.map((d) => {
                const iso = dayToISO(d);
                const dow = d.getDay();
                const isSun = dow === 0;
                const isHol = dayMeta.get(iso)?.isHoliday ?? false;
                const bgCls = isSun ? "bg-orange-50" : isHol ? "bg-yellow-50" : "bg-slate-50";
                return (
                  <th
                    key={iso}
                    style={{ minWidth: 32 }}
                    className={`border-b border-slate-200 p-0 text-center ${bgCls}`}
                  >
                    <div
                      className={`pt-1 text-[10px] font-medium ${isSun ? "text-orange-500" : "text-slate-400"}`}
                    >
                      {DAY_ABBR[dow]}
                    </div>
                    <div
                      className={`pb-1 text-xs font-bold ${isSun ? "text-orange-600" : isHol ? "text-yellow-700" : "text-slate-700"}`}
                    >
                      {d.getDate()}
                    </div>
                  </th>
                );
              })}
              <th
                style={{ width: SUM_W }}
                className="border-b border-l border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-green-700"
              >
                Días ✅
              </th>
              <th
                style={{ width: SUM_W }}
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-red-700"
              >
                Días ❌
              </th>
              <th
                style={{ width: SUM_W }}
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Horas
              </th>
              <th
                style={{ width: SUM_W }}
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                H. extra
              </th>
              <th
                style={{ width: TOTAL_W }}
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const s = sliceWorkerWeek(row, week.isoStart, week.isoEnd);
              const weekCells = row.days.filter(
                (d) => d.isoDate >= week.isoStart && d.isoDate <= week.isoEnd
              );
              return (
                <tr key={row.worker.id} className="group">
                  <td className="border-b border-slate-100 px-2 py-2 text-right text-xs font-medium text-slate-500 group-hover:bg-slate-50">
                    {formatCurrency(row.worker.dailySalary)}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-2 font-medium text-slate-900 group-hover:bg-slate-50"
                    style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                  >
                    {row.worker.firstName} {row.worker.lastName}
                  </td>
                  {weekCells.map((day) => {
                    const { bg, icon, extra } = getCellDisplay(day);
                    return (
                      <td
                        key={day.isoDate}
                        className={`border-b border-slate-100 p-0 text-center align-middle ${bg}`}
                        style={{ height: 40 }}
                      >
                        <div className="flex h-full flex-col items-center justify-center gap-0.5 py-1">
                          <span className="text-sm leading-none">{icon}</span>
                          {extra && (
                            <span className="text-[8px] font-semibold leading-none text-emerald-700">
                              {extra}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-slate-100 px-2 py-2 text-center text-sm font-semibold text-green-700">
                    {s.daysWorked}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2 text-center text-sm font-semibold text-red-700">
                    {s.daysMissed}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2 text-center text-sm text-slate-700">
                    {s.totalHoursWorked}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2 text-center text-sm text-slate-700">
                    {s.totalExtraHours}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(s.totalGenerated)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MonthlySummaryCard({ rows }: { rows: WorkerRowData[] }) {
  return (
    <Card>
      <CardHeader title="Resumen total del mes" />
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="text-right">€/día</th>
              <th>Trabajador</th>
              <th className="text-center text-green-700">Días ✅</th>
              <th className="text-center text-red-700">Días ❌</th>
              <th className="text-center">Horas</th>
              <th className="text-center">H. extra</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.worker.id}>
                <td className="text-right text-xs text-slate-500">
                  {formatCurrency(row.worker.dailySalary)}
                </td>
                <td className="font-medium text-slate-900">
                  {row.worker.firstName} {row.worker.lastName}
                </td>
                <td className="text-center font-semibold text-green-700">{row.daysWorked}</td>
                <td className="text-center font-semibold text-red-700">{row.daysMissed}</td>
                <td className="text-center text-slate-700">{row.totalHoursWorked}</td>
                <td className="text-center text-slate-700">{row.totalExtraHours}</td>
                <td className="text-right font-semibold text-slate-900">
                  {formatCurrency(row.totalGenerated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-4 w-4 rounded border ${color}`} />
      {label}
    </span>
  );
}

function DayDetailContent({ day }: { day: DayCellData }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <SummaryField label="Horas totales" value={`${day.totalHoursWorked} h`} />
        <SummaryField label="Horas extra" value={`${day.totalExtraHours} h`} />
        <SummaryField label="Total generado" value={formatCurrency(day.totalPay)} accent />
      </div>
      <div className="space-y-3">
        {day.attendances.map((det, i) => (
          <AttendanceCard key={i} det={det} />
        ))}
      </div>
    </div>
  );
}

function AttendanceCard({ det }: { det: AttendanceDetail }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{det.workSite?.name ?? "Obra sin nombre"}</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-slate-500">Horas</p>
          <p className="font-medium text-slate-900">{det.attendance.hoursWorked} h</p>
        </div>
        <div>
          <p className="text-slate-500">Horas extra</p>
          <p className="font-medium text-slate-900">{det.attendance.extraHours} h</p>
        </div>
        <div>
          <p className="text-slate-500">Pago del día</p>
          <p className="font-semibold text-green-700">{formatCurrency(det.total)}</p>
        </div>
      </div>
      {det.attendance.notes && (
        <p className="mt-2 text-xs italic text-slate-500">{det.attendance.notes}</p>
      )}
    </div>
  );
}

function SummaryField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold ${accent ? "text-green-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
