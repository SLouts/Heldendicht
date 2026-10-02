export type PlatformFeatureItem = {
  title: string;
  description: string;
};

/** 首頁「平台特色介紹」——三格靜態介紹卡,純展示用,不含資料查詢。
 * 文字內容由呼叫端從 site_settings 查好傳進來(見 migration 038),
 * 不在這裡寫死。 */
export function PlatformFeatures({ features }: { features: PlatformFeatureItem[] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {features.map((feature) => (
        <div key={feature.title} className="rounded-lg border border-border bg-surface p-4">
          <h3 className="font-display font-semibold">{feature.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
