import { LOGIN_BLOCK_MESSAGE } from "@/lib/domain/user-status";

/** Better Auth error code when Google is refused for an e-mail that already has a password account. */
const ACCOUNT_NOT_LINKED = "account_not_linked";
const ACCOUNT_NOT_LINKED_MESSAGE = "Este e-mail já tem cadastro com senha. Entre com e-mail e senha";
const GOOGLE_FAILED = "Não foi possível entrar com o Google";

function isBlockStatus(value: string | undefined): value is keyof typeof LOGIN_BLOCK_MESSAGE {
  return value !== undefined && Object.hasOwn(LOGIN_BLOCK_MESSAGE, value);
}

/**
 * Notice to show on /login after a Google sign-in. `blockStatus` is the value of the
 * `anon_login_block` cookie and `error` the `?error=` query value; unknown cookie values are ignored.
 */
export function loginNotice(input: { blockStatus: string | undefined; error: string | undefined }): string | null {
  if (isBlockStatus(input.blockStatus)) return LOGIN_BLOCK_MESSAGE[input.blockStatus];
  if (input.error === ACCOUNT_NOT_LINKED) return ACCOUNT_NOT_LINKED_MESSAGE;
  return input.error ? GOOGLE_FAILED : null;
}
