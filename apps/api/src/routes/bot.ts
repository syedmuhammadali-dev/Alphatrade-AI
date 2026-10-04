import type { FastifyInstance } from "fastify";
import { getBotStatusForUser, applyBotAction, InvalidBotTransitionError, type BotAction } from "../services/bot-service";

const ACTIONS: BotAction[] = ["start", "pause", "resume", "stop", "emergency-stop", "reset"];

export default async function botRoutes(app: FastifyInstance) {
  app.get("/bot/status", { preHandler: app.authenticate }, async (request, reply) => {
    const status = await getBotStatusForUser(request.userId!);
    return reply.send(status);
  });

  for (const action of ACTIONS) {
    app.post(`/bot/${action}`, { preHandler: app.authenticate }, async (request, reply) => {
      try {
        await applyBotAction(request.userId!, action);
        return reply.send(await getBotStatusForUser(request.userId!));
      } catch (err) {
        if (err instanceof InvalidBotTransitionError) {
          return reply.code(409).send({ error: err.message });
        }
        throw err;
      }
    });
  }
}
