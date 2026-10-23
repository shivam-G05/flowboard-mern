import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  try {
    await connectDatabase();
    console.log('MongoDB connected');
  } catch (err) {
    console.error(`Could not connect to MongoDB at ${env.MONGO_URI.replace(/\/\/[^@]*@/, '//***@')}: ${err.message}`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`FlowBoard API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting connections, let in-flight requests finish, then close the DB.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down...`);
    const force = setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {
      await disconnectDatabase();
      clearTimeout(force);
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
