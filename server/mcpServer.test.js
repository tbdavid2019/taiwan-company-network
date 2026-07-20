import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createCompanyRepository } from "./companyRepository.js";
import { createCompanyMcpServer } from "./mcpServer.js";

function createFixtureRepository() {
  return createCompanyRepository({
    loadAliases: async () => ({}),
    loadDetails: async () => ({ "中聯油脂股份有限公司": { id: "89480404" } }),
    loadGraph: async () => ({
      "中聯油脂股份有限公司": { in: ["泰山企業股份有限公司"], out: [] },
    }),
  });
}

async function withMcpClient(run) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createCompanyMcpServer(createFixtureRepository());
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    await run(client);
  } finally {
    await client.close();
  }
}

test("MCP exposes focused read-only company tools", async () => {
  await withMcpClient(async (client) => {
    const result = await client.listTools();

    assert.deepEqual(
      result.tools.map((tool) => tool.name).sort(),
      [
        "taiwan_company_get_company",
        "taiwan_company_get_relationships",
        "taiwan_company_search_companies",
      ],
    );
    assert.equal(result.tools.every((tool) => tool.annotations?.readOnlyHint === true), true);
  });
});

test("taiwan_company_get_company returns structured content", async () => {
  await withMcpClient(async (client) => {
    const result = await client.callTool({
      name: "taiwan_company_get_company",
      arguments: { company_name: "中聯油脂股份有限公司" },
    });

    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.company.id, "89480404");
    assert.equal(result.structuredContent.company.relationships.upstreamCount, 1);
  });
});

test("MCP returns actionable tool errors", async () => {
  await withMcpClient(async (client) => {
    const result = await client.callTool({
      name: "taiwan_company_get_company",
      arguments: { company_name: "不存在股份有限公司" },
    });

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /COMPANY_NOT_FOUND/);
  });
});
