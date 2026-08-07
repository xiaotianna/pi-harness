import { createServer } from "./server/create-server.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4310;

function resolvePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PI_WORKBENCH_PORT must be an integer between 1 and 65535");
  }

  return port;
}

const server = await createServer();
const host = process.env.PI_WORKBENCH_HOST ?? DEFAULT_HOST;
const port = resolvePort(process.env.PI_WORKBENCH_PORT);

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
  await server.listen({ host, port });
} catch (error: unknown) {
  server.log.error({ err: error }, "Daemon startup failed");
  process.exitCode = 1;
}
