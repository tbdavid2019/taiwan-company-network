import assert from "node:assert/strict";
import test from "node:test";
import { graphImagePath, renderGraphSvg } from "./graph-image.mjs";
import { buildCompanyShards } from "./build-static-api.mjs";

test("API exposes a stable SVG URL only for companies with direct links", () => {
  const { shards } = buildCompanyShards({ details: { 孤立公司: {} }, graph: { 中心公司: { in: ["上游"], out: [] } } });
  assert.equal(shards.get("中").data.中心公司.imageUrl, `https://taiwan-company-network.david888.com/api/v1/${graphImagePath("中心公司")}`);
  assert.equal(shards.get("孤").data.孤立公司.imageUrl, null);
  assert.match(graphImagePath('../<公司>'), /^images\/[a-f0-9]{2}\/[a-f0-9]{64}\.svg$/);
});

test("SVG preserves names, escapes untrusted XML and explains relationship meaning", () => {
  const svg = renderGraphSvg('甲<&"公司', { in: ["上游公司"], out: ["下游公司"] });
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('甲&lt;&amp;&quot;公司'));
  assert.ok(svg.includes("上游公司"));
  assert.ok(svg.includes("下游公司"));
  assert.ok(svg.includes("關係索引"));
  assert.ok(!svg.includes("<script"));
});

test("large graphs disclose omitted neighbors and keep bounded image dimensions", () => {
  const svg = renderGraphSvg("中心", { in: Array.from({ length: 30 }, (_, i) => `上游${i}`), out: [] });
  assert.ok(svg.includes("另有 18 筆"));
  assert.ok(svg.includes("上游 30"));
  assert.ok(!svg.includes(">上游12<"));
  assert.match(svg, /height="\d{3,4}"/);
});

test("SVG keeps every Chinese text run at least 12pt and wraps long names intact", () => {
  const name = "超長公司名稱".repeat(10);
  const svg = renderGraphSvg(name, { in: ['<script>alert("x")</script>'], out: [] });
  const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map((match) => Number(match[1]));
  assert.ok(sizes.length > 0 && sizes.every((size) => size >= 16));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  const title = svg.match(/<title id="title">(.*?)<\/title>/)[1];
  assert.equal(title, `${name} 公司關係圖`);
});
