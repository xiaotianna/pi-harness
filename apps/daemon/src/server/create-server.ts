import cors from "@fastify/cors";
import { AgentManager } from "@pi-harness/agent-runtime";
import Fastify from "fastify";
import { type HarnessConfig, loadHarnessConfig } from "../config/index.js";
import { registerAuthRoutes } from "../routes/auth-routes.js";
import { registerHealthRoutes } from "../routes/health-routes.js";
import { registerProviderRoutes } from "../routes/provider-routes.js";
import { registerSessionRoutes } from "../routes/session-routes.js";
import { registerWorkspaceRoutes } from "../routes/workspace-routes.js";
import { HumanInteractionService } from "../services/human-interaction-service.js";
import { ProviderService } from "../services/provider-service.js";
import { SessionEventService } from "../services/session-event-service.js";
import { SessionService } from "../services/session-service.js";
import { WorkspaceService } from "../services/workspace-service.js";
import { SessionEventBroker } from "../sse/session-event-broker.js";
import { openHarnessDatabase } from "../storage/database.js";
import { FileCredentialStore } from "../storage/provider-credential-store.js";
import { SessionEventStore } from "../storage/session-event-store.js";

const LOCAL_WEB_ORIGINS = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);

export async function createServer(config: HarnessConfig = loadHarnessConfig()) {
  const server = Fastify({
    logger: {
      level: config.logLevel,
    },
  });
  const database = openHarnessDatabase(config.databasePath);
  const credentials = await FileCredentialStore.open(config.credentialsPath);
  const eventStore = new SessionEventStore(config.sessionsPath);
  await eventStore.initialize();
  const broker = new SessionEventBroker();
  const sessionEvents = new SessionEventService(database.sessions, eventStore, broker);
  const interactions = new HumanInteractionService();
  const agents = new AgentManager(sessionEvents.handle, interactions.request, [
    config.credentialsPath,
    config.databasePath,
    config.sessionsPath,
  ]);
  const workspaces = new WorkspaceService(database.workspaces);
  let sessions: SessionService | undefined;
  const providers = await ProviderService.create(
    database.providerSettings,
    credentials,
    (providerId) =>
      agents.isProviderActive(providerId) || (sessions?.isProviderActive(providerId) ?? false),
  );
  sessions = new SessionService(
    database.sessions,
    database.workspaces,
    eventStore,
    providers,
    agents,
    interactions,
    (error, context) => {
      server.log.error({ err: error, ...context }, "Session run failed outside Agent events");
    },
  );
  const allowedHosts = new Set([
    new URL(config.webUrl).host,
    `${config.host}:${config.port}`,
    ...[...LOCAL_WEB_ORIGINS].map((origin) => new URL(origin).host),
  ]);
  if (config.githubOAuth !== null) {
    allowedHosts.add(new URL(config.githubOAuth.callbackUrl).host);
  }
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
    workspaces.close();
    await sessions.close();
    await providers.close();
    broker.clear();
    database.close();
  });

  await registerAuthRoutes(server, config, database.authSessions);
  await registerHealthRoutes(server);
  await registerProviderRoutes(server, config, providers);
  await registerSessionRoutes(server, config, sessions, broker);
  await registerWorkspaceRoutes(server, config, workspaces);

  return server;
}
