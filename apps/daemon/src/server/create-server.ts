import cors from "@fastify/cors";
import Fastify from "fastify";
import { Type } from "typebox";
import { loadWorkbenchConfig, type WorkbenchConfig } from "../config/index.js";
import { registerAuthRoutes } from "../routes/auth-routes.js";
import { openWorkbenchDatabase } from "../storage/database.js";

const LOCAL_WEB_ORIGINS = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);

const HealthResponseSchema = Type.Object({
  status: Type.Literal("ok"),
});

export async function createServer(config: WorkbenchConfig = loadWorkbenchConfig()) {
  const database = openWorkbenchDatabase(config.databasePath);
  const allowedHosts = new Set([
    new URL(config.webUrl).host,
    `${config.host}:${config.port}`,
    ...[...LOCAL_WEB_ORIGINS].map((origin) => new URL(origin).host),
  ]);
  if (config.githubOAuth !== null) {
    allowedHosts.add(new URL(config.githubOAuth.callbackUrl).host);
  }
  const server = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  server.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host;
    if (host === undefined || !allowedHosts.has(host)) {
      return reply.status(403).send({
        code: "INVALID_REQUEST_HOST",
        message: "The request host is not allowed",
      });
    }
  });

  await server.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (origin === undefined || origin === config.webUrl || LOCAL_WEB_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed"), false);
    },
  });

  server.addHook("onClose", async () => {
    database.close();
  });

  await registerAuthRoutes(server, config, database.authSessions);

  server.get(
    "/api/health",
    {
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async () => ({ status: "ok" as const }),
  );

  return server;
}
