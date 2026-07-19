import { readFile, writeFile } from "node:fs/promises";

const sources = [
  {
    market: "TWSE",
    url: "https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
    name: "公司名稱",
    alias: "公司簡稱",
    code: "公司代號",
  },
  {
    market: "TPEx",
    url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O",
    name: "CompanyName",
    alias: "CompanyAbbreviation",
    code: "SecuritiesCompanyCode",
  },
];

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/臺/g, "台")
    .replace(/[\s　]/g, "")
    .replace(/[（）()]/g, "")
    .trim();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

const dataDirectory = new URL("../public/data/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("company_details_manifest.json", dataDirectory), "utf8"));
const detailChunks = await Promise.all(
  manifest.chunks.map((fileName) => readFile(new URL(fileName, dataDirectory), "utf8").then(JSON.parse)),
);
const details = Object.assign({}, ...detailChunks);
const knownCompanyNames = new Map(
  Object.keys(details).map((name) => [normalizeName(name), name]),
);
const aliases = new Map();

for (const source of sources) {
  const records = await fetchJson(source.url);
  for (const record of records) {
    const registeredName = knownCompanyNames.get(normalizeName(record[source.name]));
    const alias = String(record[source.alias] || "").trim();
    const code = String(record[source.code] || "").trim();
    if (!registeredName || !alias) continue;

    for (const lookup of [alias, code]) {
      if (!lookup) continue;
      const entries = aliases.get(lookup) || [];
      if (!entries.some((entry) => entry.name === registeredName && entry.code === code)) {
        entries.push({ name: registeredName, code, market: source.market });
      }
      aliases.set(lookup, entries);
    }
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  sources: sources.map(({ market, url }) => ({ market, url })),
  aliases: Object.fromEntries([...aliases.entries()].sort(([left], [right]) => left.localeCompare(right, "zh-Hant"))),
};

await writeFile(
  new URL("../public/data/company_aliases.json", import.meta.url),
  `${JSON.stringify(payload)}\n`,
);

console.log(`Generated ${Object.keys(payload.aliases).length} company aliases.`);
