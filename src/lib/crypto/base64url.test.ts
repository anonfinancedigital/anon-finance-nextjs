import { describe, expect, it } from "vitest";
import { fromBase64Url, toBase64Url } from "./base64url";

const bytesOf = (length: number) => Uint8Array.from({ length }, (_, i) => (i * 37 + 251) % 256);

describe("toBase64Url / fromBase64Url", () => {
  it.each([0, 1, 2, 3, 32])("ida e volta preserva %i bytes", (length) => {
    const bytes = bytesOf(length);
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
  });

  it("usa só o alfabeto base64url e nunca termina em '='", () => {
    // 0xfb 0xff 0xbf geram '+' e '/' no base64 padrão; tamanhos 1 e 2 geram padding.
    for (const bytes of [Uint8Array.of(0xfb, 0xff, 0xbf), Uint8Array.of(0xff), Uint8Array.of(0xff, 0xfe), bytesOf(32)]) {
      const text = toBase64Url(bytes);
      expect(text).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(text.endsWith("=")).toBe(false);
    }
  });

  it("codifica um vetor conhecido", () => {
    expect(toBase64Url(Uint8Array.of(0xfb, 0xff, 0xbf))).toBe("-_-_");
    expect(toBase64Url(new TextEncoder().encode("ab"))).toBe("YWI");
  });

  it.each([["+"], ["/"], ["="], [" "]])("fromBase64Url lança com %j", (bad) => {
    expect(() => fromBase64Url(`YW${bad}I`)).toThrow();
  });
});
