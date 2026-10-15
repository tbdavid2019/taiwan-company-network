export const PRIMARY_CLEF_URL = "https://clef.create360.ai/v1/systemone";
export const FALLBACK_CLEF_URL = "https://clef.aiurl.tw/v1/systemone";
export const DEFAULT_TIMEOUT_MS = 3500;

export const ROLE_DEFINITIONS = {
  holding_parent: {
    id: "holding_parent",
    label: "集團旗艦 / 母公司",
    tag: "Flagship / Parent",
    accentClass: "text-[#d97757] bg-[#d97757]/10 border-[#d97757]/30",
    description: "擁有眾多下游轉投資或子公司之集團旗艦核心",
  },
  joint_venture: {
    id: "joint_venture",
    label: "同業合資企業",
    tag: "Joint Venture",
    accentClass: "text-[#2f7d6d] bg-[#2f7d6d]/10 border-[#2f7d6d]/30",
    description: "由多家同業或上下游大型企業共同出資設立",
  },
  operating_subsidiary: {
    id: "operating_subsidiary",
    label: "營運子公司",
    tag: "Operating Unit",
    accentClass: "text-[#2563eb] bg-[#2563eb]/10 border-[#2563eb]/30",
    description: "有明確上游母體支持之經營事業實體",
  },
  investment_vehicle: {
    id: "investment_vehicle",
    label: "投資控股載體",
    tag: "Investment SPV",
    accentClass: "text-[#7c3aed] bg-[#7c3aed]/10 border-[#7c3aed]/30",
    description: "主要作為控股、家族轉投資或資金運作單位",
  },
  standalone: {
    id: "standalone",
    label: "獨立營運實體",
    tag: "Standalone",
    accentClass: "text-[#877666] bg-[#877666]/10 border-[#877666]/30",
    description: "無複雜上下游關係之獨立事業體",
  },
};

export const STRATEGIC_LEVEL_LABELS = [
  "邊陲節點",
  "一般關聯企業",
  "重要轉投資事業",
  "核心營運樞紐",
  "集團旗艦核心",
];

const cache = new Map();
const MAX_CACHE_SIZE = 300;

export function clearClefCache() {
  cache.clear();
}

export function buildClefPayload({ name, capital, inDegree = 0, outDegree = 0, upstreamSamples = [], downstreamSamples = [] }) {
  const parsedCapital = capital !== undefined && capital !== null && !Number.isNaN(Number(capital))
    ? Number(capital)
    : null;

  return {
    model: "clef-flash",
    state: {
      name: String(name || "").trim(),
      capital: parsedCapital,
      in_degree: Number(inDegree) || 0,
      out_degree: Number(outDegree) || 0,
      upstream_samples: (upstreamSamples || []).slice(0, 5),
      downstream_samples: (downstreamSamples || []).slice(0, 5),
    },
    questions: {
      role: {
        type: "choice",
        instructions: "根據企業資本額與上下游關聯特徵，判斷該節點在集團架構中最可能的定位角色：",
        criteria: {
          joint_venture: "合資企業：由多家同業或上下游大型企業共同出資設立",
          holding_parent: "旗艦母公司 / 控股核心：擁有眾多下游轉投資或子公司",
          operating_subsidiary: "營運子公司：有明確單一或少數上游母體支持之經營實體",
          investment_vehicle: "投資載體 / 控股工具：主要作為控股或資金運作單位",
          standalone: "獨立實體：無複雜上下游關係之獨立事業體",
        },
      },
      strategic_level: {
        type: "score",
        instructions: "評估該節點在網絡中的戰略重要性與樞紐等級：",
        criteria: [
          "邊陲節點 (Peripheral)",
          "一般關聯企業 (Associate)",
          "重要轉投資事業 (Key Affiliate)",
          "核心營運樞紐 (Operational Hub)",
          "集團旗艦核心 (Core Flagship)",
        ],
      },
    },
  };
}

export function parseClefResponse(data) {
  if (!data || !data.answers) return null;

  const roleRaw = data.answers.role;
  const strategicRaw = data.answers.strategic_level;

  let role = null;
  if (roleRaw && roleRaw.type === "choice") {
    const roleId = roleRaw.choice;
    const def = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.standalone;
    role = {
      id: roleId,
      label: def.label,
      tag: def.tag,
      accentClass: def.accentClass,
      description: def.description,
      confidence: typeof roleRaw.confidence === "number" ? Math.round(roleRaw.confidence * 100) : null,
      probability: typeof roleRaw.probabilities?.[roleId] === "number"
        ? Math.round(roleRaw.probabilities[roleId] * 100)
        : null,
    };
  }

  let strategicLevel = null;
  if (strategicRaw && strategicRaw.type === "score") {
    const rawScore = Number(strategicRaw.score);
    const scoreIndex = Math.min(
      STRATEGIC_LEVEL_LABELS.length - 1,
      Math.max(0, Math.round(rawScore)),
    );
    strategicLevel = {
      score: Math.round(rawScore * 10) / 10,
      label: STRATEGIC_LEVEL_LABELS[scoreIndex],
      legend: strategicRaw.legend?.[String(scoreIndex)] || STRATEGIC_LEVEL_LABELS[scoreIndex],
      confidence: typeof strategicRaw.confidence === "number"
        ? Math.round(strategicRaw.confidence * 100)
        : null,
    };
  }

  return {
    model: data.model || "clef-flash",
    role,
    strategicLevel,
    evaluatedAt: Date.now(),
  };
}

async function requestEndpoint(url, payload, { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Clef API responded with status ${response.status}`);
    }

    const data = await response.json();
    return parseClefResponse(data);
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeCompanyNode(
  {
    name,
    capital,
    inDegree = 0,
    outDegree = 0,
    upstreamSamples = [],
    downstreamSamples = [],
  },
  {
    fetchImpl = fetch,
    primaryUrl = PRIMARY_CLEF_URL,
    fallbackUrl = FALLBACK_CLEF_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  if (!name || typeof name !== "string") return null;

  const payload = buildClefPayload({
    name,
    capital,
    inDegree,
    outDegree,
    upstreamSamples,
    downstreamSamples,
  });

  const cacheKey = JSON.stringify(payload.state);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let result = null;

  // 1. Try Primary endpoint
  try {
    result = await requestEndpoint(primaryUrl, payload, { timeoutMs, fetchImpl });
  } catch (primaryErr) {
    // 2. Try Fallback endpoint if Primary failed
    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      try {
        result = await requestEndpoint(fallbackUrl, payload, { timeoutMs, fetchImpl });
      } catch (fallbackErr) {
        // Both failed; gracefully return null
        return null;
      }
    } else {
      return null;
    }
  }

  if (result) {
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, result);
  }

  return result;
}
