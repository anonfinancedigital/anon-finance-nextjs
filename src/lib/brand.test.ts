import { describe, expect, it } from "vitest";
import {
  BRAND_DESCRIPTION,
  BRAND_DESCRIPTOR,
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_TITLE_TEMPLATE,
  RECOVERY_KEY_FILE_NAME,
} from "./brand";

describe("brand constants (rebrand-anon spec)", () => {
  it("names the product ANON in caps (Logo aria-label, ANON-01)", () => {
    expect(BRAND_NAME).toBe("ANON");
  });

  it("uses Finanças Privadas as the descriptor (ANON-05)", () => {
    expect(BRAND_DESCRIPTOR).toBe("Finanças Privadas");
  });

  it("uses the option 3 slogan as the tagline (ANON-09)", () => {
    expect(BRAND_TAGLINE).toBe("O planejamento do seu patrimônio com privacidade absoluta.");
  });

  it("sets the document title template (ANON-03)", () => {
    expect(BRAND_TITLE_TEMPLATE).toBe("ANON • %s");
  });

  it("sets the metadata description (ANON-03)", () => {
    expect(BRAND_DESCRIPTION).toBe("ANON – Finanças Privadas");
  });

  it("names the recovery key file (ANON-12)", () => {
    expect(RECOVERY_KEY_FILE_NAME).toBe("chave-de-recuperacao-anon.txt");
  });
});
