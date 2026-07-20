import assert from "node:assert/strict";
import test from "node:test";

import { nodeSelectedOnPointerEnd } from "./graphInteraction.js";

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
