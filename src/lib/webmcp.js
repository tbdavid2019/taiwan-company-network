const DEFAULT_BASE_URL = "https://taiwan-company-network.david888.com/";
const MAX_TOOL_OUTPUT_LENGTH = 1400;

export function resolveWebMcpModelContext({ documentObject, navigatorObject } = {}) {
  if (typeof documentObject?.modelContext?.registerTool === "function") {
    return { context: documentObject.modelContext, api: "document" };
  }
  if (typeof navigatorObject?.modelContext?.registerTool === "function") {
    return { context: navigatorObject.modelContext, api: "navigator" };
  }
  return { context: null, api: "none" };
}

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/臺/g, "台")
    .replace(/[\s　]/g, "")
    .toLocaleLowerCase();
}

function safeLimit(value, fallback, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(1, Math.floor(parsed)));
}

function companyUrl(name, baseUrl) {
  const url = new URL("graph", baseUrl || DEFAULT_BASE_URL);
  url.searchParams.set("company", name);
  return url.toString();
}

function compactJson(payload) {
  let result = JSON.stringify(payload);
  if (result.length <= MAX_TOOL_OUTPUT_LENGTH) return result;

  const collectionKeys = ["matches", "upstream", "downstream"];
  const compacted = { ...payload, truncated: true };
  for (const key of collectionKeys) {
    if (!Array.isArray(compacted[key])) continue;
    while (compacted[key].length > 0 && JSON.stringify(compacted).length > MAX_TOOL_OUTPUT_LENGTH) {
      compacted[key].pop();
    }
  }
  result = JSON.stringify(compacted);
  return result.length <= MAX_TOOL_OUTPUT_LENGTH
    ? result
    : JSON.stringify({ error: "Tool output exceeded the supported size." });
}

function detailRecord(name, details, aliases, graph, baseUrl) {
  const detail = details[name] || {};
  const node = graph[name] || {};
  const listings = [...new Map(
    aliases
      .map((alias) => alias.record)
      .filter(Boolean)
      .map(({ code, market }) => [`${market}:${code}`, { code, market }]),
  ).values()];

  return {
    name,
    id: detail.id ?? null,
    hasCompanyRecord: Boolean(details[name]),
    capital: detail.資本總額 ?? null,
    representative: detail.代表人姓名 ?? null,
    address: detail.公司所在地 ?? null,
    aliases: aliases.map(({ value }) => value),
    listings,
    connected: Boolean(node.in?.length || node.out?.length),
    webUrl: companyUrl(name, baseUrl),
  };
}

export function buildCompanyToolIndex({ aliases = {}, details = {}, graph = {} } = {}) {
  const names = new Set([
    ...Object.keys(details),
    ...Object.keys(graph),
    ...Object.values(aliases).flat().map((record) => record.name).filter(Boolean),
  ]);
  const aliasesByName = new Map([...names].map((name) => [name, []]));
  const lookup = new Map([...names].map((name) => [normalizeLookup(name), name]));
  const aliasLookup = new Map();

  Object.entries(aliases).forEach(([value, records]) => {
    records.forEach((record) => {
      if (!record?.name || !names.has(record.name)) return;
      const current = aliasesByName.get(record.name);
      if (!current.some((entry) => entry.value === value && entry.record?.code === record.code)) {
        current.push({ value, record });
      }
      const aliasKey = normalizeLookup(value);
      const aliasNames = aliasLookup.get(aliasKey) || [];
      if (!aliasNames.includes(record.name)) aliasNames.push(record.name);
      aliasLookup.set(aliasKey, aliasNames);
    });
  });

  aliasesByName.forEach((entries) => {
    entries.sort((left, right) => left.value.localeCompare(right.value, "zh-Hant", { numeric: true }));
  });

  function resolveName(value) {
    const key = normalizeLookup(value);
    if (!key) return null;
    if (lookup.has(key)) return lookup.get(key);
    const matches = aliasLookup.get(key) || [];
    return matches.length === 1 ? matches[0] : null;
  }

  function get(name, baseUrl) {
    if (!names.has(name)) return null;
    return detailRecord(name, details, aliasesByName.get(name) || [], graph, baseUrl);
  }

  return {
    names: [...names],
    resolveName,
    get,
    graph,
    details,
    aliasesByName,
  };
}

export function executeCompanySearch(index, { query = "", limit = 10, baseUrl } = {}) {
  const normalizedQuery = normalizeLookup(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = index.names
    .map((name) => index.get(name, baseUrl))
    .filter((record) => {
      if (!terms.length) return true;
      const searchable = [record.name, ...record.aliases].map(normalizeLookup);
      return terms.every((term) => searchable.some((value) => value.includes(term)));
    })
    .sort((left, right) => {
      const leftExact = normalizeLookup(left.name) === normalizedQuery || left.aliases.some((alias) => normalizeLookup(alias) === normalizedQuery);
      const rightExact = normalizeLookup(right.name) === normalizedQuery || right.aliases.some((alias) => normalizeLookup(alias) === normalizedQuery);
      if (leftExact !== rightExact) return leftExact ? -1 : 1;
      return left.name.localeCompare(right.name, "zh-Hant");
    });

  const requestedLimit = safeLimit(limit, 10, 20);
  return compactJson({
    query: String(query || "").trim(),
    count: matches.length,
    matches: matches.slice(0, requestedLimit),
  });
}

export function executeCompanyProfile(index, { company, baseUrl } = {}) {
  const name = index.resolveName(company);
  if (!name) return compactJson({ error: `找不到公司或法人：「${String(company || "").trim()}」。請先使用搜尋工具。` });
  return compactJson(index.get(name, baseUrl));
}

export function executeCompanyRelationships(index, { company, direction = "both", limit = 20, baseUrl } = {}) {
  const name = index.resolveName(company);
  if (!name) return compactJson({ error: `找不到公司或法人：「${String(company || "").trim()}」。請先使用搜尋工具。` });
  if (!["both", "upstream", "downstream"].includes(direction)) {
    return compactJson({ error: "direction 必須是 both、upstream 或 downstream。" });
  }

  const node = index.graph[name] || {};
  const requestedLimit = safeLimit(limit, 20, 40);
  const relationships = {
    name,
    upstream: direction === "downstream" ? [] : (node.in || []).slice(0, requestedLimit),
    downstream: direction === "upstream" ? [] : (node.out || []).slice(0, requestedLimit),
    webUrl: companyUrl(name, baseUrl),
  };
  return compactJson(relationships);
}

// API shape and annotations follow Chrome's WebMCP imperative API:
// https://developer.chrome.com/docs/ai/webmcp/imperative-api
export function createCompanyWebMcpTools(index, { baseUrl = DEFAULT_BASE_URL } = {}) {
  return [
    {
      name: "search_taiwan_companies",
      description: "Search the Taiwan company and legal-entity index by registered name, stock code, or listed-company alias. Returns matching records and links to the relationship graph.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Company name, stock code, or listed-company alias to search." },
          limit: { type: "integer", minimum: 1, maximum: 20, description: "Maximum number of matches to return." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => executeCompanySearch(index, { ...input, baseUrl }),
    },
    {
      name: "get_taiwan_company_profile",
      description: "Get a Taiwan company or legal entity's registered ID, capital, representative, address, aliases, and relationship-graph link.",
      inputSchema: {
        type: "object",
        properties: {
          company: { type: "string", description: "Exact registered name, stock code, or listed-company alias." },
        },
        required: ["company"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => executeCompanyProfile(index, { ...input, baseUrl }),
    },
    {
      name: "get_taiwan_company_links",
      description: "Get direct upstream and downstream entities in the Taiwan company relationship index for a named company or legal entity.",
      inputSchema: {
        type: "object",
        properties: {
          company: { type: "string", description: "Exact registered name, stock code, or listed-company alias." },
          direction: { type: "string", enum: ["both", "upstream", "downstream"], description: "Which direct relationship direction to return." },
          limit: { type: "integer", minimum: 1, maximum: 40, description: "Maximum number of entities per direction." },
        },
        required: ["company"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => executeCompanyRelationships(index, { ...input, baseUrl }),
    },
  ];
}

export async function registerCompanyWebMcp(tools, modelContext, { signal } = {}) {
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return { supported: false, registered: [] };
  }

  const registered = [];
  try {
    for (const tool of tools) {
      const options = signal ? { signal } : undefined;
      await modelContext.registerTool(tool, options);
      registered.push(tool.name);
    }
    return { supported: true, registered };
  } catch (error) {
    return {
      supported: true,
      registered,
      error: error?.message || "Unable to register WebMCP tools.",
    };
  }
}
