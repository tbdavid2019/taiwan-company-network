import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCompanyRepository } from "./companyRepository.js";
import { createFileDataSource } from "./dataSource.js";
import { createHttpApp } from "./httpApi.js";
import { mountMcpHttp } from "./mcpHttp.js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = process.env.COMPANY_DATA_DIR || path.join(projectDirectory, "public", "data");
const host = process.env.HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "8787", 10);
const repository = createCompanyRepository(createFileDataSource(dataDirectory));
const app = createHttpApp(repository);
mountMcpHttp(app, repository);

app.listen(port, host, () => {
  console.error(`Taiwan Company Network API: http://${host}:${port}/api/v1`);
  console.error(`Taiwan Company Network MCP: http://${host}:${port}/mcp`);
});
