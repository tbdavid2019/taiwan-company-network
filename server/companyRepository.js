const SITE_URL = "https://tbdavid2019.github.io/taiwan-company-network";

export class CompanyDataError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "CompanyDataError";
    this.code = code;
    this.status = status;
  }
}

function normalize(value) {
  return String(value || "").trim().toLocaleLowerCase("zh-TW");
}

function paginate(items, limit, offset) {
  const page = items.slice(offset, offset + limit);
  return {
    items: page,
    total: items.length,
    limit,
    offset,
    hasMore: offset + page.length < items.length,
    nextOffset: offset + page.length < items.length ? offset + page.length : null,
  };
}

export function createCompanyRepository({ loadAliases, loadDetails, loadGraph }) {
  let indexPromise;
  let detailsPromise;

  async function loadIndex() {
    if (!indexPromise) {
      indexPromise = Promise.all([loadGraph(), loadAliases()]).then(([graph, aliases]) => {
        const aliasesByName = new Map();
        for (const [code, entries] of Object.entries(aliases || {})) {
          for (const entry of entries || []) {
            const current = aliasesByName.get(entry.name) || [];
            current.push({ code: entry.code || code, market: entry.market || null });
            aliasesByName.set(entry.name, current);
          }
        }

        const names = Array.from(new Set([...Object.keys(graph), ...aliasesByName.keys()]));
        return {
          aliases,
          aliasesByName,
          graph,
          searchable: names.map((name) => ({ name, normalizedName: normalize(name) })),
        };
      });
    }
    return indexPromise;
  }

  async function getDetails() {
    detailsPromise ||= loadDetails();
    return detailsPromise;
  }

  async function searchCompanies({ query, limit = 20, offset = 0 }) {
    const normalizedQuery = normalize(query);
    const { aliases, aliasesByName, searchable } = await loadIndex();
    const aliasMatches = new Set((aliases[query] || []).map((entry) => entry.name));
    const matches = searchable
      .filter(({ name, normalizedName }) => aliasMatches.has(name) || normalizedName.includes(normalizedQuery))
      .sort((a, b) => {
        const rank = ({ name, normalizedName }) => {
          if (normalize(name) === normalizedQuery) return 0;
          if (aliasMatches.has(name)) return 1;
          if (normalizedName.startsWith(normalizedQuery)) return 2;
          return 3;
        };
        return rank(a) - rank(b) || a.name.localeCompare(b.name, "zh-TW");
      })
      .map(({ name }) => ({ name, aliases: aliasesByName.get(name) || [] }));

    return paginate(matches, limit, offset);
  }

  async function getCompany(name) {
    const [{ aliasesByName, graph }, details] = await Promise.all([loadIndex(), getDetails()]);
    const detail = details[name];
    const relationships = graph[name];
    if (!detail && !relationships) {
      throw new CompanyDataError("COMPANY_NOT_FOUND", `找不到公司：${name}`, 404);
    }

    return {
      name,
      id: detail?.id || null,
      capital: detail?.資本總額 ?? null,
      representative: detail?.代表人姓名 || null,
      address: detail?.公司所在地 || null,
      aliases: aliasesByName.get(name) || [],
      relationships: {
        upstreamCount: relationships?.in?.length || 0,
        downstreamCount: relationships?.out?.length || 0,
      },
      webUrl: `${SITE_URL}/graph?company=${encodeURIComponent(name)}`,
    };
  }

  async function getRelationships(name, { direction = "both", limit = 50, offset = 0 }) {
    const { graph } = await loadIndex();
    if (!graph[name]) {
      const details = await getDetails();
      if (!details[name]) throw new CompanyDataError("COMPANY_NOT_FOUND", `找不到公司：${name}`, 404);
    }

    const relationships = graph[name] || { in: [], out: [] };
    const items = [];
    if (direction === "both" || direction === "upstream") {
      items.push(...(relationships.in || []).map((companyName) => ({ companyName, direction: "upstream" })));
    }
    if (direction === "both" || direction === "downstream") {
      items.push(...(relationships.out || []).map((companyName) => ({ companyName, direction: "downstream" })));
    }
    return { companyName: name, direction, ...paginate(items, limit, offset) };
  }

  return { getCompany, getRelationships, searchCompanies };
}
