import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logActionError } from "./log";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

beforeEach(() => vi.mocked(Sentry.captureException).mockClear());
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

describe("logActionError -> Sentry", () => {
  const capture = vi.mocked(Sentry.captureException);

  it("reports a synthetic error tagged with the action and the code only", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      detail: "Key (name)=(Salário secreto) already exists.",
    });
    logActionError("createCategory", error);
    expect(capture).toHaveBeenCalledTimes(1);
    const [sent, hint] = capture.mock.calls[0];
    expect(sent).toBeInstanceOf(Error);
    expect(sent).not.toBe(error);
    expect((sent as Error).message).toBe("server_action_failed");
    expect(hint).toEqual({ tags: { action: "createCategory", code: "23505" } });
  });

  it("never lets the original message or detail reach Sentry, and tags unknown for a non-Error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    logActionError("x", Object.assign(new Error("secret message"), { code: "XX", detail: "secret detail" }));
    logActionError("saveGoal", "texto com dado");
    const serialized = JSON.stringify(capture.mock.calls.map(([e, h]) => [(e as Error).message, h]));
    expect(serialized).not.toMatch(/secret|detail|texto com dado/);
    expect(capture.mock.calls[1][1]).toEqual({ tags: { action: "saveGoal", code: "unknown" } });
  });
});
