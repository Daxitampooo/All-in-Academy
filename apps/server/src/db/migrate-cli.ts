import { loadConfig } from '../config';
import { connect } from './client';
import { runMigrations } from './migrate';

const config = loadConfig();
const { db, pool } = connect(config.databaseUrl);
await runMigrations(db);
await pool.end();
console.log('Database is up to date');
