"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberListItem } from "@/features/members/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, Copy, Plus, Search } from "lucide-react";

function statusBadge(status: string) {
  return status === "ACTIVE" ? (
    <Badge variant="default">Activo</Badge>
  ) : (
    <Badge variant="secondary">Inactivo</Badge>
  );
}

function subBadge(sub: MemberListItem["subscription"]) {
  if (!sub) return <span className="text-muted-foreground text-sm">Sin plan</span>;
  const variant = sub.status === "ACTIVE" ? "default" : sub.status === "PAST_DUE" ? "destructive" : "secondary";
  return <Badge variant={variant}>{sub.planName}</Badge>;
}

export default function MembersTable({
  initialMembers,
}: {
  initialMembers: MemberListItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = initialMembers.filter(
    (m) =>
      (m.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/tenant/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al agregar miembro");
        return;
      }
      if (data.data?.tempPassword) {
        setCreatedPassword(data.data.tempPassword);
      } else {
        setDialogOpen(false);
        setNewEmail("");
        setNewName("");
      }
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setCreatedPassword(null);
    setCopied(false);
    setNewEmail("");
    setNewName("");
    setError("");
  }

  async function handleCopyPassword() {
    if (!createdPassword) return;
    await navigator.clipboard.writeText(createdPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar miembro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Agregar miembro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{createdPassword ? "Miembro agregado" : "Agregar miembro"}</DialogTitle>
            </DialogHeader>
            {createdPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Comparte esta contraseña temporal al miembro para que pueda iniciar sesión.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
                    {createdPassword}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <Button onClick={handleCloseDialog} className="w-full">
                  Listo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <Label>Correo</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="juan@email.com"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleAdd} disabled={adding || !newEmail || !newName} className="w-full">
                  {adding ? "Agregando..." : "Agregar"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No se encontraron miembros
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/members/${m.id}`)}
                >
                  <TableCell className="font-medium">{m.name ?? "—"}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{subBadge(m.subscription)}</TableCell>
                  <TableCell>
                    {m.subscription
                      ? new Date(m.subscription.billingEndsAt).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  <TableCell>{statusBadge(m.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
