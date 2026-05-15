"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useData } from "@/components/data/DataProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { DocumentType, PaymentMethod, Worker } from "@/types";

type FormState = Omit<Worker, "id" | "salaryHistory">;

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  documentType: "DNI",
  documentNumber: "",
  email: "",
  phone: "",
  birthYear: undefined,
  jobPositionId: "",
  paymentMethod: "banco",
  iban: "",
  dailySalary: 0,
  bankAmount: undefined,
  active: true,
  notes: "",
};

export default function TrabajadoresPage() {
  const { can } = useAuth();
  const {
    workers,
    jobPositions,
    createWorker,
    updateWorker,
    deleteWorker,
  } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Worker | null>(null);

  const canWrite = can("workers.write");
  const canDelete = can("workers.delete");

  const jobMap = new Map(jobPositions.map((j) => [j.id, j.name]));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, jobPositionId: jobPositions[0]?.id ?? "" });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (worker: Worker) => {
    setEditing(worker);
    const { id, salaryHistory, ...rest } = worker;
    void id;
    void salaryHistory;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Obligatorio";
    if (!form.lastName.trim()) e.lastName = "Obligatorio";
    if (!form.documentNumber.trim()) e.documentNumber = "Obligatorio";
    if (!form.jobPositionId) e.jobPositionId = "Selecciona un puesto";
    if (form.dailySalary <= 0) e.dailySalary = "Debe ser mayor que 0";
    if (form.paymentMethod === "banco" && !form.iban?.trim()) {
      e.iban = "Obligatorio para pago por banco";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editing) {
      updateWorker({ ...editing, ...form });
    } else {
      createWorker(form);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) deleteWorker(deleteTarget.id);
  };

  return (
    <>
      <PageHeader
        title="Trabajadores"
        description={`${workers.length} registrados · ${workers.filter((w) => w.active).length} activos`}
        action={
          canWrite && (
            <Button onClick={openCreate}>+ Nuevo trabajador</Button>
          )
        }
      />

      <Card>
        {workers.length === 0 ? (
          <EmptyState
            title="Aún no hay trabajadores"
            description="Empieza dando de alta el primer trabajador para poder registrar asistencias."
            action={canWrite && <Button onClick={openCreate}>+ Nuevo trabajador</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Puesto</th>
                  <th>Pago</th>
                  <th className="text-right">Salario diario</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <p className="font-medium">
                        {w.firstName} {w.lastName}
                      </p>
                      {w.phone && <p className="text-xs text-slate-500">{w.phone}</p>}
                    </td>
                    <td>
                      <p className="text-xs uppercase text-slate-500">{w.documentType}</p>
                      <p>{w.documentNumber}</p>
                    </td>
                    <td>{jobMap.get(w.jobPositionId) ?? "—"}</td>
                    <td className="capitalize">
                      {w.paymentMethod}
                      {w.paymentMethod === "banco" && w.bankAmount != null && (
                        <p className="text-xs text-slate-500">{formatCurrency(w.bankAmount)}/mes</p>
                      )}
                    </td>
                    <td className="text-right font-medium">{formatCurrency(w.dailySalary)}</td>
                    <td>
                      <Badge tone={w.active ? "green" : "neutral"}>
                        {w.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setHistoryTarget(w)}>
                          Histórico
                        </Button>
                        {canWrite && (
                          <Button variant="secondary" size="sm" onClick={() => openEdit(w)}>
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(w)}>
                            Borrar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de creación / edición */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar trabajador" : "Nuevo trabajador"}
        description="Los campos marcados son obligatorios."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="worker-form">
              {editing ? "Guardar cambios" : "Crear trabajador"}
            </Button>
          </>
        }
      >
        <form id="worker-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre *"
            name="firstName"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            error={errors.firstName}
          />
          <Input
            label="Apellidos *"
            name="lastName"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            error={errors.lastName}
          />

          <Select
            label="Tipo de documento *"
            name="documentType"
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value as DocumentType })}
          >
            <option value="DNI">DNI</option>
            <option value="NIE">NIE</option>
            <option value="Pasaporte">Pasaporte</option>
            <option value="CIF">CIF</option>
            <option value="Otro">Otro</option>
          </Select>
          <Input
            label="Número de documento *"
            name="documentNumber"
            value={form.documentNumber}
            onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
            error={errors.documentNumber}
          />

          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Teléfono"
            name="phone"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <Input
            label="Año de nacimiento"
            type="number"
            name="birthYear"
            min="1900"
            max="2030"
            value={form.birthYear ?? ""}
            onChange={(e) => setForm({ ...form, birthYear: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Select
            label="Puesto de trabajo *"
            name="jobPositionId"
            value={form.jobPositionId}
            onChange={(e) => setForm({ ...form, jobPositionId: e.target.value })}
            error={errors.jobPositionId}
          >
            <option value="">— Selecciona —</option>
            {jobPositions.filter((j) => j.active).map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </Select>

          <Select
            label="Forma de pago *"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
          >
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo</option>
          </Select>
          <Input
            label="Salario diario (€) *"
            type="number"
            name="dailySalary"
            step="0.01"
            min="0"
            value={form.dailySalary}
            onChange={(e) => setForm({ ...form, dailySalary: Number(e.target.value) })}
            error={errors.dailySalary}
            hint="Al modificar este valor se guardará en el histórico."
          />

          {form.paymentMethod === "banco" && (
            <>
              <Input
                label="IBAN *"
                name="iban"
                value={form.iban ?? ""}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                error={errors.iban}
              />
              <Input
                label="Importe mensual por banco (€)"
                type="number"
                name="bankAmount"
                step="0.01"
                min="0"
                value={form.bankAmount ?? ""}
                onChange={(e) => setForm({ ...form, bankAmount: e.target.value ? Number(e.target.value) : undefined })}
                hint="Si el total generado supera este importe, la diferencia se paga en efectivo."
              />
            </>
          )}

          <div className="sm:col-span-2">
            <Textarea
              label="Observaciones"
              name="notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Trabajador activo
          </label>
        </form>
      </Modal>

      {/* Histórico de salarios */}
      <Modal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title={`Histórico salarial · ${historyTarget?.firstName ?? ""} ${historyTarget?.lastName ?? ""}`}
        size="sm"
      >
        {historyTarget && historyTarget.salaryHistory.length > 0 ? (
          <table className="table-base">
            <thead>
              <tr>
                <th>Fecha</th>
                <th className="text-right">Salario diario</th>
              </tr>
            </thead>
            <tbody>
              {[...historyTarget.salaryHistory].reverse().map((entry, i) => (
                <tr key={`${entry.date}-${i}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td className="text-right font-medium">{formatCurrency(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No hay registros históricos.</p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar trabajador"
        description={`¿Seguro que quieres eliminar a ${deleteTarget?.firstName ?? ""} ${deleteTarget?.lastName ?? ""}? Esta acción no se puede deshacer y borrará sus asistencias y registros.`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
