import { expect, type Page, test } from "@playwright/test";
import { chooseOption, login, resetDatabase, seedCategories, seedTransaction } from "./helpers";

test.beforeEach(resetDatabase);

const name = (page: Page, n: number) => page.getByLabel(`Nome da categoria ${n}`, { exact: true });
const percent = (page: Page, n: number) =>
  page.getByLabel(`Percentual da categoria ${n}`, { exact: true });

async function addCategories(page: Page, cats: [string, string][]) {
  for (const [i, [catName, catPercent]] of cats.entries()) {
    await page.getByRole("button", { name: /Adicionar (primeira )?categoria/ }).click();
    await name(page, i + 1).fill(catName);
    await percent(page, i + 1).fill(catPercent);
  }
}

const BUDGET: [string, string][] = [
  ["Custos fixos", "30"],
  ["Conforto", "30"],
  ["Metas", "10"],
  ["Prazeres", "10"],
  ["Liberdade financeira", "20"],
];

test("categories summing 100% are saved and listed after reload", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, BUDGET);

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();

  await page.reload();
  for (const [i, [catName, catPercent]] of BUDGET.entries()) {
    await expect(name(page, i + 1)).toHaveValue(catName);
    await expect(percent(page, i + 1)).toHaveValue(`${catPercent},00`);
  }
  await expect(name(page, BUDGET.length + 1)).toHaveCount(0);
});

test("a sum of 105% shows the sum message and disables saving", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, [...BUDGET, ["Extra", "5"]]);

  await expect(
    page.getByText("A soma deve ser 100%. Atual: 105,00%", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();
});

test("removing a category that has expenses is blocked with the expense count", async ({
  page,
}) => {
  const [moradia] = await seedCategories([
    { name: "Moradia", percent: 50 },
    { name: "Lazer", percent: 50 },
  ]);
  await seedTransaction({ kind: "expense", amountCents: 1000, date: "2026-09-10", categoryId: moradia.id });
  await seedTransaction({ kind: "expense", amountCents: 2000, date: "2026-09-11", categoryId: moradia.id });

  await login(page);
  await page.goto("/categorias");
  await page.getByRole("button", { name: "Remover categoria 1" }).click();
  await percent(page, 1).fill("100");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(
    page.getByText("Esta categoria tem 2 gastos e não pode ser excluída", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(name(page, 1)).toHaveValue("Moradia");
  await expect(name(page, 2)).toHaveValue("Lazer");
});

const income = (page: Page) => page.getByLabel("Receita Base Mensal", { exact: true });
/** Types the reference income, passing through "Editar base" when the card is shown instead of the field. */
async function setIncome(page: Page, text: string) {
  const edit = page.getByRole("button", { name: "Editar base", exact: true });
  if (await edit.isVisible()) await edit.click();
  await income(page).fill(text);
}
const amount = (page: Page, n: number) => page.getByTestId(`category-amount-${n}`);
const amountSum = (page: Page) => page.getByTestId("category-amount-sum");

const IMAGE_BUDGET = [
  { name: "Custos fixos", percent: 30 },
  { name: "Conforto", percent: 30 },
  { name: "Liberdade financeira", percent: 25 },
  { name: "Metas", percent: 7.5 },
  { name: "Conhecimento", percent: 2.5 },
  { name: "Prazeres", percent: 5 },
];

test("a reference income shows the amount of each category and their sum", async ({ page }) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");

  await expect(income(page)).toHaveValue("");
  for (const header of ["CATEGORIA", "ALOCAÇÃO (%)", "VALOR PREVISTO (R$)", "SUBCATEGORIAS", "AÇÕES"]) {
    await expect(page.getByText(header, { exact: true })).toBeVisible();
  }

  await setIncome(page, "5000");
  const expected = ["1.500,00", "1.500,00", "1.250,00", "375,00", "125,00", "250,00"];
  for (const [i, value] of expected.entries()) await expect(amount(page, i + 1)).toHaveValue(value);
  await expect(amountSum(page)).toHaveText("R$ 5.000,00");

  // Changing a percentage updates its amount and the sum without saving (sum ≠ 100% still shown).
  await percent(page, 4).fill("10");
  await expect(amount(page, 4)).toHaveValue("500,00");
  await expect(amountSum(page)).toHaveText("R$ 5.125,00");
  await expect(page.getByText("Categorias salvas", { exact: true })).toHaveCount(0);

  // Changing the income updates every amount.
  await setIncome(page, "1.000,00");
  await expect(amount(page, 1)).toHaveValue("300,00");
  await expect(amountSum(page)).toHaveText("R$ 1.025,00");
});

test("editing an amount adjusts the percent, and editing the percent adjusts the amount", async ({ page }) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");

  await expect(amount(page, 1)).toBeDisabled();
  await setIncome(page, "5000");

  await amount(page, 4).fill("500,00");
  await expect(percent(page, 4)).toHaveValue("10,00");
  await expect(amountSum(page)).toHaveText("R$ 5.125,00");

  await amount(page, 4).fill("333,33");
  await expect(percent(page, 4)).toHaveValue("6,67");
  await expect(amount(page, 4)).toHaveValue("333,33");

  await amount(page, 4).fill("0");
  await expect(percent(page, 4)).toHaveValue("6,67");
  await expect(page.getByText("O percentual deve estar entre 0,000001 e 100")).toBeVisible();

  await percent(page, 4).fill("12,5");
  await expect(amount(page, 4)).toHaveValue("625,00");
});

test("an empty reference income shows a dash in every amount cell and the sum", async ({ page }) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");

  await setIncome(page, "5000");
  await expect(amountSum(page)).toHaveText("R$ 5.000,00");
  await setIncome(page, "");
  for (let n = 1; n <= IMAGE_BUDGET.length; n++) await expect(amount(page, n)).toHaveValue("");
  await expect(amountSum(page)).toHaveText("—");
});

for (const [typed, message] of [
  ["abc", "Valor inválido. Use o formato 1.234,56"],
  ["0", "O valor deve ser maior que zero"],
  ["1.000.000.000,00", "O valor máximo é R$ 999.999.999,99"],
]) {
  test(`an invalid reference income "${typed}" shows the parse error and dashes`, async ({ page }) => {
    await seedCategories(IMAGE_BUDGET);
    await login(page);
    await page.goto("/categorias");

    await income(page).fill(typed);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    for (let n = 1; n <= IMAGE_BUDGET.length; n++) await expect(amount(page, n)).toHaveValue("");
    await expect(amountSum(page)).toHaveText("—");
  });
}

test("a row without a valid percentage shows a dash; removing a row recalculates the sum", async ({
  page,
}) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");
  await setIncome(page, "5000");

  await page.getByRole("button", { name: /Adicionar (primeira )?categoria/ }).click();
  await expect(amount(page, 7)).toHaveValue("");
  await percent(page, 7).fill("abc");
  await expect(amount(page, 7)).toHaveValue("");
  await expect(amountSum(page)).toHaveText("R$ 5.000,00");

  await page.getByRole("button", { name: "Remover categoria 1" }).click();
  await expect(amountSum(page)).toHaveText("R$ 3.500,00");
});

test("saving keeps the reference income, does not send it, and a reload clears it", async ({
  page,
}) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");
  await setIncome(page, "4321,09");

  const bodies: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) {
      bodies.push(request.postData() ?? "");
    }
  });

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toContain("Custos fixos");
  expect(bodies[0]).not.toContain("4321");

  await expect(page.getByText(/Base de cálculo mensal:\s*R\$\s*4\.321,09/)).toBeVisible();
  await expect(income(page)).toHaveCount(0);
  await expect(amount(page, 1)).toHaveValue("1.296,33");

  await page.reload();
  await expect(income(page)).toHaveValue("");
});

const PALETTE = ["Azul", "Laranja", "Verde", "Amarelo", "Rosa", "Verde-claro", "Roxo", "Vermelho"];
const colorButton = (page: Page, n: number) =>
  page.getByRole("button", { name: new RegExp(`^Cor da categoria ${n}:`) });
const colorOf = (page: Page, n: number) =>
  page.getByRole("radiogroup", { name: `Cor da categoria ${n}`, exact: true });
const openColors = (page: Page, n: number) => colorButton(page, n).click();
const pickColor = async (page: Page, n: number, color: string) => {
  await openColors(page, n);
  await colorOf(page, n).getByRole("radio", { name: color, exact: true }).click();
  await expect(colorOf(page, n)).toBeHidden();
};

test("each category row shows only its color; clicking it opens the 8 palette colors", async ({ page }) => {
  await seedCategories([
    { name: "Moradia", percent: 50 },
    { name: "Lazer", percent: 50 },
  ]);
  await login(page);
  await page.goto("/categorias");

  // Saved colors (seeded by position: 1 and 2) are shown, the palette is not.
  await expect(colorButton(page, 1)).toHaveAccessibleName("Cor da categoria 1: Azul");
  await expect(colorButton(page, 2)).toHaveAccessibleName("Cor da categoria 2: Laranja");
  await expect(page.getByRole("radio")).toHaveCount(0);

  for (const n of [1, 2]) {
    await openColors(page, n);
    const radios = colorOf(page, n).getByRole("radio");
    await expect(radios).toHaveCount(8);
    for (const [i, colorName] of PALETTE.entries()) {
      await expect(radios.nth(i)).toHaveAccessibleName(colorName);
    }
    await expect(colorOf(page, n).getByRole("radio", { checked: true })).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(colorOf(page, n)).toBeHidden();
  }
});

test("a color chosen for a category is saved and shown selected after reload", async ({ page }) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");
  await expect(name(page, 4)).toHaveValue("Metas");

  await pickColor(page, 4, "Roxo");
  await expect(colorButton(page, 4)).toHaveAccessibleName("Cor da categoria 4: Roxo");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();

  await page.reload();
  await expect(colorButton(page, 4)).toHaveAccessibleName("Cor da categoria 4: Roxo");
});

test("a new category preselects the first palette color not in use", async ({ page }) => {
  await seedCategories([
    { name: "Moradia", percent: 50, color: 1 },
    { name: "Lazer", percent: 50, color: 2 },
  ]);
  await login(page);
  await page.goto("/categorias");

  await page.getByRole("button", { name: /Adicionar (primeira )?categoria/ }).click();
  await expect(colorButton(page, 3)).toHaveAccessibleName("Cor da categoria 3: Verde");
});

test("all 8 colors in use make a new category preselect color 1", async ({ page }) => {
  await seedCategories(
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((n, i) => ({ name: n, percent: 12.5, color: i + 1 })),
  );
  await login(page);
  await page.goto("/categorias");

  await page.getByRole("button", { name: /Adicionar (primeira )?categoria/ }).click();
  await expect(colorButton(page, 9)).toHaveAccessibleName("Cor da categoria 9: Azul");
});

test("two categories with the same color save normally", async ({ page }) => {
  await seedCategories([
    { name: "Moradia", percent: 50, color: 1 },
    { name: "Lazer", percent: 50, color: 2 },
  ]);
  await login(page);
  await page.goto("/categorias");

  await pickColor(page, 2, "Azul");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();

  await page.reload();
  for (const n of [1, 2]) {
    await expect(colorButton(page, n)).toHaveAccessibleName(`Cor da categoria ${n}: Azul`);
  }
});

const adjustSelect = (page: Page, direction: "Descontar" | "Acrescentar") =>
  page.getByLabel(`${direction} a diferença em`, { exact: true });
const apply = (page: Page) => page.getByRole("button", { name: "Rebalancear", exact: true });

test("the sum bar closes the sum at 100% on the chosen category and enables saving", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, [["A", "50"], ["B", "30,5"], ["C", "10"]]);
  await expect(page.getByTestId("category-sum")).toHaveText("90,50%");
  await expect(page.getByText("A soma deve ser 100%. Atual: 90,50%", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();

  // The select starts on the largest category.
  await expect(adjustSelect(page, "Acrescentar")).toHaveText("A");
  await chooseOption(adjustSelect(page, "Acrescentar"), "C");
  await apply(page).click();

  await expect(percent(page, 3)).toHaveValue("19,50");
  await expect(percent(page, 1)).toHaveValue("50,00");
  await expect(percent(page, 2)).toHaveValue("30,50");
  await expect(page.getByTestId("category-sum")).toHaveText("100,00%");
  await expect(apply(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar" })).toBeEnabled();
});

test("applying with a sum above 100% lowers the chosen category by the excess", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, [["A", "50"], ["B", "40"], ["C", "10,297973"]]);

  await chooseOption(adjustSelect(page, "Descontar"), "C");
  await apply(page).click();

  await expect(percent(page, 3)).toHaveValue("10,00");
  await expect(page.getByTestId("category-sum")).toHaveText("100,00%");
});

test("an adjustment that would leave the range shows the message and changes nothing", async ({
  page,
}) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, [["A", "60"], ["B", "40,297973"], ["C", "0,2"]]);

  await chooseOption(adjustSelect(page, "Descontar"), "C");
  await apply(page).click();

  await expect(
    page.getByText(
      "Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(percent(page, 3)).toHaveValue("0,20");
  await expect(page.getByTestId("category-sum")).toHaveText("100,50%");

  await percent(page, 3).fill("0,1");
  await expect(page.getByText(/Não é possível ajustar esta categoria/)).toHaveCount(0);
});

test("removing a category with subcategories asks for confirmation", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, [["Custos fixos", "100"]]);
  await page.getByRole("button", { name: "0 subcategorias de Custos fixos" }).click();
  await page.getByRole("button", { name: "Nova subcategoria em Custos fixos" }).click();

  const dialog = page.getByRole("dialog", { name: "Remover categoria?" });
  const remove = page.getByRole("button", { name: "Remover categoria 1" });

  await remove.click();
  await expect(
    dialog.getByText('"Custos fixos" e sua 1 subcategoria serão removidas ao salvar.', { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await expect(name(page, 1)).toHaveValue("Custos fixos");

  await remove.click();
  await dialog.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(name(page, 1)).toHaveCount(0);
});
