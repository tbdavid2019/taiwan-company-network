import assert from "node:assert/strict";
import test from "node:test";

import { buildCompanyShards, shardFileName } from "./build-static-api.mjs";

test("shardFileName uses the first Unicode code point", () => {
  assert.equal(shardFileName("中聯油脂股份有限公司"), "4e2d.json");
  assert.equal(shardFileName("𠀀測試公司"), "20000.json");
});

test("buildCompanyShards combines details, aliases, and relationships", () => {
  const result = buildCompanyShards({
    aliases: {
      "2330": [{ code: "2330", market: "TWSE", name: "台灣積體電路製造股份有限公司" }],
    },
    details: {
      "中聯油脂股份有限公司": { id: "89480404", 資本總額: 1600000000 },
      "台灣積體電路製造股份有限公司": { id: "22099131" },
    },
    graph: {
      "中聯油脂股份有限公司": { in: ["泰山企業股份有限公司"], out: [] },
    },
  });

  assert.equal(result.index.companyShards["中"], "companies/4e2d.json");
  assert.equal(result.shards.get("中").data["中聯油脂股份有限公司"].id, "89480404");
  assert.deepEqual(
    result.shards.get("中").data["中聯油脂股份有限公司"].relationships.upstream,
    ["泰山企業股份有限公司"],
  );
  assert.deepEqual(
    result.shards.get("台").data["台灣積體電路製造股份有限公司"].aliases,
    [{ code: "2330", market: "TWSE" }],
  );
});
