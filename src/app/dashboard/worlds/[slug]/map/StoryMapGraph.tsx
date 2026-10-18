"use client";

import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { NodeCategoryFilter } from "@/components/NodeCategoryFilter";
import {
  nodeCategory,
  NODE_CATEGORIES,
  NODE_CATEGORY_COLOR_VARS,
  type NodeCategory,
} from "@/lib/nodeCategory";

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

/**
 * 算出讓所有節點都在畫面內的初始縮放/平移——之前固定從 {x:0,y:0,k:1}
 * 開始,節點配置範圍一大就會有節點跑到畫面外,還可能被右上角的
 * 「+ − 重置」按鈕擋住。改成依節點座標範圍算出剛好放得下的縮放比例,
 * 置中顯示,並且只縮小不放大(k 最大 1,避免節點很少時被放得過大、
 * 文字標籤反而糊成一團)。「重置」按鈕也呼叫這個函式,回到這個
 * 剛好放得下全部節點的視角,而不是回到可能裁切節點的 1:1 視角。
 */
function computeFitTransform(nodes: GraphNodeData[], width: number, height: number): Transform {
  if (nodes.length === 0) return { x: 0, y: 0, k: 1 };
  // 留給節點圓點本身+下方文字標籤的空間,不要讓邊緣節點的標籤被裁到。
  const PADDING = 56;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxWidth = Math.max(maxX - minX, 1);
  const boxHeight = Math.max(maxY - minY, 1);
  const scaleX = (width - PADDING * 2) / boxWidth;
  const scaleY = (height - PADDING * 2) / boxHeight;
  const k = clampScale(Math.min(scaleX, scaleY, 1));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { k, x: width / 2 - centerX * k, y: height / 2 - centerY * k };
}

export default function StoryMapGraph({
  nodes,
  relEdges,
  wikiEdges,
  width,
  height,
  basePath,
}: {
  nodes: GraphNodeData[];
  relEdges: RelEdge[];
  wikiEdges: WikiEdge[];
  width: number;
  height: number;
  /** 節點點擊後要連去哪裡,例如 `/dashboard/worlds/xxx/nodes` 或公開版 `/worlds/xxx/nodes`。 */
  basePath: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>(() =>
    computeFitTransform(nodes, width, height),
  );
  const [visibleCategories, setVisibleCategories] = useState<Set<NodeCategory>>(
    () => new Set(NODE_CATEGORIES),
  );
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture>({ mode: null });
  const suppressClickRef = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  function toggleCategory(category: NodeCategory) {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const visibleNodes = useMemo(
    () => nodes.filter((n) => visibleCategories.has(nodeCategory(n))),
    [nodes, visibleCategories],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleRelEdges = useMemo(
    () => relEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [relEdges, visibleIds],
  );
  const visibleWikiEdges = useMemo(
    () => wikiEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [wikiEdges, visibleIds],
  );

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
    setTransform(computeFitTransform(nodes, width, height));
  }

  // 文字是畫在被 <g transform="... scale(k)"> 縮放的座標系裡,縮到很小
  // (節點一多,computeFitTransform 算出的 k 可能遠小於 1)字就會糊成一團
  // 看不清楚。這裡反向補償:k < 1 時把 fontSize(以及節點圓點半徑、
  // 標籤跟圓點的間距)放大 1/k 倍,乘上外層的 scale(k) 後畫面上的實際
  // 大小維持不變,等於幫這些東西設一個不會再更小的底線;k >= 1(放大
  // 檢視)時維持原本大小,不特別再放大。
  //
  // 只放大字級、沒有同時放大「標籤跟圓點的間距」的話,間距會跟著 k
  // 縮小趨近 0,字級不變的標籤就會整個蓋住自己的節點圓點——必須用
  // 同一個 labelScale 一起補償位移量,圓點、文字才會维持原本的相對位置。
  const labelScale = 1 / Math.min(transform.k, 1);
  // 縮得很小、節點又多時,維持全部標籤常駐反而會互相疊字看不清楚,
  // 這時只顯示滑鼠停留節點的標籤,其餘先隱藏;放大回這個比例以上就
  // 全部正常顯示,不用特地去 hover 才看得到。
  const LABEL_VISIBLE_SCALE = 0.5;
  const showAllLabels = transform.k >= LABEL_VISIBLE_SCALE;

  return (
    <div className="mt-6">
      <div className="mb-3">
        <NodeCategoryFilter visible={visibleCategories} onToggle={toggleCategory} />
      </div>

      <div className="relative">
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            aria-label="放大"
            className="h-10 w-10 rounded-lg border border-border bg-surface text-sm shadow-sm hover:bg-muted sm:h-8 sm:w-8"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            aria-label="縮小"
            className="h-10 w-10 rounded-lg border border-border bg-surface text-sm shadow-sm hover:bg-muted sm:h-8 sm:w-8"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-xs shadow-sm hover:bg-muted sm:h-8"
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
          aria-label="條目關係圖(可縮放、拖曳)"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {visibleWikiEdges.map((e, i) => {
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
  
            {visibleRelEdges.map((e, i) => {
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
                      fontSize={11 * labelScale}
                      fill="var(--muted-foreground)"
                      paintOrder="stroke"
                      stroke="var(--surface)"
                      strokeWidth={4 * labelScale}
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
  
            {visibleNodes.map((n) => (
              <a
                key={n.id}
                href={`${basePath}/${n.slug}`}
                onClick={handleNodeClick}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={12 * labelScale}
                  style={{ fill: NODE_CATEGORY_COLOR_VARS[nodeCategory(n)] }}
                  strokeDasharray={n.status !== "approved" ? "3 2" : undefined}
                  stroke="var(--surface)"
                  strokeWidth={2 * labelScale}
                />
                {(showAllLabels || hoveredId === n.id) && (
                  <text
                    x={n.x}
                    y={n.y + 24 * labelScale}
                    textAnchor="middle"
                    fontSize={12 * labelScale}
                    fontStyle={n.isPlaceholder ? "italic" : undefined}
                    fill="var(--foreground)"
                    paintOrder="stroke"
                    stroke="var(--surface)"
                    strokeWidth={4 * labelScale}
                  >
                    {n.title}
                  </text>
                )}
              </a>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
