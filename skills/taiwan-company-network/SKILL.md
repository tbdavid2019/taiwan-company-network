---
name: taiwan-company-network
description: Searches Taiwan company registration summaries and direct relationship-index links by registered name, partial name, or TWSE/TPEx stock code. Use when an agent needs to find a Taiwan company, inspect its basic registration data, enumerate upstream or downstream entities, or provide a link to its relationship graph.
---

# Taiwan Company Network

## Workflow

1. Call `taiwan_company_search_companies` when the user provides a partial name, abbreviation, or stock code. Skip search only when the exact registered name is already known.
2. Call `taiwan_company_get_company` with the exact registered name to obtain the registration summary and relationship counts.
3. Call `taiwan_company_get_relationships` only when the user needs entity names. Select `upstream`, `downstream`, or `both`, and paginate instead of requesting an unbounded result.
4. Cite the returned `webUrl` when the user would benefit from the interactive graph.
5. State that relationship links come from the project's relationship index and are not independently verified ownership or investment claims.

## Tool availability

Prefer the three MCP tools above. If they are unavailable, state that the remote tool connection is not configured and provide the interactive website link instead. Do not claim that a tool call succeeded, and do not download the complete 46–69 MB data files into the model context.

## Response guidance

- Preserve registered company names exactly as returned.
- Distinguish missing data from zero; render `null` as unavailable.
- Do not infer beneficial ownership, control, investment amount, or current legal status from a graph edge.
- Keep natural-person names masked exactly as supplied by the source data.

## Verification

- Confirm the selected result matches the user's intended company.
- Confirm relationship direction and pagination are stated when listing entities.
- Include the data-semantics caveat when interpreting relationships.
