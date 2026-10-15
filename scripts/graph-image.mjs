import { createHash } from "node:crypto";

export function graphImagePath(name) {
  const hash = createHash("sha256").update(name).digest("hex");
  return `images/${hash.slice(0, 2)}/${hash}.svg`;
}

function xml(value) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}

// Fixed columns avoid a browser/layout dependency; names wrap without truncation.
export function renderGraphSvg(name, { in: upstream = [], out: downstream = [] } = {}) {
  const limit = 12;
  const lines = (value) => Array.from(String(value)).reduce((rows, char, i) => {
    if (i % 18 === 0) rows.push("");
    rows[rows.length - 1] += char;
    return rows;
  }, []);
  const cardHeight = (value) => Math.max(64, lines(value).length * 24 + 24);
  const columnHeight = (names) => names.slice(0, limit).reduce((sum, value) => sum + cardHeight(value) + 16, 0) + (names.length > limit ? 32 : 0);
  const height = Math.max(420, 240 + Math.max(columnHeight(upstream), columnHeight(downstream), cardHeight(name)));
  const centerY = (height - 80 + 160) / 2;
  const text = (value, x, y, size = 16, fill = "#3f3933") => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${xml(value)}</text>`;
  const card = (value, x, y, root = false) => `<rect x="${x}" y="${y}" width="320" height="${cardHeight(value)}" rx="12" fill="${root ? "#f3d3c7" : "#ffffff"}" stroke="${root ? "#d97757" : "#b7aba0"}"/>${lines(value).map((line, i) => text(line, x + 16, y + 30 + i * 24)).join("")}`;
  let edges = "";
  let cards = "";
  for (const [names, x, incoming] of [[upstream, 32, true], [downstream, 848, false]]) {
    let y = 160;
    for (const value of names.slice(0, limit)) {
      const rowCenter = y + cardHeight(value) / 2;
      edges += `<path d="M ${incoming ? 352 : 752} ${incoming ? rowCenter : centerY} L ${incoming ? 432 : 848} ${incoming ? centerY : rowCenter}" stroke="#877666" fill="none" marker-end="url(#arrow)"/>`;
      cards += card(value, x, y);
      y += cardHeight(value) + 16;
    }
    if (names.length > limit) cards += text(`另有 ${names.length - limit} 筆，請開啟互動圖查看`, x, y + 20);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc" font-family="Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif"><title id="title">${xml(name)} 公司關係圖</title><desc id="desc">直接關係索引：上游 ${upstream.length}、下游 ${downstream.length}；每側最多顯示 ${limit} 筆。</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#877666"/></marker></defs><rect width="1200" height="${height}" fill="#faf8f5"/>${text("888 台灣公司關係網", 32, 48, 26)}${text(`上游 ${upstream.length}`, 32, 118, 18)}${text("查詢公司", 432, 118, 18)}${text(`下游 ${downstream.length}`, 848, 118, 18)}${edges}${cards}${card(name, 432, centerY - cardHeight(name) / 2, true)}${text("資料為關係索引，不代表已驗證的持股、控制或投資關係。", 32, height - 44)}${text("taiwan-company-network.david888.com · 每側最多顯示 12 筆直接關係", 32, height - 18)}</svg>`;
}
