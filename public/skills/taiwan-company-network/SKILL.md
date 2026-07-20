---
name: taiwan-company-network
description: Queries the public read-only Taiwan Company Network API for company registration summaries, stock-code aliases, and direct relationship-index links. Use when an agent needs to find a Taiwan company by registered name or TWSE/TPEx stock code, inspect its basic data, enumerate upstream or downstream entities, or provide its interactive graph URL.
---

# Taiwan Company Network

## API

Use only HTTP GET requests against:

`https://tbdavid2019.github.io/taiwan-company-network/api/v1/`

No authentication is required. Do not attempt POST, PUT, PATCH, DELETE, MCP, or local server connections.

## Workflow

1. GET `index.json`.
2. If the user supplied a stock code, GET the path in `index.aliases`, resolve the code to an exact registered company name, then continue.
3. Take the first Unicode character of the registered company name.
4. Read its relative shard path from `index.companyShards[firstCharacter]`.
5. GET that shard and read `data[exactRegisteredCompanyName]`.
6. For a prefix search, inspect keys in the same first-character shard and ask the user to disambiguate multiple matches.
7. Use `relationships.upstream` and `relationships.downstream` only as direct relationship-index links.
8. Cite `webUrl` when the interactive graph is useful.

## Example

For 中聯油脂股份有限公司:

1. GET `https://tbdavid2019.github.io/taiwan-company-network/api/v1/index.json`.
2. Read `companyShards["中"]`, which identifies the shard.
3. GET that shard URL relative to the API base.
4. Read `data["中聯油脂股份有限公司"]`.

## Response rules

- Preserve registered company names exactly as returned.
- Distinguish missing data from zero; render `null` as unavailable.
- Do not infer beneficial ownership, control, investment amount, or current legal status from a graph edge.
- Keep natural-person names masked exactly as supplied by the source data.
- Never download the old monolithic data files when the sharded GET API is available.

## Verification

- Confirm every HTTP response is successful before using it.
- Confirm the selected result matches the intended company.
- State that relationships are index links, not independently verified ownership claims.
