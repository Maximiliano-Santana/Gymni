"use client"

import { useState } from "react"

type Tenant = {
  id: number
  name: string
  domain: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [form, setForm] = useState<{ name?: string; domain?: string }>({})
  const [editingId, setEditingId] = useState<number | null>(null)

  // Helpers
  const resetForm = () => setForm({})

  const handleAdd = () => {
    if (!form.name || !form.domain) return
    const newTenant = {
      id: Date.now(),
      name: form.name,
      domain: form.domain,
    }
    setTenants((prev) => [...prev, newTenant])
    resetForm()
  }

  const handleUpdate = (id: number) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...form } : t))
    )
    setEditingId(null)
    resetForm()
  }

  const handleDelete = (id: number) => {
    setTenants((prev) => prev.filter((t) => t.id !== id))
  }

  const startEdit = (tenant: Tenant) => {
    setEditingId(tenant.id)
    setForm({ name: tenant.name, domain: tenant.domain })
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Tenants</h1>
      </header>

      {/* Formulario Agregar / Editar */}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className="rounded-md border p-2"
          placeholder="Nombre"
          value={form.name ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, name: e.target.value }))
          }
        />
        <input
          className="rounded-md border p-2"
          placeholder="Dominio"
          value={form.domain ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, domain: e.target.value }))
          }
        />

        {editingId ? (
          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-2"
              onClick={() => handleUpdate(editingId!)}
            >
              Guardar
            </button>
            <button
              className="rounded-md border px-3 py-2"
              onClick={() => {
                setEditingId(null)
                resetForm()
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            className="rounded-md border px-3 py-2"
            onClick={handleAdd}
          >
            Agregar tenant
          </button>
        )}
      </div>

      {/* Listado */}
      <ul className="divide-y rounded-md border">
        {tenants.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-4 p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{t.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {t.domain}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => startEdit(t)}
              >
                Editar
              </button>
              <button
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => handleDelete(t.id)}
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {tenants.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">
            No hay tenants. 
          </li>
        )}
      </ul>
    </section>
  )
}
