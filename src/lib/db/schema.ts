import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/**
 * Reads a plain-text column of a legacy account. The column is nullable since the vault migration
 * (a sealed row keeps it NULL); legacy-path repos never see sealed rows until they are replaced.
 */
export function plain<T>(value: T | null, column: string): T {
  if (value === null) throw new Error(`Expected plain-text value in ${column}`);
  return value;
}

export const category = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Plain name of a legacy account; NULL once sealed (`name_ct`). Exactly one of the two is set. */
    name: varchar("name", { length: 40 }),
    nameCt: text("name_ct"),
    /** First day of the month the category was deleted (AAAA-MM-01); null = active. */
    deletedFrom: date("deleted_from", { mode: "string" }),
    /** Index 1..8 of the category color palette (`--viz-1` … `--viz-8`). */
    color: integer("color").notNull(),
    /** Investment/contribution category: exceeding its target is not an overspend. */
    isInvestment: boolean("is_investment").notNull().default(false),
    // clock_timestamp() (not now()) so rows inserted in the same DB transaction keep their creation order.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    check("category_color_range", sql`${t.color} BETWEEN 1 AND 8`),
    check("category_name_plain_xor_ct", sql`(${t.name} IS NULL) <> (${t.nameCt} IS NULL)`),
    uniqueIndex("category_user_lower_name_unique")
      .on(t.userId, sql`lower(${t.name})`)
      .where(sql`${t.deletedFrom} IS NULL`),
  ],
);

/** One row per percent change; in force for month M = the row with the greatest from_month <= M. */
export const categoryPercent = pgTable(
  "category_percent",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    /** First day of the month (AAAA-MM-01); 0001-01-01 = since ever. */
    fromMonth: date("from_month", { mode: "string" }).notNull(),
    /** Plain percent of a legacy account; NULL once sealed (`percent_ct`). Exactly one of the two is set. */
    percentMicro: integer("percent_micro"),
    percentCt: text("percent_ct"),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.fromMonth] }),
    check("category_percent_micro_range", sql`${t.percentMicro} BETWEEN 1 AND 100000000`),
    check(
      "category_percent_plain_xor_ct",
      sql`(${t.percentMicro} IS NULL) <> (${t.percentCt} IS NULL)`,
    ),
    check("category_percent_month_start", sql`EXTRACT(DAY FROM ${t.fromMonth}) = 1`),
  ],
);

export const subcategory = pgTable(
  "subcategory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }),
    nameCt: text("name_ct"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    check("subcategory_name_plain_xor_ct", sql`(${t.name} IS NULL) <> (${t.nameCt} IS NULL)`),
    uniqueIndex("subcategory_category_lower_name_unique").on(t.categoryId, sql`lower(${t.name})`),
    // Target of transaction's composite FK: guarantees subcategory ∈ the expense's category.
    unique("subcategory_id_category_unique").on(t.id, t.categoryId),
  ],
);

export const transactionKind = pgEnum("transaction_kind", ["income", "expense"]);

export const transaction = pgTable(
  "transaction",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: transactionKind("kind").notNull(),
    /** Plain amount of a legacy account; NULL once sealed (`amount_ct`). Exactly one of the two is set. */
    amountCents: bigint("amount_cents", { mode: "number" }),
    amountCt: text("amount_ct"),
    date: date("date", { mode: "string" }).notNull(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "restrict" }),
    subcategoryId: uuid("subcategory_id"),
    /** Plain description (legacy); `description_ct` once sealed. Both NULL = no description. */
    description: varchar("description", { length: 120 }),
    descriptionCt: text("description_ct"),
    /** A recurring row is a segment of a series: it applies from the month of `date` on. */
    recurring: boolean("recurring").notNull().default(false),
    /** Intended day of each occurrence (31 even when `date` is 28/02). */
    recurrenceDay: smallint("recurrence_day"),
    /** First day of the final month (inclusive); null = no end. */
    recurrenceEnd: date("recurrence_end", { mode: "string" }),
    /** Groups the segments of a series: the id of its first segment. */
    seriesId: uuid("series_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    check("transaction_amount_plain_xor_ct", sql`(${t.amountCents} IS NULL) <> (${t.amountCt} IS NULL)`),
    check(
      "transaction_description_not_both",
      sql`${t.description} IS NULL OR ${t.descriptionCt} IS NULL`,
    ),
    check("transaction_amount_cents_range", sql`${t.amountCents} BETWEEN 1 AND 99999999999`),
    check(
      "transaction_kind_category",
      sql`(${t.kind} = 'expense') = (${t.categoryId} IS NOT NULL)`,
    ),
    foreignKey({
      name: "transaction_subcategory_category_fk",
      columns: [t.subcategoryId, t.categoryId],
      foreignColumns: [subcategory.id, subcategory.categoryId],
    }).onDelete("restrict"),
    // MATCH SIMPLE skips the FK when any column is NULL: an income (category_id NULL) with a
    // subcategory_id would pass without this check.
    check(
      "transaction_subcategory_needs_category",
      sql`${t.subcategoryId} IS NULL OR ${t.categoryId} IS NOT NULL`,
    ),
    check(
      "transaction_recurring_fields",
      sql`${t.recurring} = (${t.recurrenceDay} IS NOT NULL) AND ${t.recurring} = (${t.seriesId} IS NOT NULL)`,
    ),
    check("transaction_recurrence_day_range", sql`${t.recurrenceDay} BETWEEN 1 AND 31`),
    check(
      "transaction_recurrence_end",
      sql`${t.recurrenceEnd} IS NULL OR (${t.recurring} AND ${t.recurrenceEnd} >= date_trunc('month', ${t.date})::date)`,
    ),
    index("transaction_user_date_idx").on(t.userId, t.date),
    index("transaction_user_recurring_idx").on(t.userId, t.date).where(sql`${t.recurring}`),
  ],
);

export const financialGoal = pgTable(
  "financial_goal",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    // Plain columns (legacy account): all set, or all NULL when the goal is sealed in the `*_ct` columns.
    // `annual_rate_bp` keeps its default 800: a sealed row must insert it as an explicit NULL.
    monthlyIncomeCents: bigint("monthly_income_cents", { mode: "number" }),
    savedCents: bigint("saved_cents", { mode: "number" }),
    retirementAge: smallint("retirement_age"),
    annualRateBp: smallint("annual_rate_bp").default(800),
    withdrawalRateBp: smallint("withdrawal_rate_bp"),
    monthlyIncomeCt: text("monthly_income_ct"),
    savedCt: text("saved_ct"),
    retirementAgeCt: text("retirement_age_ct"),
    annualRateCt: text("annual_rate_ct"),
    withdrawalRateCt: text("withdrawal_rate_ct"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    check(
      "financial_goal_plain_xor_ct",
      sql`(
        ${t.monthlyIncomeCents} IS NOT NULL AND ${t.savedCents} IS NOT NULL AND ${t.retirementAge} IS NOT NULL
        AND ${t.annualRateBp} IS NOT NULL AND ${t.withdrawalRateBp} IS NOT NULL
        AND ${t.monthlyIncomeCt} IS NULL AND ${t.savedCt} IS NULL AND ${t.retirementAgeCt} IS NULL
        AND ${t.annualRateCt} IS NULL AND ${t.withdrawalRateCt} IS NULL
      ) OR (
        ${t.monthlyIncomeCents} IS NULL AND ${t.savedCents} IS NULL AND ${t.retirementAge} IS NULL
        AND ${t.annualRateBp} IS NULL AND ${t.withdrawalRateBp} IS NULL
        AND ${t.monthlyIncomeCt} IS NOT NULL AND ${t.savedCt} IS NOT NULL AND ${t.retirementAgeCt} IS NOT NULL
        AND ${t.annualRateCt} IS NOT NULL AND ${t.withdrawalRateCt} IS NOT NULL
      )`,
    ),
    check("financial_goal_income_range", sql`${t.monthlyIncomeCents} BETWEEN 1 AND 100000000`),
    check("financial_goal_saved_range", sql`${t.savedCents} BETWEEN 0 AND 99999999999`),
    check("financial_goal_retirement_age_range", sql`${t.retirementAge} BETWEEN 1 AND 120`),
    check("financial_goal_annual_rate", sql`${t.annualRateBp} BETWEEN 100 AND 1500`),
    check(
      "financial_goal_withdrawal_rate",
      sql`${t.withdrawalRateBp} BETWEEN 100 AND 1500 AND ${t.withdrawalRateBp} <= ${t.annualRateBp}`,
    ),
  ],
);

/** Key material of a user; no row = legacy account (plain-text data). */
export const userVault = pgTable(
  "user_vault",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    kdfVersion: smallint("kdf_version").notNull().default(1),
    /** base64url, 16 bytes. */
    salt: text("salt").notNull(),
    memKib: integer("mem_kib").notNull(),
    iterations: integer("iterations").notNull(),
    parallelism: integer("parallelism").notNull(),
    dekWrappedPw: text("dek_wrapped_pw").notNull(),
    dekWrappedRecovery: text("dek_wrapped_recovery").notNull(),
    /** Sealed birth date (deviation from the design: lives here, not in `user`). */
    birthDateCt: text("birth_date_ct"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [check("user_vault_kdf_version", sql`${t.kdfVersion} = 1`)],
);

export const loginAttempt = pgTable(
  "login_attempt",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempt_email_attempted_at_idx").on(t.email, t.attemptedAt)],
);

/** Signups per client IP (HMAC hash, never the clear IP); rows older than 60 minutes are pruned on insert. */
export const signupAttempt = pgTable(
  "signup_attempt",
  {
    id: serial("id").primaryKey(),
    ipHash: text("ip_hash").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("signup_attempt_ip_hash_attempted_at_idx").on(t.ipHash, t.attemptedAt)],
);

/** One browser/device a user receives pushes on. Stored in the clear (AD-016): endpoint and public keys. */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscription_user_id_idx").on(t.userId)],
);

/** Which notifications a user wants, and at what local hour the daily ones go out. */
export const pushPreference = pgTable(
  "push_preference",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    reminder: boolean("reminder").notNull().default(false),
    due: boolean("due").notNull().default(false),
    security: boolean("security").notNull().default(true),
    admin: boolean("admin").notNull().default(true),
    hour: smallint("hour").notNull().default(9),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("push_preference_hour_range", sql`${t.hour} BETWEEN 0 AND 23`)],
);

/** Idempotency key of a notification: (user, kind, local date or broadcast id) is sent at most once. */
export const pushDispatch = pgTable(
  "push_dispatch",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    ref: text("ref").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind, t.ref] }),
    index("push_dispatch_sent_at_idx").on(t.sentAt),
    check("push_dispatch_kind", sql`${t.kind} IN ('reminder', 'due', 'broadcast')`),
  ],
);

/** Administrator messages waiting for (or done with) delivery by the next dispatch run. */
export const pushBroadcast = pgTable(
  "push_broadcast",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [check("push_broadcast_text_length", sql`char_length(${t.text}) BETWEEN 1 AND 140`)],
);
