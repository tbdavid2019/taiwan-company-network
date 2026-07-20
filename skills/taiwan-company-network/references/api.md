# API reference

Start the local read-only service from the repository:

```bash
npm run api
```

Default base URL: `http://127.0.0.1:8787/api/v1`

## Endpoints

- `GET /companies?query={name-or-code}&limit=20&offset=0`
- `GET /companies/{registered-name}`
- `GET /companies/{registered-name}/relationships?direction=both&limit=50&offset=0`
- `GET /health`

Encode registered names as URL path segments. `direction` accepts `both`, `upstream`, or `downstream`. List responses contain `data` and `pagination`; errors always use `{ "error": { "code", "message", "details"? } }`.

The stateless Streamable HTTP MCP endpoint is `POST http://127.0.0.1:8787/mcp`. For a local stdio MCP process, run `npm run mcp`.

Full OpenAPI document: `https://tbdavid2019.github.io/taiwan-company-network/openapi.json`

Source repository: `https://github.com/tbdavid2019/taiwan-company-network`
