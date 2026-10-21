import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb, migrate } from './db/db.js';
import { devSeed } from './seed/dev-seed.js';

const config = loadConfig();
const db = createDb(config.databaseUrl);

const applied = await migrate(db);
if (applied.length) console.log(JSON.stringify({ level: 'info', msg: 'migrations applied', applied }));
if (config.devSeed) await devSeed(db, config, (line) => console.log(line));

const { app } = await createApp(config, db);
app.enableShutdownHooks();
await app.listen(config.port, '0.0.0.0');
console.log(JSON.stringify({ level: 'info', msg: 'listening', port: config.port, env: config.env, devSeed: config.devSeed }));
