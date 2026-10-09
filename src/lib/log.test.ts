import { afterEach, describe, expect, it, vi } from "vitest";
import { logActionError } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("logActionError", () => {
  it("logs only the action and the code for a pg error whose detail holds values", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      detail: "Key (name)=(Salário secreto) already exists.",
    });
    logActionError("createCategory", error);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("createCategory", "23505");
  });

  it("logs unknown for a non-Error input", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logActionError("saveGoal", "texto com dado");
    logActionError("saveGoal", null);
    logActionError("saveGoal", { code: 42 });
    expect(spy).toHaveBeenNthCalledWith(1, "saveGoal", "unknown");
    expect(spy).toHaveBeenNthCalledWith(2, "saveGoal", "unknown");
    expect(spy).toHaveBeenNthCalledWith(3, "saveGoal", "unknown");
  });

  it("passes nothing beyond the action and the code to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logActionError("x", Object.assign(new Error("secret"), { code: "XX", detail: "d", stack: "s" }));
    const args = spy.mock.calls[0];
    expect(args).toEqual(["x", "XX"]);
    expect(JSON.stringify(args)).not.toMatch(/secret|detail|stack/);
  });
});
