import assert from "node:assert/strict";
import test from "node:test";

import { calculateNodeRadii } from "./graphNodeSizing.js";

function company(id, capital, { isRoot = false } = {}) {
  return {
    id,
    data: { kind: "company", isRoot },
    capital,
  };
}

function radiiFor(nodes) {
  return calculateNodeRadii(nodes, Object.fromEntries(nodes.map((node) => [node.id, { 資本總額: node.capital }])));
}

test("calculateNodeRadii keeps nodes without a usable company capital at their existing size", () => {
  const radii = radiiFor([
    { id: "法人", data: { kind: "entity", isRoot: false } },
    company("未登記資本額", undefined),
    company("焦點法人", undefined, { isRoot: true }),
  ]);

  assert.equal(radii.get("法人"), 16);
  assert.equal(radii.get("未登記資本額"), 16);
  assert.equal(radii.get("焦點法人"), 22);
});

test("calculateNodeRadii maps capital relative to the companies in the current view", () => {
  const radii = radiiFor([
    company("小", 100_000),
    company("中小", 1_000_000),
    company("中", 10_000_000),
    company("中大", 100_000_000),
    company("大", 1_000_000_000),
  ]);

  assert.equal(radii.get("小"), 14);
  assert.equal(radii.get("大"), 28);
  assert.ok(radii.get("小") < radii.get("中小"));
  assert.ok(radii.get("中小") < radii.get("中"));
  assert.ok(radii.get("中") < radii.get("中大"));
});

test("calculateNodeRadii limits the influence of a single capital outlier", () => {
  const radii = radiiFor([
    company("一百萬", 1_000_000),
    company("兩百萬", 2_000_000),
    company("三百萬", 3_000_000),
    company("四百萬", 4_000_000),
    company("一千億", 100_000_000_000),
  ]);

  assert.ok(radii.get("四百萬") - radii.get("一百萬") > 4);
  assert.equal(radii.get("一千億"), 28);
});

test("calculateNodeRadii gives equal capitals the midpoint radius", () => {
  const radii = radiiFor([
    company("甲", 5_000_000),
    company("乙", 5_000_000),
  ]);

  assert.equal(radii.get("甲"), 21);
  assert.equal(radii.get("乙"), 21);
});
