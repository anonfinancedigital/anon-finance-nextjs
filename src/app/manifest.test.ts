import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest (PWA-01, PWA-02)", () => {
  const m = manifest();

  it("identifies the app", () => {
    expect(m.name).toBe("ANON");
    expect(m.short_name).toBe("ANON");
    expect(m.lang).toBe("pt-BR");
  });

  it("opens in its own window at the root scope", () => {
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("uses the brand dark color for background and theme", () => {
    expect(m.background_color).toBe("#0D111A");
    expect(m.theme_color).toBe("#0D111A");
  });

  it("lists exactly the three PNG icons, the last one maskable", () => {
    expect(m.icons).toEqual([
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });
});
