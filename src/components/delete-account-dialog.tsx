"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { deleteAccountAction } from "@/actions/account";
import { getVaultAction } from "@/actions/vault";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SAVE_FAILED } from "@/lib/action-result";
import { deviceKey } from "@/lib/vault/device-store";

/**
 * "Excluir minha conta" (SIGILO-38 to 40): the password only derives the login secret here in the
 * browser; the server checks that secret, so the real password is never sent. "Senha incorreta" and
 * the administrator refusal stay on screen. On success the DEK leaves this device before `/login`.
 */
export function DeleteAccountDialog() {
  const router = useRouter();
  const passwordId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    try {
      const vault = await getVaultAction();
      if (!vault.ok) {
        setError(vault.error);
        return;
      }
      const { salt, memKib, iterations, parallelism } = vault.vault;
      // Loaded on demand: Argon2id (@noble/hashes) stays out of the app bundle.
      const { deriveLoginSecret } = await import("@/lib/vault/unlock-vault");
      const authSecret = await deriveLoginSecret(password, { m: memKib, t: iterations, p: parallelism }, salt);
      const result = await deleteAccountAction(authSecret);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await deviceKey.clear();
      // The session is already gone on the server.
      router.replace("/login");
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash2Icon aria-hidden />
          Excluir minha conta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Excluir minha conta?</DialogTitle>
            <DialogDescription>
              Todos os seus dados, a sua chave e as suas sessões serão apagados. Não há como desfazer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor={passwordId}>Senha</Label>
            <PasswordInput
              id={passwordId}
              name="password"
              autoComplete="current-password"
              required
              aria-invalid={error !== null}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Excluindo..." : "Excluir conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
