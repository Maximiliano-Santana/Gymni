"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantRole } from "@prisma/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Copy, Plus, Trash2 } from "lucide-react";

type StaffMember = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  roles: string[];
  status: string;
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  STAFF: "outline",
};

export default function StaffTable({
  initialStaff,
  userRoles,
  tenantId,
}: {
  initialStaff: StaffMember[];
  userRoles: TenantRole[];
  tenantId: string;
}) {
  const router = useRouter();
  const isOwner = userRoles.includes("OWNER");

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("STAFF");
  const [inviting, setInviting] = useState(false);

  // Edit roles dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setError("");
    setInviteLink("");
    setInviting(true);
    try {
      const res = await fetch("/api/auth/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, tenantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al invitar");
        return;
      }
      // If user already existed, they were added directly — no link needed
      if (data.invitation?.id) {
        const link = `${window.location.origin}/register?invitation=${data.invitation.id}`;
        setInviteLink(link);
      } else {
        // User already existed and was added directly
        setInviteOpen(false);
        setInviteEmail("");
        router.refresh();
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCloseInvite() {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteLink("");
    setCopied(false);
    if (inviteLink) router.refresh();
  }

  async function handleEditRoles() {
    if (!editTarget) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { tenantUserId: editTarget.id, roles: editRole ? [editRole] : [] },
        ]),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Error al actualizar");
        return;
      }
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(staffId: string) {
    const res = await fetch("/api/tenant/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([staffId]),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) handleCloseInvite(); else setInviteOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Invitar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar al staff</DialogTitle>
            </DialogHeader>
            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Invitación creada. Envía este link a <span className="font-medium text-foreground">{inviteEmail}</span> para que se registre:
                </p>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                {copied && <p className="text-xs text-muted-foreground">Copiado al portapapeles</p>}
                <Button onClick={handleCloseInvite} variant="outline" className="w-full">
                  Cerrar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Correo</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@email.com"
                  />
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      {isOwner && <SelectItem value="OWNER">Owner</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="w-full">
                  {inviting ? "Invitando..." : "Enviar invitación"}
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
              <TableHead>Roles</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay miembros del staff
                </TableCell>
              </TableRow>
            ) : (
              initialStaff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name ?? "—"}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.roles
                        .filter((r) => r !== "MEMBER")
                        .map((r) => (
                          <Badge key={r} variant={ROLE_COLORS[r] ?? "outline"}>
                            {r}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isOwner && !s.roles.includes("OWNER") && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditTarget(s);
                              setEditRole(s.roles.find((r) => r !== "MEMBER") ?? "STAFF");
                              setEditOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemove(s.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Roles Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar rol de {editTarget?.name ?? editTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleEditRoles} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
