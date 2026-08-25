import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGraphShareText,
  buildGraphShareUrl,
  uploadGraphToBox,
} from "./boxShare.js";

test("buildGraphShareUrl generates a canonical graph URL with company query", () => {
  const url = buildGraphShareUrl("創智動能股份有限公司");
  assert.equal(
    url,
    "https://taiwan-company-network.david888.com/graph?company=%E5%89%B5%E6%99%BA%E5%8B%95%E8%83%BD%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8",
  );
});

test("buildGraphShareText includes company name, site URL, and image URL", () => {
  const text = buildGraphShareText({
    company: "創智動能股份有限公司",
    pageUrl: "https://taiwan-company-network.david888.com/graph?company=%E5%89%B5%E6%99%BA%E5%8B%95%E8%83%BD%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8",
    imageUrl: "https://box.david888.com/storage/i/2026/08/25/example.webp",
    shareUrl: "https://box.david888.com/v/example123",
  });

  assert.match(text, /創智動能股份有限公司/);
  assert.match(text, /https:\/\/taiwan-company-network\.david888\.com\/graph/);
  assert.match(text, /https:\/\/box\.david888\.com\/storage\/i\/2026\/08\/25\/example\.webp/);
  assert.match(text, /https:\/\/box\.david888\.com\/v\/example123/);
});

test("uploadGraphToBox formats multipart payload and resolves image and share urls", async () => {
  let capturedUrl = "";
  let capturedBody = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = options.body;
    return {
      ok: true,
      json: async () => ({
        result: "success",
        code: 200,
        data: {
          id: "abc123456",
          url: "https://888box-media.s3.amazonaws.com/test.webp",
          share_url: "https://box.david888.com/v/abc123456",
          name: "test.webp",
        },
      }),
    };
  };

  const dummyBlob = new Blob(["image-bytes"], { type: "image/png" });
  const result = await uploadGraphToBox({
    blob: dummyBlob,
    fileName: "創智動能股份有限公司-公司關係圖.png",
    company: "創智動能股份有限公司",
    pageUrl: "https://taiwan-company-network.david888.com/graph?company=創智動能股份有限公司",
    fetchFn: mockFetch,
  });

  assert.equal(capturedUrl, "https://box.david888.com/api.php?action=upload");
  assert.ok(capturedBody instanceof FormData);
  assert.equal(result.success, true);
  assert.equal(result.imageUrl, "https://888box-media.s3.amazonaws.com/test.webp");
  assert.equal(result.shareUrl, "https://box.david888.com/v/abc123456");
  assert.equal(result.id, "abc123456");
});

test("uploadGraphToBox gracefully handles error responses from 888box", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      result: "error",
      code: 406,
      message: "文件不是有效的图片",
    }),
  });

  const dummyBlob = new Blob(["bad-bytes"], { type: "image/png" });
  const result = await uploadGraphToBox({
    blob: dummyBlob,
    company: "創智動能股份有限公司",
    fetchFn: mockFetch,
  });

  assert.equal(result.success, false);
  assert.equal(result.error, "文件不是有效的图片");
});
