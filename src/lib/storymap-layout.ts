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

export type GraphNode = { id: string };
export type GraphEdge = { source: string; target: string };

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
    .force("collide", forceCollide(44))
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  return simNodes.map((n) => ({
    ...(n as N),
    x: n.x ?? width / 2,
    y: n.y ?? height / 2,
  }));
}
