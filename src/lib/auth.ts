import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client";
import { usersRepo } from "@/lib/db/repos/users";
import { isGoogleEnabled } from "@/lib/google";
import { blockCookieStatus, googleUserCreateDecision } from "@/lib/google-hooks";

const DAY_SECONDS = 60 * 60 * 24;

/** Read by /login to tell a refused Google sign-in why no session was created. */
export const LOGIN_BLOCK_COOKIE = "anon_login_block";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  socialProviders: isGoogleEnabled()
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : {},
  // O Google nunca vincula a um usuário que já tem login por senha (sem aprovação do admin, o
  // e-mail alheio poderia ser cadastrado antes). Quem já tem o Google vinculado entra normalmente.
  account: { accountLinking: { enabled: false } },
  session: { expiresIn: 30 * DAY_SECONDS, updateAge: DAY_SECONDS },
  // Coluna manual em auth-schema.ts; `input: false` impede que o cliente a defina.
  user: {
    additionalFields: {
      status: { type: ["pending", "approved", "rejected", "revoked"], input: false },
    },
  },
  databaseHooks: {
    user: {
      // Só o Google cria usuário pelo adapter (o cadastro por senha grava via Drizzle).
      create: { before: async (user) => googleUserCreateDecision(user) },
    },
    session: {
      create: {
        // Recusa a sessão na origem (inclusive no endpoint público de sign-in) para quem não está approved.
        before: async (session, ctx) => {
          const owner = await usersRepo.findById(session.userId);
          if (owner?.status === "approved") return undefined;
          const blocked = owner ? blockCookieStatus(owner.status) : null;
          if (blocked) {
            ctx?.setCookie(LOGIN_BLOCK_COOKIE, blocked, {
              httpOnly: true,
              sameSite: "lax",
              path: "/login",
              maxAge: 60,
            });
          }
          return false;
        },
      },
    },
  },
  // Só nível e mensagem: argumentos extras do Better Auth podem trazer e-mail ou perfil (AD-013).
  logger: {
    log: (level, message) => {
      const line = `[Better Auth] ${message}`;
      if (level === "error") console.error(line);
      else if (level === "warn") console.warn(line);
      else console.log(line);
    },
  },
  // Painel do Better Auth Infrastructure: só ativo quando há API key (produção).
  plugins: [
    ...(process.env.BETTER_AUTH_API_KEY ? [dash()] : []),
    nextCookies(),
  ],
});
