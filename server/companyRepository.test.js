import assert from "node:assert/strict";
import test from "node:test";

import { createCompanyRepository } from "./companyRepository.js";

function createFixtureRepository() {
  return createCompanyRepository({
    loadAliases: async () => ({
      "2330": [{ code: "2330", market: "TWSE", name: "台灣積體電路製造股份有限公司" }],
    }),
    loadDetails: async () => ({
      "中聯油脂股份有限公司": {
        id: "89480404",
        公司所在地: "臺中市清水區海濱里北堤路1-8號",
        代表人姓名: "蔡_松",
        資本總額: 1600000000,
      },
      "台灣積體電路製造股份有限公司": { id: "22099131" },
    }),
    loadGraph: async () => ({
      "中聯油脂股份有限公司": {
        in: ["泰山企業股份有限公司", "福壽實業股份有限公司"],
        out: ["測試下游股份有限公司"],
      },
      "台灣積體電路製造股份有限公司": { in: [], out: [] },
    }),
  });
}

test("searchCompanies supports company names, stock codes, and pagination", async () => {
  const repository = createFixtureRepository();

  const byName = await repository.searchCompanies({ query: "中聯", limit: 10, offset: 0 });
  const byCode = await repository.searchCompanies({ query: "2330", limit: 1, offset: 0 });

  assert.equal(byName.total, 1);
  assert.equal(byName.items[0].name, "中聯油脂股份有限公司");
  assert.equal(byName.hasMore, false);
  assert.deepEqual(byCode.items[0].aliases, [{ code: "2330", market: "TWSE" }]);
});

test("getCompany combines details with relationship counts", async () => {
  const repository = createFixtureRepository();

  const company = await repository.getCompany("中聯油脂股份有限公司");

  assert.equal(company.id, "89480404");
  assert.equal(company.capital, 1600000000);
  assert.deepEqual(company.relationships, { upstreamCount: 2, downstreamCount: 1 });
});

test("getRelationships filters direction and paginates", async () => {
  const repository = createFixtureRepository();

  const result = await repository.getRelationships("中聯油脂股份有限公司", {
    direction: "upstream",
    limit: 1,
    offset: 1,
  });

  assert.equal(result.total, 2);
  assert.equal(result.items[0].companyName, "福壽實業股份有限公司");
  assert.equal(result.items[0].direction, "upstream");
  assert.equal(result.hasMore, false);
});

test("getCompany reports a stable not-found error", async () => {
  const repository = createFixtureRepository();

  await assert.rejects(
    repository.getCompany("不存在股份有限公司"),
    (error) => error.code === "COMPANY_NOT_FOUND" && error.status === 404,
  );
});
