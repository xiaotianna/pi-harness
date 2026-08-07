import cors from "@fastify/cors";
import Fastify from "fastify";
import { Type } from "typebox";

const LOCAL_WEB_ORIGINS = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);

const HealthResponseSchema = Type.Object({
  status: Type.Literal("ok"),
});

export async function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.PI_WORKBENCH_LOG_LEVEL ?? "info",
    },
  });

  await server.register(cors, {
    origin(origin, callback) {
      if (origin === undefined || LOCAL_WEB_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed"), false);
    },
  });

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
