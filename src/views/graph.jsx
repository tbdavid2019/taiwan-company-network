import React, { useEffect, useMemo, useRef, useState } from "react";
import { Graph } from "@antv/g6";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Compass,
  LoaderCircle,
  MapPin,
  Minus,
  Network,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";

import Header from "components/Headers/Header.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { loadCompanyDetails, loadGraph } from "@/lib/companyData";
import { useCompany } from "context/CompanyContext";

const VIEW_OPTIONS = [
  { id: "both", label: "全部關係", hint: "All direct relationships", icon: Network },
  { id: "invest", label: "上游", hint: "Direct incoming", icon: ArrowDownLeft },
  { id: "outvest", label: "下游", hint: "Direct outgoing", icon: ArrowUpRight },
];

function formatCapital(value) {
  if (value === undefined || value === null || value === "") return "—";
  return new Intl.NumberFormat("zh-TW").format(Number(value));
}

function firstConnectedEntity(network) {
  return Object.keys(network).find((name) => network[name]?.in?.length || network[name]?.out?.length) || Object.keys(network)[0] || "";
}

function makeGraphData(network, root, mode, details, expandedNodes) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeIds = new Set();

  const ensureNode = (id) => {
    if (!id || nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({
      id,
      data: { name: id, kind: details[id] ? "company" : "entity", isRoot: id === root },
    });
  };

  const addNeighbours = (source, direction) => {
    ensureNode(source);
    (network[source]?.[direction] || []).forEach((target) => {
      ensureNode(target);
      const edge = direction === "in" ? { source: target, target: source } : { source, target };
      const id = `${edge.source}::${edge.target}`;
      if (!edgeIds.has(id)) {
        edgeIds.add(id);
        edges.push({ id, ...edge });
      }
    });
  };

  ensureNode(root);
  if (mode === "both") {
    addNeighbours(root, "in");
    addNeighbours(root, "out");
  }
  if (mode === "invest") addNeighbours(root, "in");
  if (mode === "outvest") addNeighbours(root, "out");
  expandedNodes.forEach((nodeId) => {
    if (nodeId === root) return;
    if (mode === "both") {
      addNeighbours(nodeId, "in");
      addNeighbours(nodeId, "out");
    } else {
      addNeighbours(nodeId, mode === "invest" ? "in" : "out");
    }
  });

  return { nodes, edges };
}

function EntityDetails({ name, details }) {
  const info = details?.[name];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {info ? <Building2 className="size-4" /> : <Compass className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-5">{name}</p>
          <Badge className="mt-1" variant="outline">{info ? "Company record" : "Network entity"}</Badge>
        </div>
      </div>
      {info ? (
        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-2"><span className="w-24 shrink-0 text-muted-foreground">Capital</span><span className="font-medium">NT$ {formatCapital(info.資本總額)}</span></div>
          <div className="flex items-start gap-2"><UserRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{info.代表人姓名 || "Representative unavailable"}</span></div>
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{info.公司所在地 || "Address unavailable"}</span></div>
        </div>
      ) : <p className="text-xs leading-5 text-muted-foreground">This node is present in the relationship index but has no company detail record.</p>}
    </div>
  );
}

function LocalRelationshipMap({ data, onNodeClick, onNodeHover, zoom }) {
  const width = 1200;
  const height = 720;
  const center = { x: width / 2, y: height / 2 };
  const root = data.nodes.find((node) => node.data?.isRoot) || data.nodes[0];
  const otherNodes = data.nodes.filter((node) => node.id !== root?.id);
  const positions = new Map([[root?.id, center]]);

  const ringCapacities = [10, 20, 32, 48];
  let ring = 0;
  let ringOffset = 0;
  otherNodes.forEach((node, index) => {
    while (index >= ringOffset + ringCapacities[ring]) {
      ringOffset += ringCapacities[ring];
      ring += 1;
    }
    const ringCount = Math.min(ringCapacities[ring], otherNodes.length - ringOffset);
    const angle = (-Math.PI / 2) + ((index - ringOffset) * (2 * Math.PI)) / ringCount;
    const radius = 175 + ring * 115;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * Math.min(radius * 0.68, 270),
    });
  });

  return (
    <svg aria-label="Company relationship graph" className="h-full w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <marker id="relationship-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
        </marker>
      </defs>
      <g transform={`translate(${center.x} ${center.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`}>
      {data.edges.map((edge) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (!source || !target) return null;
        return <line key={edge.id} markerEnd="url(#relationship-arrow)" stroke="#94a3b8" strokeWidth="2" x1={source.x} x2={target.x} y1={source.y} y2={target.y} />;
      })}
      {data.nodes.map((node) => {
        const position = positions.get(node.id);
        const isRoot = node.data?.isRoot;
        const isCompany = node.data?.kind === "company";
        const fill = isRoot ? "#2563eb" : isCompany ? "#0f766e" : "#94a3b8";
        const label = String(node.data?.name || node.id);
        return (
          <g
            className="cursor-pointer"
            key={node.id}
            onClick={() => onNodeClick(node.id)}
            onMouseEnter={() => onNodeHover(node.id)}
            onMouseLeave={() => onNodeHover("")}
          >
            {isRoot && <circle cx={position.x} cy={position.y} fill="#bfdbfe" r="27" />}
            <circle cx={position.x} cy={position.y} fill={fill} r={isRoot ? 17 : 13} stroke="#fff" strokeWidth="3" />
            <text fill={isRoot ? "#1d4ed8" : "#334155"} fontFamily="Geist Variable, sans-serif" fontSize={isRoot ? 16 : 12} fontWeight={isRoot ? 600 : 500} textAnchor="middle" x={position.x} y={position.y + (isRoot ? 43 : 34)}>{label}</text>
          </g>
        );
      })}
      </g>
    </svg>
  );
}

function NetworkGraph() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCompanyDetails, setSelectedCompany } = useCompany();
  const graphContainerRef = useRef(null);
  const graphRef = useRef(null);
  const [network, setNetwork] = useState({});
  const [details, setDetails] = useState({});
  const [company, setCompany] = useState("");
  const [mode, setMode] = useState("both");
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [hoveredNode, setHoveredNode] = useState("");
  const [localZoom, setLocalZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestedCompany = searchParams.get("company") || location.state?.company;

  useEffect(() => {
    let active = true;
    loadGraph().then((graphData) => {
      if (!active) return;
      setNetwork(graphData);
      setCompany(requestedCompany || firstConnectedEntity(graphData));
      setIsLoading(false);
      return loadCompanyDetails().then((detailData) => active && setDetails(detailData)).catch(() => {});
    }).catch((loadError) => {
      if (active) {
        setError(loadError.message || "Unable to load the network dataset.");
        setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Object.keys(network).length && requestedCompany) setCompany(requestedCompany);
  }, [network, requestedCompany]);

  useEffect(() => {
    setExpandedNodes(new Set());
    setLocalZoom(1);
  }, [company, mode]);

  useEffect(() => {
    setSelectedCompany(company || null);
    setCompanyDetails(company ? details[company] || null : null);
  }, [company, details, setCompanyDetails, setSelectedCompany]);

  const graphData = useMemo(
    () => makeGraphData(network, company, mode, details, expandedNodes),
    [company, details, expandedNodes, mode, network],
  );
  const currentView = VIEW_OPTIONS.find((option) => option.id === mode);
  const useLocalRelationshipMap = graphData.nodes.length <= 80;

  useEffect(() => {
    const container = graphContainerRef.current;
    if (!container || graphRef.current) return undefined;

    const instance = new Graph({
      container,
      autoResize: true,
      autoFit: { type: "view", when: "always" },
      padding: 72,
      zoomRange: [0.5, 3],
      animation: false,
      behaviors: ["drag-canvas", "zoom-canvas", "drag-element-force"],
      layout: {
        type: "d3-force",
        link: { distance: 150 },
        manyBody: { strength: -520 },
        collide: { radius: 44 },
        alphaDecay: 0.08,
      },
      node: {
        style: (datum) => {
          const data = datum.data || {};
          const isRoot = data.isRoot;
          const isCompany = data.kind === "company";
          return {
            size: isRoot ? 30 : 20,
            fill: isRoot ? "#2563eb" : isCompany ? "#0f766e" : "#94a3b8",
            stroke: isRoot ? "#bfdbfe" : "#f8fafc",
            lineWidth: isRoot ? 7 : 2,
            label: true,
            labelText: String(data.name || datum.id),
            labelFill: isRoot ? "#1d4ed8" : "#334155",
            labelFontSize: isRoot ? 14 : 12,
            labelFontWeight: isRoot ? 600 : 400,
            labelPlacement: "bottom",
            labelOffsetY: 8,
            labelMaxWidth: 180,
            labelWordWrap: true,
          };
        },
      },
      edge: { style: { stroke: "#cbd5e1", lineWidth: 1.4, endArrow: true, endArrowSize: 5 } },
    });

    instance.on("node:click", (event) => {
      const id = event.target?.id;
      if (id) setExpandedNodes((current) => new Set(current).add(id));
    });
    instance.on("node:pointerenter", (event) => setHoveredNode(event.target?.id || ""));
    instance.on("node:pointerleave", () => setHoveredNode(""));
    graphRef.current = instance;
    return () => {
      instance.destroy();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = graphRef.current;
    if (!instance || !graphData.nodes.length) return;
    instance.setLayout(graphData.nodes.length === 1 ? { type: "grid", rows: 1, cols: 1 } : {
      type: "d3-force",
      link: { distance: 150 },
      manyBody: { strength: -520 },
      collide: { radius: 44 },
      alphaDecay: 0.08,
    });
    instance.setData(graphData);
    instance.render().catch((renderError) => setError(renderError.message || "Unable to render the network graph."));
  }, [graphData]);

  const zoom = (factor) => {
    if (useLocalRelationshipMap) {
      setLocalZoom((current) => Math.min(2.4, Math.max(0.65, current * factor)));
      return;
    }
    graphRef.current?.zoomBy(factor, { duration: 180 });
  };
  const resetGraph = () => {
    setHoveredNode("");
    setExpandedNodes(new Set());
    setLocalZoom(1);
    requestAnimationFrame(() => graphRef.current?.fitView({ padding: 72 }, { duration: 220 }));
  };

  if (isLoading) return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground"><LoaderCircle className="size-8 animate-spin text-primary" /><p className="text-sm">Loading relationship data…</p></div>;
  if (error) return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>;

  return (
    <div className="fade-in">
      <Header actions={<Button onClick={() => navigate("/index")} variant="outline"><ArrowLeft />Back to index</Button>} description="Start with all direct relationships, then click a node to expand the next layer in place." eyebrow="Network explorer" title={company || "Relationship graph"} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Network className="size-4 text-primary" />{currentView?.label}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{graphData.nodes.length} nodes · {graphData.edges.length} links</p></div><Badge variant="outline">{currentView?.hint}</Badge></div></CardHeader>
          <CardContent className="p-0"><div className="relative h-[560px] w-full overflow-hidden bg-slate-50 md:h-[640px]" ref={graphContainerRef}>
            {useLocalRelationshipMap && graphData.edges.length > 0 && (
              <div className="absolute inset-0 z-[1] p-8">
                <LocalRelationshipMap
                  data={graphData}
                  onNodeClick={(id) => setExpandedNodes((current) => new Set(current).add(id))}
                  onNodeHover={setHoveredNode}
                  zoom={localZoom}
                />
              </div>
            )}
            {graphData.edges.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <div className="max-w-sm rounded-2xl border border-border/80 bg-background/95 p-6 text-center shadow-sm">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="size-5" /></span>
                  <p className="mt-3 text-sm font-semibold">尚無可視化的法人關係</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{company} 已有公司登記資料，但目前關係索引沒有可連出的法人代表紀錄，因此沒有邊可以畫出。</p>
                </div>
              </div>
            )}
            {hoveredNode && <div className="pointer-events-none absolute right-4 top-4 z-10 w-[min(22rem,calc(100%-2rem))] rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur"><EntityDetails details={details} name={hoveredNode} /></div>}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-border/70 bg-background/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur"><span className="size-2 rounded-full bg-blue-600" /> Focus <span className="size-2 rounded-full bg-teal-700" /> Company <span className="size-2 rounded-full bg-slate-400" /> Entity <span>· 點節點展開</span> {expandedNodes.size > 0 && <span>· {expandedNodes.size} expanded</span>}</div>
            <div className="absolute bottom-4 right-4 z-10 flex gap-1 rounded-lg border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur"><Button aria-label="Zoom out" onClick={() => zoom(0.8)} size="icon" variant="ghost"><Minus /></Button><Button aria-label="Reset graph expansion" onClick={resetGraph} size="icon" variant="ghost"><RefreshCw /></Button><Button aria-label="Zoom in" onClick={() => zoom(1.2)} size="icon" variant="ghost"><Plus /></Button></div>
          </div></CardContent>
        </Card>
        <aside className="space-y-5">
          <Card><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm">Relationship lens</CardTitle><p className="text-xs leading-5 text-muted-foreground">Choose which direction to follow from the focus node.</p></CardHeader><CardContent className="space-y-2 px-5 pb-5">{VIEW_OPTIONS.map((option) => { const Icon = option.icon; const active = option.id === mode; return <Button className={`h-auto w-full justify-start gap-3 px-3 py-2.5 text-left ${active ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`} key={option.id} onClick={() => setMode(option.id)} variant={active ? "default" : "ghost"}><Icon className="size-4 shrink-0" /><span className="min-w-0"><span className="block truncate text-xs font-medium">{option.label}</span><span className={`block truncate text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{option.hint}</span></span></Button>; })}</CardContent></Card>
          <Card><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm">Focus entity</CardTitle></CardHeader><CardContent className="px-5 pb-5"><EntityDetails details={details} name={company} /><Separator className="my-4" /><p className="text-[11px] leading-5 text-muted-foreground">The source field currently represents legal-person relationships. Treat the edge as a network connection until ownership semantics are verified.</p></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}

export default NetworkGraph;
