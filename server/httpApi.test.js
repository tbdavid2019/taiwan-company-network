import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { createCompanyRepository } from "./companyRepository.js";
import { createHttpApp } from "./httpApi.js";

function createFixtureApp() {
  const repository = createCompanyRepository({
    loadAliases: async () => ({}),
    loadDetails: async () => ({ "中聯油脂股份有限公司": { id: "89480404" } }),
    loadGraph: async () => ({
      "中聯油脂股份有限公司": { in: ["泰山企業股份有限公司"], out: [] },
    }),
  });
  return createHttpApp(repository);
}

test("GET /api/v1/companies returns structured search results", async () => {
  const response = await request(createFixtureApp()).get("/api/v1/companies").query({ query: "中聯" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].name, "中聯油脂股份有限公司");
  assert.equal(response.body.pagination.totalItems, 1);
});

test("GET /api/v1/companies validates the query", async () => {
  const response = await request(createFixtureApp()).get("/api/v1/companies");

  assert.equal(response.status, 422);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("GET /api/v1/companies/:name exposes company details", async () => {
  const name = encodeURIComponent("中聯油脂股份有限公司");
  const response = await request(createFixtureApp()).get(`/api/v1/companies/${name}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "89480404");
  assert.equal(response.body.data.relationships.upstreamCount, 1);
});

test("GET /api/v1/companies/:name/relationships validates direction", async () => {
  const name = encodeURIComponent("中聯油脂股份有限公司");
  const response = await request(createFixtureApp())
    .get(`/api/v1/companies/${name}/relationships`)
    .query({ direction: "sideways" });

  assert.equal(response.status, 422);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
