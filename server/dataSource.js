import { readFile } from "node:fs/promises";
import path from "node:path";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function createFileDataSource(dataDirectory) {
  const resolvedDirectory = path.resolve(dataDirectory);
  let graphPromise;
  let aliasesPromise;
  let detailsPromise;

  const dataPath = (fileName) => {
    if (path.basename(fileName) !== fileName) throw new Error(`Unsafe data file name: ${fileName}`);
    return path.join(resolvedDirectory, fileName);
  };

  return {
    loadGraph() {
      graphPromise ||= readJson(dataPath("graph.json"));
      return graphPromise;
    },
    loadAliases() {
      aliasesPromise ||= readJson(dataPath("company_aliases.json")).then((payload) => payload.aliases || {});
      return aliasesPromise;
    },
    loadDetails() {
      detailsPromise ||= readJson(dataPath("company_details_manifest.json")).then(async (manifest) => {
        if (!Array.isArray(manifest.chunks)) throw new Error("Invalid company details manifest");
        const chunks = await Promise.all(manifest.chunks.map((fileName) => readJson(dataPath(fileName))));
        return Object.assign({}, ...chunks);
      });
      return detailsPromise;
    },
  };
}
