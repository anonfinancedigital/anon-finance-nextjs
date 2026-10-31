import type { Metadata } from "next";
import { BroadcastForm } from "@/components/broadcast-form";
import { PageHeader } from "@/components/page-header";
import { UserAdminList } from "@/components/user-admin-list";
import { requireAdminForPage } from "@/lib/auth-guard";
import { usersRepo } from "@/lib/db/repos/users";

export const metadata: Metadata = { title: "Cadastros" };

export default async function RegistrationsPage() {
  await requireAdminForPage();
  // The guard only lets the ADMIN_EMAIL account through, so the variable is set here.
  const users = await usersRepo.listForAdmin(process.env.ADMIN_EMAIL ?? "");

  return (
    <div className="space-y-4">
      <PageHeader title="Cadastros" />
      <UserAdminList users={users} />
      <BroadcastForm />
    </div>
  );
}
