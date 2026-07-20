import React, { useEffect, useState } from "react";
import { Bot, Check, Copy, Download } from "lucide-react";

import Header from "components/Headers/Header.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import skillContent from "../../public/skills/taiwan-company-network/SKILL.md?raw";

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
