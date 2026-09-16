"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import Link from "next/link";
import { setNodeMapPosition, clearNodeMapPosition } from "@/lib/actions/worldmap";
import { ImportMapForm } from "./ImportMapForm";

export type UnplacedNode = {
  id: string;
  title: string;
  slug: string;
  nodeType: string;
  status: string;
  isPlaceholder: boolean;
  characterType: "pc" | "npc" | null;
};

export type MapNode = UnplacedNode & { x: number; y: number; layerId: string };

export type MapLayer = { id: string; name: string; imageUrl: string | null };

type Transform = { x: number; y: number; k: number };

type Gesture =
  | { mode: null }
  | { mode: "pan"; startTransform: Transform; startClient: { x: number; y: number }; moved: boolean }
  | {
      mode: "pinch";
      startTransform: Transform;
      startDist: number;
      anchor: { x: number; y: number };
    };

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

function clampScale(k: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function pinColor(n: { isPlaceholder: boolean; nodeType: string; characterType: "pc" | "npc" | null }): string {
  if (n.isPlaceholder) return "var(--muted-foreground)";
  if (n.nodeType === "location") return "var(--success)";
  if (n.nodeType === "item") return "var(--primary)";
  if (n.nodeType === "character") {
    return n.characterType === "pc" ? "var(--badge-info-fg)" : "var(--muted-foreground)";
  }
  return "var(--muted-foreground)";
}

export default function WorldMapView({
  layers,
  nodes,
  unplacedNodes,
  isStaff,
  manageLayersHref,
  worldId,
  worldSlug,
  basePath,
}: {
  layers: MapLayer[];
  /** 這個世界觀「所有」已標點的節點(不限於目前選到的圖層),用 layerId 分開顯示。 */
  nodes: MapNode[];
  unplacedNodes: UnplacedNode[];
  isStaff: boolean;
  /** 有值才顯示「管理圖層」連結(只有 admin 看得到)。 */
  manageLayersHref?: string;
  worldId: string;
  worldSlug: string;
  /** 節點標點點擊後要連去哪裡,例如 `/dashboard/worlds/xxx/nodes` 或公開版 `/worlds/xxx/nodes`。 */
  basePath: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    layers[0]?.id ?? null,
  );
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [editMode, setEditMode] = useState(false);
  const [armedNodeId, setArmedNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [message, setMessage] = useState<string | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;
  const nodesOnLayer = useMemo(
    () => nodes.filter((n) => n.layerId === selectedLayerId),
    [nodes, selectedLayerId],
  );

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture>({ mode: null });
  const suppressClickRef = useRef(false);
  const dragPinRef = useRef<{ nodeId: string; pointerId: number; moved: boolean } | null>(null);

  // 拖曳/縮放時的原始事件(pointermove、wheel)可能比畫面更新頻率密集很多,
  // 尤其是高更新率的觸控螢幕或精密觸控板——如果每個事件都直接 setTransform,
  // 效能弱的裝置會因為過度重新渲染而卡頓。這裡把「計算」跟「畫面更新」拆開:
  // 每個事件還是立刻算出最新的 transform(不會漏掉任何一次滾動/拖曳的量,
  // 同一個畫面更新週期內來了好幾次也會正確疊加),但實際觸發 React
  // 重新渲染最多每個 animation frame 一次,跟畫面更新頻率對齊。
  const transformRef = useRef<Transform>(transform);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  function scheduleTransform(update: Transform | ((t: Transform) => Transform)) {
    transformRef.current =
      typeof update === "function" ? update(transformRef.current) : update;
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setTransform(transformRef.current);
    });
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  function fractionFromClient(clientX: number, clientY: number) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function startBackgroundGesture() {
    // 用 transformRef(最新算出來的值)而不是 transform state——一個手勢
    // 剛結束、下一個手勢緊接著開始時,前一個手勢排進 rAF 的畫面更新可能
    // 還沒 flush,這時 transform state 會是舊的,用它當起點會讓地圖瞬間
    // 跳一下。
    const currentTransform = transformRef.current;
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        mode: "pan",
        startTransform: currentTransform,
        startClient: pts[0],
        moved: false,
      };
    } else if (pts.length === 2) {
      const [p1, p2] = pts;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      const midClient = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const outerRect = outerRef.current?.getBoundingClientRect();
      const midLocal = {
        x: midClient.x - (outerRect?.left ?? 0),
        y: midClient.y - (outerRect?.top ?? 0),
      };
      gestureRef.current = {
        mode: "pinch",
        startTransform: currentTransform,
        startDist: dist,
        anchor: {
          x: (midLocal.x - currentTransform.x) / currentTransform.k,
          y: (midLocal.y - currentTransform.y) / currentTransform.k,
        },
      };
    } else {
      gestureRef.current = { mode: null };
    }
  }

  function handleBackgroundPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
    suppressClickRef.current = false;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startBackgroundGesture();
    if (gestureRef.current.mode === "pinch") {
      outerRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function handleBackgroundPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gesture = gestureRef.current;

    if (gesture.mode === "pan") {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length !== 1) return;
      const dx = pts[0].x - gesture.startClient.x;
      const dy = pts[0].y - gesture.startClient.y;
      if (!gesture.moved && Math.hypot(dx, dy) > 3) {
        gesture.moved = true;
        outerRef.current?.setPointerCapture(e.pointerId);
      }
      if (gesture.moved) {
        scheduleTransform({
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
      const outerRect = outerRef.current?.getBoundingClientRect();
      const midLocal = {
        x: midClient.x - (outerRect?.left ?? 0),
        y: midClient.y - (outerRect?.top ?? 0),
      };
      const k = clampScale(gesture.startTransform.k * (dist / gesture.startDist));
      scheduleTransform({
        x: midLocal.x - gesture.anchor.x * k,
        y: midLocal.y - gesture.anchor.y * k,
        k,
      });
    }
  }

  async function placeNode(nodeId: string, x: number, y: number) {
    if (!selectedLayerId) return;
    setLocalPositions((prev) => ({ ...prev, [nodeId]: { x, y } }));
    setMessage("儲存中…");
    const result = await setNodeMapPosition({
      nodeId,
      worldSlug,
      layerId: selectedLayerId,
      x,
      y,
    });
    if ("error" in result) {
      setMessage(result.error);
    } else {
      setMessage(null);
    }
  }

  function handleBackgroundPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    const gesture = gestureRef.current;

    if (gesture.mode === "pan" && !gesture.moved && editMode && armedNodeId) {
      const { x, y } = fractionFromClient(e.clientX, e.clientY);
      const nodeId = armedNodeId;
      setArmedNodeId(null);
      void placeNode(nodeId, x, y);
    } else if (gesture.mode && "moved" in gesture && gesture.moved) {
      suppressClickRef.current = true;
    }

    startBackgroundGesture();
  }

  function handleWheel(e: ReactWheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const outerRect = outerRef.current?.getBoundingClientRect();
    const cx = e.clientX - (outerRect?.left ?? 0);
    const cy = e.clientY - (outerRect?.top ?? 0);
    scheduleTransform((t) => {
      const factor = Math.exp(-e.deltaY * 0.0015);
      const k = clampScale(t.k * factor);
      const origX = (cx - t.x) / t.k;
      const origY = (cy - t.y) / t.k;
      return { x: cx - origX * k, y: cy - origY * k, k };
    });
  }

  function zoomBy(factor: number) {
    setTransform((t) => {
      const rect = outerRef.current?.getBoundingClientRect();
      const cx = (rect?.width ?? 0) / 2;
      const cy = (rect?.height ?? 0) / 2;
      const k = clampScale(t.k * factor);
      const origX = (cx - t.x) / t.k;
      const origY = (cy - t.y) / t.k;
      return { x: cx - origX * k, y: cy - origY * k, k };
    });
  }

  function resetView() {
    setTransform({ x: 0, y: 0, k: 1 });
  }

  function handleNodeClick(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault();
    }
  }

  // ---- 編輯模式下拖曳既有標點 ----
  function handlePinPointerDown(e: ReactPointerEvent<HTMLButtonElement>, nodeId: string) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragPinRef.current = { nodeId, pointerId: e.pointerId, moved: false };
    setSelectedNodeId(null);
  }

  function handlePinPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragPinRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    drag.moved = true;
    const { x, y } = fractionFromClient(e.clientX, e.clientY);
    setLocalPositions((prev) => ({ ...prev, [drag.nodeId]: { x, y } }));
  }

  function handlePinPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragPinRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    dragPinRef.current = null;

    if (drag.moved) {
      const pos = localPositions[drag.nodeId];
      if (pos) void placeNode(drag.nodeId, pos.x, pos.y);
    } else {
      setSelectedNodeId((cur) => (cur === drag.nodeId ? null : drag.nodeId));
    }
  }

  async function handleRemoveFromMap(nodeId: string) {
    setSelectedNodeId(null);
    setLocalPositions((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    setMessage("移除中…");
    const result = await clearNodeMapPosition(nodeId, worldSlug);
    setMessage("error" in result ? result.error : null);
  }

  const selectedNode = nodesOnLayer.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="mt-6">
      {layers.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {layers.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setSelectedLayerId(l.id);
                setArmedNodeId(null);
                setSelectedNodeId(null);
              }}
              className={
                "rounded-full border px-3 py-1 text-sm transition " +
                (l.id === selectedLayerId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:bg-muted")
              }
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {isStaff && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditMode((v) => !v);
              setArmedNodeId(null);
              setSelectedNodeId(null);
            }}
            className={
              "rounded-lg border px-3 py-1.5 text-sm transition " +
              (editMode
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:bg-muted")
            }
          >
            {editMode ? "結束編輯標點" : "編輯標點位置"}
          </button>
          {manageLayersHref && (
            <Link href={manageLayersHref} className="text-xs text-muted-foreground underline">
              管理圖層
            </Link>
          )}
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      )}

      {!selectedLayer && (
        <p className="text-sm text-muted-foreground">
          這個世界觀還沒有地圖圖層。
          {manageLayersHref && (
            <Link href={manageLayersHref} className="ml-1 underline">
              到「管理圖層」新增一張。
            </Link>
          )}
        </p>
      )}

      {selectedLayer && !selectedLayer.imageUrl && (
        <p className="text-sm text-muted-foreground">
          這張圖層還沒有上傳底圖。
          {manageLayersHref && (
            <Link href={manageLayersHref} className="ml-1 underline">
              到「管理圖層」上傳一張。
            </Link>
          )}
        </p>
      )}

      {editMode && armedNodeId && (
        <p className="mb-2 rounded-lg bg-badge-info-bg px-3 py-2 text-sm text-badge-info-fg">
          點擊地圖上的位置來放置節點。
          <button
            type="button"
            onClick={() => setArmedNodeId(null)}
            className="ml-2 underline"
          >
            取消
          </button>
        </p>
      )}

      {selectedLayer?.imageUrl && (
      <div className="relative">
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

        <div
          ref={outerRef}
          className="touch-none overflow-hidden rounded-lg border border-border bg-surface"
          style={{ height: 560, cursor: editMode ? "default" : "grab" }}
          onWheel={handleWheel}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handleBackgroundPointerMove}
          onPointerUp={handleBackgroundPointerUp}
          onPointerLeave={handleBackgroundPointerUp}
          onPointerCancel={handleBackgroundPointerUp}
        >
          <div
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
              transformOrigin: "0 0",
              width: "fit-content",
            }}
          >
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
              <img
                ref={imgRef}
                src={selectedLayer.imageUrl}
                alt={selectedLayer.name}
                draggable={false}
                decoding="async"
                className="block max-w-none select-none"
                style={{ width: 1000, height: "auto" }}
              />

              {nodesOnLayer.map((n) => {
                const pos = localPositions[n.id] ?? n;
                const style = {
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                };
                if (!editMode) {
                  return (
                    <a
                      key={n.id}
                      href={`${basePath}/${n.slug}`}
                      onClick={handleNodeClick}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={style}
                    >
                      <Pin node={n} />
                    </a>
                  );
                }
                return (
                  <button
                    key={n.id}
                    type="button"
                    onPointerDown={(e) => handlePinPointerDown(e, n.id)}
                    onPointerMove={handlePinPointerMove}
                    onPointerUp={handlePinPointerUp}
                    onPointerCancel={handlePinPointerUp}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none"
                    style={style}
                  >
                    <Pin node={n} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

      {editMode && selectedNode && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <span className="font-medium">{selectedNode.title}</span>
          <a
            href={`${basePath}/${selectedNode.slug}`}
            className="underline"
          >
            前往節點
          </a>
          <button
            type="button"
            onClick={() => handleRemoveFromMap(selectedNode.id)}
            className="text-danger underline"
          >
            從地圖移除
          </button>
        </div>
      )}

      {editMode && selectedLayer?.imageUrl && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">尚未標示的節點</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            這裡只列出完全還沒標在任何圖層上的節點——想把已經標在別張圖層的節點
            移過來,先在那張圖層把它從地圖移除,再回到這裡重新標示。
          </p>
          {unplacedNodes.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">全部節點都已經標到地圖上了。</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {unplacedNodes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setArmedNodeId(n.id)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition " +
                      (armedNodeId === n.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface hover:bg-muted")
                    }
                  >
                    ＋ {n.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ImportMapForm worldId={worldId} worldSlug={worldSlug} layerId={selectedLayer.id} />
        </div>
      )}
    </div>
  );
}

function Pin({
  node,
}: {
  node: { title: string; isPlaceholder: boolean; nodeType: string; status: string; characterType: "pc" | "npc" | null };
}) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className="block h-4 w-4 rounded-full border-2"
        style={{
          backgroundColor: pinColor(node),
          borderColor: "var(--surface)",
          borderStyle: node.status !== "approved" ? "dashed" : "solid",
        }}
      />
      <span
        className="whitespace-nowrap rounded bg-surface/90 px-1 text-xs text-foreground shadow-sm"
        style={{ fontStyle: node.isPlaceholder ? "italic" : undefined }}
      >
        {node.title}
      </span>
    </span>
  );
}
