import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { createLogger } from "@alphatrade/shared-config";
import { tradeProposalSchema, riskConfigSchema, accountStateSchema } from "@alphatrade/shared-types";
import { evaluateProposal } from "@alphatrade/risk-engine";

const checkRequestSchema = z.object({
  proposal: tradeProposalSchema,
  config: riskConfigSchema.partial().optional(),
  accountState: accountStateSchema.partial().optional(),
});

export async function buildApp() {
  const logger = createLogger("risk-engine");
  const app = Fastify({ loggerInstance: logger });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.post("/internal/check", async (request, reply) => {
    const parsed = checkRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }

    const config = riskConfigSchema.parse(parsed.data.config ?? {});
    const accountState = accountStateSchema.parse(parsed.data.accountState ?? {});
    const result = evaluateProposal(parsed.data.proposal, config, accountState);

    return reply.send(result);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: statusCode >= 500 ? "Internal server error." : error.message });
  });

  return app;
}
