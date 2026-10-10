import type { Metadata } from "next";
import { PrivacyContent } from "@/components/privacy/privacy-content";

export const metadata: Metadata = { title: "Privacidade e segurança" };

/**
 * Signed-in frame of the privacy page: the content inside the app shell. Served at `/privacidade` through a
 * proxy rewrite for visitors with a session; the (app) layout guards it like every other page of the shell.
 */
export default function SecurityPage() {
  return <PrivacyContent />;
}
