const normalize = (email: string) => email.trim().toLowerCase();

/** True when the e-mail is ADMIN_EMAIL (case and surrounding spaces ignored); false when it is unset. */
export function isAdminEmail(email: string): boolean {
  const admin = normalize(process.env.ADMIN_EMAIL ?? "");
  return admin !== "" && normalize(email) === admin;
}
