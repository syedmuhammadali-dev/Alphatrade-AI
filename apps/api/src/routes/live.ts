import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getOpenLivePositions,
  getClosedLivePositions,
  executeLiveTrade,
  manualCloseLivePosition,
} from "../services/live-trading-service";

const executeBodySchema = z.object({ symbol: z.string().min(1), connectionId: z.string().min(1) });

export default async function liveRoutes(app: FastifyInstance) {
  app.get("/live/positions", { preHandler: app.authenticate }, async (request, reply) => {
    return reply.send({ positions: await getOpenLivePositions(request.userId!) });
  });

  app.get("/live/trades", { preHandler: app.authenticate }, async (request, reply) => {
    return reply.send({ trades: await getClosedLivePositions(request.userId!) });
  });

  app.post("/live/execute", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = executeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const result = await executeLiveTrade(request.userId!, parsed.data.symbol.toUpperCase(), parsed.data.connectionId);
    return reply.send(result);
  });

  app.post<{ Params: { id: string } }>(
    "/live/positions/:id/close",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await manualCloseLivePosition(request.userId!, request.params.id);
      return reply.send(result);
    },
  );
}
