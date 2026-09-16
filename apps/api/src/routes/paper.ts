import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  startAccount,
  getAccountSummary,
  getOpenPositions,
  getClosedPositions,
  getPerformance,
  executePaperTrade,
  manualClosePosition,
  DEFAULT_STARTING_BALANCE_USD,
} from "../services/paper-trading-service";

const startBodySchema = z.object({ startingBalanceUsd: z.number().min(100).max(10_000_000).optional() });
const executeBodySchema = z.object({ symbol: z.string().min(1) });

export default async function paperRoutes(app: FastifyInstance) {
  app.post("/paper/start", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = startBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const account = await startAccount(request.userId!, parsed.data.startingBalanceUsd ?? DEFAULT_STARTING_BALANCE_USD);
    return reply.code(201).send({
      balanceUsd: account.balanceUsd,
      startingBalanceUsd: account.startingBalanceUsd,
      createdAt: account.createdAt.toISOString(),
    });
  });

  app.get("/paper/account", { preHandler: app.authenticate }, async (request, reply) => {
    const account = await getAccountSummary(request.userId!);
    if (!account) {
      return reply.code(404).send({ error: "No paper trading account yet — call POST /paper/start first." });
    }
    return reply.send(account);
  });

  app.get("/paper/positions", { preHandler: app.authenticate }, async (request, reply) => {
    const positions = await getOpenPositions(request.userId!);
    return reply.send({ positions });
  });

  app.get("/paper/trades", { preHandler: app.authenticate }, async (request, reply) => {
    const trades = await getClosedPositions(request.userId!);
    return reply.send({ trades });
  });

  app.get("/paper/performance", { preHandler: app.authenticate }, async (request, reply) => {
    const performance = await getPerformance(request.userId!);
    return reply.send(performance);
  });

  app.post("/paper/execute", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = executeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const result = await executePaperTrade(request.userId!, parsed.data.symbol.toUpperCase());
    return reply.send(result);
  });

  app.post<{ Params: { id: string } }>(
    "/paper/positions/:id/close",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await manualClosePosition(request.userId!, request.params.id);
      return reply.send(result);
    },
  );
}
