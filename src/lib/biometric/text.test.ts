import { describe, expect, it } from "vitest";
import { LOCK_TEXT } from "./text";

describe("LOCK_TEXT (L-002: literal spec strings)", () => {
  it("card texts match LOCK-01, LOCK-02, LOCK-05 and LOCK-22", () => {
    expect(LOCK_TEXT.cardTitle).toBe("Bloqueio por biometria");
    expect(LOCK_TEXT.cardDescription).toBe(
      "Peça a biometria do aparelho ao abrir o app e ao voltar depois de 1 minuto. Não substitui a senha da conta.",
    );
    expect(LOCK_TEXT.unsupported).toBe("Este aparelho ou navegador não oferece biometria para o app.");
    expect(LOCK_TEXT.enrollFailed).toBe("Não foi possível ativar a biometria. Tente novamente.");
    expect(LOCK_TEXT.methodHint).toBe("Digital, rosto ou o PIN do aparelho, conforme o que o seu aparelho oferecer.");
  });

  it("card buttons and state match LOCK-01 and LOCK-04", () => {
    expect(LOCK_TEXT.enable).toBe("Ativar");
    expect(LOCK_TEXT.disable).toBe("Desativar");
    expect(LOCK_TEXT.enabled).toBe("Bloqueio ativado");
  });

  it("invite texts match INVITE-01 and INVITE-09", () => {
    expect(LOCK_TEXT.inviteTitle).toBe("Proteger com biometria?");
    expect(LOCK_TEXT.inviteText).toBe(
      "Peça a biometria do aparelho ao abrir o app. Você pode mudar isso depois em Privacidade e conta.",
    );
    expect(LOCK_TEXT.dismiss).toBe("Agora não");
  });

  it("lock screen texts match LOCK-10 and LOCK-13", () => {
    expect(LOCK_TEXT.lockedTitle).toBe("ANON bloqueado");
    expect(LOCK_TEXT.verifyFailed).toBe("Não foi possível confirmar sua identidade.");
    expect(LOCK_TEXT.retry).toBe("Tentar de novo");
    expect(LOCK_TEXT.usePassword).toBe("Usar a senha");
    expect(LOCK_TEXT.signOut).toBe("Sair");
  });

  it("privacy sentence matches LOCK-21", () => {
    expect(LOCK_TEXT.privacy).toBe(
      "A biometria é conferida pelo sistema do seu aparelho. O ANON só recebe a confirmação e guarda no aparelho o identificador da credencial; nada disso vai para o servidor.",
    );
  });
});
