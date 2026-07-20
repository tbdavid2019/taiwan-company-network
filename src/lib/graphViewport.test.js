import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePinchViewport,
  clampZoom,
  companyPageTitle,
} from "./graphViewport.js";

test("companyPageTitle includes the selected company", () => {
  assert.equal(
    companyPageTitle("中聯油脂股份有限公司"),
    "中聯油脂股份有限公司 - 888台灣的公司關係網",
  );
});

test("companyPageTitle falls back to the site title", () => {
  assert.equal(companyPageTitle(""), "888台灣的公司關係網");
});

test("clampZoom keeps touch and button zoom within the supported range", () => {
  assert.equal(clampZoom(0.2), 0.65);
  assert.equal(clampZoom(4), 2.4);
  assert.equal(clampZoom(1.5), 1.5);
});

test("calculatePinchViewport zooms around the gesture midpoint", () => {
  assert.deepEqual(
    calculatePinchViewport({
      center: { x: 600, y: 360 },
      currentDistance: 200,
      currentMidpoint: { x: 700, y: 360 },
      startDistance: 100,
      startMidpoint: { x: 700, y: 360 },
      startPan: { x: 0, y: 0 },
      startZoom: 1,
    }),
    { pan: { x: -100, y: 0 }, zoom: 2 },
  );
});

test("calculatePinchViewport also follows a moving midpoint", () => {
  assert.deepEqual(
    calculatePinchViewport({
      center: { x: 600, y: 360 },
      currentDistance: 100,
      currentMidpoint: { x: 640, y: 390 },
      startDistance: 100,
      startMidpoint: { x: 620, y: 370 },
      startPan: { x: 10, y: 5 },
      startZoom: 1,
    }),
    { pan: { x: 30, y: 25 }, zoom: 1 },
  );
});
