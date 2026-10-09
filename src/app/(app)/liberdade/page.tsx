import type { Metadata } from "next";
import { GoalLoader } from "@/components/goal-loader";
import { requireSessionForPage } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { vaultRepo } from "@/lib/db/repos/vault";

export const metadata: Metadata = { title: "Ápice" };

export default async function FreedomPage() {
  const { userId } = await requireSessionForPage();
  // Sealed rows only: the browser opens them (and sends a missing birth date to /data-nascimento).
  const [savedDto, birthDateCt] = await Promise.all([
    goalsRepo.getSealed(userId),
    vaultRepo.getBirthDateSealed(userId),
  ]);

  return <GoalLoader savedDto={savedDto} birthDateCt={birthDateCt} nowIso={new Date().toISOString()} />;
}
