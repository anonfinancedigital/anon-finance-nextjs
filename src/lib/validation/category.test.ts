import { describe, expect, it } from "vitest";
import { categorySetSchema } from "./category";

const ID = "7d9e1f2a-3b4c-4d5e-8f6a-7b8c9d0e1f2a";

const set = (...percents: string[]) =>
  percents.map((percent, i) => ({ name: `Cat ${i + 1}`, percent, color: i + 1 }));

/** Issues as "path → message" pairs, path joined with ".". */
function issues(input: unknown) {
  const result = categorySetSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

describe("categorySetSchema", () => {
  it("converts a valid set into { name, percentBp }[], keeping an existing id", () => {
    const input = set("30", "30", "10", "10", "20");
    input[0] = { ...input[0], id: ID } as (typeof input)[0];
    expect(categorySetSchema.parse(input)).toEqual([
      { id: ID, name: "Cat 1", percentBp: 3000, color: 1 },
      { name: "Cat 2", percentBp: 3000, color: 2 },
      { name: "Cat 3", percentBp: 1000, color: 3 },
      { name: "Cat 4", percentBp: 1000, color: 4 },
      { name: "Cat 5", percentBp: 2000, color: 5 },
    ]);
  });

  it.each([["0"], ["100,01"], ["12,345"]])("rejects percent %j with an error on the item", (bad) => {
    const result = issues([{ name: "Lazer", percent: bad, color: 1 }, ...set("50")]);
    expect(result.map((i) => i.path)).toEqual(["0.percent"]);
  });

  it.each([[1], [2], [3], [4], [5], [6], [7], [8]])("accepts color %i", (color) => {
    const [first] = categorySetSchema.parse([{ name: "Tudo", percent: "100", color }]);
    expect(first.color).toBe(color);
  });

  it.each([[0], [9], [2.5], ["3"]])(
    "rejects color %j with \"Cor inválida\" on the item",
    (color) => {
      expect(issues([...set("50"), { name: "Lazer", percent: "50", color }])).toEqual([
        { path: "1.color", message: "Cor inválida" },
      ]);
    },
  );

  it("rejects an item without the color key with \"Cor inválida\"", () => {
    expect(issues([{ name: "Tudo", percent: "100" }])).toEqual([
      { path: "0.color", message: "Cor inválida" },
    ]);
  });

  it("rejects a set that does not sum to 100% with the set message", () => {
    expect(issues(set("30", "30", "10", "10", "20", "5"))).toEqual([
      { path: "", message: "A soma dos percentuais deve ser 100% (atual: 105%)" },
    ]);
  });

  it("rejects duplicate names (Lazer/lazer) on the repeated item plus a set-level message", () => {
    const result = issues([
      { name: "Lazer", percent: "50", color: 1 },
      { name: "lazer", percent: "50", color: 2 },
    ]);
    expect(result.map((i) => i.path)).toEqual(["1.name", ""]);
  });
});
