# Changelog

All notable changes to this project are documented in this file.

## 2026-07-19

- Simplified the relationship controls from six two-hop permutations to three useful views: all direct relationships, upstream, and downstream. Small relationship maps now use a deterministic SVG fallback so focus companies such as TSMC remain visible with their direct links; large expansions continue to use G6.
- Connected zoom, reset, hover, and click-to-expand controls to the small-map SVG fallback.
- Made node expansion toggleable: clicking an expanded node now collapses its branch and hides descendants that are no longer connected to the focus path.
- Made directional edges explicit in the SVG relationship map with visible arrowheads ending at node boundaries.
- Migrated the client build from Create React App to Vite and updated the React/Tailwind/shadcn UI stack.
- Replaced `react-force-graph-2d` with AntV G6 for the relationship explorer. The graph now has bounded native zoom, force layout, stable labels, and click-to-expand next-hop relationships.
- Fixed the two-hop relationship lens so first-hop links are retained and clicking a node expands it in place.
- Rebuilt the company and relationship datasets from the public source snapshots (885,755 approved records). The updater now supports both legacy `公司狀況` and current `登記現況` source fields, restoring recently registered companies such as 創造智能科技股份有限公司. Company detail data is split into two Pages-friendly files to remain below GitHub's 100 MB per-file limit.
- Added TWSE/TPEx company-alias index generation for listed-company abbreviations and stock codes (for example, 台積電 and 2330).
- Made data file writes atomic and raw-source downloads resumable.
- Relicensed project modifications under AGPL-3.0-or-later, retained upstream notices, and documented attribution to voidful and Creative Tim.
