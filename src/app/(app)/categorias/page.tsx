import type { Metadata } from "next";
import { CategoryEditor } from "@/components/category-editor";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";

export const metadata: Metadata = { title: "Categorias · Orçamento" };

export default async function CategoriesPage() {
  const { userId } = await requireSessionForPage();
  const categories = await categoriesRepo.list(userId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Categorias</h1>
      <p className="text-sm text-muted-foreground">
        Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.
      </p>
      <CategoryEditor categories={categories} />
    </div>
  );
}
