import{E as e,a as t,b as n,f as r,i,k as a,o,r as s,x as c}from"./index-CFudhiAR.js";import{t as l}from"./Header-DTMfb7h2.js";var u=n(`bot`,[[`path`,{d:`M12 8V4H8`,key:`hb8ula`}],[`rect`,{width:`16`,height:`12`,x:`4`,y:`8`,rx:`2`,key:`enze0r`}],[`path`,{d:`M2 14h2`,key:`vft8re`}],[`path`,{d:`M20 14h2`,key:`4cs60a`}],[`path`,{d:`M15 13v2`,key:`1xurst`}],[`path`,{d:`M9 13v2`,key:`rq6x2g`}]]),d=n(`check`,[[`path`,{d:`M20 6 9 17l-5-5`,key:`1gmf2c`}]]),f=n(`copy`,[[`rect`,{width:`14`,height:`14`,x:`8`,y:`8`,rx:`2`,ry:`2`,key:`17jyea`}],[`path`,{d:`M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2`,key:`zix9uf`}]]),p=n(`download`,[[`path`,{d:`M12 15V3`,key:`m9g1x1`}],[`path`,{d:`M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`,key:`ih7n3h`}],[`path`,{d:`m7 10 5 5 5-5`,key:`brsn70`}]]),m=a(e(),1),h=c(),g=`---
name: taiwan-company-network
description: Searches Taiwan company registration summaries and direct relationship-index links by registered name, partial name, or TWSE/TPEx stock code. Use when an agent needs to find a Taiwan company, inspect its basic registration data, enumerate upstream or downstream entities, or provide a link to its relationship graph.
---

# Taiwan Company Network

## Workflow

1. Call \`taiwan_company_search_companies\` when the user provides a partial name, abbreviation, or stock code. Skip search only when the exact registered name is already known.
2. Call \`taiwan_company_get_company\` with the exact registered name to obtain the registration summary and relationship counts.
3. Call \`taiwan_company_get_relationships\` only when the user needs entity names. Select \`upstream\`, \`downstream\`, or \`both\`, and paginate instead of requesting an unbounded result.
4. Cite the returned \`webUrl\` when the user would benefit from the interactive graph.
5. State that relationship links come from the project's relationship index and are not independently verified ownership or investment claims.

## Tool availability

Prefer the three MCP tools above. If they are unavailable, state that the remote tool connection is not configured and provide the interactive website link instead. Do not claim that a tool call succeeded, and do not download the complete 46–69 MB data files into the model context.

## Response guidance

- Preserve registered company names exactly as returned.
- Distinguish missing data from zero; render \`null\` as unavailable.
- Do not infer beneficial ownership, control, investment amount, or current legal status from a graph edge.
- Keep natural-person names masked exactly as supplied by the source data.

## Verification

- Confirm the selected result matches the user's intended company.
- Confirm relationship direction and pagination are stated when listing entities.
- Include the data-semantics caveat when interpreting relationships.
`;function _(){let[e,n]=(0,m.useState)(!1);return(0,m.useEffect)(()=>{document.title=`Agent Skill - 888台灣的公司關係網`},[]),(0,h.jsxs)(`div`,{className:`fade-in`,children:[(0,h.jsx)(l,{description:`讓支援 Agent Skills 的 LLM 知道如何搜尋臺灣公司、讀取基本資料與查詢直接關係。`,eyebrow:`LLM integration`,title:`Taiwan Company Network Skill`}),(0,h.jsxs)(s,{children:[(0,h.jsx)(t,{className:`border-b border-border/70 px-5 py-5 sm:px-6`,children:(0,h.jsxs)(`div`,{className:`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`,children:[(0,h.jsxs)(`div`,{children:[(0,h.jsxs)(o,{className:`flex items-center gap-2 text-base`,children:[(0,h.jsx)(u,{className:`size-4 text-primary`}),`SKILL.md`]}),(0,h.jsx)(`p`,{className:`mt-1 text-sm text-muted-foreground`,children:`複製內容交給 LLM，或下載後安裝到 Agent 的 skills 目錄。`})]}),(0,h.jsxs)(`div`,{className:`flex gap-2`,children:[(0,h.jsxs)(r,{onClick:async()=>{await navigator.clipboard.writeText(g),n(!0),window.setTimeout(()=>n(!1),1800)},type:`button`,variant:`outline`,children:[e?(0,h.jsx)(d,{className:`size-4`}):(0,h.jsx)(f,{className:`size-4`}),e?`已複製`:`複製`]}),(0,h.jsxs)(r,{onClick:()=>{let e=URL.createObjectURL(new Blob([g],{type:`text/markdown;charset=utf-8`})),t=document.createElement(`a`);t.href=e,t.download=`SKILL.md`,t.click(),URL.revokeObjectURL(e)},type:`button`,children:[(0,h.jsx)(p,{className:`size-4`}),`下載`]})]})]})}),(0,h.jsx)(i,{className:`p-0`,children:(0,h.jsx)(`pre`,{className:`max-h-[65vh] overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-5 text-xs leading-6 text-slate-100 sm:p-6`,children:(0,h.jsx)(`code`,{children:g})})})]})]})}export{_ as default};