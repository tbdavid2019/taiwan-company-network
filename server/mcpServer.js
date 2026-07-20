import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const aliasSchema = z.object({ code: z.string(), market: z.string().nullable() });
const companySummarySchema = z.object({ name: z.string(), aliases: z.array(aliasSchema) });
const companySchema = z.object({
  name: z.string(),
  id: z.string().nullable(),
  capital: z.number().nullable(),
  representative: z.string().nullable(),
  address: z.string().nullable(),
  aliases: z.array(aliasSchema),
  relationships: z.object({ upstreamCount: z.number(), downstreamCount: z.number() }),
  webUrl: z.string(),
});
const paginationOutputSchema = {
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
  nextOffset: z.number().nullable(),
};

function asToolError(error) {
  const code = error?.code || "INTERNAL_ERROR";
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: `${code}: ${message}` }],
  };
}

function toolResult(structuredContent, markdown) {
  return { content: [{ type: "text", text: markdown }], structuredContent };
}

export function createCompanyMcpServer(repository) {
  const server = new McpServer(
    { name: "taiwan-company-network-mcp-server", version: "1.0.0" },
    {
      instructions: "Search for a company before requesting its details or relationships when the exact registered name is unknown. Treat relationship directions as index links, not verified ownership claims.",
    },
  );

  server.registerTool(
    "taiwan_company_search_companies",
    {
      title: "Search Taiwan Companies",
      description: "Search registered Taiwan company names by partial name or TWSE/TPEx stock code. Returns paginated company names and listed-company aliases.",
      inputSchema: {
        query: z.string().trim().min(1).max(100).describe("Partial registered company name or stock code, such as 中聯油脂 or 2330"),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      },
      outputSchema: { results: z.array(companySummarySchema), ...paginationOutputSchema },
      annotations,
    },
    async ({ query, limit, offset }) => {
      try {
        const result = await repository.searchCompanies({ query, limit, offset });
        const structuredContent = {
          results: result.items,
          limit: result.limit,
          offset: result.offset,
          total: result.total,
          hasMore: result.hasMore,
          nextOffset: result.nextOffset,
        };
        const lines = result.items.map((item) => {
          const aliases = item.aliases.map(({ code, market }) => `${code}${market ? ` (${market})` : ""}`).join(", ");
          return `- ${item.name}${aliases ? ` — ${aliases}` : ""}`;
        });
        return toolResult(structuredContent, lines.length ? lines.join("\n") : "找不到符合的公司。");
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "taiwan_company_get_company",
    {
      title: "Get Taiwan Company",
      description: "Get one Taiwan company's registration summary, listed-company aliases, relationship counts, and public relationship-map URL using its exact registered name.",
      inputSchema: {
        company_name: z.string().trim().min(1).max(200).describe("Exact registered company name"),
      },
      outputSchema: { company: companySchema },
      annotations,
    },
    async ({ company_name }) => {
      try {
        const company = await repository.getCompany(company_name);
        return toolResult(
          { company },
          `## ${company.name}\n\n- 統一編號：${company.id || "無資料"}\n- 資本總額：${company.capital ?? "無資料"}\n- 代表人：${company.representative || "無資料"}\n- 地址：${company.address || "無資料"}\n- 上游／下游關係：${company.relationships.upstreamCount}／${company.relationships.downstreamCount}\n- 關係圖：${company.webUrl}`,
        );
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  server.registerTool(
    "taiwan_company_get_relationships",
    {
      title: "Get Taiwan Company Relationships",
      description: "List paginated upstream, downstream, or all direct indexed relationships for an exact Taiwan company name. These links are not independently verified ownership claims.",
      inputSchema: {
        company_name: z.string().trim().min(1).max(200).describe("Exact registered company name"),
        direction: z.enum(["both", "upstream", "downstream"]).default("both"),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      },
      outputSchema: {
        companyName: z.string(),
        direction: z.enum(["both", "upstream", "downstream"]),
        relationships: z.array(z.object({ companyName: z.string(), direction: z.enum(["upstream", "downstream"]) })),
        ...paginationOutputSchema,
      },
      annotations,
    },
    async ({ company_name, direction, limit, offset }) => {
      try {
        const result = await repository.getRelationships(company_name, { direction, limit, offset });
        const structuredContent = {
          companyName: result.companyName,
          direction: result.direction,
          relationships: result.items,
          limit: result.limit,
          offset: result.offset,
          total: result.total,
          hasMore: result.hasMore,
          nextOffset: result.nextOffset,
        };
        const lines = result.items.map((item) => `- ${item.direction === "upstream" ? "上游" : "下游"}：${item.companyName}`);
        return toolResult(structuredContent, lines.length ? lines.join("\n") : "沒有符合方向的直接關係。");
      } catch (error) {
        return asToolError(error);
      }
    },
  );

  return server;
}
