import WorldMapView, {
  type MapLayer,
  type MapNode,
  type UnplacedNode,
} from "@/app/dashboard/worlds/[slug]/worldmap/WorldMapView";

/**
 * 「世界導讀」分頁——世界觀背景描述+世界地圖(有設定圖層才顯示)。跟
 * 後台版世界觀首頁共用同一份檔案:世界地圖沿用既有的 WorldMapView 元件
 * 整塊搬進來(不是簡化成縮圖連結),因為公開版網站目前沒有獨立的世界
 * 地圖頁面——`/worlds/[slug]/map` 其實是關係圖(StoryMapGraph),不是這個
 * 圖釘式的世界地圖,只有這個首頁自己在顯示,所以沒有地方可以「連過去」,
 * 維持原本內嵌的做法。
 *
 * isStaff/manageLayersHref/unplacedNodes 是後台版才會用到的可編輯狀態
 * (拖曳標點、管理圖層連結、未標點節點清單),公開版全部維持預設值
 * (false/undefined/空陣列),行為跟原本一樣。
 */
export function WorldOverviewTab({
  description,
  mapLayers,
  mapNodes,
  hasVisibleMap,
  worldId,
  worldSlug,
  basePath,
  isStaff = false,
  manageLayersHref,
  unplacedNodes = [],
}: {
  description: string | null;
  mapLayers: MapLayer[];
  mapNodes: MapNode[];
  hasVisibleMap: boolean;
  worldId: string;
  worldSlug: string;
  /** 節點標點點擊後要連去哪裡,例如 `/worlds/xxx/nodes` 或 `/dashboard/worlds/xxx/nodes`。 */
  basePath: string;
  isStaff?: boolean;
  manageLayersHref?: string;
  unplacedNodes?: UnplacedNode[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {description ? (
        <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
          {description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">這個世界觀還沒有介紹文字。</p>
      )}

      {(hasVisibleMap || isStaff) && (
        <section>
          <h2 className="text-lg font-semibold">世界地圖</h2>
          <div className="mt-3">
            <WorldMapView
              layers={mapLayers}
              nodes={mapNodes}
              unplacedNodes={unplacedNodes}
              isStaff={isStaff}
              manageLayersHref={manageLayersHref}
              worldId={worldId}
              worldSlug={worldSlug}
              basePath={basePath}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export type { MapLayer, MapNode, UnplacedNode };
