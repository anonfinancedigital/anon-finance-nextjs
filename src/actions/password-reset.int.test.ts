import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verification } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { passwordResetsRepo } from "@/lib/db/repos/password-resets";
import { insertCredentialUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { requestPasswordResetAction } from "./password-reset";

// Tasks scheduled with `after` are kept so the test can wait for them, as the response would.
const scheduled = vi.hoisted(() => ({ tasks: [] as Promise<unknown>[] }));

vi.mock("next/server", () => ({
  after: vi.fn((task: (() => unknown) | Promise<unknown>) => {
    scheduled.tasks.push(Promise.resolve(typeof task === "function" ? task() : task));
  }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/mailer", () => ({ sendMail: vi.fn(async () => {}) }));

const { sendMail } = await import("@/lib/mailer");

setupTestDb();

const EMAIL = "ana@x.com";
const BASE_URL = process.env.BETTER_AUTH_URL!;
const NOT_APPROVED = [["pending"], ["rejected"], ["revoked"]] as const;
const INVALID_EMAIL = {
  ok: false,
  error: "Informe um e-mail válido",
  fieldErrors: { email: "Informe um e-mail válido" },
};

/** Calls the action and waits for the work scheduled with `after`. */
async function request(email: string) {
  const data = new FormData();
  data.set("email", email);
  const result = await requestPasswordResetAction(undefined, data);
  await Promise.all(scheduled.tasks);
  return result;
}

/** The raw token carried by the link of the n-th e-mail sent. */
function tokenOfMail(n = 0) {
  const { text } = vi.mocked(sendMail).mock.calls[n][0];
  const match = text.match(/\/redefinir-senha\?token=(\S+)/);
  if (!match) throw new Error("no reset link in the e-mail");
  return decodeURIComponent(match[1]);
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scheduled.tasks = [];
  vi.mocked(sendMail).mockReset().mockResolvedValue(undefined);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestPasswordResetAction", () => {
  it("sends one e-mail with a working link to an approved account, matched after trim and lower case", async () => {
    await insertCredentialUser(EMAIL);

    const result = await request("  ANA@X.com ");

    expect(result).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = vi.mocked(sendMail).mock.calls[0][0];
    expect(mail.to).toBe(EMAIL);
    expect(mail.subject).toBe("Redefinir sua senha");
    expect(mail.text).toContain(`${BASE_URL}/redefinir-senha?token=`);
    expect(await passwordResetsRepo.isValid(tokenOfMail())).toBe(true);
  });

  it("sends nothing to an e-mail without account and answers like the approved case", async () => {
    await insertCredentialUser(EMAIL);

    expect(await request("bia@x.com")).toEqual({ ok: true });
    expect(sendMail).not.toHaveBeenCalled();
    expect(await db.$count(verification)).toBe(0);
  });

  it.each(NOT_APPROVED)(
    "sends nothing to a %s account and answers like the approved case",
    async (status) => {
      await insertCredentialUser(EMAIL, undefined, status);

      expect(await request(EMAIL)).toEqual({ ok: true });
      expect(sendMail).not.toHaveBeenCalled();
      expect(await db.$count(verification)).toBe(0);
    },
  );

  it.each([[""], ["ana-sem-arroba"]])(
    "refuses the e-mail %j with the exact message and sends nothing",
    async (email) => {
      await insertCredentialUser(EMAIL);

      expect(await request(email)).toEqual(INVALID_EMAIL);
      expect(sendMail).not.toHaveBeenCalled();
      expect(await db.$count(verification)).toBe(0);
    },
  );

  it("logs a failed delivery and still answers like the approved case", async () => {
    await insertCredentialUser(EMAIL);
    const failure = new Error("SMTP fora do ar");
    vi.mocked(sendMail).mockRejectedValue(failure);

    expect(await request(EMAIL)).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("logs a repository failure and still answers like the approved case", async () => {
    await insertCredentialUser(EMAIL);
    const failure = new Error("banco fora do ar");
    vi.spyOn(passwordResetsRepo, "issue").mockRejectedValue(failure);

    expect(await request(EMAIL)).toEqual({ ok: true });
    expect(sendMail).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("invalidates the first link when a second one is requested", async () => {
    await insertCredentialUser(EMAIL);

    await request(EMAIL);
    await request(EMAIL);

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(await passwordResetsRepo.isValid(tokenOfMail(0))).toBe(false);
    expect(await passwordResetsRepo.isValid(tokenOfMail(1))).toBe(true);
  });
});
