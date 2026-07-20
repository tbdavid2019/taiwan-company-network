# Public GET API

Base URL: `https://taiwan-company-network.david888.com/api/v1/`

- `GET index.json`: API instructions and first-character shard routing table.
- `GET aliases.json`: TWSE/TPEx stock-code aliases.
- `GET companies/{shard}.json`: company details and direct relationship arrays.

All endpoints are static, read-only JSON and require no authentication. Resolve shard URLs through `index.json`; do not guess filenames.
