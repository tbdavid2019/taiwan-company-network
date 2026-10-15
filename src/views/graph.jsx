import { flushSync } from "react-dom";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Compass,
  ExternalLink,
  Landmark,
  LoaderCircle,
  MapPin,
  Minus,
  Network,
  Plus,
  Printer,
  RefreshCw,
  Share2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import Header from "components/Headers/Header.jsx";
import GraphShareDialog from "@/components/GraphShareDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeCompanyNode } from "@/lib/clefClient";
import { buildGraphShareUrl, uploadGraphToBox } from "@/lib/boxShare";
import { loadCompanyDetails, loadGraph } from "@/lib/companyData";
import { nodeSelectedOnPointerEnd, pointerMovementExceedsThreshold } from "@/lib/graphInteraction";
import { layoutReadableGraph } from "@/lib/graphReadableLayout";
import { calculateNodeRadii } from "@/lib/graphNodeSizing";
import { graphShareFileName, graphShareText } from "@/lib/graphShare";
import { calculatePinchViewport, clampZoom, companyPageTitle } from "@/lib/graphViewport";
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
      data: {
        name: id,
        kind: details[id] ? "company" : "entity",
        isRoot: id === root,
        upstreamCount: network[id]?.in?.length || 0,
        downstreamCount: network[id]?.out?.length || 0,
      },
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
    if (nodeId === root || !nodeIds.has(nodeId)) return;
    if (mode === "both") {
      addNeighbours(nodeId, "in");
      addNeighbours(nodeId, "out");
    } else {
      addNeighbours(nodeId, mode === "invest" ? "in" : "out");
    }
  });

  const nodeRadii = calculateNodeRadii(nodes, details);
  return {
    nodes: nodes.map((node) => ({
      ...node,
      data: { ...node.data, radius: nodeRadii.get(node.id) },
    })),
    edges,
  };
}

function EntityAiDecision({ capital, connections, name }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!name) {
      setAnalysis(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    analyzeCompanyNode({
      name,
      capital,
      inDegree: connections?.incoming?.length || 0,
      outDegree: connections?.outgoing?.length || 0,
      upstreamSamples: connections?.incoming || [],
      downstreamSamples: connections?.outgoing || [],
    })
      .then((result) => {
        if (active) setAnalysis(result);
      })
      .catch(() => {
        if (active) setAnalysis(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [name, capital, connections]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/70 bg-[#fffdf9] p-3.5 space-y-2">
        <div className="flex items-center text-base">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Sparkles className="size-3.5 animate-pulse text-[#d97757]" />
            結構角色分析中…
          </span>
        </div>
        <Skeleton className="h-5 w-3/4 rounded" />
      </div>
    );
  }

  if (!analysis?.role) return null;

  const { role, strategicLevel } = analysis;

  return (
    <div className="rounded-xl border border-border/70 bg-[#fffdf9] p-3.5 space-y-2.5">
      <div className="flex items-center gap-1.5 text-base font-medium text-foreground">
        <Sparkles className="size-3.5 text-[#d97757]" />
        <span>結構角色洞察</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-base font-medium ${role.accentClass}`}
        >
          {role.label}
        </span>
        {role.probability !== null && (
          <span className="font-mono text-base text-muted-foreground">
            {role.probability}%
          </span>
        )}
      </div>

      <p className="text-base leading-snug text-muted-foreground">
        {role.description}
      </p>

      {strategicLevel && (
        <div className="flex items-center justify-between border-t border-border/50 pt-2 text-base">
          <span className="text-muted-foreground">網絡戰略等級</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="font-mono text-muted-foreground">Lv.{Math.round(strategicLevel.score)}</span>
            <span>{strategicLevel.label}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function EntityTenderIntelligence({ info, name }) {
  const queryTarget = name || "";
  const tobidSearchUrl = `https://tobid.tw/?q=${encodeURIComponent(queryTarget)}`;

  return (
    <div className="rounded-xl border border-border/70 bg-[#fffdf9] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-base font-medium text-foreground">
          <Landmark className="size-3.5 text-[#2f7d6d]" />
          <span>政府標案與採購歷程</span>
        </div>
        <span
          className="cursor-help font-mono text-base text-muted-foreground/80"
          title="收錄行政院公共工程委員會 1,400 萬筆政府標案分析資料"
        >
          ToBid
        </span>
      </div>

      <p className="text-base leading-snug text-muted-foreground">
        查詢歷年政府投標得標金額、主要承辦機關、同場競爭對手與底價分析。
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <a
          aria-label={`在 ToBid 查詢 ${name} 的政府標案紀錄`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-base font-medium text-foreground shadow-xs transition hover:border-border hover:bg-muted"
          href={tobidSearchUrl}
          rel="noreferrer"
          target="_blank"
        >
          <span>查閱標案與得標紀錄</span>
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </a>

        {info?.id && (
          <span className="font-mono text-base text-muted-foreground/70" title="公司統一編號">
            統編 {info.id}
          </span>
        )}
      </div>
    </div>
  );
}

function EntityDetails({ connections, details, name }) {
  const info = details?.[name];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {info ? <Building2 className="size-4" /> : <Compass className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="break-words text-base font-semibold leading-6">{name}</p>
          <Badge className="mt-1" variant="outline">{info ? "Company record" : "Network entity"}</Badge>
        </div>
      </div>
      {info ? (
        <div className="space-y-3 text-base">
          <div className="flex items-start gap-2"><span className="w-24 shrink-0 text-muted-foreground">Capital</span><span className="font-medium">NT$ {formatCapital(info.資本總額)}</span></div>
          <div className="flex items-start gap-2"><UserRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{info.代表人姓名 || "Representative unavailable"}</span></div>
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{info.公司所在地 || "Address unavailable"}</span></div>
        </div>
      ) : <p className="text-base leading-6 text-muted-foreground">This node is present in the relationship index but has no company detail record.</p>}
      <EntityAiDecision
        capital={info?.資本總額}
        connections={connections}
        name={name}
      />
      <EntityTenderIntelligence
        info={info}
        name={name}
      />
    </div>
  );
}

function ExpansionEntityList({ icon: Icon, label, names, tone }) {
  const [showAll, setShowAll] = useState(false);
  const visibleNames = showAll ? names : names.slice(0, 8);

  useEffect(() => setShowAll(false), [names]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-base">
        <span className="flex items-center gap-1.5 font-medium"><Icon className={`size-3.5 ${tone}`} />{label}</span>
        <Badge variant="secondary">{names.length}</Badge>
      </div>
      {names.length === 0 ? <p className="text-base text-muted-foreground">No direct entities in this direction.</p> : (
        <>
          <ul className="space-y-1.5">
            {visibleNames.map((name) => <li className="truncate rounded-md bg-muted/50 px-2 py-1.5 text-base" key={name}>{name}</li>)}
          </ul>
          {names.length > 8 && <Button className="mt-2 h-7 px-2 text-base" onClick={() => setShowAll((value) => !value)} variant="ghost">{showAll ? "Show less" : `Show all ${names.length}`}</Button>}
        </>
      )}
    </div>
  );
}

function LocalRelationshipMap({ data, onNodeClick, onZoomChange, zoom }) {
  const width = 1200;
  const height = 720;
  const center = { x: width / 2, y: height / 2 };
  const root = data.nodes.find((node) => node.data?.isRoot) || data.nodes[0];
  const nodesById = new Map(data.nodes.map((node) => [node.id, node]));
  const svgRef = useRef(null);
  const [viewportAspect, setViewportAspect] = useState(2);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const beforePrint = () => flushSync(() => setPrinting(true));
    const afterPrint = () => setPrinting(false);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height && !window.matchMedia("print").matches) setViewportAspect(width / height);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const dragRef = useRef(null);
  const gestureRef = useRef(null);
  const pointersRef = useRef(new Map());
  const [draggedPositions, setDraggedPositions] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const readableLayout = useMemo(() => layoutReadableGraph(data.nodes, center, printing ? 281 / 152 : viewportAspect), [data.nodes, viewportAspect, printing]);
  const defaultPositions = readableLayout.positions;

  useEffect(() => {
    setDraggedPositions({});
    setPan({ x: 0, y: 0 });
  }, [root?.id]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const positions = new Map(defaultPositions);
  Object.entries(printing ? {} : draggedPositions).forEach(([id, position]) => {
    if (positions.has(id)) positions.set(id, position);
  });
  const viewBox = readableLayout.viewBox;
  const viewportPosition = (event) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  };
  const graphPosition = (point) => ({
    x: center.x + (point.x - center.x - panRef.current.x) / zoomRef.current,
    y: center.y + (point.y - center.y - panRef.current.y) / zoomRef.current,
  });
  const pointerPair = () => [...pointersRef.current.values()].slice(0, 2);
  const distance = ([first, second]) => Math.hypot(second.x - first.x, second.y - first.y);
  const midpoint = ([first, second]) => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  const startPointer = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = viewportPosition(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, point);
    const nodeId = event.target.closest?.("[data-node-id]")?.dataset.nodeId;

    if (pointersRef.current.size === 1) {
      if (nodeId) {
        dragRef.current = {
          id: nodeId,
          point: graphPosition(point),
          pointerStart: { x: event.clientX, y: event.clientY },
          origin: positions.get(nodeId),
          moved: false,
        };
      } else {
        gestureRef.current = { type: "pan", point, origin: panRef.current, moved: false };
      }
      return;
    }

    const pair = pointerPair();
    dragRef.current = null;
    gestureRef.current = {
      type: "pinch",
      startDistance: distance(pair),
      startMidpoint: midpoint(pair),
      startPan: panRef.current,
      startZoom: zoomRef.current,
      moved: true,
    };
  };
  const movePointer = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const viewportPoint = viewportPosition(event);
    if (!viewportPoint) return;
    pointersRef.current.set(event.pointerId, viewportPoint);

    if (pointersRef.current.size >= 2 && gestureRef.current?.type === "pinch") {
      const pair = pointerPair();
      const nextViewport = calculatePinchViewport({
        center,
        currentDistance: distance(pair),
        currentMidpoint: midpoint(pair),
        startDistance: gestureRef.current.startDistance,
        startMidpoint: gestureRef.current.startMidpoint,
        startPan: gestureRef.current.startPan,
        startZoom: gestureRef.current.startZoom,
      });
      panRef.current = nextViewport.pan;
      zoomRef.current = nextViewport.zoom;
      setPan(nextViewport.pan);
      onZoomChange(nextViewport.zoom);
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      if (!drag.moved && !pointerMovementExceedsThreshold({
        current: { x: event.clientX, y: event.clientY },
        start: drag.pointerStart,
      })) return;
      drag.moved = true;
      const point = graphPosition(viewportPoint);
      const deltaX = point.x - drag.point.x;
      const deltaY = point.y - drag.point.y;
      setDraggedPositions((current) => ({ ...current, [drag.id]: { x: drag.origin.x + deltaX, y: drag.origin.y + deltaY } }));
      return;
    }

    const gesture = gestureRef.current;
    if (gesture?.type !== "pan") return;
    const deltaX = viewportPoint.x - gesture.point.x;
    const deltaY = viewportPoint.y - gesture.point.y;
    if (Math.hypot(deltaX, deltaY) > 2) gesture.moved = true;
    const nextPan = { x: gesture.origin.x + deltaX, y: gesture.origin.y + deltaY };
    panRef.current = nextPan;
    setPan(nextPan);
  };
  const endPointer = (event) => {
    const drag = dragRef.current;
    pointersRef.current.delete(event.pointerId);
    const selectedNodeId = nodeSelectedOnPointerEnd({
      cancelled: event.type === "pointercancel",
      drag,
      remainingPointerCount: pointersRef.current.size,
    });
    dragRef.current = null;

    if (pointersRef.current.size === 1) {
      const point = [...pointersRef.current.values()][0];
      gestureRef.current = { type: "pan", point, origin: panRef.current, moved: true };
      return;
    }

    gestureRef.current = null;
    if (selectedNodeId) onNodeClick(selectedNodeId);
  };

  return (
    <svg aria-label="Company relationship graph" className="relationship-svg h-full w-full cursor-grab active:cursor-grabbing" onPointerCancel={endPointer} onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} ref={svgRef} role="img" style={{ touchAction: "none" }} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
      <defs>
        <marker id="relationship-arrow" markerHeight="10" markerUnits="userSpaceOnUse" markerWidth="10" orient="auto" refX="9" refY="5">
          <path d="M0,0 L10,5 L0,10 Z" fill="#786f66" />
        </marker>
        <pattern id="david888-watermark" height="120" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse" width="210">
          <text fill="#6f6258" fillOpacity="0.06" fontFamily="JetBrains Mono, Gen Jyuu Gothic, sans-serif" fontSize="22" fontWeight="700" letterSpacing="3" x="18" y="64">DAVID888</text>
        </pattern>
      </defs>
      <rect aria-hidden="true" fill="url(#david888-watermark)" height={viewBox.height} width={viewBox.width} x={viewBox.x} y={viewBox.y} />
      <g className="relationship-transform" transform={`translate(${pan.x} ${pan.y}) translate(${center.x} ${center.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`}>
      {data.nodes.map((node) => {
        if (!node.data?.isRoot) return null;
        const position = positions.get(node.id);
        if (!position) return null;
        const nodeRadius = node.data?.radius || 22;
        return (
          <circle
            cx={position.x}
            cy={position.y}
            data-node-id={node.id}
            fill="#f3d3c7"
            key={`halo-${node.id}`}
            r={nodeRadius + 12}
          />
        );
      })}
      {data.edges.map((edge) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (!source || !target) return null;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.hypot(dx, dy) || 1;
        const sourceRadius = nodesById.get(edge.source)?.data?.radius || (nodesById.get(edge.source)?.data?.isRoot ? 22 : 16);
        const targetRadius = nodesById.get(edge.target)?.data?.radius || (nodesById.get(edge.target)?.data?.isRoot ? 22 : 16);
        return <line key={edge.id} markerEnd="url(#relationship-arrow)" stroke="#b7aba0" strokeWidth="2" x1={source.x + (dx / distance) * sourceRadius} x2={target.x - (dx / distance) * targetRadius} y1={source.y + (dy / distance) * sourceRadius} y2={target.y - (dy / distance) * targetRadius} />;
      })}
      {data.nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;
        const isRoot = node.data?.isRoot;
        const isCompany = node.data?.kind === "company";
        const fill = isRoot ? "#d97757" : isCompany ? "#2f7d6d" : "#877666";
        const label = String(node.data?.name || node.id);
        const geometry = readableLayout.geometries.get(node.id);
        const { radius: nodeRadius, fontSize, lineHeight, lines: labelLines, upstreamWidth, downstreamWidth } = geometry;
        const upstreamCount = node.data?.upstreamCount || 0;
        const downstreamCount = node.data?.downstreamCount || 0;
        const badgeY = position.y - nodeRadius - 23;
        const badgeLeft = position.x - (upstreamWidth + downstreamWidth + 5) / 2;
        return (
          <g
            className="graph-node cursor-grab active:cursor-grabbing"
            aria-label={label}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onNodeClick(node.id);
              }
            }}
            data-node-id={node.id}
            key={node.id}
          >
            <circle cx={position.x} cy={position.y} fill={fill} r={nodeRadius} stroke="#fff" strokeWidth="3" />
            <g transform={`translate(${badgeLeft} ${badgeY})`}>
              <rect fill="#eef2ff" height="18" rx="9" stroke="#c7d2fe" width={upstreamWidth} />
              <text fill="#4f46e5" fontFamily="JetBrains Mono, Gen Jyuu Gothic, sans-serif" fontSize="11" fontWeight="500" textAnchor="middle" x={upstreamWidth / 2} y="13">上 {upstreamCount}</text>
            </g>
            <g transform={`translate(${badgeLeft + upstreamWidth + 5} ${badgeY})`}>
              <rect fill="#e7f6f1" height="18" rx="9" stroke="#a7e3d3" width={downstreamWidth} />
              <text fill="#18765f" fontFamily="JetBrains Mono, Gen Jyuu Gothic, sans-serif" fontSize="11" fontWeight="500" textAnchor="middle" x={downstreamWidth / 2} y="13">下 {downstreamCount}</text>
            </g>
            <text fill={isRoot ? "#9a3412" : "#3f3933"} fontFamily="JetBrains Mono, Gen Jyuu Gothic, sans-serif" fontSize={fontSize} paintOrder="stroke" stroke="#faf8f5" strokeWidth="3" strokeLinejoin="round" fontWeight={isRoot ? 600 : 500} textAnchor="middle" x={position.x} y={position.y + nodeRadius + 12 + fontSize}>{labelLines.map((line, index) => <tspan dy={index === 0 ? 0 : lineHeight} key={index} x={position.x}>{line}</tspan>)}</text>
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
  const { rememberCompany, setCompanyDetails, setSelectedCompany } = useCompany();
  const graphShareRef = useRef(null);
  const preparedShareRef = useRef(null);
  const [network, setNetwork] = useState({});
  const [details, setDetails] = useState({});
  const [company, setCompany] = useState("");
  const [mode, setMode] = useState("both");
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [activeNode, setActiveNode] = useState("");
  const [localZoom, setLocalZoom] = useState(1);
  const [localMapResetKey, setLocalMapResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareDialogState, setShareDialogState] = useState({
    isOpen: false,
    blob: null,
    imageUrl: null,
    shareUrl: null,
    uploadError: null,
    isUploading: false,
  });
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
    setActiveNode(company || "");
    setShareMessage("");
  }, [company, mode]);

  useEffect(() => {
    setSelectedCompany(company || null);
    setCompanyDetails(company ? details[company] || null : null);
    if (company) rememberCompany(company, details[company] || null);
  }, [company, details, rememberCompany, setCompanyDetails, setSelectedCompany]);

  useEffect(() => {
    document.title = companyPageTitle(company || requestedCompany);
    return () => { document.title = companyPageTitle(""); };
  }, [company, requestedCompany]);

  const graphData = useMemo(
    () => makeGraphData(network, company, mode, details, expandedNodes),
    [company, details, expandedNodes, mode, network],
  );

  useEffect(() => {
    setShareMessage("");
  }, [graphData]);

  const currentView = VIEW_OPTIONS.find((option) => option.id === mode);
  const toggleExpandedNode = useCallback((id) => {
    setExpandedNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectExpansionNode = useCallback((id) => {
    setActiveNode(id);
    toggleExpandedNode(id);
  }, [toggleExpandedNode]);
  const activeNodeConnections = useMemo(() => {
    if (!activeNode) return null;
    const node = network[activeNode] || { in: [], out: [] };
    return {
      incoming: mode === "outvest" ? [] : node.in || [],
      outgoing: mode === "invest" ? [] : node.out || [],
    };
  }, [activeNode, mode, network]);

  const zoom = (factor) => setLocalZoom((current) => clampZoom(current * factor));
  const resetGraph = () => {
    setExpandedNodes(new Set());
    setLocalZoom(1);
    setLocalMapResetKey((current) => current + 1);
  };

  const shareGraph = async () => {
    if (isSharing) return;
    setShareMessage("");

    if (!graphShareRef.current) return;
    setIsSharing(true);

    try {
      await document.fonts?.ready;
      const blob = await toBlob(graphShareRef.current, {
        backgroundColor: "#faf8f5",
        cacheBust: true,
        filter: (node) => node?.dataset?.shareExclude !== "true",
        pixelRatio: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
      });
      if (!blob) throw new Error("Unable to create graph image.");

      const pageUrl = typeof window !== "undefined" ? window.location.href : buildGraphShareUrl(company);

      // Open share dialog with local preview
      setShareDialogState({
        isOpen: true,
        blob,
        imageUrl: null,
        shareUrl: null,
        uploadError: null,
        isUploading: true,
      });

      // Background upload to 888box
      const boxResult = await uploadGraphToBox({
        blob,
        fileName: graphShareFileName(company),
        company,
        pageUrl,
      });

      if (boxResult.success) {
        setShareDialogState((curr) => ({
          ...curr,
          imageUrl: boxResult.imageUrl,
          shareUrl: boxResult.shareUrl,
          isUploading: false,
        }));
      } else {
        setShareDialogState((curr) => ({
          ...curr,
          uploadError: boxResult.error,
          isUploading: false,
        }));
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        setShareMessage("無法產生分享圖片，請稍後再試。");
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground"><LoaderCircle className="size-8 animate-spin text-primary" /><p className="text-base">Loading relationship data…</p></div>;
  if (error) return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-base text-destructive">{error}</div>;

  return (
    <div className="company-network-page fade-in">
      <div className="relationship-heading"><Header actions={<div className="flex flex-wrap gap-2"><Button onClick={() => navigate("/index")} variant="outline"><ArrowLeft />Back to index</Button><Button disabled={isSharing} onClick={shareGraph}><Share2 />{isSharing ? "產生中…" : "分享"}</Button><Button onClick={() => window.print()} variant="outline"><Printer />列印</Button></div>} title={company || "Relationship graph"} /></div>
      {shareMessage && <p aria-live="polite" className="mb-3 text-right text-base text-muted-foreground">{shareMessage}</p>}
      <div className={`relationship-grid grid gap-5 ${activeNode ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        <Card className="relationship-card min-w-0 overflow-hidden" ref={graphShareRef}>
          <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <form
              className="mb-4 flex flex-wrap gap-2"
              data-share-exclude="true"
              onSubmit={(e) => e.preventDefault()}
              tooldescription="Switch the company relationship graph direction between all relationships, upstream incoming links, and downstream outgoing links"
              toolname="switch_relationship_view"
            >
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.id === mode;
                return (
                  <Button
                    className="gap-2"
                    key={option.id}
                    onClick={() => setMode(option.id)}
                    size="sm"
                    toolparamdescription={`View ${option.label} (${option.hint})`}
                    type="button"
                    variant={active ? "default" : "outline"}
                  >
                    <Icon className="size-3.5" />
                    {option.label}
                  </Button>
                );
              })}
            </form>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="size-4 text-primary" />
                  {company} · {currentView?.label}
                </CardTitle>
                <p className="mt-1 text-base text-muted-foreground">
                  {graphData.nodes.length} nodes · {graphData.edges.length} links · 圓球大小為此視圖中的相對資本額
                </p>
              </div>
              <Badge className="hidden sm:inline-flex" variant="outline">
                {currentView?.hint}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0"><div className="relationship-canvas relative h-[560px] w-full overflow-hidden bg-[#faf8f5] md:h-[640px]">
            {graphData.edges.length > 0 && (
              <div className="local-map-shell absolute inset-0 z-[1] p-3 sm:p-5">
                <LocalRelationshipMap
                  data={graphData}
                  key={`${company}-${mode}-${localMapResetKey}`}
                  onNodeClick={selectExpansionNode}
                  onZoomChange={setLocalZoom}
                  zoom={localZoom}
                />
              </div>
            )}
            {graphData.edges.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <div className="max-w-sm rounded-2xl border border-border/80 bg-background/95 p-6 text-center shadow-sm">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="size-5" /></span>
                  <p className="mt-3 text-base font-semibold">尚無可視化的法人關係</p>
                  <p className="mt-2 text-base leading-6 text-muted-foreground">{company} 已有公司登記資料，但目前關係索引沒有可連出的法人代表紀錄，因此沒有邊可以畫出。</p>
                </div>
              </div>
            )}

          </div>
            <div className="relationship-toolbar flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-[#fffdf9] px-4 py-2" data-share-exclude="true">
              <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground"><span className="size-2 rounded-full bg-[#d97757]" /> Focus <span className="size-2 rounded-full bg-[#2f7d6d]" /> Company <span className="size-2 rounded-full bg-[#877666]" /> Entity <span>· 拖曳移動、雙指縮放</span></div>
              <div className="flex gap-1"><Button aria-label="Zoom out" onClick={() => zoom(0.8)} size="icon" variant="ghost"><Minus /></Button><Button aria-label="Reset graph expansion" onClick={resetGraph} size="icon" variant="ghost"><RefreshCw /></Button><Button aria-label="Zoom in" onClick={() => zoom(1.2)} size="icon" variant="ghost"><Plus /></Button></div>
            </div>
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-[#fffdf9] px-5 py-3 text-base text-muted-foreground"><span>資料為公司／法人關係索引，不代表已驗證持股、控制或投資關係。</span><span>taiwan-company-network.david888.com</span></div>
        </Card>
        <aside className="relationship-details space-y-5">
          {activeNode && activeNodeConnections && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between px-5 pb-3 pt-5">
                <div>
                  <CardTitle className="text-base">
                    {activeNode === company ? "焦點實體" : "已選取實體"}
                  </CardTitle>
                  <p className="text-base leading-6 text-muted-foreground">
                    {activeNode === company ? "目前關係圖的核心公司與結構分析。" : "點擊圖譜節點開啟之實體資訊與關聯。"}
                  </p>
                </div>
                <Button
                  aria-label="關閉側邊欄"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveNode("")}
                  size="icon"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <EntityDetails connections={activeNodeConnections} details={details} name={activeNode} />
                <Separator />
                <ExpansionEntityList icon={ArrowDownLeft} label="Upstream entities" names={activeNodeConnections.incoming} tone="text-blue-600" />
                <ExpansionEntityList icon={ArrowUpRight} label="Downstream entities" names={activeNodeConnections.outgoing} tone="text-teal-700" />
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
      <GraphShareDialog
        blob={shareDialogState.blob}
        company={company}
        imageUrl={shareDialogState.imageUrl}
        isOpen={shareDialogState.isOpen}
        isUploading={shareDialogState.isUploading}
        onClose={() => setShareDialogState((curr) => ({ ...curr, isOpen: false }))}
        pageUrl={typeof window !== "undefined" ? window.location.href : buildGraphShareUrl(company)}
        shareUrl={shareDialogState.shareUrl}
        uploadError={shareDialogState.uploadError}
      />
    </div>
  );
}

export default NetworkGraph;
