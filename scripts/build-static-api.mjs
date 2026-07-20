import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://taiwan-company-network.david888.com";

export function shardFileName(companyName) {
  const firstCharacter = Array.from(companyName)[0];
  if (!firstCharacter) throw new Error("Company name cannot be empty");
  return `${firstCharacter.codePointAt(0).toString(16)}.json`;
}

export function buildCompanyShards({ aliases, details, graph }) {
  const aliasesByName = new Map();
  for (const [code, records] of Object.entries(aliases || {})) {
    for (const record of records || []) {
      const current = aliasesByName.get(record.name) || [];
      current.push({ code: record.code || code, market: record.market || null });
      aliasesByName.set(record.name, current);
    }
  }

  const shards = new Map();
  const names = new Set([...Object.keys(details || {}), ...Object.keys(graph || {})]);
  for (const name of names) {
    const firstCharacter = Array.from(name)[0];
    if (!firstCharacter) continue;
    if (!shards.has(firstCharacter)) shards.set(firstCharacter, { data: {} });
    const detail = details[name];
    const node = graph[name];
    shards.get(firstCharacter).data[name] = {
      name,
      id: detail?.id || null,
      capital: detail?.資本總額 ?? null,
      representative: detail?.代表人姓名 || null,
      address: detail?.公司所在地 || null,
      aliases: aliasesByName.get(name) || [],
      relationships: {
        upstream: node?.in || [],
        downstream: node?.out || [],
      },
      webUrl: `${SITE_URL}/graph?company=${encodeURIComponent(name)}`,
    };
  }

  const companyShards = {};
  for (const firstCharacter of [...shards.keys()].sort((a, b) => a.localeCompare(b, "zh-Hant"))) {
    companyShards[firstCharacter] = `companies/${shardFileName(firstCharacter)}`;
  }

  return {
    index: {
      version: "1.0.0",
      method: "GET",
      description: "Read-only static API for Taiwan company registration and relationship-index data.",
      usage: [
        "Read companyShards[first character of the company name].",
        "GET that shard URL relative to this index.",
        "Read data[exact registered company name] from the shard response.",
        "Use aliases.json to resolve TWSE or TPEx stock codes to registered company names.",
      ],
      aliases: "aliases.json",
      companyShards,
    },
    shards,
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function main() {
  const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dataDirectory = path.join(projectDirectory, "public", "data");
  const outputDirectory = path.join(projectDirectory, "dist", "api", "v1");
  const skillContent = await readFile(path.join(projectDirectory, "public", "skills", "taiwan-company-network", "SKILL.md"), "utf8");
  const manifest = await readJson(path.join(dataDirectory, "company_details_manifest.json"));
  const [graph, aliasPayload, ...detailChunks] = await Promise.all([
    readJson(path.join(dataDirectory, "graph.json")),
    readJson(path.join(dataDirectory, "company_aliases.json")),
    ...manifest.chunks.map((fileName) => readJson(path.join(dataDirectory, fileName))),
  ]);
  const details = Object.assign({}, ...detailChunks);
  const { index, shards } = buildCompanyShards({ aliases: aliasPayload.aliases, details, graph });

  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(path.join(outputDirectory, "companies"), { recursive: true });
  await writeFile(path.join(outputDirectory, "index.json"), JSON.stringify(index));
  await writeFile(path.join(outputDirectory, "aliases.json"), JSON.stringify(aliasPayload));

  for (const [firstCharacter, payload] of shards) {
    await writeFile(
      path.join(outputDirectory, "companies", shardFileName(firstCharacter)),
      JSON.stringify({ shard: firstCharacter, count: Object.keys(payload.data).length, data: payload.data }),
    );
  }
  const skillPageDirectory = path.join(projectDirectory, "dist", "skill");
  await mkdir(skillPageDirectory, { recursive: true });
  await writeFile(path.join(skillPageDirectory, "index.html"), `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Agent Skill - 888台灣的公司關係網</title>
  <meta name="description" content="給 LLM 使用的 Taiwan Company Network Skill 與公開 GET API 操作手冊。">
  <link rel="canonical" href="${SITE_URL}/skill">
  <style>body{margin:0;background:#f7f6f3;color:#171717;font:15px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}.wrap{max-width:1000px;margin:auto;padding:32px 20px}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}h1{font:700 26px/1.2 system-ui,sans-serif;margin:0}.actions{display:flex;gap:10px}a{color:#155eef}.button{border:1px solid #d6d3d1;border-radius:8px;background:white;padding:9px 13px;text-decoration:none;color:#171717}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#07111f;color:#e5edf8;border-radius:12px;padding:24px;overflow:auto;box-shadow:0 8px 24px #00000012}@media(max-width:640px){.top{align-items:flex-start;flex-direction:column}.wrap{padding:20px 12px}pre{padding:16px;font-size:12px}}</style>
</head>
<body><main class="wrap"><div class="top"><div><h1>Taiwan Company Network Skill</h1><div>給其他 LLM 使用的公開 GET API 操作手冊</div></div><div class="actions"><a class="button" download="SKILL.md" href="${SITE_URL}/skills/taiwan-company-network/SKILL.md">下載 SKILL.md</a><a class="button" href="${SITE_URL}/">回網站</a></div></div><pre><code>${escapeHtml(skillContent)}</code></pre></main></body>
</html>`);
  console.log(`Static GET API generated: ${shards.size.toLocaleString()} shards, ${Object.keys(details).length.toLocaleString()} company records.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
