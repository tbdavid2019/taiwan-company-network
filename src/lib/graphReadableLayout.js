const FONT_SIZE = 14;
const LINE_HEIGHT = 18;

function characterWidth(char, size) {
  return /[\u0020-\u007e]/u.test(char) ? size * 0.65 : size;
}

export function wrapGraphLabel(value, size = FONT_SIZE, maximumWidth = 168) {
  const lines = [];
  let line = "";
  let width = 0;
  for (const char of Array.from(String(value))) {
    const nextWidth = characterWidth(char, size);
    if (line && width + nextWidth > maximumWidth) {
      lines.push(line);
      line = "";
      width = 0;
    }
    line += char;
    width += nextWidth;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function graphNodeGeometry(node) {
  const isRoot = Boolean(node.data?.isRoot);
  const radius = node.data?.radius || (isRoot ? 22 : 16);
  const fontSize = isRoot ? 16 : FONT_SIZE;
  const lineHeight = isRoot ? 20 : LINE_HEIGHT;
  const lines = wrapGraphLabel(node.data?.name || node.id, fontSize);
  const lineWidth = Math.max(...lines.map(line => Array.from(line).reduce((sum, char) => sum + characterWidth(char, fontSize), 0)));
  const upstreamWidth = Math.max(42, 25 + String(node.data?.upstreamCount || 0).length * 7);
  const downstreamWidth = Math.max(42, 25 + String(node.data?.downstreamCount || 0).length * 7);
  return {
    radius, fontSize, lineHeight, lines, upstreamWidth, downstreamWidth,
    halfWidth: Math.max(lineWidth / 2 + 8, (upstreamWidth + downstreamWidth + 5) / 2 + 4, radius + 12),
    top: -radius - 26,
    bottom: radius + 12 + lines.length * lineHeight + 4,
  };
}

export function graphNodeBounds(position, geometry, padding = 0) {
  return {
    left: position.x - geometry.halfWidth - padding,
    right: position.x + geometry.halfWidth + padding,
    top: position.y + geometry.top - padding,
    bottom: position.y + geometry.bottom + padding,
  };
}

export function boundsOverlap(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// Allocate a measured cell to every complete annotation. Fitting the grid to
// the viewport's aspect ratio uses the available width and keeps labels apart.
export function layoutReadableGraph(nodes, center = { x: 600, y: 360 }, aspectRatio = 2) {
  const root = nodes.find(node => node.data?.isRoot) || nodes[0];
  const ordered = root ? [root, ...nodes.filter(node => node !== root)] : [];
  const geometries = new Map(ordered.map(node => [node.id, graphNodeGeometry(node)]));
  const cellWidth = Math.max(140, ...[...geometries.values()].map(g => g.halfWidth * 2)) + 24;
  const cellHeight = Math.max(90, ...[...geometries.values()].map(g => g.bottom - g.top)) + 24;
  const columns = Math.max(1, Math.min(ordered.length, Math.ceil(Math.sqrt(ordered.length * aspectRatio * cellHeight / cellWidth))));
  const rows = Math.max(1, Math.ceil(ordered.length / columns));
  const rootColumn = Math.floor((columns - 1) / 2);
  const rootRow = Math.floor((rows - 1) / 2);
  const cells = Array.from({ length: rows * columns }, (_, index) => ({ x: index % columns - rootColumn, y: Math.floor(index / columns) - rootRow }));
  cells.sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y) || a.y - b.y || a.x - b.x);
  const rootGeometry = root && geometries.get(root.id);
  const rootOffset = rootGeometry ? (rootGeometry.top + rootGeometry.bottom) / 2 : 0;
  const positions = new Map();
  const occupied = [];
  ordered.forEach((node, index) => {
    const geometry = geometries.get(node.id);
    const position = { x: center.x + cells[index].x * cellWidth, y: center.y + rootOffset + cells[index].y * cellHeight - (geometry.top + geometry.bottom) / 2 };
    positions.set(node.id, position);
    occupied.push(graphNodeBounds(position, geometry));
  });
  const margin = 24;
  const left = Math.min(center.x - 120, ...occupied.map(box => box.left)) - margin;
  const right = Math.max(center.x + 120, ...occupied.map(box => box.right)) + margin;
  const top = Math.min(center.y - 100, ...occupied.map(box => box.top)) - margin;
  const bottom = Math.max(center.y + 100, ...occupied.map(box => box.bottom)) + margin;
  return { positions, geometries, viewBox: { x: left, y: top, width: right - left, height: bottom - top } };
}
