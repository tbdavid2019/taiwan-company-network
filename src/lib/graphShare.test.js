import assert from "node:assert/strict";
import test from "node:test";

import { graphShareFileName, graphShareText } from "./graphShare.js";

test("graphShareFileName uses the selected company", () => {
  assert.equal(
    graphShareFileName("聯華實業控股股份有限公司"),
    "聯華實業控股股份有限公司-公司關係圖.png",
  );
});

test("graphShareFileName removes characters that are invalid in filenames", () => {
  assert.equal(
    graphShareFileName('測試/公司:「A?」'),
    "測試-公司-「A-」-公司關係圖.png",
  );
});

test("graphShareFileName has a stable fallback", () => {
  assert.equal(graphShareFileName(""), "888台灣公司關係網-公司關係圖.png");
});

test("graphShareText does not include a URL that social apps can expand into a second image", () => {
  const text = graphShareText("聯華實業控股股份有限公司");
  assert.equal(text, "聯華實業控股股份有限公司的公司與法人關係索引");
  assert.doesNotMatch(text, /https?:\/\//);
});
