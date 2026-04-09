import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetNetwork } from "@workspace/api-client-react";
import * as d3 from "d3";
import { Shield, ArrowLeft } from "lucide-react";

const GREEN = "#1D9E75";
const AMBER = "#BA7517";
const CORAL = "#D85A30";

function getScoreColor(score: number): string {
  if (score >= 700) return GREEN;
  if (score >= 580) return AMBER;
  return CORAL;
}

function getScoreLabel(score: number): string {
  if (score >= 700) return "Good";
  if (score >= 580) return "Fair";
  return "Building";
}

function getNodeRadius(score: number): number {
  const clamped = Math.max(300, Math.min(850, score));
  return 10 + ((clamped - 300) / 550) * 16;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  score: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  strength?: number;
}

export default function Network() {
  const [, setLocation] = useLocation();
  const userId = localStorage.getItem("trustchain_userId");

  useEffect(() => {
    if (!userId) setLocation("/");
  }, [userId, setLocation]);

  const { data: networkData, isLoading } = useGetNetwork();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    node: NetworkNode;
    vouchCount: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!networkData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Build vouch count map
    const vouchCountMap: Record<string, number> = {};
    for (const link of (networkData.links as any[])) {
      const target = typeof link.target === "object" ? link.target.id : link.target;
      vouchCountMap[target] = (vouchCountMap[target] ?? 0) + 1;
    }

    const nodes: NetworkNode[] = (networkData.nodes as any[]).map(n => ({
      id: n.id,
      name: n.name,
      score: n.score
    }));

    const links: NetworkLink[] = (networkData.links as any[]).map(l => ({
      source: typeof l.source === "object" ? l.source.id : l.source,
      target: typeof l.target === "object" ? l.target.id : l.target,
      strength: l.strength ?? 1
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Defs: arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "rgba(255,255,255,0.25)");

    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(links).id(d => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<NetworkNode>().radius(d => getNodeRadius(d.score) + 15));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", (d: any) => Math.max(0.5, (d.strength ?? 1) * 0.4))
      .attr("marker-end", "url(#arrow)");

    const nodeG = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          node: d,
          vouchCount: vouchCountMap[d.id] ?? 0,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
      })
      .on("mouseout", () => setTooltip(null))
      .call(
        d3.drag<SVGGElement, NetworkNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as any
      );

    // White ring for current user
    nodeG.filter(d => d.id === userId)
      .append("circle")
      .attr("r", (d: any) => getNodeRadius(d.score) + 5)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2.5);

    nodeG.append("circle")
      .attr("r", d => getNodeRadius(d.score))
      .attr("fill", d => getScoreColor(d.score))
      .attr("stroke", "rgba(0,0,0,0.15)")
      .attr("stroke-width", 1);

    nodeG.append("text")
      .text(d => d.name.split(" ")[0])
      .attr("dy", d => getNodeRadius(d.score) + 16)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("font-family", "Inter, sans-serif")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as NetworkNode).x!)
        .attr("y1", (d: any) => (d.source as NetworkNode).y!)
        .attr("x2", (d: any) => {
          const src = d.source as NetworkNode;
          const tgt = d.target as NetworkNode;
          const dx = tgt.x! - src.x!;
          const dy = tgt.y! - src.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return tgt.x! - (dx / dist) * (getNodeRadius(tgt.score) + 8);
        })
        .attr("y2", (d: any) => {
          const src = d.source as NetworkNode;
          const tgt = d.target as NetworkNode;
          const dx = tgt.x! - src.x!;
          const dy = tgt.y! - src.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return tgt.y! - (dy / dist) * (getNodeRadius(tgt.score) + 8);
        });

      nodeG.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [networkData, userId]);

  if (!userId) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)" }}>
      {/* Nav */}
      <nav className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-white/60 hover:text-white transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Shield className="text-brand w-5 h-5" />
            <span className="text-white font-bold tracking-tight">TrustChain</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5">
          {[
            { color: GREEN, label: "Good" },
            { color: AMBER, label: "Fair" },
            { color: CORAL, label: "Building" }
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-white/50">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </nav>

      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white">Trust Network</h1>
        <p className="text-white/50 text-sm">Explore vouching relationships across the community</p>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="relative flex-1 mx-6 mb-6 rounded-xl overflow-hidden" style={{ minHeight: 500, border: "1px solid rgba(255,255,255,0.08)" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
              <span className="text-sm text-white/50">Loading graph...</span>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full" />

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <div className="bg-[#111827]/95 backdrop-blur border border-white/10 rounded-xl p-4 min-w-[180px] shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getScoreColor(tooltip.node.score) }} />
                <span className="font-bold text-white text-sm">{tooltip.node.name}</span>
                {tooltip.node.id === userId && (
                  <span className="text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-full">You</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Score</span>
                  <span className="font-bold" style={{ color: getScoreColor(tooltip.node.score) }}>{tooltip.node.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Status</span>
                  <span className="text-white font-medium">{getScoreLabel(tooltip.node.score)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Vouches received</span>
                  <span className="text-white font-medium">{tooltip.vouchCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
