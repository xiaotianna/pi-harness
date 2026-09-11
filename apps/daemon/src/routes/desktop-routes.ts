import type { FastifyInstance } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import { DesktopController } from "../controllers/desktop-controller.js";

export async function registerDesktopRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
): Promise<void> {
  const controller = new DesktopController(config, () => {
    const closing = server.close();
    server.server.closeAllConnections();
    return closing;
  });
  server.get("/__desktop/bootstrap", controller.getBootstrapPage);
  server.post("/__desktop/bootstrap", controller.authorize);
  server.post("/__desktop/shutdown", controller.shutdown);
}
