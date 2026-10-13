"use client";

import { useState, useTransition } from "react";
import { deleteUser, reactivateUser, revokeUser } from "@/actions/admin-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-result";
import type { AdminUserRow } from "@/lib/db/repos/users";
import { availableActions, type UserAction, type UserStatus } from "@/lib/domain/user-status";

const STATUS: Record<UserStatus, { label: string; variant: "warning" | "success" | "destructive" | "secondary" }> = {
  pending: { label: "Pendente", variant: "warning" },
  approved: { label: "Aprovado", variant: "success" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  revoked: { label: "Revogado", variant: "secondary" },
};

const ACTION_LABEL: Record<UserAction | "delete", string> = {
  reactivate: "Reativar",
  revoke: "Revogar",
  delete: "Excluir",
};

const RUN: Record<UserAction, (id: string) => Promise<ActionResult>> = {
  reactivate: reactivateUser,
  revoke: revokeUser,
};

// Fixed time zone so the server and the browser render the same date.
const registeredAt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Registrations for the admin: status badge, the actions allowed for each status, and a confirmation before deleting. */
export function UserAdminList({ users }: { users: AdminUserRow[] }) {
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum cadastro</p>;
  }

  function run(action: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error);
      onDone?.();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Badge variant={STATUS[u.status].variant}>{STATUS[u.status].label}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">{registeredAt.format(u.createdAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {availableActions(u.status).map((action) =>
                    action === "delete" ? (
                      <Button
                        key={action}
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => setDeleting(u)}
                      >
                        {ACTION_LABEL[action]}
                      </Button>
                    ) : (
                      <Button
                        key={action}
                        variant={action === "reactivate" ? "default" : "outline"}
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => RUN[action](u.id))}
                      >
                        {ACTION_LABEL[action]}
                      </Button>
                    ),
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir cadastro</DialogTitle>
            <DialogDescription>
              {deleting &&
                `Excluir ${deleting.name}? Isso apaga todas as categorias, transações e o objetivo dessa pessoa. Não dá para desfazer`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (deleting) run(() => deleteUser(deleting.id), () => setDeleting(null));
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
