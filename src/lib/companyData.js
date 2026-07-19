const dataBase = `${import.meta.env.BASE_URL}data`;
const cache = new Map();

async function loadJson(fileName) {
  if (!cache.has(fileName)) {
    const request = fetch(`${dataBase}/${fileName}`).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${fileName} (${response.status})`);
      }
      return response.json();
    });
    cache.set(fileName, request);
  }
  return cache.get(fileName);
}

export function loadGraph() {
  return loadJson("graph.json");
}

export function loadCompanyDetails() {
  return loadJson("company_details_manifest.json").then(async ({ chunks }) => {
    const detailChunks = await Promise.all(chunks.map((fileName) => loadJson(fileName)));
    return Object.assign({}, ...detailChunks);
  });
}

export async function loadCompanyAliases() {
  const payload = await loadJson("company_aliases.json");
  return payload.aliases || {};
}
