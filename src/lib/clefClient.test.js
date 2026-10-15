import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeCompanyNode,
  buildClefPayload,
  clearClefCache,
  parseClefResponse,
  ROLE_DEFINITIONS,
  PRIMARY_CLEF_URL,
  FALLBACK_CLEF_URL,
} from "./clefClient.js";

test("buildClefPayload correctly structures state and questions", () => {
  const payload = buildClefPayload({
    name: "中聯油脂股份有限公司",
    capital: 1600000000,
    inDegree: 4,
    outDegree: 0,
    upstreamSamples: ["泰山企業股份有限公司", "福壽實業股份有限公司"],
    downstreamSamples: [],
  });

  assert.equal(payload.model, "clef-flash");
  assert.equal(payload.state.name, "中聯油脂股份有限公司");
  assert.equal(payload.state.capital, 1600000000);
  assert.equal(payload.state.in_degree, 4);
  assert.equal(payload.state.out_degree, 0);
  assert.equal(payload.state.upstream_samples.length, 2);
  assert.equal(payload.questions.role.type, "choice");
  assert.equal(payload.questions.strategic_level.type, "score");
});

test("parseClefResponse maps answers to structured role and strategicLevel", () => {
  const sampleData = {
    model: "clef-flash",
    answers: {
      role: {
        type: "choice",
        choice: "joint_venture",
        confidence: 0.852,
        probabilities: {
          joint_venture: 0.88,
          holding_parent: 0.05,
        },
      },
      strategic_level: {
        type: "score",
        score: 2.1,
        confidence: 0.75,
        legend: {
          "2": "重要轉投資事業 (Key Affiliate)",
        },
      },
    },
  };

  const parsed = parseClefResponse(sampleData);
  assert.ok(parsed);
  assert.equal(parsed.role.id, "joint_venture");
  assert.equal(parsed.role.label, "同業合資企業");
  assert.equal(parsed.role.confidence, 85);
  assert.equal(parsed.role.probability, 88);
  assert.equal(parsed.strategicLevel.score, 2.1);
  assert.equal(parsed.strategicLevel.label, "重要轉投資事業");
  assert.equal(parsed.strategicLevel.confidence, 75);
});

test("analyzeCompanyNode fetches from primary endpoint and caches result", async () => {
  clearClefCache();
  let callCount = 0;

  const mockFetch = async (url, options) => {
    callCount += 1;
    assert.equal(url, PRIMARY_CLEF_URL);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: "clef-flash",
        answers: {
          role: {
            type: "choice",
            choice: "holding_parent",
            confidence: 0.92,
            probabilities: { holding_parent: 0.94 },
          },
          strategic_level: {
            type: "score",
            score: 3.8,
            confidence: 0.8,
          },
        },
      }),
    };
  };

  const first = await analyzeCompanyNode(
    { name: "台灣積體電路製造股份有限公司", capital: 259303804580, inDegree: 0, outDegree: 45 },
    { fetchImpl: mockFetch },
  );

  assert.ok(first);
  assert.equal(first.role.id, "holding_parent");
  assert.equal(callCount, 1);

  // Second call with same parameters should hit cache and NOT call fetch
  const second = await analyzeCompanyNode(
    { name: "台灣積體電路製造股份有限公司", capital: 259303804580, inDegree: 0, outDegree: 45 },
    { fetchImpl: mockFetch },
  );

  assert.deepEqual(second, first);
  assert.equal(callCount, 1);
});

test("analyzeCompanyNode falls back to secondary endpoint if primary fails", async () => {
  clearClefCache();
  const calledUrls = [];

  const mockFetch = async (url) => {
    calledUrls.push(url);
    if (url === PRIMARY_CLEF_URL) {
      throw new Error("Primary network failure");
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: "clef-flash-q4",
        answers: {
          role: {
            type: "choice",
            choice: "operating_subsidiary",
            confidence: 0.81,
            probabilities: { operating_subsidiary: 0.85 },
          },
        },
      }),
    };
  };

  const res = await analyzeCompanyNode(
    { name: "采鈺科技股份有限公司", capital: 3150000000, inDegree: 1, outDegree: 0 },
    { fetchImpl: mockFetch },
  );

  assert.ok(res);
  assert.equal(res.role.id, "operating_subsidiary");
  assert.deepEqual(calledUrls, [PRIMARY_CLEF_URL, FALLBACK_CLEF_URL]);
});

test("analyzeCompanyNode gracefully returns null if all endpoints fail", async () => {
  clearClefCache();

  const mockFetch = async () => {
    throw new Error("Complete network failure");
  };

  const res = await analyzeCompanyNode(
    { name: "測試無效公司", capital: 1000 },
    { fetchImpl: mockFetch },
  );

  assert.equal(res, null);
});

test("analyzeCompanyNode returns null on empty name without making network requests", async () => {
  let called = false;
  const res = await analyzeCompanyNode(
    { name: "" },
    { fetchImpl: async () => { called = true; } },
  );
  assert.equal(res, null);
  assert.equal(called, false);
});

test("analyzeCompanyNode separates cache entries when neighbor samples differ with same degrees", async () => {
  clearClefCache();
  let callCount = 0;

  const mockFetch = async () => {
    callCount += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: "clef-flash",
        answers: {
          role: {
            type: "choice",
            choice: callCount === 1 ? "holding_parent" : "joint_venture",
            confidence: 0.9,
            probabilities: {},
          },
        },
      }),
    };
  };

  const first = await analyzeCompanyNode(
    {
      name: "公司A",
      capital: 1000,
      inDegree: 1,
      outDegree: 0,
      upstreamSamples: ["母公司1"],
    },
    { fetchImpl: mockFetch },
  );

  const second = await analyzeCompanyNode(
    {
      name: "公司A",
      capital: 1000,
      inDegree: 1,
      outDegree: 0,
      upstreamSamples: ["母公司2"],
    },
    { fetchImpl: mockFetch },
  );

  assert.equal(callCount, 2);
  assert.equal(first.role.id, "holding_parent");
  assert.equal(second.role.id, "joint_venture");
});
