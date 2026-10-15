import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Building2,
  Check,
  Copy,
  Download,
  ExternalLink,
  Landmark,
  Play,
  ShieldCheck,
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
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
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

  const copyCmd = async () => {
    await navigator.clipboard.writeText("claude mcp add --transport http tobid https://api.tobid.tw/mcp");
    setCopiedCmd(true);
    window.setTimeout(() => setCopiedCmd(false), 1800);
  };

  const copyPrompt = async () => {
    const promptText = "請先透過 taiwan-company-network 查出目標企業的核心上下游子公司與關聯企業，接著使用 tobid MCP 的 vendor_report 與 vendor_compliance，分析這些關聯企業近年的政府標案得標總額、主要承辦部會，並檢查是否有任何採購法停權紀錄。";
    await navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1800);
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
                  className="font-mono text-base"
                  variant={mcpStatus === "ready" ? "default" : "secondary"}
                >
                  {mcpStatus === "ready"
                    ? `WebMCP Ready (${mcpApi})`
                    : "WebMCP Experimental (Flags/Trial)"}
                </Badge>
              </div>
              <p className="mt-1 text-base text-muted-foreground">
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
              className="inline-flex items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground"
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
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
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
                      <span className="font-mono text-base font-semibold text-primary">{tool.name}</span>
                      <Badge className="text-base" variant="outline">{tool.type}</Badge>
                    </div>
                    <p className="mt-2 text-base leading-6 text-muted-foreground">{tool.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                    <span className="font-mono text-base text-muted-foreground">
                      範例: {JSON.stringify(tool.sample)}
                    </span>
                    <Button
                      className="h-7 text-base"
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
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <Terminal className="size-4 text-emerald-500" />
              宣告式表單工具 (Declarative Tools - HTML form & input annotations)
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {DECLARATIVE_TOOLS.map((tool) => (
                <div
                  className="rounded-xl border border-border/70 bg-muted/20 p-3.5"
                  key={tool.toolname}
                >
                  <span className="font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400">
                    &lt;form toolname="{tool.toolname}"&gt;
                  </span>
                  <p className="mt-1 text-base font-medium text-foreground">{tool.location}</p>
                  <p className="mt-1 text-base text-muted-foreground">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive WebMCP Tool Test Console */}
          <div className="rounded-xl border border-border/80 bg-slate-950 p-4 text-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-blue-400" />
                <span className="text-base font-semibold uppercase tracking-wider text-slate-300">
                  WebMCP Live Test Runner
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 w-44 border-slate-700 bg-slate-900 font-mono text-base text-slate-100 placeholder:text-slate-500"
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="公司名稱或股號 (2330)"
                  value={testQuery}
                />
                <Button
                  className="h-8 text-base"
                  disabled={!toolIndex || isRunningTest}
                  onClick={() => runToolTest(selectedTool)}
                  size="sm"
                >
                  <Play className="size-3" /> 執行 {selectedTool}
                </Button>
              </div>
            </div>
            {testOutput ? (
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-900/90 p-3 font-mono text-base text-slate-200">
                <code>{testOutput}</code>
              </pre>
            ) : (
              <p className="mt-2 text-base text-slate-400">
                點擊上方工具的「測試」按鈕，即可在當前瀏覽器環境直接執行 WebMCP 函式並檢視輸出。
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ecosystem Partner Section: ToBid MCP */}
      <Card className="overflow-hidden border-border/80">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="size-4 text-[#2f7d6d]" />
                <CardTitle className="text-base">生態夥伴聯動：ToBid 政府標案 MCP</CardTitle>
                <Badge className="font-mono text-base" variant="secondary">
                  Streamable HTTP / Free
                </Badge>
              </div>
              <p className="mt-1 text-base text-muted-foreground">
                結合臺灣公開政府標案數據庫{" "}
                <a
                  className="inline-flex items-center gap-0.5 text-primary underline underline-offset-4"
                  href="https://tobid.tw/guide/mcp"
                  rel="noreferrer"
                  target="_blank"
                >
                  ToBid (1,400 萬筆標案) <ExternalLink className="size-3" />
                </a>
                ，讓 AI 代理同時具備「企業集團股權結構」與「公部門採購得標情報」的全方位調查能力。
              </p>
            </div>
            <a
              className="inline-flex items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground"
              href="https://tobid.tw/guide/mcp"
              rel="noreferrer"
              target="_blank"
            >
              ToBid MCP 設定指引 <ExternalLink className="size-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          {/* Capabilities Grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground text-base">
                <Building2 className="size-4 text-primary" />
                <span>集團穿透 × 標案版圖</span>
              </div>
              <p className="mt-2 text-base leading-6 text-muted-foreground">
                先由本專案解析集團旗艦核心與子公司群，再透過 ToBid <code>vendor_report</code> 查閱各子公司的歷年得標總額與常客部會。
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground text-base">
                <Sparkles className="size-4 text-amber-500" />
                <span>同業競標 × 底價分析</span>
              </div>
              <p className="mt-2 text-base leading-6 text-muted-foreground">
                分析合資企業與同業實體時，利用 ToBid <code>compare_vendors</code> 與 <code>price_analysis</code> 深入同場對抗紀錄與真實底價落點。
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground text-base">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>法規合規 × 101 條停權</span>
              </div>
              <p className="mt-2 text-base leading-6 text-muted-foreground">
                穿透複雜股權關聯，同步利用 ToBid <code>vendor_compliance</code> 檢驗各節點是否有政府採購法第 101 條拒絕往來或停權紀錄。
              </p>
            </div>
          </div>

          {/* Claude Code MCP Command Box */}
          <div className="rounded-xl border border-border/80 bg-slate-950 p-4 text-slate-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-emerald-400" />
                <span className="text-base font-semibold uppercase tracking-wider text-slate-300">
                  Claude Code / AI Client 終端機設定命令
                </span>
              </div>
              <Button
                className="h-7 text-base text-slate-200 hover:text-white"
                onClick={copyCmd}
                size="sm"
                variant="ghost"
              >
                {copiedCmd ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copiedCmd ? "已複製命令" : "複製命令"}
              </Button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900/90 p-3 font-mono text-base text-emerald-300">
              <code>claude mcp add --transport http tobid https://api.tobid.tw/mcp</code>
            </pre>
            <p className="mt-2 text-base text-slate-400">
              Claude Desktop / Cursor / Windsurf 亦可直接以 Streamable HTTP 方式加入端點 <code>https://api.tobid.tw/mcp</code>。免 API Key、免註冊。
            </p>
          </div>

          {/* Recommended Multi-Tool Prompt */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-base font-semibold text-foreground">
                推薦雙工具協同提示詞 (Multi-Tool Prompt)
              </span>
              <Button
                className="h-7 text-base"
                onClick={copyPrompt}
                size="sm"
                variant="outline"
              >
                {copiedPrompt ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedPrompt ? "已複製 Prompt" : "複製 Prompt"}
              </Button>
            </div>
            <p className="mt-2 rounded-lg border border-border/60 bg-background/80 p-3 text-base leading-6 text-foreground/90">
              「請先透過 taiwan-company-network 查出目標企業的核心上下游子公司與關聯企業，接著使用 tobid MCP 的 vendor_report 與 vendor_compliance，分析這些關聯企業近年的政府標案得標總額、主要承辦部會，並檢查是否有任何採購法停權紀錄。」
            </p>
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
              <p className="mt-1 text-base text-muted-foreground">
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
          <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-5 text-base leading-6 text-slate-100 sm:p-6">
            <code>{skillContent}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default Skill;

