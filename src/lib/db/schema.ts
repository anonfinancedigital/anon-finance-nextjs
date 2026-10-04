import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
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
    percentBp: integer("percent_bp").notNull(),
    /** Index 1..8 of the category color palette (`--viz-1` … `--viz-8`). */
    color: integer("color").notNull(),
    // clock_timestamp() (not now()) so rows inserted in the same DB transaction keep their creation order.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    check("category_percent_bp_range", sql`${t.percentBp} BETWEEN 1 AND 10000`),
    check("category_color_range", sql`${t.color} BETWEEN 1 AND 8`),
    uniqueIndex("category_user_lower_name_unique").on(t.userId, sql`lower(${t.name})`),
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
    index("transaction_user_date_idx").on(t.userId, t.date),
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
