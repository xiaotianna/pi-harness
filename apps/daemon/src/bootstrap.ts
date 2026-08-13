import { loadWorkbenchConfig } from "./config/index.js";
import { createServer } from "./server/create-server.js";

const config = loadWorkbenchConfig();
const server = await createServer(config);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  server.log.info({ signal }, "Shutting down daemon");
  await server.close();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      server.log.error({ err: error, signal }, "Daemon shutdown failed");
      process.exitCode = 1;
    });
  });
}

try {
  await server.listen({ host: config.host, port: config.port });
} catch (error: unknown) {
  server.log.error({ err: error }, "Daemon startup failed");
  process.exitCode = 1;
}
