"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useData } from "@/components/data/DataProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import type { JobPosition } from "@/types";

type FormState = Omit<JobPosition, "id">;

const emptyForm: FormState = {
  name: "",
  location: "",
  mapsUrl: "",
  active: true,
};

export default function PuestosPage() {
  const { can } = useAuth();
  const { jobPositions, workers, createJobPosition, updateJobPosition, deleteJobPosition } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobPosition | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<JobPosition | null>(null);

  const canWrite = can("jobpositions.write");
  const canDelete = can("jobpositions.delete");

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (j: JobPosition) => {
    setEditing(j);
    const { id, ...rest } = j;
    void id;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatorio";
    if (!form.location.trim()) e.location = "Obligatorio";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editing) {
      updateJobPosition({ ...editing, ...form });
    } else {
      createJobPosition(form);
    }
    setModalOpen(false);
  };

  const isInUse = (id: string) => workers.some((w) => w.jobPositionId === id);

  return (
    <>
      <PageHeader
        title="Puestos de trabajo"
        description={`${jobPositions.length} puestos definidos`}
        action={canWrite && <Button onClick={openCreate}>+ Nuevo puesto</Button>}
      />

      <Card>
        {jobPositions.length === 0 ? (
          <EmptyState
            title="Sin puestos definidos"
            description="Crea al menos un puesto para poder asignarlo a los trabajadores."
            action={canWrite && <Button onClick={openCreate}>+ Nuevo puesto</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ubicación</th>
                  <th>Maps</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jobPositions.map((j) => (
                  <tr key={j.id}>
                    <td className="font-medium">{j.name}</td>
                    <td>{j.location}</td>
                    <td>
                      {j.mapsUrl ? (
                        <a
                          href={j.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 underline"
                        >
                          Ver mapa
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Badge tone={j.active ? "green" : "neutral"}>
                        {j.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {canWrite && (
                          <Button variant="secondary" size="sm" onClick={() => openEdit(j)}>
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget(j)}
                            disabled={isInUse(j.id)}
                            title={isInUse(j.id) ? "Hay trabajadores con este puesto" : ""}
                          >
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar puesto" : "Nuevo puesto"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="job-form">
              {editing ? "Guardar cambios" : "Crear puesto"}
            </Button>
          </>
        }
      >
        <form id="job-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del puesto *"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input
            label="Ubicación *"
            name="location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            error={errors.location}
          />
          <Input
            label="Enlace a Google Maps"
            name="mapsUrl"
            type="url"
            placeholder="https://maps.google.com/..."
            value={form.mapsUrl ?? ""}
            onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Puesto activo
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteJobPosition(deleteTarget.id)}
        title="Eliminar puesto"
        description={`¿Seguro que quieres eliminar el puesto "${deleteTarget?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
