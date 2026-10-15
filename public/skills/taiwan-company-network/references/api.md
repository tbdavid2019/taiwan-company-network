# Public GET API

Base URL: `https://taiwan-company-network.david888.com/api/v1/`

- `GET index.json`: API instructions and first-character shard routing table.
- `GET aliases.json`: TWSE/TPEx stock-code aliases.
- `GET companies/{shard}.json`: company details and direct relationship arrays.

- `GET images/{prefix}/{image}.svg`: pre-rendered SVG overview; follow the absolute `imageUrl` returned in company records.

Company records include `webUrl` (interactive graph) and `imageUrl` (SVG URL or `null` for companies without direct links). Each image shows up to 12 upstream and 12 downstream links, preserving array order, with omitted counts. Full relationships remain in JSON. Native text size is at least 16px (12pt); shrinking a displayed image also shrinks its text.

All endpoints are static and read-only (JSON or SVG) and require no authentication. Resolve shard URLs through `index.json`; do not guess filenames.

## External Procurement Intelligence

To cross-reference any company's government contracting history and Public Procurement Act Article 101 records, query the company name or unified business number (`id`) against the ToBid database at `https://tobid.tw/?q={query}` or via the public ToBid MCP endpoint `https://api.tobid.tw/mcp`.

