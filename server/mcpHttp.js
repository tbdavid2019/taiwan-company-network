import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createCompanyMcpServer } from "./mcpServer.js";

export function mountMcpHttp(app, repository) {
  app.post("/mcp", async (request, response) => {
    const server = createCompanyMcpServer(repository);
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    });
    response.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      console.error(error);
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal MCP server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_request, response) => {
    response.status(405).set("Allow", "POST").json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for stateless MCP requests" } });
  });
}
