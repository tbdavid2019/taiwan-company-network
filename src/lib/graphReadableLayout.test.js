import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { boundsOverlap, graphNodeBounds, layoutReadableGraph } from "./graphReadableLayout.js";

const graph = JSON.parse(readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf8"));
for (const company of ["臺灣水泥股份有限公司", "統一企業股份有限公司"]) {
  test(`${company}: full names, counts and circles reserve non-overlapping space`, () => {
    const names = [...new Set([company, ...graph[company].in, ...graph[company].out])];
    const nodes = names.map((name, i) => ({ id: name, data: { name, isRoot: i === 0, radius: 14 + i % 15, upstreamCount: graph[name]?.in.length || 0, downstreamCount: graph[name]?.out.length || 0 } }));
    const { positions, geometries, viewBox } = layoutReadableGraph(nodes);
    const boxes = nodes.map(node => graphNodeBounds(positions.get(node.id), geometries.get(node.id)));
    for (let i = 0; i < boxes.length; i++) {
      assert.equal(geometries.get(nodes[i].id).lines.join(""), nodes[i].id);
      assert.ok(boxes[i].left >= viewBox.x && boxes[i].right <= viewBox.x + viewBox.width);
      assert.ok(boxes[i].top >= viewBox.y && boxes[i].bottom <= viewBox.y + viewBox.height);
      for (let j = 0; j < i; j++) assert.equal(boundsOverlap(boxes[i], boxes[j]), false, `${nodes[i].id} overlaps ${nodes[j].id}`);
    }
  });
}

test("long names and large counts remain complete at 80 nodes", () => {
  const nodes = Array.from({ length: 80 }, (_, i) => ({ id: `${"超長公司完整名稱".repeat(4)}${i}`, data: { isRoot: i === 0, radius: 28, upstreamCount: 100000, downstreamCount: 99999 } }));
  const { positions, geometries } = layoutReadableGraph(nodes);
  const boxes = nodes.map(node => graphNodeBounds(positions.get(node.id), geometries.get(node.id)));
  for (let i = 0; i < nodes.length; i++) {
    assert.equal(geometries.get(nodes[i].id).lines.join(""), nodes[i].id);
    for (let j = 0; j < i; j++) assert.equal(boundsOverlap(boxes[i], boxes[j]), false);
  }
});
