import "server-only";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import {
  STORYMAP_NODE_RADIUS,
  STORYMAP_MIN_LABEL_K,
  estimateLabelWidth,
} from "@/lib/storymapConstants";

export type GraphNode = { id: string; title: string };
export type GraphEdge = { source: string; target: string };

/**
 * 碰撞半徑取「節點圓點半徑」和「標籤寬度的一半」中較大的值,讓距離近的
 * 節點至少留出放得下彼此標籤的距離,不會像之前固定用 44 那樣,標題長的
 * 節點(例如「回春丹beta」)還是會跟旁邊的節點擠在一起、標籤互相蓋住。
 *
 * 除以 STORYMAP_MIN_LABEL_K 是因為 StoryMapGraph.tsx 縮小到那個比例時
 * 標籤還會放大補償維持可讀,畫面上的標籤大小不會比這裡假設的更小——
 * 要讓「不重疊」在使用者實際會縮到的範圍內都成立,不能只算 k=1 的情況,
 * 要用標籤「最大可能撐開到多大」的情境去抓間距。
 */
function collisionRadius(title: string): number {
  const halfLabelWidth = estimateLabelWidth(title) / 2;
  return Math.max(STORYMAP_NODE_RADIUS, halfLabelWidth / STORYMAP_MIN_LABEL_K);
}

/**
 * 用 d3-force 算一次靜態的力導向版面配置(跑固定 300 個 tick 後停止,
 * 不是持續動畫的模擬)。這個函式沒有用到任何 DOM API,可以直接在
 * Server Component 裡算完座標,整張 StoryMap 用純 SVG 伺服器端渲染,
 * 不需要載入任何 client-side JS。
 *
 * 節點初始位置是 d3-force 內建的黃金角螺旋分佈,只跟節點順序有關,
 * 所以同一份資料每次算出來的版面配置是穩定的、不會每次 reload 亂跳。
 */
export function computeGraphLayout<N extends GraphNode>(
  nodes: N[],
  edges: GraphEdge[],
  width: number,
  height: number,
): (N & { x: number; y: number })[] {
  type SimNode = N & SimulationNodeDatum;
  const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
  const simLinks: SimulationLinkDatum<SimNode>[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const simulation = forceSimulation(simNodes)
    .force("charge", forceManyBody().strength(-260))
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((d) => d.id)
        .distance(110),
    )
    .force("center", forceCenter(width / 2, height / 2))
    .force("collide", forceCollide<SimNode>((d) => collisionRadius(d.title)))
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  return simNodes.map((n) => ({
    ...(n as N),
    x: n.x ?? width / 2,
    y: n.y ?? height / 2,
  }));
}
