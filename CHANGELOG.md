# Changelog

All notable changes to this project are documented in this file.

## 2026-07-20

- Added company-specific browser titles in the format `{company} - 888台灣的公司關係網`.
- Added mobile graph gestures: drag nodes, pan the canvas with one pointer, and pinch to zoom around the gesture midpoint.
- Added a low-opacity, repeating `DAVID888` SVG text watermark behind graph nodes and links.
- Installed Google Analytics with measurement ID `G-VSJ3K6F4BF`.
- Added desktop and mobile relationship-map screenshots to the README.
- Added unit coverage for page-title generation and graph viewport zoom calculations.
- Updated compatible transitive dependencies to resolve the current npm security advisories.
- Added complete search and social metadata, canonical URL, Open Graph and Twitter Card tags, JSON-LD structured data, static crawler-visible H1 content, SVG/32px favicons, and a 1200×630 social preview image.
- Added a read-only Taiwan company REST API, MCP server with search/detail/relationship tools, and a public Agent Skill linked from the site footer.

## 2026-07-19

- Simplified the relationship controls from six two-hop permutations to three useful views: all direct relationships, upstream, and downstream. Small relationship maps now use a deterministic SVG fallback so focus companies such as TSMC remain visible with their direct links; large expansions continue to use G6.
- Connected zoom, reset, hover, and click-to-expand controls to the small-map SVG fallback.
- Made node expansion toggleable: clicking an expanded node now collapses its branch and hides descendants that are no longer connected to the focus path.
- Made directional edges explicit in the SVG relationship map with visible arrowheads ending at node boundaries.
- Enlarged graph nodes and added upstream/downstream relationship-count badges to show which nodes can be expanded.
- Added persistent recent-company history in the sidebar, graph breadcrumbs, and listed-company-first index ordering with stock-code badges.
- Added an expanded-entity panel that keeps the focus company fixed while showing the upstream and downstream entities opened from the last clicked node.
- Moved the three relationship controls above the graph, replaced the utility navbar with breadcrumbs and a company search box, and refreshed graph colours with a warm high-contrast palette.
- Renamed the product to 888台灣的公司關係網, added draggable SVG nodes and auto-fit after graph updates, and removed the duplicate right-side focus panel.
- Added david888.com to the footer and installed the WebTalk origin-scoped chat widget site-wide.
- Migrated the client build from Create React App to Vite and updated the React/Tailwind/shadcn UI stack.
- Replaced `react-force-graph-2d` with AntV G6 for the relationship explorer. The graph now has bounded native zoom, force layout, stable labels, and click-to-expand next-hop relationships.
- Fixed the two-hop relationship lens so first-hop links are retained and clicking a node expands it in place.
- Rebuilt the company and relationship datasets from the public source snapshots (885,755 approved records). The updater now supports both legacy `公司狀況` and current `登記現況` source fields, restoring recently registered companies such as 創造智能科技股份有限公司. Company detail data is split into two Pages-friendly files to remain below GitHub's 100 MB per-file limit.
- Added TWSE/TPEx company-alias index generation for listed-company abbreviations and stock codes (for example, 台積電 and 2330).
- Made data file writes atomic and raw-source downloads resumable.
- Relicensed project modifications under AGPL-3.0-or-later, retained upstream notices, and documented attribution to voidful and Creative Tim.
