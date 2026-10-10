import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { poolOptions } from "./pool-options";
import * as authSchema from "./auth-schema";
import * as domainSchema from "./schema";

export const schema = { ...authSchema, ...domainSchema };

export const pool = new Pool(poolOptions(process.env));

export const db = drizzle({ client: pool, schema });

export type Db = typeof db;
