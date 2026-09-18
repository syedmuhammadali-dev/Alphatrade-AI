import type { FastifyInstance } from "fastify";
import { backtestRequestSchema } from "@alphatrade/shared-types";
import { createBacktest, listBacktests, getBacktestDetail } from "../services/backtest-service";
import { BacktestingEngineUnavailableError } from "../services/backtesting-engine-client";

export default async function backtestsRoutes(app: FastifyInstance) {
  app.post("/backtests", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = backtestRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    if (Date.parse(parsed.data.endDate) <= Date.parse(parsed.data.startDate)) {
      return reply.code(400).send({ error: "endDate must be after startDate." });
    }

    try {
      const detail = await createBacktest(request.userId!, parsed.data);
      return reply.code(201).send(detail);
    } catch (err) {
      if (err instanceof BacktestingEngineUnavailableError) {
        return reply.code(503).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get("/backtests", { preHandler: app.authenticate }, async (request, reply) => {
    const results = await listBacktests(request.userId!);
    return reply.send({ backtests: results });
  });

  app.get<{ Params: { id: string } }>("/backtests/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const detail = await getBacktestDetail(request.userId!, request.params.id);
    if (!detail) {
      return reply.code(404).send({ error: "Backtest not found." });
    }
    return reply.send(detail);
  });
}
