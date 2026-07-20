import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Graph } from "@antv/g6";
import { toBlob } from "html-to-image";
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
  Share2,
  UserRound,
} from "lucide-react";

import Header from "components/Headers/Header.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { loadCompanyDetails, loadGraph } from "@/lib/companyData";
import { graphShareFileName } from "@/lib/graphShare";
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

function ExpansionEntityList({ icon: Icon, label, names, tone }) {
  const [showAll, setShowAll] = useState(false);
  const visibleNames = showAll ? names : names.slice(0, 8);

  useEffect(() => setShowAll(false), [names]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium"><Icon className={`size-3.5 ${tone}`} />{label}</span>
        <Badge variant="secondary">{names.length}</Badge>
      </div>
      {names.length === 0 ? <p className="text-xs text-muted-foreground">No direct entities in this direction.</p> : (
        <>
          <ul className="space-y-1.5">
            {visibleNames.map((name) => <li className="truncate rounded-md bg-muted/50 px-2 py-1.5 text-xs" key={name}>{name}</li>)}
          </ul>
          {names.length > 8 && <Button className="mt-2 h-7 px-2 text-[11px]" onClick={() => setShowAll((value) => !value)} variant="ghost">{showAll ? "Show less" : `Show all ${names.length}`}</Button>}
        </>
      )}
    </div>
  );
}

function LocalRelationshipMap({ data, onNodeClick, onNodeHover, onZoomChange, zoom }) {
  const width = 1200;
  const height = 720;
  const center = { x: width / 2, y: height / 2 };
  const root = data.nodes.find((node) => node.data?.isRoot) || data.nodes[0];
  const otherNodes = data.nodes.filter((node) => node.id !== root?.id);
  const nodesById = new Map(data.nodes.map((node) => [node.id, node]));
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const gestureRef = useRef(null);
  const pointersRef = useRef(new Map());
  const didDragRef = useRef(false);
  const [draggedPositions, setDraggedPositions] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const defaultPositions = new Map([[root?.id, center]]);

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
    defaultPositions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * Math.min(radius * 0.68, 270),
    });
  });

  useEffect(() => {
    setDraggedPositions({});
    setPan({ x: 0, y: 0 });
  }, [root?.id]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const positions = new Map(defaultPositions);
  Object.entries(draggedPositions).forEach(([id, position]) => {
    if (positions.has(id)) positions.set(id, position);
  });
  const defaultPoints = [...defaultPositions.values()];
  const minX = Math.min(...defaultPoints.map((point) => point.x)) - 100;
  const maxX = Math.max(...defaultPoints.map((point) => point.x)) + 100;
  const minY = Math.min(...defaultPoints.map((point) => point.y)) - 100;
  const maxY = Math.max(...defaultPoints.map((point) => point.y)) + 100;
  const viewBox = { x: minX, y: minY, width: Math.max(260, maxX - minX), height: Math.max(220, maxY - minY) };

  const viewportPosition = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
    };
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
        dragRef.current = { id: nodeId, point: graphPosition(point), origin: positions.get(nodeId), moved: false };
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
      didDragRef.current = true;
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const point = graphPosition(viewportPoint);
      const deltaX = point.x - drag.point.x;
      const deltaY = point.y - drag.point.y;
      if (Math.hypot(deltaX, deltaY) > 2) drag.moved = true;
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
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.moved || gestureRef.current?.moved) didDragRef.current = true;
    dragRef.current = null;

    if (pointersRef.current.size === 1) {
      const point = [...pointersRef.current.values()][0];
      gestureRef.current = { type: "pan", point, origin: panRef.current, moved: true };
      return;
    }

    gestureRef.current = null;
    window.setTimeout(() => { didDragRef.current = false; }, 0);
  };

  return (
    <svg aria-label="Company relationship graph" className="h-full w-full cursor-grab active:cursor-grabbing" onPointerCancel={endPointer} onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} ref={svgRef} role="img" style={{ touchAction: "none" }} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
      <defs>
        <marker id="relationship-arrow" markerHeight="10" markerUnits="userSpaceOnUse" markerWidth="10" orient="auto" refX="9" refY="5">
          <path d="M0,0 L10,5 L0,10 Z" fill="#786f66" />
        </marker>
        <pattern id="david888-watermark" height="120" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse" width="210">
          <text fill="#6f6258" fillOpacity="0.06" fontFamily="Geist Variable, sans-serif" fontSize="22" fontWeight="700" letterSpacing="3" x="18" y="64">DAVID888</text>
        </pattern>
      </defs>
      <rect aria-hidden="true" fill="url(#david888-watermark)" height={viewBox.height} width={viewBox.width} x={viewBox.x} y={viewBox.y} />
      <g transform={`translate(${pan.x} ${pan.y}) translate(${center.x} ${center.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`}>
      {data.edges.map((edge) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (!source || !target) return null;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.hypot(dx, dy) || 1;
        const sourceRadius = nodesById.get(edge.source)?.data?.isRoot ? 24 : 18;
        const targetRadius = nodesById.get(edge.target)?.data?.isRoot ? 30 : 24;
        return <line key={edge.id} markerEnd="url(#relationship-arrow)" stroke="#b7aba0" strokeWidth="2" x1={source.x + (dx / distance) * sourceRadius} x2={target.x - (dx / distance) * targetRadius} y1={source.y + (dy / distance) * sourceRadius} y2={target.y - (dy / distance) * targetRadius} />;
      })}
      {data.nodes.map((node) => {
        const position = positions.get(node.id);
        const isRoot = node.data?.isRoot;
        const isCompany = node.data?.kind === "company";
        const fill = isRoot ? "#d97757" : isCompany ? "#2f7d6d" : "#877666";
        const label = String(node.data?.name || node.id);
        const upstreamCount = node.data?.upstreamCount || 0;
        const downstreamCount = node.data?.downstreamCount || 0;
        const nodeRadius = isRoot ? 22 : 16;
        const badgeY = position.y - nodeRadius - 17;
        return (
          <g
            className="cursor-grab active:cursor-grabbing"
            data-node-id={node.id}
            key={node.id}
            onClick={() => { if (!didDragRef.current) onNodeClick(node.id); }}
            onMouseEnter={() => onNodeHover(node.id)}
            onMouseLeave={() => onNodeHover("")}
          >
            {isRoot && <circle cx={position.x} cy={position.y} fill="#f3d3c7" r="34" />}
            <circle cx={position.x} cy={position.y} fill={fill} r={nodeRadius} stroke="#fff" strokeWidth="3" />
            <g transform={`translate(${position.x - 43} ${badgeY})`}>
              <rect fill="#eef2ff" height="16" rx="8" stroke="#c7d2fe" width="40" />
              <text fill="#4f46e5" fontFamily="Geist Variable, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle" x="20" y="11">上 {upstreamCount}</text>
            </g>
            <g transform={`translate(${position.x + 3} ${badgeY})`}>
              <rect fill="#e7f6f1" height="16" rx="8" stroke="#a7e3d3" width="40" />
              <text fill="#18765f" fontFamily="Geist Variable, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle" x="20" y="11">下 {downstreamCount}</text>
            </g>
            <text fill={isRoot ? "#9a3412" : "#3f3933"} fontFamily="Geist Variable, sans-serif" fontSize={isRoot ? 16 : 12} fontWeight={isRoot ? 600 : 500} textAnchor="middle" x={position.x} y={position.y + (isRoot ? 48 : 38)}>{label}</text>
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
  const graphContainerRef = useRef(null);
  const graphShareRef = useRef(null);
  const preparedShareRef = useRef(null);
  const graphRef = useRef(null);
  const [network, setNetwork] = useState({});
  const [details, setDetails] = useState({});
  const [company, setCompany] = useState("");
  const [mode, setMode] = useState("both");
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [hoveredNode, setHoveredNode] = useState("");
  const [activeNode, setActiveNode] = useState("");
  const [localZoom, setLocalZoom] = useState(1);
  const [localMapResetKey, setLocalMapResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
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
    setActiveNode("");
    preparedShareRef.current = null;
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
    preparedShareRef.current = null;
    setShareMessage("");
  }, [graphData]);

  const currentView = VIEW_OPTIONS.find((option) => option.id === mode);
  const useLocalRelationshipMap = graphData.nodes.length <= 80;
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
            size: isRoot ? 38 : 28,
            fill: isRoot ? "#d97757" : isCompany ? "#2f7d6d" : "#877666",
            stroke: isRoot ? "#f3d3c7" : "#faf8f5",
            lineWidth: isRoot ? 8 : 3,
            label: true,
            labelText: `${String(data.name || datum.id)}\n上 ${data.upstreamCount || 0} · 下 ${data.downstreamCount || 0}`,
            labelFill: isRoot ? "#9a3412" : "#3f3933",
            labelFontSize: isRoot ? 14 : 12,
            labelFontWeight: isRoot ? 600 : 400,
            labelPlacement: "bottom",
            labelOffsetY: 8,
            labelMaxWidth: 180,
            labelWordWrap: true,
          };
        },
      },
      edge: { style: { stroke: "#b7aba0", lineWidth: 1.4, endArrow: true, endArrowSize: 5 } },
    });

    instance.on("node:click", (event) => {
      const id = event.target?.id;
      if (id) selectExpansionNode(id);
    });
    instance.on("node:pointerenter", (event) => setHoveredNode(event.target?.id || ""));
    instance.on("node:pointerleave", () => setHoveredNode(""));
    graphRef.current = instance;
    return () => {
      instance.destroy();
      graphRef.current = null;
    };
  }, [selectExpansionNode]);

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
    instance.render()
      .then(() => instance.fitView({ padding: 72 }, { duration: 180 }))
      .catch((renderError) => setError(renderError.message || "Unable to render the network graph."));
  }, [graphData]);

  const zoom = (factor) => {
    if (useLocalRelationshipMap) {
      setLocalZoom((current) => clampZoom(current * factor));
      return;
    }
    graphRef.current?.zoomBy(factor, { duration: 180 });
  };
  const resetGraph = () => {
    setHoveredNode("");
    setExpandedNodes(new Set());
    setLocalZoom(1);
    setLocalMapResetKey((current) => current + 1);
    requestAnimationFrame(() => graphRef.current?.fitView({ padding: 72 }, { duration: 220 }));
  };

  const downloadGraphImage = (blob) => {
    const imageUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = graphShareFileName(company);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(imageUrl);
    setShareMessage("關係圖 PNG 已下載。");
  };

  const sharePreparedImage = async ({ blob, file }) => {
    const shareData = {
      files: [file],
      title: `${company} - 888台灣的公司關係網`,
      text: `${company} 的公司與法人關係索引\n${window.location.href}`,
    };

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share(shareData);
      setShareMessage("已開啟系統分享選單。");
      return;
    }

    downloadGraphImage(blob);
  };

  const shareGraph = async () => {
    if (isSharing) return;
    setShareMessage("");

    if (preparedShareRef.current) {
      try {
        await sharePreparedImage(preparedShareRef.current);
      } catch (shareError) {
        if (shareError?.name !== "AbortError") setShareMessage("分享未開啟；請再按一次分享，或改用下載的 PNG。");
      }
      return;
    }

    if (!graphShareRef.current) return;
    setIsSharing(true);
    setHoveredNode("");

    try {
      await document.fonts?.ready;
      const blob = await toBlob(graphShareRef.current, {
        backgroundColor: "#faf8f5",
        cacheBust: true,
        filter: (node) => node?.dataset?.shareExclude !== "true",
        pixelRatio: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
      });
      if (!blob) throw new Error("Unable to create graph image.");

      const file = new File([blob], graphShareFileName(company), { type: "image/png" });
      preparedShareRef.current = { blob, file };
      await sharePreparedImage({ blob, file });
    } catch (shareError) {
      if (shareError?.name === "AbortError") return;
      if (preparedShareRef.current && shareError?.name === "NotAllowedError") {
        setShareMessage("圖片已產生，請再按一次「分享圖片」開啟系統分享選單。");
      } else {
        setShareMessage("無法產生分享圖片，請稍後再試。");
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground"><LoaderCircle className="size-8 animate-spin text-primary" /><p className="text-sm">Loading relationship data…</p></div>;
  if (error) return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>;

  return (
    <div className="fade-in">
      <Header actions={<div className="flex flex-wrap gap-2"><Button onClick={() => navigate("/index")} variant="outline"><ArrowLeft />Back to index</Button><Button disabled={isSharing} onClick={shareGraph}><Share2 />{isSharing ? "產生圖片…" : preparedShareRef.current ? "分享圖片" : "分享"}</Button></div>} title={company || "Relationship graph"} />
      {shareMessage && <p aria-live="polite" className="mb-3 text-right text-xs text-muted-foreground">{shareMessage}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 overflow-hidden" ref={graphShareRef}>
          <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6"><div className="mb-4 flex flex-wrap gap-2" data-share-exclude="true">{VIEW_OPTIONS.map((option) => { const Icon = option.icon; const active = option.id === mode; return <Button className="gap-2" key={option.id} onClick={() => setMode(option.id)} size="sm" variant={active ? "default" : "outline"}><Icon className="size-3.5" />{option.label}</Button>; })}</div><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Network className="size-4 text-primary" />{company} · {currentView?.label}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{graphData.nodes.length} nodes · {graphData.edges.length} links</p></div><Badge className="hidden sm:inline-flex" variant="outline">{currentView?.hint}</Badge></div></CardHeader>
          <CardContent className="p-0"><div className="relative h-[560px] w-full overflow-hidden bg-[#faf8f5] md:h-[640px]" ref={graphContainerRef}>
            {useLocalRelationshipMap && graphData.edges.length > 0 && (
              <div className="absolute inset-0 z-[1] p-3 sm:p-8">
                <LocalRelationshipMap
                  data={graphData}
                  key={`${company}-${mode}-${localMapResetKey}`}
                  onNodeClick={selectExpansionNode}
                  onNodeHover={setHoveredNode}
                  onZoomChange={setLocalZoom}
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
            {hoveredNode && <div className="pointer-events-none absolute right-4 top-4 z-10 w-[min(22rem,calc(100%-2rem))] rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur" data-share-exclude="true"><EntityDetails details={details} name={hoveredNode} /></div>}
            {useLocalRelationshipMap && graphData.edges.length > 0 && <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border/70 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur sm:hidden" data-share-exclude="true">拖曳移動 · 雙指縮放</div>}
            <div className="absolute bottom-4 left-4 z-10 hidden items-center gap-2 rounded-lg border border-border/70 bg-[#fffdf9]/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur sm:flex"><span className="size-2 rounded-full bg-[#d97757]" /> Focus <span className="size-2 rounded-full bg-[#2f7d6d]" /> Company <span className="size-2 rounded-full bg-[#877666]" /> Entity <span>· 拖曳空白處移動畫布、雙指縮放</span> {expandedNodes.size > 0 && <span>· {expandedNodes.size} expanded</span>}</div>
            <div className="absolute bottom-4 right-4 z-10 flex gap-1 rounded-lg border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur" data-share-exclude="true"><Button aria-label="Zoom out" onClick={() => zoom(0.8)} size="icon" variant="ghost"><Minus /></Button><Button aria-label="Reset graph expansion" onClick={resetGraph} size="icon" variant="ghost"><RefreshCw /></Button><Button aria-label="Zoom in" onClick={() => zoom(1.2)} size="icon" variant="ghost"><Plus /></Button></div>
          </div></CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-[#fffdf9] px-5 py-3 text-[11px] text-muted-foreground"><span>資料為公司／法人關係索引，不代表已驗證持股、控制或投資關係。</span><span>taiwan-company-network.david888.com</span></div>
        </Card>
        <aside className="space-y-5">
          {activeNode && activeNodeConnections && <Card><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm">Expanded entity</CardTitle><p className="text-xs leading-5 text-muted-foreground">Entities opened from the node you last clicked.</p></CardHeader><CardContent className="space-y-4 px-5 pb-5"><EntityDetails details={details} name={activeNode} /><Separator /><ExpansionEntityList icon={ArrowDownLeft} label="Upstream entities" names={activeNodeConnections.incoming} tone="text-blue-600" /><ExpansionEntityList icon={ArrowUpRight} label="Downstream entities" names={activeNodeConnections.outgoing} tone="text-teal-700" /></CardContent></Card>}
        </aside>
      </div>
    </div>
  );
}

export default NetworkGraph;
