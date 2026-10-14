import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

export type Database = { db: Db; pool: pg.Pool };

export function connect(url: string): Database {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return { db: drizzle(pool, { schema }), pool };
}
