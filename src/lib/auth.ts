import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client";
import { usersRepo } from "@/lib/db/repos/users";

const DAY_SECONDS = 60 * 60 * 24;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  session: { expiresIn: 30 * DAY_SECONDS, updateAge: DAY_SECONDS },
  // Coluna manual em auth-schema.ts; `input: false` impede que o cliente a defina.
  user: {
    additionalFields: {
      status: { type: ["pending", "approved", "rejected", "revoked"], input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Recusa a sessão na origem (inclusive no endpoint público de sign-in) para quem não está approved.
        before: async (session) => {
          const owner = await usersRepo.findById(session.userId);
          return owner?.status === "approved" ? undefined : false;
        },
      },
    },
  },
  // Painel do Better Auth Infrastructure: só ativo quando há API key (produção).
  plugins: [
    ...(process.env.BETTER_AUTH_API_KEY ? [dash()] : []),
    nextCookies(),
  ],
});
