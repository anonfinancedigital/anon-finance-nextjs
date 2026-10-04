import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client";

const DAY_SECONDS = 60 * 60 * 24;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  session: { expiresIn: 30 * DAY_SECONDS, updateAge: DAY_SECONDS },
  // Painel do Better Auth Infrastructure: só ativo quando há API key (produção).
  plugins: [
    ...(process.env.BETTER_AUTH_API_KEY ? [dash()] : []),
    nextCookies(),
  ],
});
