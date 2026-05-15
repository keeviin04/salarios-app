"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useData } from "@/components/data/DataProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, monthName } from "@/utils/formatters";
import { calculateDayPayment } from "@/utils/calculations";
import type { Attendance, GlobalConfig, Worker, WorkSite } from "@/types";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const OTRO_SITE_ID = "__otro__";

type Step = "main" | "obras" | "obras-summary" | "workers";

interface ObrasWorkerEntry {
  workerId: string;
  checked: boolean;
  hoursWorked: number;
  extraHours: number;
  notes: string;
}

interface ObrasSiteData {
  siteId: string;
  open: boolean;
  workers: ObrasWorkerEntry[];
}

interface WorkersModeEntry {
  workerId: string;
  checked: boolean;
  hoursWorked: number;
  extraHours: number;
  workSiteId: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateAddDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayDisplay(iso: string): string {
  const [y, m, dy] = iso.split("-").map(Number);
  return new Date(y, m - 1, dy).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getSiteName(siteId: string, map: Map<string, string>): string {
  if (siteId === OTRO_SITE_ID) return "Otro";
  return map.get(siteId) ?? "—";
}

function buildObrasSites(
  sites: WorkSite[],
  workers: Worker[],
  fullDayHours: number
): ObrasSiteData[] {
  const makeWorkers = (): ObrasWorkerEntry[] =>
    workers.map((w) => ({
      workerId: w.id,
      checked: false,
      hoursWorked: fullDayHours,
      extraHours: 0,
      notes: "",
    }));

  return [
    ...sites.map((ws) => ({ siteId: ws.id, open: false, workers: makeWorkers() })),
    { siteId: OTRO_SITE_ID, open: false, workers: makeWorkers() },
  ];
}

function buildWorkersModeEntries(
  workers: Worker[],
  sites: WorkSite[],
  fullDayHours: number
): WorkersModeEntry[] {
  const defaultSite = sites[0]?.id ?? OTRO_SITE_ID;
  return workers.map((w) => ({
    workerId: w.id,
    checked: true,
    hoursWorked: fullDayHours,
    extraHours: 0,
    workSiteId: defaultSite,
    notes: "",
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExtraHoursControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const step = 0.5;
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, parseFloat((value - step).toFixed(1))))}
        className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        −
      </button>
      <input
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="h-7 w-14 rounded border border-slate-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      <button
        type="button"
        onClick={() => onChange(parseFloat((value + step).toFixed(1)))}
        className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        +
      </button>
    </div>
  );
}

function ObrasWorkerRow({
  entry,
  worker,
  config,
  onChange,
}: {
  entry: ObrasWorkerEntry;
  worker: Worker;
  config: GlobalConfig;
  onChange: (u: Partial<ObrasWorkerEntry>) => void;
}) {
  const pay = calculateDayPayment(
    entry.hoursWorked,
    entry.extraHours,
    worker.dailySalary,
    config
  );

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        entry.checked
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          type="checkbox"
          checked={entry.checked}
          onChange={(e) => onChange({ checked: e.target.checked })}
          className="h-4 w-4 cursor-pointer rounded border-slate-400 accent-green-600"
        />
        <span className="flex-1 font-medium text-slate-900" style={{ minWidth: 120 }}>
          {worker.firstName} {worker.lastName}
        </span>

        {entry.checked && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Horas</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={entry.hoursWorked}
                onChange={(e) => onChange({ hoursWorked: Math.max(0, Number(e.target.value)) })}
                className="h-7 w-16 rounded border border-slate-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">H+</span>
              <ExtraHoursControl
                value={entry.extraHours}
                onChange={(v) => onChange({ extraHours: v })}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(pay.total)}
            </span>
          </>
        )}
      </div>

      {entry.checked && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Observaciones (opcional)"
            value={entry.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      )}
    </div>
  );
}

function WorkerModeRow({
  entry,
  worker,
  siteOptions,
  config,
  onChange,
}: {
  entry: WorkersModeEntry;
  worker: Worker;
  siteOptions: WorkSite[];
  config: GlobalConfig;
  onChange: (u: Partial<WorkersModeEntry>) => void;
}) {
  const pay = calculateDayPayment(
    entry.hoursWorked,
    entry.extraHours,
    worker.dailySalary,
    config
  );

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        entry.checked
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          type="checkbox"
          checked={entry.checked}
          onChange={(e) => onChange({ checked: e.target.checked })}
          className="h-4 w-4 cursor-pointer rounded border-slate-400 accent-blue-600"
        />
        <span className="flex-1 font-medium text-slate-900" style={{ minWidth: 120 }}>
          {worker.firstName} {worker.lastName}
        </span>

        {entry.checked && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Horas</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={entry.hoursWorked}
                onChange={(e) => onChange({ hoursWorked: Math.max(0, Number(e.target.value)) })}
                className="h-7 w-16 rounded border border-slate-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">H+</span>
              <ExtraHoursControl
                value={entry.extraHours}
                onChange={(v) => onChange({ extraHours: v })}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(pay.total)}
            </span>
          </>
        )}
      </div>

      {entry.checked && (
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={entry.workSiteId}
            onChange={(e) => onChange({ workSiteId: e.target.value })}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {siteOptions.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
            <option value={OTRO_SITE_ID}>Otro</option>
          </select>
          <input
            type="text"
            placeholder="Observaciones (opcional)"
            value={entry.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AsistenciasPage() {
  const { can } = useAuth();
  const {
    workers,
    workSites,
    attendances,
    config,
    createAttendance,
    updateAttendance,
    deleteAttendance,
  } = useData();

  // ── date ──
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // ── flow state ──
  const [step, setStep] = useState<Step>("main");
  const [pickOpen, setPickOpen] = useState(false);

  // ── obras mode ──
  const [obrasSites, setObrasSites] = useState<ObrasSiteData[]>([]);

  // ── workers mode ──
  const [workersModeEntries, setWorkersModeEntries] = useState<WorkersModeEntry[]>([]);

  // ── saving guard (previene doble click) ──
  const [saving, setSaving] = useState(false);

  // ── edit / delete (existing attendances) ──
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);
  const [editForm, setEditForm] = useState({
    hoursWorked: 0,
    extraHours: 0,
    notes: "",
    workSiteId: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null);

  const canWrite = can("attendances.write");
  const canDelete = can("attendances.delete");

  const activeWorkers = useMemo(
    () =>
      workers
        .filter((w) => w.active)
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        ),
    [workers]
  );

  const activeWorkSites = useMemo(
    () => workSites.filter((ws) => ws.status === "activa" || ws.status === "en_pausa"),
    [workSites]
  );

  const workerMap = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);
  const workSiteMap = useMemo(
    () => new Map(workSites.map((ws) => [ws.id, ws.name])),
    [workSites]
  );

  const dayAttendances = useMemo(
    () =>
      attendances
        .filter((a) => a.date === selectedDate)
        .sort((a, b) => {
          const nA = `${workerMap.get(a.workerId)?.firstName ?? ""} ${workerMap.get(a.workerId)?.lastName ?? ""}`;
          const nB = `${workerMap.get(b.workerId)?.firstName ?? ""} ${workerMap.get(b.workerId)?.lastName ?? ""}`;
          return nA.localeCompare(nB);
        }),
    [attendances, selectedDate, workerMap]
  );

  const dayTotals = useMemo(
    () =>
      dayAttendances.reduce(
        (acc, a) => {
          const w = workerMap.get(a.workerId);
          if (!w) return acc;
          const p = calculateDayPayment(a.hoursWorked, a.extraHours, w.dailySalary, config);
          return {
            hours: acc.hours + a.hoursWorked,
            extra: acc.extra + a.extraHours,
            total: acc.total + p.total,
          };
        },
        { hours: 0, extra: 0, total: 0 }
      ),
    [dayAttendances, workerMap, config]
  );

  // ── obras summary data ──
  const summaryRows = useMemo(
    () =>
      obrasSites.flatMap((site) =>
        site.workers
          .filter((w) => w.checked)
          .map((w) => ({ ...w, siteId: site.siteId }))
      ),
    [obrasSites]
  );

  const notAttended = useMemo(() => {
    const checkedIds = new Set(summaryRows.map((r) => r.workerId));
    return activeWorkers.filter((w) => !checkedIds.has(w.id));
  }, [summaryRows, activeWorkers]);

  // ── flow handlers ──
  function enterObrasMode() {
    setObrasSites(buildObrasSites(activeWorkSites, activeWorkers, config.fullDayHours));
    setStep("obras");
    setPickOpen(false);
  }

  function enterWorkersMode() {
    setWorkersModeEntries(
      buildWorkersModeEntries(activeWorkers, activeWorkSites, config.fullDayHours)
    );
    setStep("workers");
    setPickOpen(false);
  }

  function goBack() {
    setStep("main");
  }

  // ── obras site helpers ──
  function toggleSite(idx: number) {
    setObrasSites((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, open: !s.open } : s))
    );
  }

  function updateObrasWorker(
    siteIdx: number,
    workerId: string,
    update: Partial<ObrasWorkerEntry>
  ) {
    setObrasSites((prev) =>
      prev.map((s, i) =>
        i !== siteIdx
          ? s
          : {
              ...s,
              workers: s.workers.map((w) =>
                w.workerId !== workerId ? w : { ...w, ...update }
              ),
            }
      )
    );
  }

  // ── workers mode helpers ──
  function updateWorkerEntry(workerId: string, update: Partial<WorkersModeEntry>) {
    setWorkersModeEntries((prev) =>
      prev.map((e) => (e.workerId !== workerId ? e : { ...e, ...update }))
    );
  }

  // ── save handlers ──

  function isDuplicateAttendance(newAtt: Omit<Attendance, "id">): boolean {
    return attendances.some(
      (a) =>
        a.workerId === newAtt.workerId &&
        a.date === newAtt.date &&
        a.workSiteId === newAtt.workSiteId &&
        a.hoursWorked === newAtt.hoursWorked &&
        a.extraHours === newAtt.extraHours
    );
  }

  function handleConfirmObras() {
    if (saving) return;
    setSaving(true);
    summaryRows.forEach((row) => {
      const newAtt: Omit<Attendance, "id"> = {
        date: selectedDate,
        workerId: row.workerId,
        workSiteId: row.siteId,
        hoursWorked: row.hoursWorked,
        extraHours: row.extraHours,
        notes: row.notes || undefined,
      };
      if (!isDuplicateAttendance(newAtt)) {
        createAttendance(newAtt);
      }
    });
    setSaving(false);
    setStep("main");
  }

  function handleFinalizarWorkers() {
    if (saving) return;
    setSaving(true);
    workersModeEntries
      .filter((e) => e.checked)
      .forEach((e) => {
        const newAtt: Omit<Attendance, "id"> = {
          date: selectedDate,
          workerId: e.workerId,
          workSiteId: e.workSiteId,
          hoursWorked: e.hoursWorked,
          extraHours: e.extraHours,
          notes: e.notes || undefined,
        };
        if (!isDuplicateAttendance(newAtt)) {
          createAttendance(newAtt);
        }
      });
    setSaving(false);
    setStep("main");
  }

  // ── edit existing attendance ──
  function openEdit(a: Attendance) {
    setEditTarget(a);
    setEditForm({
      hoursWorked: a.hoursWorked,
      extraHours: a.extraHours,
      notes: a.notes ?? "",
      workSiteId: a.workSiteId,
    });
  }

  function handleSaveEdit() {
    if (!editTarget) return;
    updateAttendance({
      ...editTarget,
      hoursWorked: editForm.hoursWorked,
      extraHours: editForm.extraHours,
      notes: editForm.notes || undefined,
      workSiteId: editForm.workSiteId,
    });
    setEditTarget(null);
  }

  const editWorker = editTarget ? workerMap.get(editTarget.workerId) : undefined;
  const editPreview =
    editWorker
      ? calculateDayPayment(editForm.hoursWorked, editForm.extraHours, editWorker.dailySalary, config)
      : null;

  // ====================================================================
  // RENDERS
  // ====================================================================

  // ── Obras mode ──────────────────────────────────────────────────────
  if (step === "obras") {
    const checkedCount = obrasSites.reduce(
      (acc, s) => acc + s.workers.filter((w) => w.checked).length,
      0
    );

    return (
      <>
        <div className="pb-24">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
              ← Volver
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Agregar según obras</h1>
              <p className="text-sm text-slate-500 capitalize">{formatDayDisplay(selectedDate)}</p>
            </div>
          </div>

          {activeWorkers.length === 0 ? (
            <Card>
              <EmptyState title="Sin trabajadores activos" description="Activa trabajadores para registrar asistencias." />
            </Card>
          ) : (
            <div className="space-y-3">
              {obrasSites.map((site, siteIdx) => {
                const siteName =
                  site.siteId === OTRO_SITE_ID ? "Otro" : (workSiteMap.get(site.siteId) ?? "Obra");
                const checkedInSite = site.workers.filter((w) => w.checked).length;

                return (
                  <Card key={site.siteId} className="p-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSite(siteIdx)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            checkedInSite > 0
                              ? "bg-green-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {checkedInSite > 0 ? checkedInSite : "·"}
                        </span>
                        <span className="font-semibold text-slate-900">{siteName}</span>
                        {checkedInSite > 0 && (
                          <span className="text-xs text-slate-500">
                            {checkedInSite} trabajador{checkedInSite > 1 ? "es" : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400">{site.open ? "▲" : "▼"}</span>
                    </button>

                    {site.open && (
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                        {site.workers.map((entry) => {
                          const w = workerMap.get(entry.workerId);
                          if (!w) return null;
                          return (
                            <ObrasWorkerRow
                              key={entry.workerId}
                              entry={entry}
                              worker={w}
                              config={config}
                              onChange={(u) => updateObrasWorker(siteIdx, entry.workerId, u)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:left-64">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              {checkedCount} seleccionado{checkedCount !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack}>Cancelar</Button>
              <Button
                onClick={() => setStep("obras-summary")}
                disabled={checkedCount === 0}
              >
                Finalizar →
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Obras summary ────────────────────────────────────────────────────
  if (step === "obras-summary") {
    return (
      <>
        <PageHeader
          title="Resumen del día"
          description={formatDayDisplay(selectedDate)}
        />

        <div className="space-y-4">
          {/* Attended */}
          <Card>
            <CardHeader
              title="Trabajadores seleccionados"
              description={`${summaryRows.length} entrada${summaryRows.length !== 1 ? "s" : ""}`}
            />
            {summaryRows.length === 0 ? (
              <p className="text-sm text-slate-500">Ningún trabajador seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trabajador</th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Obra</th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Horas</th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">H. extra</th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row, i) => {
                      const w = workerMap.get(row.workerId);
                      if (!w) return null;
                      const pay = calculateDayPayment(row.hoursWorked, row.extraHours, w.dailySalary, config);
                      return (
                        <tr key={i}>
                          <td className="border-b border-slate-100 px-3 py-2.5 font-medium text-slate-900">
                            {w.firstName} {w.lastName}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2.5 text-slate-700">
                            {getSiteName(row.siteId, workSiteMap)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2.5 text-right">{row.hoursWorked}</td>
                          <td className="border-b border-slate-100 px-3 py-2.5 text-right">{row.extraHours}</td>
                          <td className="border-b border-slate-100 px-3 py-2.5 text-right font-semibold text-green-700">
                            {formatCurrency(pay.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Not attended */}
          {notAttended.length > 0 && (
            <Card>
              <CardHeader
                title="No asistieron"
                description="Trabajadores activos sin asistencia registrada este día."
              />
              <ul className="space-y-1">
                {notAttended.map((w) => (
                  <li key={w.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-red-400">❌</span>
                    {w.firstName} {w.lastName}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex justify-end gap-2 pb-4">
            <Button variant="secondary" onClick={() => setStep("obras")}>
              ← Editar
            </Button>
            <Button onClick={handleConfirmObras} disabled={summaryRows.length === 0 || saving}>
              {saving ? "Guardando…" : "Confirmar y guardar"}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ── Workers mode ─────────────────────────────────────────────────────
  if (step === "workers") {
    const selectedCount = workersModeEntries.filter((e) => e.checked).length;

    return (
      <>
        <div className="pb-24">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
              ← Volver
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Agregar según trabajadores</h1>
              <p className="text-sm text-slate-500 capitalize">{formatDayDisplay(selectedDate)}</p>
            </div>
          </div>

          {activeWorkers.length === 0 ? (
            <Card>
              <EmptyState title="Sin trabajadores activos" description="Activa trabajadores para registrar asistencias." />
            </Card>
          ) : (
            <div className="space-y-2">
              {workersModeEntries.map((entry) => {
                const w = workerMap.get(entry.workerId);
                if (!w) return null;
                return (
                  <WorkerModeRow
                    key={entry.workerId}
                    entry={entry}
                    worker={w}
                    siteOptions={activeWorkSites}
                    config={config}
                    onChange={(u) => updateWorkerEntry(entry.workerId, u)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:left-64">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack}>Cancelar</Button>
              <Button
                onClick={handleFinalizarWorkers}
                disabled={selectedCount === 0 || saving}
              >
                {saving ? "Guardando…" : "Finalizar y guardar"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Rellenar días"
        description="Registra horas trabajadas y horas extra por día y obra."
      />

      {/* Date navigation */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => dateAddDays(d, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            title="Día anterior"
          >
            ‹
          </button>

          <div className="flex-1 text-center">
            <p className="text-xs text-slate-500 capitalize">
              {monthName(Number(selectedDate.slice(5, 7)))} {selectedDate.slice(0, 4)}
            </p>
            <p className="font-semibold text-slate-900 capitalize">
              {formatDayDisplay(selectedDate).split(",")[0]}
              {", "}
              {Number(selectedDate.slice(8, 10))}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((d) => dateAddDays(d, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            title="Día siguiente"
          >
            ›
          </button>

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />

          {canWrite && (
            <Button onClick={() => setPickOpen(true)}>+ Agregar día</Button>
          )}
        </div>
      </Card>

      {/* Attendance list */}
      <Card>
        <CardHeader
          title={`Asistencias del ${formatDate(selectedDate)}`}
          description="Cada fila es una asistencia. Un trabajador puede aparecer en varias obras el mismo día."
        />

        {dayAttendances.length === 0 ? (
          <EmptyState
            title="Sin asistencias este día"
            description={canWrite ? 'Pulsa "+ Agregar día" para registrar asistencias.' : "No hay asistencias registradas para este día."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Obra</th>
                  <th className="text-right">Horas</th>
                  <th className="text-right">H. extra</th>
                  <th className="text-right">Total</th>
                  <th>Notas</th>
                  {(canWrite || canDelete) && <th className="text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {dayAttendances.map((a) => {
                  const w = workerMap.get(a.workerId);
                  if (!w) return null;
                  const p = calculateDayPayment(a.hoursWorked, a.extraHours, w.dailySalary, config);
                  return (
                    <tr key={a.id}>
                      <td className="font-medium">
                        {w.firstName} {w.lastName}
                      </td>
                      <td>{getSiteName(a.workSiteId, workSiteMap)}</td>
                      <td className="text-right">{a.hoursWorked}</td>
                      <td className="text-right">{a.extraHours}</td>
                      <td className="text-right font-semibold">{formatCurrency(p.total)}</td>
                      <td className="max-w-xs text-xs text-slate-500">{a.notes ?? "—"}</td>
                      {(canWrite || canDelete) && (
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            {canWrite && (
                              <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                                Editar
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="danger" size="sm" onClick={() => setDeleteTarget(a)}>
                                Borrar
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc" }} className="font-semibold">
                  <td colSpan={2}>TOTALES DEL DÍA</td>
                  <td className="text-right">{dayTotals.hours}</td>
                  <td className="text-right">{dayTotals.extra}</td>
                  <td className="text-right">{formatCurrency(dayTotals.total)}</td>
                  <td colSpan={(canWrite || canDelete) ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Pick mode modal */}
      <Modal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="Agregar día"
        description={formatDayDisplay(selectedDate)}
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={enterObrasMode}
            className="flex flex-col items-start rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-900">Agregar según obras</span>
            <span className="mt-0.5 text-sm text-slate-500">
              Ver obras y asignar trabajadores a cada una
            </span>
          </button>
          <button
            type="button"
            onClick={enterWorkersMode}
            className="flex flex-col items-start rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-900">Agregar según trabajadores</span>
            <span className="mt-0.5 text-sm text-slate-500">
              Ver trabajadores y asignar obra a cada uno
            </span>
          </button>
        </div>
      </Modal>

      {/* Edit existing attendance */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar asistencia"
        description={
          editTarget
            ? `${editWorker?.firstName ?? ""} ${editWorker?.lastName ?? ""} · ${formatDate(editTarget.date)}`
            : ""
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar cambios</Button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Obra</label>
                <select
                  value={editForm.workSiteId}
                  onChange={(e) => setEditForm({ ...editForm, workSiteId: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {activeWorkSites.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                  <option value={OTRO_SITE_ID}>Otro</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Horas trabajadas</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.hoursWorked}
                    onChange={(e) => setEditForm({ ...editForm, hoursWorked: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Horas extra</label>
                  <ExtraHoursControl
                    value={editForm.extraHours}
                    onChange={(v) => setEditForm({ ...editForm, extraHours: v })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Observaciones</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            {editPreview && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Pago día</p>
                    <p className="font-semibold">{formatCurrency(editPreview.dailyPay)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pago extra</p>
                    <p className="font-semibold">{formatCurrency(editPreview.extraPay)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-bold text-slate-900">{formatCurrency(editPreview.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteAttendance(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Eliminar asistencia"
        description="¿Seguro que quieres eliminar esta asistencia? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}

