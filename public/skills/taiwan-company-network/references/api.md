# Public GET API

Base URL: `https://tbdavid2019.github.io/taiwan-company-network/api/v1/`

- `GET index.json`: API instructions and first-character shard routing table.
- `GET aliases.json`: TWSE/TPEx stock-code aliases.
- `GET companies/{shard}.json`: company details and direct relationship arrays.

All endpoints are static, read-only JSON and require no authentication. Resolve shard URLs through `index.json`; do not guess filenames.
