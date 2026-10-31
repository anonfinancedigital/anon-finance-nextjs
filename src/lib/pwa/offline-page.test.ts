import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(join(process.cwd(), "public", "offline.html"), "utf8");

describe("public/offline.html (PWA-15, PWA-16, PWA-17)", () => {
  it("is a pt-BR page titled for the offline state", () => {
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("<title>ANON • Sem conexão</title>");
  });

  it("tells the user they are offline and that their data is protected", () => {
    expect(html).toContain("Você está sem conexão");
    expect(html).toContain("Seus dados continuam protegidos. Reconecte-se para continuar.");
  });

  it("links back to the root to retry", () => {
    expect(html).toContain('<a href="/">Tentar novamente</a>');
  });

  it("has no script element", () => {
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("loads no external resource", () => {
    expect(html).not.toMatch(/https?:\/\//);
  });
});
