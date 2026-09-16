import type { FastifyInstance } from "fastify";
import { riskConfigSchema } from "@alphatrade/shared-types";
import { getRiskConfig, updateRiskConfig } from "../services/risk-config-service";

const partialRiskConfigSchema = riskConfigSchema.partial();

export default async function riskRoutes(app: FastifyInstance) {
  app.get("/risk/config", { preHandler: app.authenticate }, async (request, reply) => {
    const config = await getRiskConfig(request.userId!);
    return reply.send({ config });
  });

  app.patch("/risk/config", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = partialRiskConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const config = await updateRiskConfig(request.userId!, parsed.data);
    return reply.send({ config });
  });
}
