# API reference

The REST and MCP contracts are implemented in the source repository. Do not call them until a public remote base URL is configured by the service operator.

## Endpoints

- `GET /companies?query={name-or-code}&limit=20&offset=0`
- `GET /companies/{registered-name}`
- `GET /companies/{registered-name}/relationships?direction=both&limit=50&offset=0`
- `GET /health`

Encode registered names as URL path segments. `direction` accepts `both`, `upstream`, or `downstream`. List responses contain `data` and `pagination`; errors always use `{ "error": { "code", "message", "details"? } }`.

Full OpenAPI document: `https://tbdavid2019.github.io/taiwan-company-network/openapi.json`

Source repository: `https://github.com/tbdavid2019/taiwan-company-network`
