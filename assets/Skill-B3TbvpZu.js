import{E as e,a as t,b as n,f as r,i,k as a,o,r as s,x as c}from"./index-DAa_buUW.js";import{t as l}from"./Header-Bx9jMuhY.js";var u=n(`bot`,[[`path`,{d:`M12 8V4H8`,key:`hb8ula`}],[`rect`,{width:`16`,height:`12`,x:`4`,y:`8`,rx:`2`,key:`enze0r`}],[`path`,{d:`M2 14h2`,key:`vft8re`}],[`path`,{d:`M20 14h2`,key:`4cs60a`}],[`path`,{d:`M15 13v2`,key:`1xurst`}],[`path`,{d:`M9 13v2`,key:`rq6x2g`}]]),d=n(`check`,[[`path`,{d:`M20 6 9 17l-5-5`,key:`1gmf2c`}]]),f=n(`copy`,[[`rect`,{width:`14`,height:`14`,x:`8`,y:`8`,rx:`2`,ry:`2`,key:`17jyea`}],[`path`,{d:`M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2`,key:`zix9uf`}]]),p=n(`download`,[[`path`,{d:`M12 15V3`,key:`m9g1x1`}],[`path`,{d:`M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`,key:`ih7n3h`}],[`path`,{d:`m7 10 5 5 5-5`,key:`brsn70`}]]),m=a(e(),1),h=`---
name: taiwan-company-network
description: Queries the public read-only Taiwan Company Network API for company registration summaries, stock-code aliases, and direct relationship-index links. Use when an agent needs to find a Taiwan company by registered name or TWSE/TPEx stock code, inspect its basic data, enumerate upstream or downstream entities, or provide its interactive graph URL.
---

# Taiwan Company Network

## API

Use only HTTP GET requests against:

\`https://taiwan-company-network.david888.com/api/v1/\`

No authentication is required. Do not attempt POST, PUT, PATCH, DELETE, MCP, or local server connections.

## Workflow

1. GET \`index.json\`.
2. If the user supplied a stock code, GET the path in \`index.aliases\`, resolve the code to an exact registered company name, then continue.
3. Take the first Unicode character of the registered company name.
4. Read its relative shard path from \`index.companyShards[firstCharacter]\`.
5. GET that shard and read \`data[exactRegisteredCompanyName]\`.
6. For a prefix search, inspect keys in the same first-character shard and ask the user to disambiguate multiple matches.
7. Use \`relationships.upstream\` and \`relationships.downstream\` only as direct relationship-index links.
8. Cite \`webUrl\` when the interactive graph is useful.

## Example

For 中聯油脂股份有限公司:

1. GET \`https://taiwan-company-network.david888.com/api/v1/index.json\`.
2. Read \`companyShards["中"]\`, which identifies the shard.
3. GET that shard URL relative to the API base.
4. Read \`data["中聯油脂股份有限公司"]\`.

## Response rules

- Preserve registered company names exactly as returned.
- Distinguish missing data from zero; render \`null\` as unavailable.
- Do not infer beneficial ownership, control, investment amount, or current legal status from a graph edge.
- Keep natural-person names masked exactly as supplied by the source data.
- Never download the old monolithic data files when the sharded GET API is available.

## Verification

- Confirm every HTTP response is successful before using it.
- Confirm the selected result matches the intended company.
- State that relationships are index links, not independently verified ownership claims.
`,g=c();function _(){let[e,n]=(0,m.useState)(!1);return(0,m.useEffect)(()=>{document.title=`Agent Skill - 888台灣的公司關係網`},[]),(0,g.jsxs)(`div`,{className:`fade-in`,children:[(0,g.jsx)(l,{description:`讓支援 Agent Skills 的 LLM 知道如何搜尋臺灣公司、讀取基本資料與查詢直接關係。`,eyebrow:`LLM integration`,title:`Taiwan Company Network Skill`}),(0,g.jsxs)(s,{children:[(0,g.jsx)(t,{className:`border-b border-border/70 px-5 py-5 sm:px-6`,children:(0,g.jsxs)(`div`,{className:`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(o,{className:`flex items-center gap-2 text-base`,children:[(0,g.jsx)(u,{className:`size-4 text-primary`}),`SKILL.md`]}),(0,g.jsx)(`p`,{className:`mt-1 text-sm text-muted-foreground`,children:`複製內容交給 LLM，或下載後安裝到 Agent 的 skills 目錄。`})]}),(0,g.jsxs)(`div`,{className:`flex gap-2`,children:[(0,g.jsxs)(r,{onClick:async()=>{await navigator.clipboard.writeText(h),n(!0),window.setTimeout(()=>n(!1),1800)},type:`button`,variant:`outline`,children:[e?(0,g.jsx)(d,{className:`size-4`}):(0,g.jsx)(f,{className:`size-4`}),e?`已複製`:`複製`]}),(0,g.jsxs)(r,{onClick:()=>{let e=URL.createObjectURL(new Blob([h],{type:`text/markdown;charset=utf-8`})),t=document.createElement(`a`);t.href=e,t.download=`SKILL.md`,t.click(),URL.revokeObjectURL(e)},type:`button`,children:[(0,g.jsx)(p,{className:`size-4`}),`下載`]})]})]})}),(0,g.jsx)(i,{className:`p-0`,children:(0,g.jsx)(`pre`,{className:`max-h-[65vh] overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-5 text-xs leading-6 text-slate-100 sm:p-6`,children:(0,g.jsx)(`code`,{children:h})})})]})]})}export{_ as default};