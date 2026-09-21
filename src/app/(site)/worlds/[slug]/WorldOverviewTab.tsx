import WorldMapView, {
  type MapLayer,
  type MapNode,
} from "@/app/dashboard/worlds/[slug]/worldmap/WorldMapView";

/**
 * 「世界導讀」分頁——世界觀背景描述+世界地圖(有設定圖層才顯示)。
 * 世界地圖沿用既有的 WorldMapView 元件整塊搬進來(不是簡化成縮圖連結),
 * 因為公開版網站目前沒有獨立的世界地圖頁面——`/worlds/[slug]/map` 其實
 * 是關係圖(StoryMapGraph),不是這個圖釘式的世界地圖,只有這個首頁自己
 * 在顯示,所以沒有地方可以「連過去」,維持原本內嵌的做法。
 */
export function WorldOverviewTab({
  description,
  mapLayers,
  mapNodes,
  hasVisibleMap,
  worldId,
  worldSlug,
}: {
  description: string | null;
  mapLayers: MapLayer[];
  mapNodes: MapNode[];
  hasVisibleMap: boolean;
  worldId: string;
  worldSlug: string;
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

      {hasVisibleMap && (
        <section>
          <h2 className="text-lg font-semibold">世界地圖</h2>
          <div className="mt-3">
            <WorldMapView
              layers={mapLayers}
              nodes={mapNodes}
              unplacedNodes={[]}
              isStaff={false}
              worldId={worldId}
              worldSlug={worldSlug}
              basePath={`/worlds/${worldSlug}/nodes`}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export type { MapLayer, MapNode };
