import type { FastifyInstance } from "fastify";
import { connectExchangeRequestSchema } from "@alphatrade/shared-types";
import { connectExchange, listConnections, testConnection, deleteConnection } from "../services/exchange-connection-service";

export default async function exchangeConnectionsRoutes(app: FastifyInstance) {
  app.post("/exchange-connections", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = connectExchangeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const connection = await connectExchange(request.userId!, parsed.data);
    return reply.code(201).send(connection);
  });

  app.get("/exchange-connections", { preHandler: app.authenticate }, async (request, reply) => {
    return reply.send({ connections: await listConnections(request.userId!) });
  });

  app.post<{ Params: { id: string } }>(
    "/exchange-connections/:id/test",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await testConnection(request.userId!, request.params.id);
      if (!result) return reply.code(404).send({ error: "Connection not found." });
      return reply.send(result);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/exchange-connections/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const deleted = await deleteConnection(request.userId!, request.params.id);
      if (!deleted) return reply.code(404).send({ error: "Connection not found." });
      return reply.code(204).send();
    },
  );
}
