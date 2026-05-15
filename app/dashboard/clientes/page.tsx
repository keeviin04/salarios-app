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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Client, DocumentType } from "@/types";

type FormState = Omit<Client, "id">;

const emptyForm: FormState = {
  businessName: "",
  lastName: "",
  documentType: "CIF",
  documentNumber: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function ClientesPage() {
  const { can } = useAuth();
  const { clients, workSites, createClient, updateClient, deleteClient } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const canWrite = can("clients.write");
  const canDelete = can("clients.delete");

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    const { id, ...rest } = c;
    void id;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.businessName.trim()) e.businessName = "Obligatorio";
    if (!form.documentNumber.trim()) e.documentNumber = "Obligatorio";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editing) {
      updateClient({ ...editing, ...form });
    } else {
      createClient(form);
    }
    setModalOpen(false);
  };

  const workSitesByClient = (id: string) => workSites.filter((ws) => ws.clientId === id).length;

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes registrados`}
        action={canWrite && <Button onClick={openCreate}>+ Nuevo cliente</Button>}
      />

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description="Da de alta el primer cliente para empezar a registrar obras."
            action={canWrite && <Button onClick={openCreate}>+ Nuevo cliente</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th className="text-right">Obras</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">
                        {c.businessName}
                        {c.lastName ? ` ${c.lastName}` : ""}
                      </p>
                    </td>
                    <td>
                      <p className="text-xs uppercase text-slate-500">{c.documentType}</p>
                      <p>{c.documentNumber}</p>
                    </td>
                    <td>
                      {c.phone && <p className="text-sm">{c.phone}</p>}
                      {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                    </td>
                    <td className="max-w-xs text-sm text-slate-700">{c.address ?? "—"}</td>
                    <td className="text-right">{workSitesByClient(c.id)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {canWrite && (
                          <Button variant="secondary" size="sm" onClick={() => openEdit(c)}>
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget(c)}
                            disabled={workSitesByClient(c.id) > 0}
                            title={workSitesByClient(c.id) > 0 ? "Tiene obras asociadas" : ""}
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
        title={editing ? "Editar cliente" : "Nuevo cliente"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="client-form">
              {editing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre o razón social *"
            name="businessName"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            error={errors.businessName}
          />
          <Input
            label="Apellidos"
            name="lastName"
            value={form.lastName ?? ""}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />

          <Select
            label="Tipo de documento *"
            name="documentType"
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value as DocumentType })}
          >
            <option value="CIF">CIF</option>
            <option value="DNI">DNI</option>
            <option value="NIE">NIE</option>
            <option value="Pasaporte">Pasaporte</option>
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
            label="Teléfono"
            name="phone"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <div className="sm:col-span-2">
            <Input
              label="Dirección"
              name="address"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

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
        onConfirm={() => deleteTarget && deleteClient(deleteTarget.id)}
        title="Eliminar cliente"
        description={`¿Seguro que quieres eliminar a ${deleteTarget?.businessName ?? ""}?`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
