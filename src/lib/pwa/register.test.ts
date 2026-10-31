import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./register";

function nav(register: (...args: unknown[]) => Promise<unknown>) {
  return { serviceWorker: { register } };
}

describe("registerServiceWorker", () => {
  it("registers /sw.js with scope / and updateViaCache none in production (PWA-18)", async () => {
    const register = vi.fn().mockResolvedValue({});
    await registerServiceWorker({ nodeEnv: "production", nav: nav(register) });
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  });

  it.each(["development", "test", undefined])("does not register when NODE_ENV is %s (PWA-19)", async (nodeEnv) => {
    const register = vi.fn().mockResolvedValue({});
    await registerServiceWorker({ nodeEnv, nav: nav(register) });
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing when the browser has no serviceWorker (PWA-18)", async () => {
    await expect(registerServiceWorker({ nodeEnv: "production", nav: {} })).resolves.toBeUndefined();
  });

  it("swallows a rejected registration (PWA-20)", async () => {
    const register = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(registerServiceWorker({ nodeEnv: "production", nav: nav(register) })).resolves.toBeUndefined();
  });

  it("swallows a registration that throws synchronously (PWA-20)", async () => {
    const register = vi.fn(() => {
      throw new Error("boom");
    });
    await expect(registerServiceWorker({ nodeEnv: "production", nav: nav(register) })).resolves.toBeUndefined();
  });
});
