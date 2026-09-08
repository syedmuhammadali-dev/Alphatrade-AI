import type { FastifyInstance } from "fastify";
import { getBotStatusForUser } from "../services/bot-service";

export default async function botRoutes(app: FastifyInstance) {
  app.get("/bot/status", { preHandler: app.authenticate }, async (request, reply) => {
    const status = await getBotStatusForUser(request.userId!);
    return reply.send(status);
  });
}
