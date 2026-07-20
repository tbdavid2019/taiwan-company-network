#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createCompanyRepository } from "./companyRepository.js";
import { createFileDataSource } from "./dataSource.js";
import { createCompanyMcpServer } from "./mcpServer.js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = process.env.COMPANY_DATA_DIR || path.join(projectDirectory, "public", "data");
const repository = createCompanyRepository(createFileDataSource(dataDirectory));
const server = createCompanyMcpServer(repository);

await server.connect(new StdioServerTransport());
