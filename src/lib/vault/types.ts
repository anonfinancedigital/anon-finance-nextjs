/**
 * Types shared by browser and server for the encrypted vault. Isomorphic: no server imports.
 * Source: .specs/features/sigilo-dados/design.md (Data Models, DTOs).
 */

/** Sealed field: `v1:<base64url>`, at most 2048 characters. */
export type Ct = string;

export type TransactionKind = "income" | "expense";
export type Recurrence = "none" | "indefinite" | "until";

/** What the server stores per user to let the browser derive keys and unwrap the DEK. */
export interface VaultMaterial {
  kdfVersion: 1;
  /** base64url, 16 bytes. */
  salt: string;
  memKib: number;
  iterations: number;
  parallelism: number;
  /** DEK wrapped by the KEK (AAD `vault.dek.<userId>`). */
  dekWrappedPw: Ct;
  /** DEK wrapped by the recovery key. */
  dekWrappedRecovery: Ct;
}

export interface TransactionDto {
  id: string;
  kind: TransactionKind;
  date: string;
  categoryId: string | null;
  subcategoryId: string | null;
  amountCt: Ct;
  descriptionCt: Ct | null;
  recurrence: Recurrence;
  recurrenceStartMonth?: string;
  recurrenceEndMonth?: string;
}

export interface UpdateTransactionDto extends TransactionDto {
  /** Id chosen by the client for the new series segment, so the AAD closes before the insert. */
  newRowId: string;
  insertedCt: { amountCt: Ct; descriptionCt: Ct | null };
}

export interface CategorySetDto {
  items: {
    id?: string;
    clientId: string;
    color: number;
    isInvestment: boolean;
    nameCt: Ct;
    percentChange?: { fromMonth: string; percentCt: Ct };
    subcategories: { id?: string; nameCt: Ct }[];
  }[];
}

export interface GoalDto {
  monthlyIncomeCt: Ct;
  savedCt: Ct;
  retirementAgeCt: Ct;
  annualRateCt: Ct;
  withdrawalRateCt: Ct;
}

/** Server to client: the rows of one month, all sensitive fields sealed. */
export interface MonthPayload {
  categories: {
    id: string;
    color: number;
    isInvestment: boolean;
    deleted: boolean;
    nameCt: Ct;
    versions: { fromMonth: string; percentCt: Ct }[];
    subcategories: { id: string; nameCt: Ct }[];
  }[];
  occurrences: {
    id: string;
    kind: TransactionKind;
    date: string;
    month: string;
    categoryId: string | null;
    subcategoryId: string | null;
    amountCt: Ct;
    descriptionCt: Ct | null;
    recurring: boolean;
    // SPEC_DEVIATION: `recurrenceEnd`, `createdAt` and `updatedAt` are not in the design's MonthPayload.
    // Reason: `openMonth` must return the `Occurrence` type the UI already uses (the edit form reads `recurrenceEnd`).
    /** First day of the final month; null = no end (or not recurring). */
    recurrenceEnd: string | null;
    installment: { number: number; total: number } | null;
    seriesStart: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  totalTransactions: number;
}

/** Every sealed row of the session user, for the export (SIGILO-37). */
export interface ExportPayload {
  transactions: {
    id: string;
    kind: TransactionKind;
    date: string;
    categoryId: string | null;
    subcategoryId: string | null;
    amountCt: Ct;
    descriptionCt: Ct | null;
    recurring: boolean;
    recurrenceDay: number | null;
    recurrenceEnd: string | null;
    seriesId: string | null;
  }[];
  categories: {
    id: string;
    color: number;
    isInvestment: boolean;
    deletedFrom: string | null;
    nameCt: Ct;
    versions: { fromMonth: string; percentCt: Ct }[];
    subcategories: { id: string; nameCt: Ct }[];
  }[];
  goal: GoalDto | null;
  birthDateCt: Ct | null;
}

/**
 * What the browser sends to import an exported file into an empty account: every row sealed for the
 * destination user, under new ids (IMPORT-03, IMPORT-06). `goal` is `null` when the file has none or
 * it conflicts with the account's birth date; `birthDateCt` is `null` when the file has none.
 */
export interface ImportPayload {
  categories: {
    id: string;
    color: number;
    isInvestment: boolean;
    deletedFrom: string | null;
    nameCt: Ct;
    versions: { fromMonth: string; percentCt: Ct }[];
    subcategories: { id: string; nameCt: Ct }[];
  }[];
  transactions: {
    id: string;
    kind: TransactionKind;
    date: string;
    categoryId: string | null;
    subcategoryId: string | null;
    amountCt: Ct;
    descriptionCt: Ct | null;
    recurring: boolean;
    recurrenceDay: number | null;
    recurrenceEnd: string | null;
    /** New id shared by every segment of a series. */
    seriesId: string | null;
  }[];
  goal: GoalDto | null;
  birthDateCt: Ct | null;
}

/** Plain-text rows of a legacy account, read once for the migration. */
export interface LegacyPlain {
  transactions: {
    id: string;
    kind: TransactionKind;
    date: string;
    categoryId: string | null;
    subcategoryId: string | null;
    amountCents: number;
    description: string | null;
    recurring: boolean;
    recurrenceDay: number | null;
    recurrenceEnd: string | null;
    seriesId: string | null;
  }[];
  categories: {
    id: string;
    name: string;
    color: number;
    isInvestment: boolean;
    deletedFrom: string | null;
    versions: { fromMonth: string; percentMicro: number }[];
    subcategories: { id: string; name: string }[];
  }[];
  goal: {
    monthlyIncomeCents: number;
    savedCents: number;
    retirementAge: number;
    annualRateBp: number;
    withdrawalRateBp: number;
  } | null;
  birthDate: string | null;
}

/** The same rows as `LegacyPlain`, sealed in the browser, with the same ids. */
export interface LegacyPackage {
  transactions: {
    id: string;
    amountCt: Ct;
    descriptionCt: Ct | null;
  }[];
  categories: {
    id: string;
    nameCt: Ct;
    versions: { fromMonth: string; percentCt: Ct }[];
    subcategories: { id: string; nameCt: Ct }[];
  }[];
  goal: GoalDto | null;
  birthDateCt: Ct | null;
}
