"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useData } from "@/components/data/DataProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, monthName, todayISO } from "@/utils/formatters";
import type { EconomicRecord, EconomicRecordType } from "@/types";

interface FormState {
  date: string;
  workerId: string;
  type: EconomicRecordType;
  amount: number;
  placeId: string;
  description: string;
}

const typeOptions: { value: EconomicRecordType; label: string; tone: "yellow" | "blue" | "green" }[] = [
  { value: "adelanto", label: "Adelanto", tone: "yellow" },
  { value: "pago_adelanto", label: "Pago de adelanto", tone: "blue" },
  { value: "sueldo", label: "Sueldo", tone: "green" },
];

const typeLabel = (t: EconomicRecordType) =>
  typeOptions.find((o) => o.value === t)?.label ?? t;

const typeTone = (t: EconomicRecordType) =>
  typeOptions.find((o) => o.value === t)?.tone ?? "neutral";

export default function RegistrosPage() {
  const { can } = useAuth();
  const {
    economicRecords,
    workers,
    paymentPlaces,
    createRecord,
    updateRecord,
    deleteRecord,
    createPlace,
    deletePlace,
  } = useData();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filterWorker, setFilterWorker] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | EconomicRecordType>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EconomicRecord | null>(null);
  const [form, setForm] = useState<FormState>({
    date: todayISO(),
    workerId: "",
    type: "adelanto",
    amount: 0,
    placeId: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<EconomicRecord | null>(null);

  // Modal de nuevo lugar
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [placeDeleteTarget, setPlaceDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const canWrite = can("records.write");
  const canDelete = can("records.delete");
  const canCreatePlace = can("places.create");
  const canDeletePlace = can("places.delete");

  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const placeMap = new Map(paymentPlaces.map((p) => [p.id, p.name]));

  const filtered = useMemo(() => {
    return economicRecords
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .filter((r) => filterWorker === "all" || r.workerId === filterWorker)
      .filter((r) => filterType === "all" || r.type === filterType)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [economicRecords, year, month, filterWorker, filterType]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          if (r.type === "adelanto") acc.advances += r.amount;
          if (r.type === "pago_adelanto") acc.advancePayments += r.amount;
          if (r.type === "sueldo") acc.salaries += r.amount;
          return acc;
        },
        { advances: 0, advancePayments: 0, salaries: 0 }
      ),
    [filtered]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      date: todayISO(),
      workerId: workers[0]?.id ?? "",
      type: "adelanto",
      amount: 0,
      placeId: paymentPlaces[0]?.id ?? "",
      description: "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (r: EconomicRecord) => {
    setEditing(r);
    setForm({
      date: r.date,
      workerId: r.workerId,
      type: r.type,
      amount: r.amount,
      placeId: r.placeId,
      description: r.description ?? "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.date) e.date = "Obligatorio";
    if (!form.workerId) e.workerId = "Selecciona un trabajador";
    if (form.amount <= 0) e.amount = "Debe ser mayor que 0";
    if (!form.placeId) e.placeId = "Selecciona un lugar";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      date: form.date,
      workerId: form.workerId,
      type: form.type,
      amount: Number(form.amount),
      placeId: form.placeId,
      description: form.description || undefined,
    };
    if (editing) {
      updateRecord({ ...editing, ...payload });
    } else {
      createRecord(payload);
    }
    setModalOpen(false);
  };

  const handleCreatePlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;
    createPlace({ name: newPlaceName.trim() });
    setNewPlaceName("");
    setPlaceModalOpen(false);
  };

  const placeInUse = (id: string) => economicRecords.some((r) => r.placeId === id);

  return (
    <>
      <PageHeader
        title="Registros económicos"
        description="Adelantos, pagos de adelanto y sueldos abonados."
        action={
          <>
            {canCreatePlace && (
              <Button variant="secondary" onClick={() => setPlaceModalOpen(true)}>
                Lugares de pago
              </Button>
            )}
            {canWrite && <Button onClick={openCreate}>+ Nuevo registro</Button>}
          </>
        }
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-yellow-700">Adelantos</p>
          <p className="mt-1 text-xl font-semibold text-yellow-900">{formatCurrency(totals.advances)}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-700">Pagos de adelanto</p>
          <p className="mt-1 text-xl font-semibold text-blue-900">{formatCurrency(totals.advancePayments)}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-green-700">Sueldos pagados</p>
          <p className="mt-1 text-xl font-semibold text-green-900">{formatCurrency(totals.salaries)}</p>
        </div>
      </section>

      <Card>
        <CardHeader
          title={`Movimientos de ${monthName(month)} ${year}`}
          description={`${filtered.length} registros encontrados`}
          action={
            <div className="flex flex-wrap gap-2">
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
              <Select value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)} className="w-auto">
                <option value="all">Todos los trabajadores</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                ))}
              </Select>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value as "all" | EconomicRecordType)} className="w-auto">
                <option value="all">Todos los tipos</option>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="Sin registros este mes"
            description="Añade un adelanto, un pago de adelanto o un sueldo abonado."
            action={canWrite && <Button onClick={openCreate}>+ Nuevo registro</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Trabajador</th>
                  <th>Tipo</th>
                  <th className="text-right">Cantidad</th>
                  <th>Lugar</th>
                  <th>Descripción</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const w = workerMap.get(r.workerId);
                  return (
                    <tr key={r.id}>
                      <td>{formatDate(r.date)}</td>
                      <td className="font-medium">
                        {w ? `${w.firstName} ${w.lastName}` : "—"}
                      </td>
                      <td>
                        <Badge tone={typeTone(r.type)}>{typeLabel(r.type)}</Badge>
                      </td>
                      <td className="text-right font-semibold">{formatCurrency(r.amount)}</td>
                      <td>{placeMap.get(r.placeId) ?? "—"}</td>
                      <td className="max-w-xs text-xs text-slate-500">{r.description ?? "—"}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>
                              Editar
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(r)}>
                              Borrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de registro */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar registro" : "Nuevo registro económico"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="record-form">
              {editing ? "Guardar cambios" : "Crear registro"}
            </Button>
          </>
        }
      >
        <form id="record-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Fecha *"
            type="date"
            name="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            error={errors.date}
          />
          <Select
            label="Trabajador *"
            name="workerId"
            value={form.workerId}
            onChange={(e) => setForm({ ...form, workerId: e.target.value })}
            error={errors.workerId}
          >
            <option value="">— Selecciona —</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
            ))}
          </Select>

          <Select
            label="Tipo de movimiento *"
            name="type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as EconomicRecordType })}
          >
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
          <Input
            label="Cantidad (€) *"
            type="number"
            name="amount"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            error={errors.amount}
          />

          <div className="sm:col-span-2">
            <Select
              label="Lugar de pago *"
              name="placeId"
              value={form.placeId}
              onChange={(e) => setForm({ ...form, placeId: e.target.value })}
              error={errors.placeId}
            >
              <option value="">— Selecciona —</option>
              {paymentPlaces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Textarea
              label="Descripción"
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Modal de lugares de pago */}
      <Modal
        open={placeModalOpen}
        onClose={() => setPlaceModalOpen(false)}
        title="Lugares de pago"
        description="Cualquier usuario puede crear lugares. Sólo el administrador puede eliminarlos."
        size="sm"
      >
        {canCreatePlace && (
          <form onSubmit={handleCreatePlace} className="mb-4 flex gap-2">
            <Input
              placeholder="Nombre del lugar"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
            />
            <Button type="submit" disabled={!newPlaceName.trim()}>Añadir</Button>
          </form>
        )}

        {paymentPlaces.length === 0 ? (
          <p className="text-sm text-slate-500">No hay lugares de pago.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {paymentPlaces.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{p.name}</span>
                {canDeletePlace && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlaceDeleteTarget(p)}
                    disabled={placeInUse(p.id)}
                    title={placeInUse(p.id) ? "Hay registros usando este lugar" : ""}
                  >
                    Eliminar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRecord(deleteTarget.id)}
        title="Eliminar registro"
        description="¿Seguro que quieres eliminar este registro económico?"
        confirmLabel="Eliminar"
        destructive
      />

      <ConfirmDialog
        open={!!placeDeleteTarget}
        onClose={() => setPlaceDeleteTarget(null)}
        onConfirm={() => placeDeleteTarget && deletePlace(placeDeleteTarget.id)}
        title="Eliminar lugar de pago"
        description={`¿Seguro que quieres eliminar "${placeDeleteTarget?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
