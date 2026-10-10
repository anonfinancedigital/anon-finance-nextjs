import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Guarda do rebrand ANON: "Vértice" e "Ápice" são marcas de terceiros e não podem voltar ao app.
// Varre src/ e public/ e lista arquivo:linha de cada ocorrência fora das exceções abaixo.

const ROOT = join(__dirname, "..", "..");
const SCAN_DIRS = ["src", "public"];
const TEXT_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|css|svg|json|md|html|txt)$/;
const THIS_FILE = "src/lib/brand-guard.test.ts";

// Sem diferenciar maiúsculas nem acentos: o texto é normalizado (NFD, sem diacríticos, minúsculas) antes da busca.
const OLD_NAMES = /vertice|apice/;

/** Remove diacríticos e põe em minúsculas, para casar "Vértice", "VERTICE", "Ápice" etc. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

type Exception = { name: string; reason: string; applies: (file: string, line: string) => boolean };

const EXCEPTIONS: Exception[] = [
  {
    name: "este arquivo",
    reason: "o teste-guarda precisa citar os nomes antigos para procurá-los",
    applies: (file) => file === THIS_FILE,
  },
  {
    name: "linha de comentário",
    reason: "comentários são notas de código (rastreabilidade histórica, identificadores internos), não texto visível ao usuário",
    applies: (_file, line) => /^\s*(\/\/|\/\*|\*)/.test(line),
  },
  {
    name: "nome de describe/it/test em *.test.ts",
    reason: "nomes de teste não aparecem na interface; só descrevem o cenário (ex.: spec apice-folga-meta)",
    applies: (file, line) => file.endsWith(".test.ts") && /^\s*(describe|it|test)(\.\w+)*\(\s*["'`]/.test(line),
  },
  {
    name: "lista de termos antigos proibidos em freedom-copy.test.ts",
    reason: "o teste afirma que a copy NÃO contém o termo antigo; o termo precisa estar escrito para ser rejeitado",
    applies: (file, line) => file === "src/lib/domain/freedom-copy.test.ts" && /^\s*const OLD_TERMS\s*=/.test(line),
  },
];

/** IDs de requisito APICE-NN (rastreabilidade histórica, fora do escopo do rebrand) são retirados da linha antes da busca. */
const REQUIREMENT_ID = /\bAPICE-\d+/gi;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    return TEXT_EXTENSIONS.test(entry.name) ? [path] : [];
  });
}

function findOffenders(): string[] {
  const offenders: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const path of listFiles(join(ROOT, dir))) {
      const file = relative(ROOT, path).split("\\").join("/");
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (!OLD_NAMES.test(normalize(line.replace(REQUIREMENT_ID, "")))) return;
          if (EXCEPTIONS.some((exception) => exception.applies(file, line))) return;
          offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        });
    }
  }
  return offenders;
}

describe("guarda de marca (rebrand-anon)", () => {
  it("não deixa Vértice nem Ápice em src/ e public/ fora das exceções documentadas (ANON-06, ANON-07, ANON-10)", () => {
    expect(findOffenders()).toEqual([]);
  });
});
