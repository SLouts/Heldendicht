"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

export type GraphNodeData = {
  id: string;
  title: string;
  slug: string;
  nodeType: string;
  status: string;
  isPlaceholder: boolean;
  characterType: "pc" | "npc" | null;
  x: number;
  y: number;
};

export type RelEdge = {
  kind: "relationship";
  source: string;
  target: string;
  label: string | null;
  dashed: boolean;
};

export type WikiEdge = { kind: "wikilink"; source: string; target: string };

type Transform = { x: number; y: number; k: number };

type Gesture =
  | { mode: null }
  | { mode: "pan"; startTransform: Transform; startScreen: { x: number; y: number }; moved: boolean }
  | {
      mode: "pinch";
      startTransform: Transform;
      startDist: number;
      anchor: { x: number; y: number };
      moved: boolean;
    };

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

function clampScale(k: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));
}

export default function StoryMapGraph({
  nodes,
  relEdges,
  wikiEdges,
  width,
  height,
  worldSlug,
}: {
  nodes: GraphNodeData[];
  relEdges: RelEdge[];
  wikiEdges: WikiEdge[];
  width: number;
  height: number;
  worldSlug: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture>({ mode: null });
  const suppressClickRef = useRef(false);

  const posMap = new Map(nodes.map((n) => [n.id, n]));

  function toScreenPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }

  function startGestureFromPointers() {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        mode: "pan",
        startTransform: transform,
        startScreen: toScreenPoint(pts[0].x, pts[0].y),
        moved: false,
      };
    } else if (pts.length === 2) {
      const [p1, p2] = pts;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const midClient = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const midScreen = toScreenPoint(midClient.x, midClient.y);
      const anchor = {
        x: (midScreen.x - transform.x) / transform.k,
        y: (midScreen.y - transform.y) / transform.k,
      };
      gestureRef.current = {
        mode: "pinch",
        startTransform: transform,
        startDist: dist || 1,
        anchor,
        moved: true,
      };
    } else {
      gestureRef.current = { mode: null };
    }
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
    suppressClickRef.current = false;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGestureFromPointers();
    // 只有進入雙指縮放才立刻抓 pointer capture;單指先不抓,
    // 這樣「單純點擊節點」時瀏覽器原生的 click 才會正常落在 <a> 上,
    // 不會被 capture 導到 svg 根節點而讓連結失效。真正開始拖曳時
    // 才在 handlePointerMove 補抓。
    if (gestureRef.current.mode === "pinch") {
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gesture = gestureRef.current;

    if (gesture.mode === "pan") {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length !== 1) return;
      const cur = toScreenPoint(pts[0].x, pts[0].y);
      const dx = cur.x - gesture.startScreen.x;
      const dy = cur.y - gesture.startScreen.y;
      if (!gesture.moved && Math.hypot(dx, dy) > 3) {
        gesture.moved = true;
        svgRef.current?.setPointerCapture(e.pointerId);
      }
      if (gesture.moved) {
        setTransform({
          x: gesture.startTransform.x + dx,
          y: gesture.startTransform.y + dy,
          k: gesture.startTransform.k,
        });
      }
    } else if (gesture.mode === "pinch") {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length !== 2) return;
      const [p1, p2] = pts;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      const midClient = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const midScreen = toScreenPoint(midClient.x, midClient.y);
      const k = clampScale(gesture.startTransform.k * (dist / gesture.startDist));
      setTransform({
        x: midScreen.x - gesture.anchor.x * k,
        y: midScreen.y - gesture.anchor.y * k,
        k,
      });
    }
  }

  function handlePointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    pointersRef.current.delete(e.pointerId);
    const gesture = gestureRef.current;
    if (gesture.mode && gesture.moved) suppressClickRef.current = true;
    startGestureFromPointers();
  }

  function handleWheel(e: ReactWheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const cursor = toScreenPoint(e.clientX, e.clientY);
    setTransform((t) => {
      const factor = Math.exp(-e.deltaY * 0.0015);
      const k = clampScale(t.k * factor);
      const origX = (cursor.x - t.x) / t.k;
      const origY = (cursor.y - t.y) / t.k;
      return { x: cursor.x - origX * k, y: cursor.y - origY * k, k };
    });
  }

  function handleNodeClick(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault();
    }
  }

  function zoomBy(factor: number) {
    setTransform((t) => {
      const k = clampScale(t.k * factor);
      const origX = (width / 2 - t.x) / t.k;
      const origY = (height / 2 - t.y) / t.k;
      return { x: width / 2 - origX * k, y: height / 2 - origY * k, k };
    });
  }

  function resetView() {
    setTransform({ x: 0, y: 0, k: 1 });
  }

  return (
    <div className="relative mt-6">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          aria-label="放大"
          className="h-8 w-8 rounded-lg border border-border bg-surface text-sm shadow-sm hover:bg-muted"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.8)}
          aria-label="縮小"
          className="h-8 w-8 rounded-lg border border-border bg-surface text-sm shadow-sm hover:bg-muted"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          className="h-8 rounded-lg border border-border bg-surface px-2 text-xs shadow-sm hover:bg-muted"
        >
          重置
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none rounded-lg border border-border bg-surface"
        style={{ cursor: "grab" }}
        role="img"
        aria-label="節點關係圖(可縮放、拖曳)"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {wikiEdges.map((e, i) => {
            const a = posMap.get(e.source);
            const b = posMap.get(e.target);
            if (!a || !b) return null;
            return (
              <line
                key={`w-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
            );
          })}

          {relEdges.map((e, i) => {
            const a = posMap.get(e.source);
            const b = posMap.get(e.target);
            if (!a || !b) return null;
            return (
              <g key={`r-${i}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--foreground)"
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  strokeDasharray={e.dashed ? "6 4" : undefined}
                />
                {e.label && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                    paintOrder="stroke"
                    stroke="var(--surface)"
                    strokeWidth={4}
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {nodes.map((n) => (
            <a
              key={n.id}
              href={`/dashboard/worlds/${worldSlug}/nodes/${n.slug}`}
              onClick={handleNodeClick}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={12}
                style={{ fill: nodeFillColor(n) }}
                strokeDasharray={n.status !== "approved" ? "3 2" : undefined}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              <text
                x={n.x}
                y={n.y + 24}
                textAnchor="middle"
                fontSize={12}
                fontStyle={n.isPlaceholder ? "italic" : undefined}
                fill="var(--foreground)"
                paintOrder="stroke"
                stroke="var(--surface)"
                strokeWidth={4}
              >
                {n.title}
              </text>
            </a>
          ))}
        </g>
      </svg>
    </div>
  );
}

function nodeFillColor(n: GraphNodeData): string {
  if (n.isPlaceholder) return "var(--muted-foreground)";
  if (n.nodeType === "location") return "var(--success)";
  if (n.nodeType === "item") return "var(--primary)";
  if (n.nodeType === "character") {
    return n.characterType === "pc" ? "var(--badge-info-fg)" : "var(--muted-foreground)";
  }
  return "var(--muted-foreground)";
}
