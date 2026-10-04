import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
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
    // clock_timestamp() (not now()) so rows inserted in the same DB transaction keep their creation order.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    check("category_percent_bp_range", sql`${t.percentBp} BETWEEN 1 AND 10000`),
    uniqueIndex("category_user_lower_name_unique").on(t.userId, sql`lower(${t.name})`),
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
