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
import { collisionRadiusForTitle } from "@/lib/storymapConstants";

export type GraphNode = { id: string; title: string };
export type GraphEdge = { source: string; target: string };

/** 連線兩端節點之間留的額外空隙,避免兩個碰撞圓剛好內切、標籤邊框貼在一起。 */
const LINK_GAP = 16;

/**
 * 用 d3-force 算一次靜態的力導向版面配置(跑固定 400 個 tick 後停止,
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
        // 連線的「理想長度」直接用兩端節點各自的碰撞半徑相加,讓連線力
        // 跟碰撞力拉往同一個目標、不互相打架——之前固定寫 110,碰撞半徑
        // 改成依標籤大小動態計算後,很多時候碰撞需要的最小距離早就超過
        // 110,兩個力各退一步的結果就是連線間還是會比碰撞半徑要求的更近,
        // 標籤照樣疊在一起。
        .distance((l) => {
          const source = l.source as SimNode;
          const target = l.target as SimNode;
          return collisionRadiusForTitle(source.title) + collisionRadiusForTitle(target.title) + LINK_GAP;
        })
        // 連線力調弱,讓碰撞力主導最終距離——預設的連線力強度是依兩端
        // 節點的連線數反比計算,對只有一兩條連線的節點來說還是偏強,
        // 容易把它們拉到比碰撞半徑更近的地方。
        .strength(0.3),
    )
    .force("center", forceCenter(width / 2, height / 2))
    .force("collide", forceCollide<SimNode>((d) => collisionRadiusForTitle(d.title)).iterations(3))
    .stop();

  for (let i = 0; i < 400; i++) simulation.tick();

  return simNodes.map((n) => ({
    ...(n as N),
    x: n.x ?? width / 2,
    y: n.y ?? height / 2,
  }));
}
