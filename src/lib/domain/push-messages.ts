// Every fixed notification text lives here, so no financial data can reach a payload (PUSH-29).
import { BRAND_NAME } from "@/lib/brand";

export const PUSH_TITLE = BRAND_NAME;

export const PUSH_TEXT = {
  reminder: "Que tal registrar seus gastos de hoje?",
  due: "Você tem lançamentos recorrentes para hoje.",
  passwordReset: "Sua senha foi redefinida.",
  revoked: "Seu acesso ao ANON foi revogado.",
  /** Same text the service worker shows when a push arrives without a usable payload. */
  generic: "Você tem uma nova notificação.",
} as const;

/** Seconds the push service keeps an undelivered notification. */
export const PUSH_TTL = 86400;

/** The JSON the service worker reads: a fixed title, the given body and the app root as target. */
export function pushPayload(body: string): string {
  return JSON.stringify({ title: PUSH_TITLE, body, url: "/" });
}
