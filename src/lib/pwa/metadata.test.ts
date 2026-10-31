import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pwaMetadata, pwaViewport } from "./metadata";
import { startupImages } from "./splash-list";

describe("pwaMetadata (PWA-03)", () => {
  it("makes the iOS home-screen app capable, titled Anon Finance (APPNAME-02)", () => {
    expect(pwaMetadata.appleWebApp).toMatchObject({ capable: true, title: "Anon Finance" });
  });

  it("declares the iOS startup images, each pointing to an existing file (SPLASH-02)", () => {
    expect(pwaMetadata.appleWebApp.startupImage).toEqual(startupImages());
    for (const { url } of startupImages()) {
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
    }
  });

  it("declares the 180x180 Apple touch icon", () => {
    expect(pwaMetadata.icons).toEqual({
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    });
  });
});

describe("pwaViewport (PWA-04)", () => {
  it("sets the theme color to the brand dark", () => {
    expect(pwaViewport.themeColor).toBe("#0D111A");
  });
});
