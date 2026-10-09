import { z } from "zod";
import { ciphertextSchema } from "./ciphertext";

/** Structure of a sealed goal (`GoalDto`): five opaque ciphertexts; the rules live in the browser. */
export const sealedGoalSchema = z.object({
  monthlyIncomeCt: ciphertextSchema,
  savedCt: ciphertextSchema,
  retirementAgeCt: ciphertextSchema,
  annualRateCt: ciphertextSchema,
  withdrawalRateCt: ciphertextSchema,
});
