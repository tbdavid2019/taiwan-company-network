import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  Building2,
  Compass,
  LoaderCircle,
  MapPin,
  Minus,
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
  { id: "invest", label: "指向焦點", hint: "Direct incoming", icon: ArrowDownLeft },
  { id: "outvest", label: "焦點指向", hint: "Direct outgoing", icon: ArrowUpRight },
  { id: "investout", label: "上游的下游", hint: "Incoming then outgoing", icon: ArrowRight },
  { id: "investin", label: "上游的上游", hint: "Incoming then incoming", icon: ArrowDownRight },
  { id: "outvestin", label: "下游的上游", hint: "Outgoing then incoming", icon: ArrowUpLeft },
  { id: "outvestout", label: "下游的下游", hint: "Outgoing then outgoing", icon: ArrowRight },
];

function formatCapital(value) {
  if (value === undefined || value === null || value === "") return "—";
  return new Intl.NumberFormat("zh-TW").format(Number(value));
}

function firstConnectedEntity(graph) {
  return Object.keys(graph).find((name) => graph[name]?.in?.length || graph[name]?.out?.length) || Object.keys(graph)[0] || "";
}

function makeGraphData(graph, root, mode, details) {
  const nodes = [];
  const links = [];
  const nodeIds = new Set();
  const linkIds = new Set();

  const ensureNode = (id) => {
    if (!id || nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({
      id,
      name: id,
      kind: details[id] ? "company" : "entity",
    });
  };

  const addNeighbours = (source, direction) => {
    ensureNode(source);
    const neighbours = graph[source]?.[direction] || [];
    neighbours.forEach((target) => {
      ensureNode(target);
      const link = direction === "in"
        ? { source: target, target: source }
        : { source, target };
      const linkId = `${link.source}::${link.target}`;
      if (!linkIds.has(linkId)) {
        linkIds.add(linkId);
        links.push(link);
      }
    });
  };

  ensureNode(root);
  if (mode === "invest") addNeighbours(root, "in");
  if (mode === "outvest") addNeighbours(root, "out");

  const twoHop = {
    investout: ["in", "out"],
    investin: ["in", "in"],
    outvestin: ["out", "in"],
    outvestout: ["out", "out"],
  }[mode];

  if (twoHop) {
    const firstHop = graph[root]?.[twoHop[0]] || [];
    firstHop.forEach((entity) => {
      addNeighbours(entity, twoHop[1]);
      ensureNode(entity);
    });
  }

  return { nodes, links };
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
          <div className="flex items-start gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">Capital</span>
            <span className="font-medium">NT$ {formatCapital(info.資本總額)}</span>
          </div>
          <div className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="break-words">{info.代表人姓名 || "Representative unavailable"}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="break-words">{info.公司所在地 || "Address unavailable"}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          This node is present in the relationship index but has no company detail record.
        </p>
      )}
    </div>
  );
}

function NetworkGraph() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCompanyDetails, setSelectedCompany } = useCompany();
  const graphContainerRef = useRef(null);
  const forceGraphRef = useRef(null);
  const [graph, setGraph] = useState({});
  const [details, setDetails] = useState({});
  const [company, setCompany] = useState("");
  const [mode, setMode] = useState("invest");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [size, setSize] = useState({ width: 900, height: 620 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestedCompany = searchParams.get("company") || location.state?.company;

  useEffect(() => {
    let active = true;

    loadGraph()
      .then((graphData) => {
        if (!active) return;
        setGraph(graphData);
        setCompany(requestedCompany && graphData[requestedCompany] ? requestedCompany : firstConnectedEntity(graphData));
        setIsLoading(false);

        return loadCompanyDetails()
          .then((detailsData) => {
            if (active) setDetails(detailsData);
          })
          .catch(() => {
            // The graph remains useful when the optional detail index is unavailable.
          });
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message || "Unable to load the network dataset.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!Object.keys(graph).length || !requestedCompany || !graph[requestedCompany]) return;
    setCompany(requestedCompany);
  }, [graph, requestedCompany]);

  useEffect(() => {
    setSelectedCompany(company || null);
    setCompanyDetails(company ? details[company] || null : null);
  }, [company, details, setCompanyDetails, setSelectedCompany]);

  useEffect(() => {
    if (!graphContainerRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(480, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(graphContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(
    () => makeGraphData(graph, company, mode, details),
    [company, details, graph, mode],
  );

  const currentView = VIEW_OPTIONS.find((option) => option.id === mode);

  const handleNodeClick = (node) => {
    setCompany(node.id);
    setSearchParams({ company: node.id });
  };

  const zoom = (factor) => {
    if (!forceGraphRef.current) return;
    forceGraphRef.current.zoom(forceGraphRef.current.zoom() * factor, 300);
  };

  const resetZoom = () => forceGraphRef.current?.zoomToFit(400, 50);

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-8 animate-spin text-primary" />
        <p className="text-sm">Loading relationship data…</p>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="fade-in">
      <Header
        actions={(
          <Button onClick={() => navigate("/index")} variant="outline">
            <ArrowLeft />
            Back to index
          </Button>
        )}
        description="Inspect direct relationships or move two hops through the selected entity. Click any node to make it the new focus."
        eyebrow="Network explorer"
        title={company || "Relationship graph"}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="size-4 text-primary" />
                  {currentView?.label}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{graphData.nodes.length} nodes · {graphData.links.length} links</p>
              </div>
              <Badge variant="outline">{currentView?.hint}</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="relative h-[560px] w-full overflow-hidden bg-slate-50 md:h-[640px]" ref={graphContainerRef}>
              <ForceGraph2D
                backgroundColor="#f8fafc"
                cooldownTicks={100}
                d3AlphaDecay={0.03}
                d3VelocityDecay={0.35}
                graphData={graphData}
                height={size.height}
                linkColor={() => "#cbd5e1"}
                linkDirectionalArrowLength={5}
                linkDirectionalArrowRelPos={1}
                linkWidth={1.5}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const isRoot = node.id === company;
                  const isHovered = hoveredNode?.id === node.id;
                  const showLabel = isRoot || isHovered || graphData.nodes.length <= 14 || globalScale > 1.25;
                  const nodeSize = isRoot ? 8 : isHovered ? 7 : 5;
                  const color = isRoot ? "#2563eb" : node.kind === "company" ? "#0f766e" : "#94a3b8";

                  ctx.save();
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                  ctx.fill();

                  if (isRoot || isHovered) {
                    ctx.strokeStyle = isRoot ? "rgba(37, 99, 235, .24)" : "rgba(15, 118, 110, .2)";
                    ctx.lineWidth = 5;
                    ctx.stroke();
                  }

                  if (showLabel) {
                    const label = node.name || node.id;
                    const fontSize = Math.max(9, (isRoot || isHovered ? 13 : 11) / globalScale);
                    ctx.font = `${isRoot || isHovered ? "600 " : ""}${fontSize}px Geist Variable, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    ctx.fillStyle = "rgba(248, 250, 252, .92)";
                    ctx.fillRect(node.x - textWidth / 2 - 4, node.y + 9, textWidth + 8, fontSize + 5);
                    ctx.fillStyle = isRoot ? "#1d4ed8" : "#334155";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(label, node.x, node.y + 11);
                  }
                  ctx.restore();
                }}
                nodeId="id"
                nodeLabel="name"
                nodePointerAreaPaint={(node, color, ctx) => {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI);
                  ctx.fill();
                }}
                onEngineStop={resetZoom}
                onNodeClick={handleNodeClick}
                onNodeHover={setHoveredNode}
                ref={forceGraphRef}
                width={size.width}
              />

              {hoveredNode && (
                <div className="pointer-events-none absolute right-4 top-4 w-[min(22rem,calc(100%-2rem))] rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur">
                  <EntityDetails details={details} name={hoveredNode.id} />
                </div>
              )}

              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-border/70 bg-background/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
                <span className="size-2 rounded-full bg-blue-600" /> Focus
                <span className="size-2 rounded-full bg-teal-700" /> Company
                <span className="size-2 rounded-full bg-slate-400" /> Entity
              </div>

              <div className="absolute bottom-4 right-4 flex gap-1 rounded-lg border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur">
                <Button aria-label="Zoom out" onClick={() => zoom(0.8)} size="icon" variant="ghost"><Minus /></Button>
                <Button aria-label="Reset zoom" onClick={resetZoom} size="icon" variant="ghost"><RefreshCw /></Button>
                <Button aria-label="Zoom in" onClick={() => zoom(1.2)} size="icon" variant="ghost"><Plus /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card>
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle className="text-sm">Relationship lens</CardTitle>
              <p className="text-xs leading-5 text-muted-foreground">Choose which direction to follow from the focus node.</p>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.id === mode;
                return (
                  <Button
                    className={`h-auto w-full justify-start gap-3 px-3 py-2.5 text-left ${active ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                    key={option.id}
                    onClick={() => setMode(option.id)}
                    variant={active ? "default" : "ghost"}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{option.label}</span>
                      <span className={`block truncate text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{option.hint}</span>
                    </span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle className="text-sm">Focus entity</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <EntityDetails details={details} name={company} />
              <Separator className="my-4" />
              <p className="text-[11px] leading-5 text-muted-foreground">
                The source field currently represents legal-person relationships. Treat the edge as a network connection until ownership semantics are verified.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default NetworkGraph;
