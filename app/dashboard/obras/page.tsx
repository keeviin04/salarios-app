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
import type { WorkSite, WorkSiteStatus } from "@/types";

type FormState = Omit<WorkSite, "id">;

const statusOptions: { value: WorkSiteStatus; label: string; tone: "neutral" | "green" | "yellow" | "blue" }[] = [
  { value: "no_iniciada", label: "No iniciada", tone: "neutral" },
  { value: "activa", label: "Activa", tone: "green" },
  { value: "en_pausa", label: "En pausa", tone: "yellow" },
  { value: "finalizada", label: "Finalizada", tone: "blue" },
];

const emptyForm: FormState = {
  name: "",
  status: "no_iniciada",
  clientId: "",
  startDate: "",
  estimatedEndDate: "",
  budget: undefined,
  mapsUrl: "",
  notes: "",
};

export default function ObrasPage() {
  const { can } = useAuth();
  const { workSites, clients, attendances, createWorkSite, updateWorkSite, deleteWorkSite } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSite | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<WorkSite | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | WorkSiteStatus>("all");

  const canWrite = can("worksites.write");
  const canDelete = can("worksites.delete");

  const clientMap = new Map(clients.map((c) => [c.id, c.businessName]));

  const filtered = workSites.filter((ws) => statusFilter === "all" || ws.status === statusFilter);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, clientId: clients[0]?.id ?? "" });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (ws: WorkSite) => {
    setEditing(ws);
    const { id, ...rest } = ws;
    void id;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatorio";
    if (!form.clientId) e.clientId = "Selecciona un cliente";
    if (form.startDate && form.estimatedEndDate && form.startDate > form.estimatedEndDate) {
      e.estimatedEndDate = "Debe ser posterior a la fecha de inicio";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editing) {
      updateWorkSite({ ...editing, ...form });
    } else {
      createWorkSite(form);
    }
    setModalOpen(false);
  };

  const attendancesByWorksite = (id: string) => attendances.filter((a) => a.workSiteId === id).length;

  return (
    <>
      <PageHeader
        title="Obras"
        description={`${workSites.length} obras registradas`}
        action={canWrite && <Button onClick={openCreate}>+ Nueva obra</Button>}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Filtrar:</span>
          {(["all", ...statusOptions.map((s) => s.value)] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {status === "all" ? "Todas" : statusOptions.find((s) => s.value === status)?.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Sin obras"
            description={statusFilter === "all" ? "Crea la primera obra para empezar." : "No hay obras con este estado."}
            action={canWrite && statusFilter === "all" && <Button onClick={openCreate}>+ Nueva obra</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Obra</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Fin estimado</th>
                  <th className="text-right">Presupuesto</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ws) => {
                  const status = statusOptions.find((s) => s.value === ws.status)!;
                  return (
                    <tr key={ws.id}>
                      <td>
                        <p className="font-medium">{ws.name}</p>
                        {ws.notes && <p className="text-xs text-slate-500">{ws.notes}</p>}
                        {ws.mapsUrl && (
                          <a
                            href={ws.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-700 underline"
                          >
                            Ver mapa
                          </a>
                        )}
                      </td>
                      <td>{clientMap.get(ws.clientId) ?? "—"}</td>
                      <td>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td>{ws.startDate ? formatDate(ws.startDate) : "—"}</td>
                      <td>{ws.estimatedEndDate ? formatDate(ws.estimatedEndDate) : "—"}</td>
                      <td className="text-right font-medium">
                        {ws.budget != null ? formatCurrency(ws.budget) : "—"}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <Button variant="secondary" size="sm" onClick={() => openEdit(ws)}>
                              Editar
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteTarget(ws)}
                              disabled={attendancesByWorksite(ws.id) > 0}
                              title={
                                attendancesByWorksite(ws.id) > 0
                                  ? "Hay asistencias asociadas"
                                  : ""
                              }
                            >
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar obra" : "Nueva obra"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="worksite-form">
              {editing ? "Guardar cambios" : "Crear obra"}
            </Button>
          </>
        }
      >
        <form id="worksite-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Calle o nombre de la obra *"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
          </div>

          <Select
            label="Estado *"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as WorkSiteStatus })}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Select
            label="Cliente asociado *"
            name="clientId"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            error={errors.clientId}
          >
            <option value="">— Selecciona —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.businessName}</option>
            ))}
          </Select>

          <Input
            label="Fecha de inicio"
            type="date"
            name="startDate"
            value={form.startDate ?? ""}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Input
            label="Fecha estimada de fin"
            type="date"
            name="estimatedEndDate"
            value={form.estimatedEndDate ?? ""}
            onChange={(e) => setForm({ ...form, estimatedEndDate: e.target.value })}
            error={errors.estimatedEndDate}
          />

          <Input
            label="Presupuesto total (€)"
            type="number"
            name="budget"
            step="0.01"
            min="0"
            value={form.budget ?? ""}
            onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Input
            label="Ubicación Google Maps"
            type="url"
            name="mapsUrl"
            placeholder="https://maps.google.com/..."
            value={form.mapsUrl ?? ""}
            onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
          />

          <div className="sm:col-span-2">
            <Textarea
              label="Observaciones"
              name="notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteWorkSite(deleteTarget.id)}
        title="Eliminar obra"
        description={`¿Seguro que quieres eliminar la obra "${deleteTarget?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
