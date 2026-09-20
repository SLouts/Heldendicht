const FEATURES = [
  {
    title: "8 款沉浸式美術主題",
    description:
      "泥金手抄本、羊皮紙卷軸、東方玄幻印章……八種風格隨時切換,同一份內容換一套視覺就像換了一本書。",
  },
  {
    title: "雙向連結與知識網絡",
    description:
      "內文用 [[條目名稱]] 就能連到其他節點,系統自動建立連結與反向關聯,連不到的名字會先開一個待撰寫的佔位節點。",
  },
  {
    title: "企劃協作與角色審查",
    description:
      "PC/NPC 配額、世界地圖標點、開放共筆或僅本人編輯——主辦跟編輯可以審核投稿,協作規則交給系統把關。",
  },
];

/** 首頁「平台特色介紹」——三格靜態介紹卡,純展示用,不含資料查詢。 */
export function PlatformFeatures() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {FEATURES.map((feature) => (
        <div key={feature.title} className="rounded-lg border border-border bg-surface p-4">
          <h3 className="font-display font-semibold">{feature.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
