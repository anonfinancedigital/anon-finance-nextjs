import { requireSessionForPage } from "@/lib/auth-guard";

export default async function SummaryPage() {
  await requireSessionForPage();
  return <h1 className="text-2xl font-semibold">Resumo</h1>;
}
