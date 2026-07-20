import React, { useEffect, useState } from "react";
import { Bot, Check, Copy, Download } from "lucide-react";

import Header from "components/Headers/Header.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const skillContent = `---
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
`;

function Skill() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "Agent Skill - 888台灣的公司關係網";
  }, []);

  const copySkill = async () => {
    await navigator.clipboard.writeText(skillContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadSkill = () => {
    const url = URL.createObjectURL(new Blob([skillContent], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "SKILL.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <Header
        description="讓支援 Agent Skills 的 LLM 知道如何搜尋臺灣公司、讀取基本資料與查詢直接關係。"
        eyebrow="LLM integration"
        title="Taiwan Company Network Skill"
      />

      <Card>
        <CardHeader className="border-b border-border/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="size-4 text-primary" />
                SKILL.md
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">複製內容交給 LLM，或下載後安裝到 Agent 的 skills 目錄。</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copySkill} type="button" variant="outline">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "已複製" : "複製"}
              </Button>
              <Button onClick={downloadSkill} type="button">
                <Download className="size-4" />
                下載
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-5 text-xs leading-6 text-slate-100 sm:p-6">
            <code>{skillContent}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default Skill;
