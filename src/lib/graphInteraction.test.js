import assert from "node:assert/strict";
import test from "node:test";

import { nodeSelectedOnPointerEnd, pointerMovementExceedsThreshold } from "./graphInteraction.js";

test("pointerMovementExceedsThreshold treats small pointer jitter as a click", () => {
  assert.equal(pointerMovementExceedsThreshold({
    current: { x: 104, y: 103 },
    start: { x: 100, y: 100 },
  }), false);
  assert.equal(pointerMovementExceedsThreshold({
    current: { x: 107, y: 100 },
    start: { x: 100, y: 100 },
  }), true);
});

test("nodeSelectedOnPointerEnd selects a tapped node even when the SVG owns pointer capture", () => {
  assert.equal(nodeSelectedOnPointerEnd({
    cancelled: false,
    drag: { id: "聯碩投資開發股份有限公司", moved: false },
    remainingPointerCount: 0,
  }), "聯碩投資開發股份有限公司");
});

test("nodeSelectedOnPointerEnd ignores drags and cancelled gestures", () => {
  assert.equal(nodeSelectedOnPointerEnd({
    cancelled: false,
    drag: { id: "聯碩投資開發股份有限公司", moved: true },
    remainingPointerCount: 0,
  }), "");
  assert.equal(nodeSelectedOnPointerEnd({
    cancelled: true,
    drag: { id: "聯碩投資開發股份有限公司", moved: false },
    remainingPointerCount: 0,
  }), "");
});
