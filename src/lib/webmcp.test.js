import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompanyToolIndex,
  createCompanyWebMcpTools,
  executeCompanySearch,
  executeCompanyProfile,
  executeCompanyRelationships,
  registerCompanyWebMcp,
} from "./webmcp.js";

const index = buildCompanyToolIndex({
  aliases: {
    "2330": [{ code: "2330", market: "TWSE", name: "台灣積體電路製造股份有限公司" }],
    台積電: [{ code: "2330", market: "TWSE", name: "台灣積體電路製造股份有限公司" }],
  },
  details: {
    "台灣積體電路製造股份有限公司": {
      id: "22099131",
      資本總額: 280000000000,
      代表人姓名: "魏哲家",
      公司地址: "新竹市",
    },
  },
  graph: {
    "台灣積體電路製造股份有限公司": { in: ["國家發展基金"], out: ["台積電全球研發中心"] },
    "國家發展基金": { in: [], out: ["台灣積體電路製造股份有限公司"] },
  },
});

test("buildCompanyToolIndex resolves names, aliases, listings, and relationships", () => {
  assert.deepEqual(index.resolveName("2330"), "台灣積體電路製造股份有限公司");
  assert.deepEqual(index.resolveName("台積電"), "台灣積體電路製造股份有限公司");
  assert.deepEqual(index.resolveName("台灣積體電路製造股份有限公司"), "台灣積體電路製造股份有限公司");
  assert.deepEqual(index.resolveName("不存在"), null);
  assert.deepEqual(index.get("台灣積體電路製造股份有限公司").aliases, ["2330", "台積電"]);
});

test("executeCompanySearch returns compact matching records", () => {
  const result = JSON.parse(executeCompanySearch(index, { query: "台積電", limit: 5 }));

  assert.equal(result.count, 1);
  assert.equal(result.matches[0].name, "台灣積體電路製造股份有限公司");
  assert.deepEqual(result.matches[0].aliases, ["2330", "台積電"]);
  assert.equal(result.matches[0].hasCompanyRecord, true);
});

test("profile and relationships resolve stock aliases and keep outputs bounded", () => {
  const profile = JSON.parse(executeCompanyProfile(index, { company: "2330" }));
  const relationships = JSON.parse(executeCompanyRelationships(index, {
    company: "台積電",
    direction: "upstream",
    limit: 10,
  }));

  assert.equal(profile.name, "台灣積體電路製造股份有限公司");
  assert.equal(profile.id, "22099131");
  assert.deepEqual(relationships.upstream, ["國家發展基金"]);
  assert.deepEqual(relationships.downstream, []);
  assert.match(profile.webUrl, /\/graph\?company=/);
  assert.ok(JSON.stringify(profile).length <= 1400);
  assert.ok(JSON.stringify(relationships).length <= 1400);
});

test("relationships reject unsupported directions instead of guessing", () => {
  const result = JSON.parse(executeCompanyRelationships(index, {
    company: "台積電",
    direction: "sideways",
  }));

  assert.match(result.error, /direction/);
});

test("tools use read-only annotations and documented input schemas", () => {
  const tools = createCompanyWebMcpTools(index, { baseUrl: "https://example.com/" });

  assert.deepEqual(tools.map((tool) => tool.name), [
    "search_taiwan_companies",
    "get_taiwan_company_profile",
    "get_taiwan_company_links",
  ]);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.untrustedContentHint, true);
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.description.length <= 500);
  }
});

test("registerCompanyWebMcp uses document.modelContext and returns a cleanup signal", async () => {
  const calls = [];
  const modelContext = {
    registerTool: async (tool, options) => {
      calls.push({ name: tool.name, signal: options.signal });
    },
  };
  const controller = new AbortController();
  const tools = createCompanyWebMcpTools(index);

  const result = await registerCompanyWebMcp(tools, modelContext, { signal: controller.signal });

  assert.equal(result.supported, true);
  assert.deepEqual(result.registered, tools.map((tool) => tool.name));
  assert.equal(calls[0].signal, controller.signal);
});

test("registerCompanyWebMcp gracefully reports unsupported browsers", async () => {
  const result = await registerCompanyWebMcp([], {});

  assert.deepEqual(result, { supported: false, registered: [] });
});
