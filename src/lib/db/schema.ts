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

export const category = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
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
    percentMicro: integer("percent_micro").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.fromMonth] }),
    check("category_percent_micro_range", sql`${t.percentMicro} BETWEEN 1 AND 100000000`),
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
    name: varchar("name", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
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
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "restrict" }),
    subcategoryId: uuid("subcategory_id"),
    description: varchar("description", { length: 120 }),
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
    monthlyIncomeCents: bigint("monthly_income_cents", { mode: "number" }).notNull(),
    savedCents: bigint("saved_cents", { mode: "number" }).notNull(),
    retirementAge: smallint("retirement_age").notNull(),
    annualRateBp: smallint("annual_rate_bp").notNull().default(800),
    withdrawalRateBp: smallint("withdrawal_rate_bp").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
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

export const loginAttempt = pgTable(
  "login_attempt",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempt_email_attempted_at_idx").on(t.email, t.attemptedAt)],
);
