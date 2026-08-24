import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Check,
  Copy,
  Download,
  ExternalLink,
  Play,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

import Header from "components/Headers/Header.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import skillContent from "../../public/skills/taiwan-company-network/SKILL.md?raw";
import { loadCompanyAliases, loadCompanyDetails, loadGraph } from "@/lib/companyData";
import {
  buildCompanyToolIndex,
  executeCompanySearch,
  executeCompanyProfile,
  executeCompanyRelationships,
  executeOpenCompanyNetwork,
  resolveWebMcpModelContext,
} from "@/lib/webmcp";

const WEBMCP_TOOLS = [
  {
    name: "search_taiwan_companies",
    type: "Imperative (JavaScript)",
    description: "Search Taiwan companies & legal entities by name, stock code, or alias.",
    sample: { query: "台積電", limit: 3 },
  },
  {
    name: "get_taiwan_company_profile",
    type: "Imperative (JavaScript)",
    description: "Retrieve registered ID, capital, representative, address, and aliases.",
    sample: { company: "2330" },
  },
  {
    name: "get_taiwan_company_links",
    type: "Imperative (JavaScript)",
    description: "Query direct upstream and downstream relationships in the index.",
    sample: { company: "2330", direction: "both", limit: 5 },
  },
  {
    name: "open_company_network",
    type: "Imperative (Action / Navigation)",
    description: "Navigate active tab to visual company relationship graph in the browser.",
    sample: { company: "2330", direction: "both" },
  },
];

const DECLARATIVE_TOOLS = [
  {
    toolname: "search_companies_form",
    location: "Companies Index (/index)",
    description: "Interactive directory search form with toolparamdescription on query input.",
  },
  {
    toolname: "quick_company_search",
    location: "Navbar Header (/index, /graph)",
    description: "Quick navigation search bar allowing agent to jump directly to any company graph.",
  },
  {
    toolname: "switch_relationship_view",
    location: "Relationship Graph (/graph)",
    description: "Relationship filter toggling between all, upstream (incoming), and downstream.",
  },
];

function Skill() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [mcpStatus, setMcpStatus] = useState("checking");
  const [mcpApi, setMcpApi] = useState("none");
  const [toolIndex, setToolIndex] = useState(null);
  const [testQuery, setTestQuery] = useState("2330");
  const [selectedTool, setSelectedTool] = useState("search_taiwan_companies");
  const [testOutput, setTestOutput] = useState("");
  const [isRunningTest, setIsRunningTest] = useState(false);

  useEffect(() => {
    document.title = "Agent Skill & WebMCP - 888台灣的公司關係網";

    const { context, api } = resolveWebMcpModelContext({
      documentObject: typeof document !== "undefined" ? document : null,
      navigatorObject: typeof navigator !== "undefined" ? navigator : null,
    });
    setMcpApi(api);
    setMcpStatus(context ? "ready" : "unsupported");

    Promise.all([loadGraph(), loadCompanyDetails(), loadCompanyAliases()])
      .then(([graph, details, aliases]) => {
        const index = buildCompanyToolIndex({ aliases, details, graph });
        setToolIndex(index);
      })
      .catch(() => {});
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

  const runToolTest = async (toolName) => {
    if (!toolIndex) return;
    setIsRunningTest(true);
    const targetTool = toolName || selectedTool;
    setSelectedTool(targetTool);
    const baseUrl = window.location.origin;

    try {
      let result = "";
      if (targetTool === "search_taiwan_companies") {
        result = executeCompanySearch(toolIndex, { query: testQuery, limit: 5, baseUrl });
      } else if (targetTool === "get_taiwan_company_profile") {
        result = executeCompanyProfile(toolIndex, { company: testQuery, baseUrl });
      } else if (targetTool === "get_taiwan_company_links") {
        result = executeCompanyRelationships(toolIndex, { company: testQuery, direction: "both", limit: 10, baseUrl });
      } else if (targetTool === "open_company_network") {
        result = executeOpenCompanyNetwork(toolIndex, {
          company: testQuery,
          direction: "both",
          baseUrl,
          onNavigate: ({ name }) => {
            navigate(`/graph?company=${encodeURIComponent(name)}`);
          },
        });
      }
      setTestOutput(JSON.stringify(JSON.parse(result), null, 2));
    } catch (err) {
      setTestOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <Header
        description="本站同時支援 Chrome 內建 AI 的 WebMCP (Model Context Protocol) 規範與靜態 Agent Skill (SKILL.md)，讓瀏覽器內外各類 AI 代理皆能結構化探索臺灣公司關係資料。"
        eyebrow="AI Integration & WebMCP"
        title="Agent Skill & WebMCP Tools"
      />

      {/* WebMCP Section */}
      <Card className="overflow-hidden border-border/80">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-base">Chrome WebMCP 整合規範</CardTitle>
                <Badge
                  className="font-mono text-xs"
                  variant={mcpStatus === "ready" ? "default" : "secondary"}
                >
                  {mcpStatus === "ready"
                    ? `WebMCP Ready (${mcpApi})`
                    : "WebMCP Experimental (Flags/Trial)"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                依據{" "}
                <a
                  className="inline-flex items-center gap-0.5 text-primary underline underline-offset-4"
                  href="https://developer.chrome.com/docs/ai/webmcp?hl=zh-tw"
                  rel="noreferrer"
                  target="_blank"
                >
                  Google Chrome WebMCP 官方文件 <ExternalLink className="size-3" />
                </a>{" "}
                實作之命令式 (Imperative) 與宣告式 (Declarative) 工具集。
              </p>
            </div>
            <a
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              href="https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd?hl=zh-tw"
              rel="noreferrer"
              target="_blank"
            >
              Model Context Tool Inspector 擴充功能 <ExternalLink className="size-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          {/* Imperative tools grid */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="size-4 text-amber-500" />
              命令式工具 (Imperative Tools - document.modelContext)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {WEBMCP_TOOLS.map((tool) => (
                <div
                  className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition hover:border-primary/40"
                  key={tool.name}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{tool.name}</span>
                      <Badge className="text-[10px]" variant="outline">{tool.type}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{tool.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      範例: {JSON.stringify(tool.sample)}
                    </span>
                    <Button
                      className="h-7 text-xs"
                      disabled={!toolIndex || isRunningTest}
                      onClick={() => runToolTest(tool.name)}
                      size="sm"
                      variant="secondary"
                    >
                      <Play className="size-3" /> 測試
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Declarative tools */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Terminal className="size-4 text-emerald-500" />
              宣告式表單工具 (Declarative Tools - HTML form & input annotations)
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {DECLARATIVE_TOOLS.map((tool) => (
                <div
                  className="rounded-xl border border-border/70 bg-muted/20 p-3.5"
                  key={tool.toolname}
                >
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    &lt;form toolname="{tool.toolname}"&gt;
                  </span>
                  <p className="mt-1 text-[11px] font-medium text-foreground">{tool.location}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive WebMCP Tool Test Console */}
          <div className="rounded-xl border border-border/80 bg-slate-950 p-4 text-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  WebMCP Live Test Runner
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 w-44 border-slate-700 bg-slate-900 font-mono text-xs text-slate-100 placeholder:text-slate-500"
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="公司名稱或股號 (2330)"
                  value={testQuery}
                />
                <Button
                  className="h-8 text-xs"
                  disabled={!toolIndex || isRunningTest}
                  onClick={() => runToolTest(selectedTool)}
                  size="sm"
                >
                  <Play className="size-3" /> 執行 {selectedTool}
                </Button>
              </div>
            </div>
            {testOutput ? (
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-900/90 p-3 font-mono text-xs text-slate-200">
                <code>{testOutput}</code>
              </pre>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                點擊上方工具的「測試」按鈕，即可在當前瀏覽器環境直接執行 WebMCP 函式並檢視輸出。
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SKILL.md Section */}
      <Card>
        <CardHeader className="border-b border-border/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="size-4 text-primary" />
                SKILL.md (遠端 HTTP GET Agent Skill 規範)
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                提供無瀏覽器環境之遠端 LLM 透過公開靜態 GET API 查詢臺灣公司資料。複製內容交給 LLM，或下載後安裝到 Agent 的 skills 目錄。
              </p>
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

