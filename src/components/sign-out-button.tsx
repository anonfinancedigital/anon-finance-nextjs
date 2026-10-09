"use client";

import { LogOutIcon } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { deviceKey } from "@/lib/vault/device-store";

/** "Sair": removes the DEK from this device before ending the session (SIGILO-16). */
export function SignOutButton() {
  async function signOut() {
    await deviceKey.clear();
    await signOutAction();
  }

  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" className="md:w-full md:justify-start">
        <LogOutIcon aria-hidden />
        Sair
      </Button>
    </form>
  );
}
