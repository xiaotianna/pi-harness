import type { FastifyInstance } from "fastify";
import { HealthController } from "../controllers/health-controller.js";
import { HealthVoSchema } from "../vo/health-vo.js";

/** 仅声明健康检查接口路径、schema 与对应 controller。 */
export async function registerHealthRoutes(server: FastifyInstance): Promise<void> {
  const controller = new HealthController();

  server.get(
    "/api/health",
    {
      schema: {
        response: {
          200: HealthVoSchema,
        },
      },
    },
    controller.getHealth,
  );
}
