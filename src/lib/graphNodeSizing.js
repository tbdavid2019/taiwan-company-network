export const DEFAULT_NODE_RADIUS = 16;
export const DEFAULT_ROOT_RADIUS = 22;
export const MIN_COMPANY_RADIUS = 14;
export const MAX_COMPANY_RADIUS = 28;

const MINIMUM_ROBUST_SAMPLE_SIZE = 5;

function capitalFor(node, details) {
  if (node.data?.kind !== "company") return null;
  const capital = Number(details[node.id]?.資本總額);
  return Number.isFinite(capital) && capital > 0 ? capital : null;
}

function quantile(values, percentile) {
  const index = (values.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const fraction = index - lowerIndex;
  return values[lowerIndex] + (values[upperIndex] - values[lowerIndex]) * fraction;
}

function fallbackRadius(node) {
  return node.data?.isRoot ? DEFAULT_ROOT_RADIUS : DEFAULT_NODE_RADIUS;
}

export function calculateNodeRadii(nodes, details) {
  const capitalById = new Map(nodes.map((node) => [node.id, capitalFor(node, details)]));
  const loggedCapitals = [...capitalById.values()]
    .filter((capital) => capital !== null)
    .map((capital) => Math.log10(capital))
    .sort((first, second) => first - second);

  if (loggedCapitals.length === 0) {
    return new Map(nodes.map((node) => [node.id, fallbackRadius(node)]));
  }

  let lowerBound = quantile(loggedCapitals, loggedCapitals.length < MINIMUM_ROBUST_SAMPLE_SIZE ? 0 : 0.1);
  let upperBound = quantile(loggedCapitals, loggedCapitals.length < MINIMUM_ROBUST_SAMPLE_SIZE ? 1 : 0.9);
  if (loggedCapitals.length >= MINIMUM_ROBUST_SAMPLE_SIZE) {
    const firstQuartile = quantile(loggedCapitals, 0.25);
    const thirdQuartile = quantile(loggedCapitals, 0.75);
    const interquartileRange = thirdQuartile - firstQuartile;
    lowerBound = Math.max(lowerBound, firstQuartile - interquartileRange * 1.5);
    upperBound = Math.min(upperBound, thirdQuartile + interquartileRange * 1.5);
  }
  const midpointRadius = (MIN_COMPANY_RADIUS + MAX_COMPANY_RADIUS) / 2;

  return new Map(nodes.map((node) => {
    const capital = capitalById.get(node.id);
    if (capital === null) return [node.id, fallbackRadius(node)];
    if (lowerBound === upperBound) return [node.id, midpointRadius];

    const position = (Math.log10(capital) - lowerBound) / (upperBound - lowerBound);
    const clampedPosition = Math.min(1, Math.max(0, position));
    return [node.id, MIN_COMPANY_RADIUS + (MAX_COMPANY_RADIUS - MIN_COMPANY_RADIUS) * clampedPosition];
  }));
}
