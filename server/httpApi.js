import express from "express";
import { z } from "zod";

import { CompanyDataError } from "./companyRepository.js";

const paginationSchema = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
};
const searchSchema = z.object({
  query: z.string().trim().min(1).max(100),
  ...paginationSchema,
});
const relationshipSchema = z.object({
  direction: z.enum(["both", "upstream", "downstream"]).default("both"),
  ...paginationSchema,
});

function pageResponse(result) {
  return {
    data: result.items,
    pagination: {
      limit: result.limit,
      offset: result.offset,
      totalItems: result.total,
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
    },
  };
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response)).catch(next);
}

export function createHttpApp(repository) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use((request, response, next) => {
    response.set("Access-Control-Allow-Origin", "*");
    if (request.method === "GET" && request.path.startsWith("/api/")) {
      response.set("Cache-Control", "public, max-age=300");
    }
    next();
  });

  app.get("/api/v1/health", (_request, response) => {
    response.json({ data: { service: "taiwan-company-network-api", status: "ok", version: "1.0.0" } });
  });

  app.get("/api/v1/companies", asyncRoute(async (request, response) => {
    const input = searchSchema.parse(request.query);
    response.json(pageResponse(await repository.searchCompanies(input)));
  }));

  app.get("/api/v1/companies/:name/relationships", asyncRoute(async (request, response) => {
    const input = relationshipSchema.parse(request.query);
    const result = await repository.getRelationships(request.params.name, input);
    response.json({ companyName: result.companyName, direction: result.direction, ...pageResponse(result) });
  }));

  app.get("/api/v1/companies/:name", asyncRoute(async (request, response) => {
    response.json({ data: await repository.getCompany(request.params.name) });
  }));

  app.use((error, _request, response, _next) => {
    if (error instanceof z.ZodError) {
      return response.status(422).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid request parameters", details: error.flatten() },
      });
    }
    if (error instanceof CompanyDataError) {
      return response.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    console.error(error);
    return response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } });
  });

  return app;
}
